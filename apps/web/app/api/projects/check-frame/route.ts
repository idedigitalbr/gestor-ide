import { NextResponse } from "next/server";
import { checkUrlFrameCompatibility } from "@/lib/frame-embed-checker";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url") || "";

  if (!targetUrl) {
    return NextResponse.json(
      {
        canEmbed: false,
        status: "blocked",
        reason: "Parâmetro 'url' é obrigatório.",
        suggestedMode: "new_tab",
      },
      { status: 400 }
    );
  }

  const result = await checkUrlFrameCompatibility(targetUrl);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const targetUrl = typeof body?.url === "string" ? body.url : "";

    if (!targetUrl) {
      return NextResponse.json(
        {
          canEmbed: false,
          status: "blocked",
          reason: "Campo 'url' é obrigatório no corpo da requisição.",
          suggestedMode: "new_tab",
        },
        { status: 400 }
      );
    }

    const result = await checkUrlFrameCompatibility(targetUrl);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        canEmbed: false,
        status: "blocked",
        reason: "Corpo da requisição JSON inválido.",
        suggestedMode: "new_tab",
      },
      { status: 400 }
    );
  }
}
