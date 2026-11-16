import { NextResponse } from "next/server";
import {
  extractBearerFromRequest,
  getCrmBaseUrl,
  getStoredUpstreamCookieHeader,
} from "@/lib/crm-proxy-config";

export type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function forwardToIdeCrm(request: Request, context: RouteContext) {
  const { path } = await context.params;
  if (
    path.some(
      (segment) =>
        segment === "." ||
        segment === ".." ||
        segment.includes("/") ||
        segment.includes("\\")
    )
  ) {
    return NextResponse.json({ error: "Caminho inválido." }, { status: 400 });
  }

  const crmBaseUrl = getCrmBaseUrl();
  const reqUrl = new URL(request.url);
  const encodedPath = path.map((segment) => encodeURIComponent(segment)).join("/");
  const targetUrl = `${crmBaseUrl}/api/${encodedPath}${reqUrl.search}`;

  const headers = new Headers();
  headers.set("Origin", crmBaseUrl);

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  const accept = request.headers.get("accept");
  if (accept) {
    headers.set("Accept", accept);
  } else if (encodedPath === "mcp") {
    headers.set("Accept", "application/json, text/event-stream");
  }

  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey) {
    headers.set("Idempotency-Key", idempotencyKey);
  }

  let bearer = extractBearerFromRequest(request);
  if (!bearer && (encodedPath === "mcp" || reqUrl.searchParams.has("token"))) {
    bearer =
      reqUrl.searchParams.get("token") ||
      process.env.STUDUPLAY_MCP_TOKEN ||
      "sp_mcp_o37A8Dt_C2_RwK63-JZjy6CHrYhtxrNRXiSIno712J4";
  }
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

    const responseHeaders = new Headers();
    const resContentType = upstreamRes.headers.get("content-type");
    if (resContentType) {
      responseHeaders.set("Content-Type", resContentType);
    }

    if ([204, 205, 304].includes(upstreamRes.status)) {
      return new NextResponse(null, {
        status: upstreamRes.status,
        headers: responseHeaders,
      });
    }

    if (resContentType?.includes("text/event-stream") && upstreamRes.body) {
      return new NextResponse(upstreamRes.body, {
        status: upstreamRes.status,
        headers: responseHeaders,
      });
    }

    const responseBuffer = await upstreamRes.arrayBuffer();
    if (!resContentType && responseBuffer.byteLength > 0) {
      responseHeaders.set("Content-Type", "application/json");
    }

    return new NextResponse(responseBuffer, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível comunicar com a API do IDE CRM." },
      { status: 502 }
    );
  }
}
