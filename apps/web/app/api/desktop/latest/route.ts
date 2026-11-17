import { NextResponse } from "next/server";

const FALLBACK_VERSION = "v0.1.6";
const FALLBACK_FILENAME = "instalador-ide-gestor-v0.1.6-oneclick.exe";
const FALLBACK_DOWNLOAD_URL = `https://github.com/idedigitalbr/gestor-ide/releases/download/${FALLBACK_VERSION}/${FALLBACK_FILENAME}`;
const FALLBACK_RELEASE_URL = `https://github.com/idedigitalbr/gestor-ide/releases/tag/${FALLBACK_VERSION}`;

export async function GET() {
  try {
    const res = await fetch(
      "https://api.github.com/repos/idedigitalbr/gestor-ide/releases/latest",
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Gestor-IDE-Web",
        },
        next: { revalidate: 300 }, // Cache por 5 minutos
      }
    );

    if (!res.ok) {
      return NextResponse.json({
        version: FALLBACK_VERSION,
        name: FALLBACK_FILENAME,
        downloadUrl: FALLBACK_DOWNLOAD_URL,
        releaseUrl: FALLBACK_RELEASE_URL,
      });
    }

    const data = await res.json();
    const tag = data.tag_name || FALLBACK_VERSION;
    const assets = Array.isArray(data.assets) ? data.assets : [];

    // Priorizar o instalador OneClick para Windows
    const oneclickAsset = assets.find(
      (a: { name?: string; browser_download_url?: string }) =>
        typeof a.name === "string" &&
        a.name.toLowerCase().includes("oneclick") &&
        a.name.toLowerCase().endsWith(".exe")
    );

    // Fallback para qualquer .exe caso o oneclick com nome exato não seja encontrado
    const exeAsset =
      oneclickAsset ||
      assets.find(
        (a: { name?: string }) =>
          typeof a.name === "string" && a.name.toLowerCase().endsWith(".exe")
      );

    const downloadUrl = exeAsset?.browser_download_url || FALLBACK_DOWNLOAD_URL;
    const name = exeAsset?.name || FALLBACK_FILENAME;
    const releaseUrl = data.html_url || FALLBACK_RELEASE_URL;

    return NextResponse.json({
      version: tag,
      name,
      downloadUrl,
      releaseUrl,
      publishedAt: data.published_at,
    });
  } catch {
    return NextResponse.json({
      version: FALLBACK_VERSION,
      name: FALLBACK_FILENAME,
      downloadUrl: FALLBACK_DOWNLOAD_URL,
      releaseUrl: FALLBACK_RELEASE_URL,
    });
  }
}
