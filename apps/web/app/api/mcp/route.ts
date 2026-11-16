import { forwardToIdeCrm } from "@/lib/crm-proxy-forwarder";

const mcpContext = { params: Promise.resolve({ path: ["mcp"] }) };

export async function GET(request: Request) {
  return forwardToIdeCrm(request, mcpContext);
}

export async function POST(request: Request) {
  return forwardToIdeCrm(request, mcpContext);
}
