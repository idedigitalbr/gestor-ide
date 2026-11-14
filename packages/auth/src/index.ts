// @gestor-ide/auth — Gestão de sessão e permissões integrada ao IDE CRM
import type { CrmUserProfile, CrmModuleAccess } from "@gestor-ide/core";

export const GESTOR_TOKEN_STORAGE_KEY = "gestor_ide_crm_token";

export interface GestorAuthSession {
  authenticated: boolean;
  token: string | null;
  user: CrmUserProfile | null;
}

export function getStoredCrmToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(GESTOR_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredCrmToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      window.localStorage.setItem(GESTOR_TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(GESTOR_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors in restricted environments
  }
}

export function canAccessCrmModule(
  user: CrmUserProfile | null,
  moduleId: keyof CrmModuleAccess
): boolean {
  if (!user) return false;
  if (user.roles?.includes("admin")) return true;
  return Boolean(user.modules?.[moduleId]);
}

export function hasCrmPermission(
  user: CrmUserProfile | null,
  permissionCode: string
): boolean {
  if (!user) return false;
  const userRole = (user.role ?? "").toLowerCase();
  const userRoles = (user.roles ?? []).map((r) => r.toLowerCase());
  if (
    userRole === "admin" ||
    userRole === "owner" ||
    userRole === "manager" ||
    userRoles.includes("admin") ||
    userRoles.includes("owner") ||
    userRoles.includes("manager")
  ) {
    return true;
  }
  return Boolean(user.permissions?.includes(permissionCode));
}
