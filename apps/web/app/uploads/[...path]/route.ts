import { NextResponse } from "next/server";
import { getCrmBaseUrl, getStoredUpstreamCookieHeader } from "@/lib/crm-proxy-config";

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (path.some(segment => segment === "." || segment === ".." || segment.includes("/") || segment.includes("\\"))) return new NextResponse(null, { status: 400 });
  const cookie = await getStoredUpstreamCookieHeader();
  try {
    const response = await fetch(`${getCrmBaseUrl()}/uploads/${path.map(encodeURIComponent).join("/")}`, { headers: cookie ? { Cookie: cookie } : {}, cache: "no-store" });
    const headers = new Headers();
    for (const name of ["content-type", "cache-control", "x-content-type-options"]) {
      const value = response.headers.get(name); if (value) headers.set(name, value);
    }
    return new NextResponse(response.body, { status: response.status, headers });
  } catch { return new NextResponse(null, { status: 502 }); }
}
