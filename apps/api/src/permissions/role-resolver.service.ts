import { Injectable } from "@nestjs/common";
import type { Request } from "express";
import { MembersService } from "../members/members.service.js";
import type { Role } from "./permission.types.js";

/**
 * Resolves a session's role for a request. Workspace-scoped routes (anything with
 * a :workspaceId param) look up the caller's Member record in that workspace by
 * email; a matching `admin` or `owner` Member role maps to the `admin` CASL role,
 * everything else to `member`.
 *
 * Known gap: routes with no :workspaceId param in their path (messages, channels,
 * reactions, pins, threads, search, files — see internal-docs/api/permissions.md)
 * can't yet resolve which workspace they belong to without a join the mock
 * services don't support, and default to `member`. This is a real limitation to
 * close once those resources carry a workspace reference, not a design choice to
 * keep long-term.
 */
@Injectable()
export class RoleResolverService {
  constructor(private readonly members: MembersService) {}

  resolve(req: Request, email: string): Role {
    const param = req.params["workspaceId"];
    const workspaceId = Array.isArray(param) ? param[0] : param;
    if (!workspaceId) return "member";

    const member = this.members.findByEmail(workspaceId, email);
    if (member?.role === "admin" || member?.role === "owner") return "admin";
    return "member";
  }
}
