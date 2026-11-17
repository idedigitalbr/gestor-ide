import { NextResponse } from "next/server";

const FALLBACK_VERSION = "v0.1.7";
const FALLBACK_FILENAME = "instalador-ide-gestor-v0.1.7-oneclick.exe";
const FALLBACK_DOWNLOAD_URL = `https://github.com/idedigitalbr/gestor-ide/releases/download/${FALLBACK_VERSION}/${FALLBACK_FILENAME}`;

export async function GET() {
  try {
    const res = await fetch(
      "https://api.github.com/repos/idedigitalbr/gestor-ide/releases/latest",
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Gestor-IDE-Web",
        },
        next: { revalidate: 300 },
      }
    );

    if (res.ok) {
      const data = await res.json();
      const assets = Array.isArray(data.assets) ? data.assets : [];
      const oneclickAsset = assets.find(
        (a: { name?: string; browser_download_url?: string }) =>
          typeof a.name === "string" &&
          a.name.toLowerCase().includes("oneclick") &&
          a.name.toLowerCase().endsWith(".exe")
      );
      const downloadUrl = oneclickAsset?.browser_download_url;
      if (downloadUrl) {
        return NextResponse.redirect(downloadUrl, 302);
      }
    }
  } catch {
    // Silently proceed to fallback
  }

  return NextResponse.redirect(FALLBACK_DOWNLOAD_URL, 302);
}
