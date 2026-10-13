# AI Integration & Agent Design

> Technical specification for Pydantic AI agents, prompt construction, structured output contracts, error handling, telemetry, and offline testing.
> Bound by RULES.md § 5: `pydantic-ai-slim[google]`, model `gemini-3.5-flash-lite`, typed Pydantic outputs, zero direct DB writes, offline tests.

---

## 1. Architectural Principles
1. **Typed Output Contract:** Every LLM interaction uses Pydantic AI's `output_type` bound to strict Pydantic schemas. Prompt strings never request raw JSON strings to parse manually.
2. **Form-Targeted Only:** AI output flows strictly back to the frontend client state to prefill forms or display side-by-side annotations. AI never writes directly to the database.
3. **Resilient Fallback:** The core product operates fully without AI. Upstream timeouts, network breaks, or HTTP 429 quota exhaustion render a clean, plain-language notification in the UI without freezing the app or blocking plan submission.
4. **Tenant Telemetry:** Every invocation logs an audit record in `ai_call_logs` keyed to the user's `organization_id`.
5. **Hermetic Offline Testing:** Tests use `TestModel` or `FunctionModel`. `uv run pytest` runs with zero network and no `GOOGLE_API_KEY`.

---

## 2. Agent 1: Plan Review Agent ("Approval Meeting in a Box")

### Purpose
Acts as a rigorous, senior engineering lead reviewing an individual member's weekly plan before they formally submit it to their human lead.
Flags:
- Activity-oriented tasks rather than checkable outcomes (e.g. "Work on auth" vs "User can log in via email and session persists across refresh").
- Main tasks that fail to state business impact / why it matters.
- Plans lacking go-to-market (GTM) considerations (changelogs, metrics, documentation, flags).
- Unrealistic scope for a 5-day cycle.

### Output Schema
```python
from enum import Enum
import uuid
from pydantic import BaseModel, Field

class FindingType(str, Enum):
    VAGUE_ACTIVITY = "vague_activity"      # Describes work instead of checkable outcome
    MISSING_IMPACT = "missing_impact"      # Main task doesn't state why it matters
    MISSING_GTM = "missing_gtm"            # No telemetry, docs, or release safety
    UNREALISTIC_SCOPE = "unrealistic_scope"# Too broad for one week

class PlanFinding(BaseModel):
    task_id: uuid.UUID | None = Field(
        None, description="The UUID of the specific task this finding applies to, or null if plan-wide"
    )
    issue_type: FindingType = Field(..., description="Categorization of the critique")
    critique: str = Field(..., description="Clear explanation of why this task will trigger lead pushback")
    suggested_rewrite: str | None = Field(
        None, description="Concrete, drop-in replacement title or text describing the verifiable result"
    )

class PlanReviewResult(BaseModel):
    overall_assessment: str = Field(
        ..., description="2-3 sentence executive assessment of the week's strategic focus"
    )
    findings: list[PlanFinding] = Field(
        default_factory=list, description="Specific items requiring refinement"
    )
    ready_to_submit: bool = Field(
        ..., description="True if no blocking vague tasks remain"
    )
```

### Prompt Construction Strategy
The backend transforms the relational database plan into a clean, markdown-structured payload:
```text
System Prompt:
You are an exacting, high-agency engineering lead reviewing a weekly commitment for a high-velocity startup.
Your standard:
1. Every task must describe a checkable outcome that can be verified on staging or in production (e.g., 'Checkout handles expired cards, confirmed on staging'), NEVER vague activity ('Implement checkout').
2. The main task must articulate why it matters to customers or company metrics.
3. Every engineering initiative must include at least one go-to-market task (analytics events, changelog entry, user docs, feature flag).
4. Never wave through generic or vague tasks. For every critique, provide an exact suggested rewrite.

Plan to Review:
Week Commencing: {week_start_date}
Member: {user_name}

[MAIN TASK] (ID: {task_id})
Title: {title}
Why it matters: {why_it_matters}

[SUB-GOALS]
- ID: {task_id} | {title}
- ID: {task_id} | {title}

[GO-TO-MARKET GOALS]
- ID: {task_id} | {title}
```

---

## 3. Agent 2: Brain Dump Agent ("Draft from Notes")

### Purpose
Takes a user's unstructured thoughts, meeting bullet points, or rough scratch notes and synthesizes them into a structured weekly plan ready for editing in the UI.

### Output Schema
```python
from typing import Literal
from pydantic import BaseModel, Field

class DraftTask(BaseModel):
    category: Literal["main", "sub_goal", "gtm"] = Field(..., description="Category of task")
    title: str = Field(..., description="Actionable title describing a checkable outcome")
    why_it_matters: str | None = Field(
        None, description="Business impact explanation (required for main task)"
    )

class BrainDumpResult(BaseModel):
    main_task: DraftTask = Field(..., description="The primary shippable initiative of the week")
    sub_goals: list[DraftTask] = Field(
        ..., min_length=1, max_length=5, description="Tactical tasks delivering the main goal"
    )
    gtm_goals: list[DraftTask] = Field(
        ..., min_length=1, max_length=4, description="Release enablement (metrics, flags, changelog)"
    )
```

### System Directives
- Refuse to produce generic tasks like "Do research" or "Code feature".
- Extract the core business deliverable as the `main_task`.
- If the user notes did not mention GTM, infer plausible operational hygiene items (e.g., "Add PostHog tracking", "Draft customer release note").

---

## 4. Failure, Rate-Limit & Timeout Handling

### Upstream Gemini Error Mapping
```python
from pydantic_ai.exceptions import ModelRetry, UnexpectedModelBehavior
import google.api_core.exceptions as google_exceptions

try:
    async with asyncio.timeout(15.0): # Strict 15s budget
        result = await agent.run(prompt)
        log_status = "success"
        return result.data
except asyncio.TimeoutError:
    log_status = "failure"
    raise APIException(
        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
        code="AI_TIMEOUT",
        message="AI assistant timed out. You can still edit and submit your plan manually.",
    )
except google_exceptions.ResourceExhausted:
    log_status = "rate_limited"
    raise APIException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        code="AI_RATE_LIMITED",
        message="AI request limit reached. Please wait a moment or proceed manually.",
    )
except Exception as exc:
    log_status = "failure"
    logger.exception("AI agent failure")
    raise APIException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        code="AI_SERVICE_ERROR",
        message="AI assistant is currently unavailable. Planning works normally without it.",
    )
finally:
    # Always commit telemetry record
    await log_ai_usage(session, org_id, user_id, feature, log_status)
```

---

## 5. Offline Testing Architecture

### Hermetic Test Implementation
In `tests/api/app/test_ai.py`:
```python
from pydantic_ai.models.test import TestModel

def test_plan_review_agent_offline():
    mock_data = PlanReviewResult(
        overall_assessment="Strong focus on checkout reliability.",
        findings=[
            PlanFinding(
                task_id=sample_task_id,
                issue_type=FindingType.VAGUE_ACTIVITY,
                critique="Describes internal activity rather than verification.",
                suggested_rewrite="Checkout webhook passes end-to-end stripe mock test",
            )
        ],
        ready_to_submit=False,
    )
    test_model = TestModel(custom_result_args={"data": mock_data})
    # Run agent against test_model — no network, no secret keys required!
```
Guarantees `uv run pytest` executes cleanly in automated sandboxes.
