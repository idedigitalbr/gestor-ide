import { NextResponse } from "next/server";

const FALLBACK_VERSION = "v0.1.7";
const RELEASES_PAGE_URL = "https://github.com/idedigitalbr/gestor-ide/releases";

interface GitHubAsset {
  name?: string;
  browser_download_url?: string;
}

interface GitHubRelease {
  tag_name?: string;
  assets?: GitHubAsset[];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const platform = (url.searchParams.get("platform") || "windows").toLowerCase();

  try {
    const res = await fetch(
      "https://api.github.com/repos/idedigitalbr/gestor-ide/releases",
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Gestor-IDE-Web",
        },
        next: { revalidate: 300 },
      }
    );

    if (res.ok) {
      const releases = (await res.json()) as GitHubRelease[];
      if (Array.isArray(releases) && releases.length > 0) {
        const findDownloadUrl = (
          predicate: (name: string) => boolean
        ): string | null => {
          for (const r of releases) {
            const found = r.assets?.find(
              (a) =>
                typeof a.name === "string" &&
                predicate(a.name.toLowerCase()) &&
                a.browser_download_url
            );
            if (found && found.browser_download_url) {
              return found.browser_download_url;
            }
          }
          return null;
        };

        if (platform === "mac") {
          const macUrl =
            findDownloadUrl((n) => n.endsWith(".dmg")) ||
            findDownloadUrl((n) => n.endsWith(".app.tar.gz") || n.endsWith(".zip"));
          if (macUrl) return NextResponse.redirect(macUrl, 302);
        } else if (platform === "linux") {
          const linuxUrl =
            findDownloadUrl((n) => n.endsWith(".appimage")) ||
            findDownloadUrl((n) => n.endsWith(".deb") || n.endsWith(".rpm"));
          if (linuxUrl) return NextResponse.redirect(linuxUrl, 302);
        } else if (platform === "android") {
          const androidUrl = findDownloadUrl((n) => n.endsWith(".apk"));
          if (androidUrl) return NextResponse.redirect(androidUrl, 302);
          // Se o APK ainda não estiver disponível, redireciona para a página de releases
          return NextResponse.redirect(`${RELEASES_PAGE_URL}/latest`, 302);
        } else {
          // Padrão: Windows
          const winUrl =
            findDownloadUrl((n) => n.includes("oneclick") && n.endsWith(".exe")) ||
            findDownloadUrl((n) => n.endsWith(".exe") || n.endsWith(".msi"));
          if (winUrl) return NextResponse.redirect(winUrl, 302);
        }
      }
    }
  } catch {
    // Silently proceed to fallback
  }

  // Fallbacks estáticos caso a API do GitHub falhe
  if (platform === "mac") {
    return NextResponse.redirect(
      "https://github.com/idedigitalbr/gestor-ide/releases/download/v0.1.6/IDE.Gestor_0.1.6_universal.dmg",
      302
    );
  }
  if (platform === "linux") {
    return NextResponse.redirect(
      `https://github.com/idedigitalbr/gestor-ide/releases/download/${FALLBACK_VERSION}/IDE.Gestor_${FALLBACK_VERSION}_amd64.AppImage`,
      302
    );
  }
  if (platform === "android") {
    return NextResponse.redirect(`${RELEASES_PAGE_URL}/latest`, 302);
  }

  return NextResponse.redirect(
    `https://github.com/idedigitalbr/gestor-ide/releases/download/${FALLBACK_VERSION}/instalador-ide-gestor-${FALLBACK_VERSION}-oneclick.exe`,
    302
  );
}
