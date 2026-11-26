import type { Member } from "@wire/types";
import { Button, Input, Label } from "@wire/ui";
import { useState } from "react";
import { useIcon } from "@/lib/ui-config/icon-pack.js";
import {
  useCreateMember,
  useMembers,
  useRemoveMember,
  useUpdateMember,
} from "../hooks.js";

const ROLES: Member["role"][] = ["owner", "admin", "member", "guest"];

export function MembersPanel({
  workspaceId,
}: {
  workspaceId: string;
}): React.JSX.Element {
  const Icon = useIcon();
  const { data, isLoading } = useMembers(workspaceId);
  const createMember = useCreateMember(workspaceId);
  const removeMember = useRemoveMember(workspaceId);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");

  function handleInvite(e: React.FormEvent): void {
    e.preventDefault();
    if (!(displayName.trim() && email.trim())) {
      return;
    }
    createMember.mutate(
      { displayName: displayName.trim(), email: email.trim(), role: "member" },
      {
        onSuccess: () => {
          setDisplayName("");
          setEmail("");
        },
      }
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        className="border-border bg-card flex flex-wrap items-end gap-3 rounded-md border p-4"
        onSubmit={handleInvite}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="member-name">Name</Label>
          <Input
            id="member-name"
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Jordan Lee"
            value={displayName}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="member-email">Email</Label>
          <Input
            id="member-email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jordan@example.com"
            type="email"
            value={email}
          />
        </div>
        <Button disabled={createMember.isPending} type="submit">
          <Icon name="plus" />
          Invite
        </Button>
      </form>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {(data?.items ?? []).map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            onRemove={() => removeMember.mutate(member.id)}
            workspaceId={workspaceId}
          />
        ))}
      </ul>
    </div>
  );
}

function MemberRow({
  workspaceId,
  member,
  onRemove,
}: {
  member: Member;
  onRemove: () => void;
  workspaceId: string;
}): React.JSX.Element {
  const Icon = useIcon();
  const updateMember = useUpdateMember(workspaceId, member.id);

  return (
    <li className="border-border bg-card flex items-center justify-between rounded-md border px-4 py-3">
      <div>
        <p className="text-foreground text-sm font-medium">
          {member.displayName}
        </p>
        <p className="text-muted-foreground text-xs">{member.email}</p>
      </div>
      <div className="flex items-center gap-2">
        <select
          aria-label={`Role for ${member.displayName}`}
          className="border-border bg-background text-foreground rounded-md border px-2 py-1 text-xs"
          onChange={(e) =>
            updateMember.mutate({ role: e.target.value as Member["role"] })
          }
          value={member.role}
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        <Button
          aria-label={`Remove ${member.displayName}`}
          onClick={onRemove}
          size="sm"
          variant="destructive"
        >
          <Icon name="trash" />
        </Button>
      </div>
    </li>
  );
}
