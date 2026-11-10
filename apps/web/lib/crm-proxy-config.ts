import { cookies } from "next/headers";

export const GESTOR_CRM_COOKIE_NAME = "gestor_crm_session_cookie";

export function getCrmBaseUrl(): string {
  const raw =
    process.env.IDE_CRM_BASE_URL ||
    process.env.NEXT_PUBLIC_IDE_CRM_BASE_URL ||
    "https://crm.suporteide.digital";
  return raw.replace(/\/+$/, "");
}

export function extractBearerFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("authorization")?.trim();
  if (authHeader && /^Bearer\s+(\S+)$/i.test(authHeader)) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token && token !== "cookie-session") {
      return token;
    }
  }
  const serverToken = process.env.IDE_CRM_SERVER_TOKEN?.trim();
  if (serverToken) return serverToken;
  return null;
}

export async function getStoredUpstreamCookieHeader(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const saved = cookieStore.get(GESTOR_CRM_COOKIE_NAME)?.value;
    if (saved) {
      return Buffer.from(saved, "base64").toString("utf8");
    }
  } catch {
    // Ignore outside request context
  }
  return null;
}
