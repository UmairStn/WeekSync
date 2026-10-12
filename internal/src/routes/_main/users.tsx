import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
} from "lucide-react";
import {
  getUserListQueryKey,
  useUserDeactivate,
  useUserList,
  useUserReactivate,
} from "@/api/endpoints/users/users";
import type { InternalUserResponse } from "@/api/model";
import { useCurrentUser } from "@/contexts/user-context";
import { UserFormDialog } from "@/components/users/user-form-dialog";
import { ChangePasswordDialog } from "@/components/users/change-password-dialog";
import { DeleteUserDialog } from "@/components/users/delete-user-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const PAGE_SIZE = 20;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export const Route = createFileRoute("/_main/users")({ component: UsersPage });

function UsersPage() {
  const currentUser = useCurrentUser();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<InternalUserResponse | null>(null);
  const [passwordUser, setPasswordUser] = useState<InternalUserResponse | null>(
    null
  );
  const [deleteUser, setDeleteUser] = useState<InternalUserResponse | null>(
    null
  );
  const [userToDeactivate, setUserToDeactivate] =
    useState<InternalUserResponse | null>(null);

  const offset = page * PAGE_SIZE;
  const { data, isLoading, isError } = useUserList({
    limit: PAGE_SIZE,
    offset,
    search: search.trim() ? search.trim() : undefined,
  });

  const deactivateMutation = useUserDeactivate({
    mutation: {
      onSuccess: () => {
        toast.success(`Account deactivated for ${userToDeactivate?.email}`);
        setUserToDeactivate(null);
        queryClient.invalidateQueries({
          queryKey: getUserListQueryKey(),
        });
      },
      onError: (err) => {
        toast.error(
          `Failed to deactivate account: ${err?.message || "Unknown error"}`
        );
      },
    },
  });

  const reactivateMutation = useUserReactivate({
    mutation: {
      onSuccess: (res) => {
        toast.success(`Account reactivated for ${res.email}`);
        queryClient.invalidateQueries({
          queryKey: getUserListQueryKey(),
        });
      },
      onError: (err) => {
        toast.error(
          `Failed to reactivate account: ${err?.message || "Unknown error"}`
        );
      },
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const showingFrom = total === 0 ? 0 : offset + 1;
  const showingTo = offset + items.length;
  const canPrev = page > 0;
  const canNext = showingTo < total;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-xl font-bold uppercase tracking-wider">
              Staff & User Directory
            </h1>
            <span className="rounded bg-destructive/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-destructive border border-destructive/20">
              Access Control
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground font-mono">
            Manage user accounts, tenant memberships, password credentials, and
            global account activation.
          </p>
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          className="font-mono text-xs gap-1.5 h-8"
        >
          <Plus className="size-4" />
          Add User
        </Button>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search users by name or email..."
            className="pl-9 font-mono text-sm"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40 font-mono text-xs uppercase">
            <TableRow>
              <TableHead>Created</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Organizations & Roles</TableHead>
              <TableHead>Privilege</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!isLoading && isError && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center font-mono text-sm text-destructive"
                >
                  Failed to load users. Please verify staff permissions.
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !isError && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground font-mono">
                    <UserPlus className="size-6 opacity-40" />
                    <p className="text-sm">No users found matching query.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              !isError &&
              items.map((user) => {
                const isSelf = currentUser?.id === user.id;
                const orgs = user.organizations ?? [];

                return (
                  <TableRow key={user.id} className="font-mono text-xs">
                    <TableCell className="text-muted-foreground text-[11px]">
                      {formatDate(user.created_at)}
                    </TableCell>
                    <TableCell className="font-sans font-medium text-foreground">
                      {user.first_name} {user.last_name}
                      {isSelf && (
                        <span className="ml-1.5 rounded bg-muted px-1.5 py-0.2 font-mono text-[10px] text-muted-foreground">
                          you
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-[11px]">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      {orgs.length === 0 ? (
                        <span className="text-muted-foreground/60 text-[11px]">
                          No orgs
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {orgs.map((org) => (
                            <Badge
                              key={org.id}
                              variant="outline"
                              className="font-mono text-[10px] px-1.5 py-0"
                            >
                              <span className="font-sans font-medium">
                                {org.name}
                              </span>
                              <span className="ml-1 text-muted-foreground">
                                ({org.org_role})
                              </span>
                              {org.is_suspended && (
                                <span className="ml-1 text-destructive font-bold">
                                  [SUSPENDED]
                                </span>
                              )}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.is_admin ? (
                        <Badge
                          variant="secondary"
                          className="font-mono text-[10px]"
                        >
                          Staff Admin
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground font-mono">
                          Customer
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.is_active ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]"
                        >
                          ACTIVE
                        </Badge>
                      ) : (
                        <Badge
                          variant="destructive"
                          className="font-mono text-[10px]"
                        >
                          INACTIVE
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
                          aria-label="User actions"
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48 font-mono text-xs"
                        >
                          <DropdownMenuItem onClick={() => setEditUser(user)}>
                            <Pencil className="size-3.5 mr-2" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setPasswordUser(user)}
                          >
                            <KeyRound className="size-3.5 mr-2" />
                            Reset Password
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {user.is_active ? (
                            <DropdownMenuItem
                              disabled={isSelf}
                              className="text-amber-600 focus:text-amber-700 dark:text-amber-400"
                              onClick={() => setUserToDeactivate(user)}
                            >
                              <UserX className="size-3.5 mr-2" />
                              Deactivate Account
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="text-emerald-600 focus:text-emerald-700 dark:text-emerald-400"
                              onClick={() =>
                                reactivateMutation.mutate({ userId: user.id })
                              }
                            >
                              <UserCheck className="size-3.5 mr-2" />
                              Reactivate Account
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={isSelf}
                            onClick={() => setDeleteUser(user)}
                          >
                            <Trash2 className="size-3.5 mr-2" />
                            Delete Account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-2.5 font-mono text-xs text-muted-foreground">
          <div>
            Showing {showingFrom}–{showingTo} of {total} users
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs font-mono"
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs font-mono"
              disabled={!canNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Deactivate User Confirmation Dialog */}
      <Dialog
        open={Boolean(userToDeactivate)}
        onOpenChange={(open) => !open && setUserToDeactivate(null)}
      >
        <DialogContent className="font-mono text-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-5" />
              Deactivate User Account
            </DialogTitle>
            <DialogDescription className="pt-2 font-mono text-xs text-muted-foreground">
              Deactivate login access for{" "}
              <span className="font-bold text-foreground">
                {userToDeactivate?.first_name} {userToDeactivate?.last_name}
              </span>{" "}
              ({userToDeactivate?.email})?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            The user will not be able to log in or refresh auth tokens across
            any client. Their data and organization memberships are preserved.
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUserToDeactivate(null)}
              disabled={deactivateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deactivateMutation.isPending}
              onClick={() => {
                if (userToDeactivate) {
                  deactivateMutation.mutate({ userId: userToDeactivate.id });
                }
              }}
            >
              {deactivateMutation.isPending
                ? "Deactivating..."
                : "Confirm Deactivation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserFormDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <UserFormDialog
        mode="edit"
        user={editUser ?? undefined}
        open={editUser !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditUser(null);
          }
        }}
      />
      <ChangePasswordDialog
        user={passwordUser}
        open={passwordUser !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPasswordUser(null);
          }
        }}
      />
      <DeleteUserDialog
        user={deleteUser}
        open={deleteUser !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteUser(null);
          }
        }}
      />
    </>
  );
}
