import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  extractBearerFromRequest,
  GESTOR_CRM_COOKIE_NAME,
  getCrmBaseUrl,
  getStoredUpstreamCookieHeader,
} from "@/lib/crm-proxy-config";

function parseSetCookiePair(setCookieStrings: string[]): string {
  const cookieMap = new Map<string, string>();
  for (const raw of setCookieStrings) {
    const firstPart = raw.split(";")[0]?.trim();
    if (!firstPart) continue;
    const eqIdx = firstPart.indexOf("=");
    if (eqIdx <= 0) continue;
    const name = firstPart.slice(0, eqIdx).trim();
    const val = firstPart.slice(eqIdx + 1).trim();
    if (val) {
      cookieMap.set(name, `${name}=${val}`);
    }
  }
  return Array.from(cookieMap.values()).join("; ");
}

export async function GET(request: Request) {
  const crmBaseUrl = getCrmBaseUrl();
  const bearer = extractBearerFromRequest(request);

  if (bearer) {
    try {
      const res = await fetch(`${crmBaseUrl}/api/account`, {
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as {
          account?: {
            id: string;
            name: string | null;
            email: string;
            avatarUrl: string | null;
            role?: string;
            roles?: string[];
            permissions?: string[];
            modules?: { crm: boolean; projects: boolean; finance: boolean };
          };
        };
        if (data.account?.id) {
          return NextResponse.json({
            authenticated: true,
            user: {
              id: data.account.id,
              name: data.account.name,
              email: data.account.email,
              avatarUrl: data.account.avatarUrl,
              role: data.account.role ?? "",
              roles: data.account.roles ?? (data.account.role ? [data.account.role] : []),
              permissions: data.account.permissions ?? [],
              modules: data.account.modules ?? { projects: false, crm: false, finance: false },
            },
          });
        }
      }
    } catch {
      // Fallback to cookie check
    }
  }

  const upstreamCookie = await getStoredUpstreamCookieHeader();
  if (upstreamCookie) {
    try {
      const sessionRes = await fetch(`${crmBaseUrl}/api/auth/session`, {
        headers: {
          Cookie: upstreamCookie,
        },
        cache: "no-store",
      });
      if (sessionRes.ok) {
        const sessionData = (await sessionRes.json()) as {
          user?: {
            id?: string;
            name?: string | null;
            email?: string;
            avatarUrl?: string | null;
            role?: string;
            roles?: string[];
            permissions?: string[];
            modules?: { crm: boolean; projects: boolean; finance: boolean };
          };
        };
        if (sessionData?.user?.id) {
          return NextResponse.json({
            authenticated: true,
            user: {
              id: sessionData.user.id,
              name: sessionData.user.name ?? null,
              email: sessionData.user.email ?? "",
              avatarUrl: sessionData.user.avatarUrl ?? null,
              role: sessionData.user.role ?? "",
              roles: sessionData.user.roles ?? (sessionData.user.role ? [sessionData.user.role] : []),
              permissions: sessionData.user.permissions ?? [],
              modules: sessionData.user.modules ?? {
                projects: false,
                crm: false,
                finance: false,
              },
            },
          });
        }
      }
    } catch {
      // Fall through to 401
    }
  }

  return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
}

export async function POST(request: Request) {
  let body: { email?: string; password?: string; clientName?: string } | null = null;
  try {
    body = (await request.json()) as {
      email?: string;
      password?: string;
      clientName?: string;
    };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const email = body?.email?.trim();
  const password = body?.password;
  if (!email || !password) {
    return NextResponse.json(
      { error: "Informe e-mail e senha da sua conta IDE CRM." },
      { status: 422 }
    );
  }

  const crmBaseUrl = getCrmBaseUrl();

  try {
    // 1. Tenta o endpoint direto /api/auth/token (quando disponível no CRM)
    const tokenEndpointRes = await fetch(`${crmBaseUrl}/api/auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: crmBaseUrl,
      },
      body: JSON.stringify({
        email,
        password,
        clientName: body?.clientName || "IDE Gestor Web",
      }),
      cache: "no-store",
    });

    if (tokenEndpointRes.ok) {
      const payload = await tokenEndpointRes.json();
      return NextResponse.json(payload, { status: 201 });
    }

    // 2. Fallback: Autenticação via fluxo oficial NextAuth (/api/auth/csrf + /api/auth/callback/credentials)
    const csrfRes = await fetch(`${crmBaseUrl}/api/auth/csrf`, {
      cache: "no-store",
    });
    if (!csrfRes.ok) {
      return NextResponse.json(
        { error: "Não foi possível iniciar autenticação no IDE CRM." },
        { status: 502 }
      );
    }

    const csrfData = (await csrfRes.json()) as { csrfToken?: string };
    const csrfCookies = csrfRes.headers.getSetCookie?.() ?? [];
    const initialCookieHeader = parseSetCookiePair(csrfCookies);

    const formParams = new URLSearchParams();
    formParams.set("email", email);
    formParams.set("password", password);
    formParams.set("csrfToken", csrfData.csrfToken ?? "");
    formParams.set("redirect", "false");
    formParams.set("json", "true");

    const callbackRes = await fetch(
      `${crmBaseUrl}/api/auth/callback/credentials`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Origin: crmBaseUrl,
          Cookie: initialCookieHeader,
        },
        body: formParams.toString(),
        redirect: "manual",
        cache: "no-store",
      }
    );

    const callbackCookies = callbackRes.headers.getSetCookie?.() ?? [];
    const combinedCookieHeader = parseSetCookiePair([
      ...csrfCookies,
      ...callbackCookies,
    ]);

    if (!combinedCookieHeader.includes("session-token")) {
      return NextResponse.json(
        { error: "E-mail ou senha inválidos no IDE CRM." },
        { status: 401 }
      );
    }

    const sessionRes = await fetch(`${crmBaseUrl}/api/auth/session`, {
      headers: {
        Cookie: combinedCookieHeader,
      },
      cache: "no-store",
    });

    const sessionData = (await sessionRes.json()) as {
      user?: {
        id?: string;
        name?: string | null;
        email?: string;
        avatarUrl?: string | null;
        role?: string;
        roles?: string[];
        permissions?: string[];
        modules?: { crm: boolean; projects: boolean; finance: boolean };
      };
    };

    if (!sessionData?.user?.id) {
      return NextResponse.json(
        { error: "Sessão não pôde ser validada no IDE CRM." },
        { status: 401 }
      );
    }

    const forwardedProto = request.headers.get("x-forwarded-proto");
    const isHttps =
      forwardedProto?.split(",")[0]?.trim() === "https" ||
      new URL(request.url).protocol === "https:";

    const cookieStore = await cookies();
    cookieStore.set(
      GESTOR_CRM_COOKIE_NAME,
      Buffer.from(combinedCookieHeader, "utf8").toString("base64"),
      {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: isHttps,
        maxAge: 8 * 60 * 60,
      }
    );

    return NextResponse.json(
      {
        token: "cookie-session",
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        user: {
          id: sessionData.user.id,
          name: sessionData.user.name ?? email,
          email: sessionData.user.email ?? email,
          avatarUrl: sessionData.user.avatarUrl ?? null,
          role: sessionData.user.role ?? "",
          roles: sessionData.user.roles ?? (sessionData.user.role ? [sessionData.user.role] : []),
          permissions: sessionData.user.permissions ?? [],
          modules: sessionData.user.modules ?? {
            projects: false,
            crm: false,
            finance: false,
          },
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Falha de comunicação com o servidor do IDE CRM." },
      { status: 502 }
    );
  }
}

export async function DELETE(request: Request) {
  const bearer = extractBearerFromRequest(request);
  const crmBaseUrl = getCrmBaseUrl();

  if (bearer) {
    try {
      await fetch(`${crmBaseUrl}/api/auth/token`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${bearer}`,
          Origin: crmBaseUrl,
        },
        cache: "no-store",
      });
    } catch {
      // Best-effort remote token revocation
    }
  }

  try {
    const cookieStore = await cookies();
    cookieStore.delete(GESTOR_CRM_COOKIE_NAME);
  } catch {
    // Ignore
  }
  return NextResponse.json({ revoked: true });
}
