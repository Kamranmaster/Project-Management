import { UserMinus } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, RoleBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { useUpdateMemberRole } from "@/hooks/useMembers";
import { toastError } from "@/lib/errors";
import { ROLE_LABELS } from "@/lib/permissions";
import { displayName, formatDate } from "@/lib/utils";
import type { ProjectMember, ProjectRole } from "@/types";

const ROLES: ProjectRole[] = ["admin", "project_admin", "member"];

interface MemberRowProps {
  projectId: string;
  member: ProjectMember & { user: NonNullable<ProjectMember["user"]> };
  isCurrentUser: boolean;
  canManage: boolean;
  onRemove: () => void;
}

export function MemberRow({ projectId, member, isCurrentUser, canManage, onRemove }: MemberRowProps) {
  const updateRole = useUpdateMemberRole(projectId);
  const { user } = member;
  // Admins manage everyone except themselves (avoids accidental self-demotion / removal).
  const editable = canManage && !isCurrentUser;

  const onRoleChange = (role: ProjectRole) =>
    updateRole.mutate(
      { userId: user._id, role },
      {
        onSuccess: () => toast.success(`${displayName(user)} is now ${ROLE_LABELS[role]}`),
        onError: (error) => toastError(error, "Couldn't change the role"),
      },
    );

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar user={user} />
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate text-sm font-medium text-slate-900">
            {displayName(user)}
            {isCurrentUser && <Badge>You</Badge>}
          </p>
          <p className="truncate text-xs text-slate-500">
            @{user.username}
            {user.email && <> · {user.email}</>}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 pl-12 sm:pl-0">
        <span className="hidden text-xs text-slate-400 md:inline">Joined {formatDate(member.createdAt)}</span>
        {editable ? (
          <div className="flex items-center gap-2">
            {updateRole.isPending && <Spinner className="size-4 text-slate-400" />}
            <Select
              value={member.role}
              onChange={(event) => onRoleChange(event.target.value as ProjectRole)}
              disabled={updateRole.isPending}
              aria-label={`Role for ${displayName(user)}`}
              className="h-8 w-40"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <RoleBadge role={member.role} />
        )}
        {editable && (
          <Button
            variant="danger-ghost"
            size="icon-sm"
            onClick={onRemove}
            aria-label={`Remove ${displayName(user)} from project`}
            title="Remove from project"
          >
            <UserMinus className="size-4" />
          </Button>
        )}
      </div>
    </li>
  );
}
