import { forwardToIdeCrm, type RouteContext } from "@/lib/crm-proxy-forwarder";

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
