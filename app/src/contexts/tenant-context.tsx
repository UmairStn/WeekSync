import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { format, startOfWeek, addWeeks, subWeeks, isSameWeek } from "date-fns";
import { useListMyOrganizations } from "@/api/endpoints/organizations/organizations";
import { useListTeams } from "@/api/endpoints/teams/teams";
import { useCurrentUser } from "@/contexts/user-context";
import type { OrganizationResponse, TeamResponse } from "@/api/model";

interface TenantContextType {
  // Organizations
  orgs: OrganizationResponse[];
  currentOrg: OrganizationResponse | null;
  currentOrgId: string;
  setCurrentOrgId: (orgId: string) => void;
  isLoadingOrgs: boolean;
  isOwner: boolean;
  isAdmin: boolean;

  // Teams
  teams: TeamResponse[];
  currentTeam: TeamResponse | null;
  currentTeamId: string;
  setCurrentTeamId: (teamId: string) => void;
  isLoadingTeams: boolean;
  isTeamLead: boolean;

  // Week planning state
  selectedMonday: string; // YYYY-MM-DD
  setSelectedMonday: (monday: string) => void;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToCurrentWeek: () => void;
  isCurrentWeek: boolean;
  formattedWeekLabel: string;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

function getMondayString(date: Date = new Date()): string {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return format(monday, "yyyy-MM-dd");
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const user = useCurrentUser();

  // 1. Organization state
  const { data: orgsData, isLoading: isLoadingOrgs } = useListMyOrganizations({
    query: {
      enabled: !!user,
    },
  });

  const orgs = useMemo(() => orgsData ?? [], [orgsData]);

  const [currentOrgId, setCurrentOrgIdState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("weeksync_current_org_id") || "";
    }
    return "";
  });

  // Keep selected org valid
  useEffect(() => {
    if (orgs.length > 0) {
      const exists = orgs.some((o) => o.id === currentOrgId);
      if (!currentOrgId || !exists) {
        const defaultOrg = orgs[0];
        if (defaultOrg) {
          setCurrentOrgIdState(defaultOrg.id);
          if (typeof window !== "undefined") {
            localStorage.setItem("weeksync_current_org_id", defaultOrg.id);
          }
        }
      }
    }
  }, [orgs, currentOrgId]);

  const setCurrentOrgId = (orgId: string) => {
    setCurrentOrgIdState(orgId);
    if (typeof window !== "undefined") {
      localStorage.setItem("weeksync_current_org_id", orgId);
    }
  };

  const currentOrg = useMemo(() => {
    return orgs.find((o) => o.id === currentOrgId) ?? null;
  }, [orgs, currentOrgId]);

  const isOwner = currentOrg?.my_role === "owner";
  const isAdmin = isOwner || currentOrg?.my_role === "admin";

  // 2. Teams state for the active organization
  const { data: teamsData, isLoading: isLoadingTeams } = useListTeams(
    currentOrgId,
    {
      query: {
        enabled: !!user && !!currentOrgId,
      },
    }
  );

  const teams = useMemo(() => teamsData ?? [], [teamsData]);

  const [currentTeamId, setCurrentTeamIdState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("weeksync_current_team_id") || "";
    }
    return "";
  });

  useEffect(() => {
    if (teams.length > 0) {
      const exists = teams.some((t) => t.id === currentTeamId);
      if (!currentTeamId || !exists) {
        const defaultTeam = teams[0];
        if (defaultTeam) {
          setCurrentTeamIdState(defaultTeam.id);
          if (typeof window !== "undefined") {
            localStorage.setItem("weeksync_current_team_id", defaultTeam.id);
          }
        }
      }
    } else {
      setCurrentTeamIdState("");
    }
  }, [teams, currentTeamId]);

  const setCurrentTeamId = (teamId: string) => {
    setCurrentTeamIdState(teamId);
    if (typeof window !== "undefined") {
      localStorage.setItem("weeksync_current_team_id", teamId);
    }
  };

  const currentTeam = useMemo(() => {
    return teams.find((t) => t.id === currentTeamId) ?? null;
  }, [teams, currentTeamId]);

  const isTeamLead = !!user && currentTeam?.lead_user_id === user.id;

  // 3. Weekly Planner Monday date navigation
  const [selectedMonday, setSelectedMonday] = useState<string>(() =>
    getMondayString()
  );

  const mondayDate = useMemo(() => {
    const parts = selectedMonday.split("-").map(Number);
    const year = parts[0] ?? 2026;
    const month = parts[1] ?? 1;
    const day = parts[2] ?? 1;
    return new Date(year, month - 1, day);
  }, [selectedMonday]);

  const isCurrentWeek = useMemo(() => {
    return isSameWeek(mondayDate, new Date(), { weekStartsOn: 1 });
  }, [mondayDate]);

  const formattedWeekLabel = useMemo(() => {
    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(sundayDate.getDate() + 6);
    return `${format(mondayDate, "MMM d")} – ${format(sundayDate, "MMM d, yyyy")}`;
  }, [mondayDate]);

  const goToPreviousWeek = () => {
    const prev = subWeeks(mondayDate, 1);
    setSelectedMonday(getMondayString(prev));
  };

  const goToNextWeek = () => {
    const next = addWeeks(mondayDate, 1);
    setSelectedMonday(getMondayString(next));
  };

  const goToCurrentWeek = () => {
    setSelectedMonday(getMondayString(new Date()));
  };

  return (
    <TenantContext.Provider
      value={{
        orgs,
        currentOrg,
        currentOrgId,
        setCurrentOrgId,
        isLoadingOrgs,
        isOwner,
        isAdmin,

        teams,
        currentTeam,
        currentTeamId,
        setCurrentTeamId,
        isLoadingTeams,
        isTeamLead,

        selectedMonday,
        setSelectedMonday,
        goToPreviousWeek,
        goToNextWeek,
        goToCurrentWeek,
        isCurrentWeek,
        formattedWeekLabel,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}
