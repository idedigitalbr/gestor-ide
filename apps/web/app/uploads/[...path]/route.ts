import { NextResponse } from "next/server";
import {
  extractBearerFromRequest,
  getCrmBaseUrl,
  getStoredUpstreamCookieHeader,
} from "@/lib/crm-proxy-config";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  if (
    path.some(
      (segment) =>
        segment === "." ||
        segment === ".." ||
        segment.includes("/") ||
        segment.includes("\\")
    )
  ) {
    return new NextResponse(null, { status: 400 });
  }

  const upstreamHeaders = new Headers();
  const bearer = extractBearerFromRequest(request);
  if (bearer) {
    upstreamHeaders.set("Authorization", `Bearer ${bearer}`);
  }
  const cookie = await getStoredUpstreamCookieHeader();
  if (cookie) {
    upstreamHeaders.set("Cookie", cookie);
  }

  try {
    const response = await fetch(
      `${getCrmBaseUrl()}/uploads/${path.map(encodeURIComponent).join("/")}`,
      { headers: upstreamHeaders, cache: "no-store" }
    );
    const headers = new Headers();
    for (const name of ["content-type", "cache-control"]) {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set("X-Content-Type-Options", "nosniff");
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (contentType.includes("svg")) {
      headers.set("Content-Security-Policy", "sandbox");
    }
    return new NextResponse(response.body, { status: response.status, headers });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
