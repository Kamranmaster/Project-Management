import { useMemo, useState } from "react";
import { UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { InviteMemberDialog } from "@/components/members/InviteMemberDialog";
import { MemberRow } from "@/components/members/MemberRow";
import { RoleBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { useAuthenticatedUser } from "@/hooks/useAuth";
import { useMembers, useRemoveMember } from "@/hooks/useMembers";
import { toastError } from "@/lib/errors";
import { can, ROLE_DESCRIPTIONS } from "@/lib/permissions";
import { displayName } from "@/lib/utils";
import type { ProjectRole, UserSummary } from "@/types";
import { useProjectContext } from "./ProjectLayout";

const ROLE_ORDER: Record<ProjectRole, number> = { admin: 0, project_admin: 1, member: 2 };

export function MembersPage() {
  const { project } = useProjectContext();
  const currentUser = useAuthenticatedUser();
  const members = useMembers(project._id);
  const removeMember = useRemoveMember(project._id);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<UserSummary | null>(null);

  // Admins first, then alphabetical. Memberships whose user account no longer exists are skipped.
  const sorted = useMemo(
    () =>
      (members.data ?? [])
        .filter((member) => member.user)
        .map((member) => ({ ...member, user: member.user! }))
        .sort(
          (a, b) =>
            ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || displayName(a.user).localeCompare(displayName(b.user)),
        ),
    [members.data],
  );

  const onConfirmRemove = () => {
    if (!memberToRemove) return;
    removeMember.mutate(memberToRemove._id, {
      onSuccess: () => {
        toast.success(`${displayName(memberToRemove)} was removed`);
        setMemberToRemove(null);
      },
      onError: (error) => toastError(error, "Couldn't remove the member"),
    });
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Members</h2>
          <p className="text-sm text-slate-500">
            {members.data ? `${sorted.length} ${sorted.length === 1 ? "person" : "people"} on this project` : "People on this project"}
          </p>
        </div>
        {can(project.role, "inviteMember") && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="size-4" aria-hidden />
            Add member
          </Button>
        )}
      </div>

      {members.isPending ? (
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {[0, 1, 2].map((key) => (
            <div key={key} className="flex items-center gap-3 px-5 py-4">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      ) : members.isError ? (
        <ErrorState error={members.error} onRetry={() => members.refetch()} />
      ) : sorted.length === 0 ? (
        <EmptyState icon={Users} title="No members found" />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-xs">
          {sorted.map((member) => (
            <MemberRow
              key={member.user._id}
              projectId={project._id}
              member={member}
              isCurrentUser={member.user._id === currentUser._id}
              canManage={can(project.role, "manageMembers")}
              onRemove={() => setMemberToRemove(member.user)}
            />
          ))}
        </ul>
      )}

      <section aria-labelledby="roles-heading" className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 id="roles-heading" className="text-sm font-semibold text-slate-900">
          What each role can do
        </h3>
        <dl className="mt-3 space-y-2.5">
          {(Object.keys(ROLE_DESCRIPTIONS) as ProjectRole[]).map((role) => (
            <div key={role} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <dt className="w-32 shrink-0">
                <RoleBadge role={role} />
              </dt>
              <dd className="text-sm text-slate-600">{ROLE_DESCRIPTIONS[role]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <InviteMemberDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        projectId={project._id}
        currentRole={project.role}
      />
      <ConfirmDialog
        open={memberToRemove !== null}
        onClose={() => setMemberToRemove(null)}
        onConfirm={onConfirmRemove}
        loading={removeMember.isPending}
        title="Remove member?"
        description={
          <>
            <strong className="font-medium text-slate-900">{displayName(memberToRemove)}</strong> will lose access to
            this project. Tasks assigned to them stay assigned until you change them.
          </>
        }
        confirmLabel="Remove member"
      />
    </div>
  );
}
