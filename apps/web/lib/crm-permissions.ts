import type { CrmUserProfile } from "@gestor-ide/core";
import { hasCrmPermission } from "@gestor-ide/auth";

export type ProjectCrmPermission =
  | "projects.read"
  | "projects.write"
  | "projects.manage"
  | "projects.members";

/**
 * Avalia permissões RBAC na UI quando a sessão fornece claims explícitos
 * (roles/permissions). Sessões por token MCP que não carregam claims de
 * permissão mantêm a UI liberada para que o backend do IDE CRM faça o enforcement.
 */
export function canPerformProjectAction(
  user: CrmUserProfile | null,
  isConnectedCrm: boolean,
  permission: ProjectCrmPermission
): boolean {
  if (!isConnectedCrm) return true;
  if (!user) return false;

  const hasExplicitClaims =
    (user.roles?.length ?? 0) > 0 || (user.permissions?.length ?? 0) > 0;
  if (!hasExplicitClaims) return true;

  if (permission === "projects.write") {
    return (
      hasCrmPermission(user, "projects.write") ||
      hasCrmPermission(user, "projects.manage")
    );
  }

  return hasCrmPermission(user, permission);
}
