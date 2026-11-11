import { NextResponse } from "next/server";
import {
  extractBearerFromRequest,
  getCrmBaseUrl,
  getStoredUpstreamCookieHeader,
} from "@/lib/crm-proxy-config";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function forwardToIdeCrm(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const crmBaseUrl = getCrmBaseUrl();
  const reqUrl = new URL(request.url);
  const targetUrl = `${crmBaseUrl}/api/${path.join("/")}${reqUrl.search}`;

  const headers = new Headers();
  headers.set("Origin", crmBaseUrl);

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey) {
    headers.set("Idempotency-Key", idempotencyKey);
  }

  const bearer = extractBearerFromRequest(request);
  if (bearer) {
    headers.set("Authorization", `Bearer ${bearer}`);
  }
  const upstreamCookie = await getStoredUpstreamCookieHeader();
  if (upstreamCookie) {
    headers.set("Cookie", upstreamCookie);
  }

  const isBodyMethod = !["GET", "HEAD"].includes(request.method.toUpperCase());
  const body = isBodyMethod ? await request.arrayBuffer() : undefined;

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
      cache: "no-store",
      keepalive: true,
    });

    const responseText = await upstreamRes.text();
    const resContentType =
      upstreamRes.headers.get("content-type") || "application/json";

    return new NextResponse(responseText, {
      status: upstreamRes.status,
      headers: {
        "Content-Type": resContentType,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível comunicar com a API do IDE CRM." },
      { status: 502 }
    );
  }
}

export async function GET(request: Request, context: RouteContext) {
  return forwardToIdeCrm(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return forwardToIdeCrm(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return forwardToIdeCrm(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
  return forwardToIdeCrm(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return forwardToIdeCrm(request, context);
}
