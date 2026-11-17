import { NextResponse } from "next/server";

export interface PlatformReleaseInfo {
  os: "windows" | "mac" | "linux" | "android";
  name: string;
  downloadUrl: string;
  version: string;
  available: boolean;
  label: string;
  badge: string;
  sublabel: string;
}

const FALLBACK_VERSION = "v0.1.7";
const RELEASES_PAGE_URL = "https://github.com/idedigitalbr/gestor-ide/releases";

interface GitHubAsset {
  name?: string;
  browser_download_url?: string;
}

interface GitHubRelease {
  tag_name?: string;
  html_url?: string;
  published_at?: string;
  assets?: GitHubAsset[];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedPlatform = (url.searchParams.get("platform") || "").toLowerCase();

  try {
    const res = await fetch(
      "https://api.github.com/repos/idedigitalbr/gestor-ide/releases",
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Gestor-IDE-Web",
        },
        next: { revalidate: 300 }, // Cache por 5 minutos
      }
    );

    if (res.ok) {
      const releases = (await res.json()) as GitHubRelease[];
      if (Array.isArray(releases) && releases.length > 0) {
        const latestRelease = releases[0];
        const latestTag = latestRelease.tag_name || FALLBACK_VERSION;
        const releaseUrl = latestRelease.html_url || `${RELEASES_PAGE_URL}/tag/${latestTag}`;

        // Helper para vasculhar os releases mais recentes pelo asset correspondente
        const findAsset = (
          predicate: (name: string) => boolean
        ): { asset: GitHubAsset; tag: string } | null => {
          for (const r of releases) {
            const found = r.assets?.find(
              (a) => typeof a.name === "string" && predicate(a.name.toLowerCase())
            );
            if (found && found.browser_download_url) {
              return { asset: found, tag: r.tag_name || latestTag };
            }
          }
          return null;
        };

        // 1. Windows: OneClick .exe ou qualquer instalador .exe
        const winResult =
          findAsset((n) => n.includes("oneclick") && n.endsWith(".exe")) ||
          findAsset((n) => n.endsWith(".exe") || n.endsWith(".msi"));

        // 2. macOS: .dmg Universal ou .app.tar.gz
        const macResult =
          findAsset((n) => n.endsWith(".dmg")) ||
          findAsset((n) => n.endsWith(".app.tar.gz") || n.endsWith(".zip"));

        // 3. Linux: .AppImage ou .deb ou .rpm
        const linuxResult =
          findAsset((n) => n.endsWith(".appimage")) ||
          findAsset((n) => n.endsWith(".deb") || n.endsWith(".rpm"));

        // 4. Android: .apk
        const androidResult = findAsset((n) => n.endsWith(".apk"));

        const platforms: Record<string, PlatformReleaseInfo> = {
          windows: {
            os: "windows",
            name: winResult?.asset.name || `instalador-ide-gestor-${latestTag}-oneclick.exe`,
            downloadUrl:
              winResult?.asset.browser_download_url ||
              `https://github.com/idedigitalbr/gestor-ide/releases/download/${latestTag}/instalador-ide-gestor-${latestTag}-oneclick.exe`,
            version: winResult?.tag || latestTag,
            available: true,
            label: "Baixar para Windows (OneClick)",
            badge: "Windows 10/11 x64",
            sublabel: "Instalação em 1 clique • ~45MB",
          },
          mac: {
            os: "mac",
            name: macResult?.asset.name || `IDE.Gestor_${latestTag}_universal.dmg`,
            downloadUrl:
              macResult?.asset.browser_download_url ||
              `https://github.com/idedigitalbr/gestor-ide/releases/download/v0.1.6/IDE.Gestor_0.1.6_universal.dmg`,
            version: macResult?.tag || "v0.1.6",
            available: true,
            label: "Baixar para macOS (.dmg)",
            badge: "Apple Silicon & Intel",
            sublabel: "Instalador Universal .dmg",
          },
          linux: {
            os: "linux",
            name: linuxResult?.asset.name || `IDE.Gestor_${latestTag}_amd64.AppImage`,
            downloadUrl:
              linuxResult?.asset.browser_download_url ||
              `https://github.com/idedigitalbr/gestor-ide/releases/download/${latestTag}/IDE.Gestor_${latestTag}_amd64.AppImage`,
            version: linuxResult?.tag || latestTag,
            available: true,
            label: "Baixar para Linux (.AppImage)",
            badge: "Linux x64 • AppImage / Deb",
            sublabel: "Executável Portátil ou .deb",
          },
          android: {
            os: "android",
            name: androidResult?.asset.name || "ide-gestor.apk",
            downloadUrl: androidResult?.asset.browser_download_url || releaseUrl,
            version: androidResult?.tag || latestTag,
            available: Boolean(androidResult),
            label: androidResult ? "Baixar para Android (.apk)" : "Versão Android (Em Breve)",
            badge: androidResult ? "Android 8.0+ Mobile" : "Em Compilação",
            sublabel: androidResult ? "Instalador Oficial APK" : "Build em andamento no GitHub",
          },
        };

        const activePlatformKey =
          requestedPlatform && platforms[requestedPlatform]
            ? requestedPlatform
            : "windows";

        const selectedPlatform = platforms[activePlatformKey];

        return NextResponse.json({
          version: latestTag,
          name: selectedPlatform.name,
          downloadUrl: selectedPlatform.downloadUrl,
          releaseUrl,
          platforms,
          publishedAt: latestRelease.published_at,
        });
      }
    }
  } catch {
    // Fallback gracioso
  }

  // Fallback estático caso a API do GitHub esteja inacessível
  const fallbackPlatforms: Record<string, PlatformReleaseInfo> = {
    windows: {
      os: "windows",
      name: `instalador-ide-gestor-${FALLBACK_VERSION}-oneclick.exe`,
      downloadUrl: `https://github.com/idedigitalbr/gestor-ide/releases/download/${FALLBACK_VERSION}/instalador-ide-gestor-${FALLBACK_VERSION}-oneclick.exe`,
      version: FALLBACK_VERSION,
      available: true,
      label: "Baixar para Windows (OneClick)",
      badge: "Windows 10/11 x64",
      sublabel: "Instalação em 1 clique • ~45MB",
    },
    mac: {
      os: "mac",
      name: "IDE.Gestor_0.1.6_universal.dmg",
      downloadUrl:
        "https://github.com/idedigitalbr/gestor-ide/releases/download/v0.1.6/IDE.Gestor_0.1.6_universal.dmg",
      version: "v0.1.6",
      available: true,
      label: "Baixar para macOS (.dmg)",
      badge: "Apple Silicon & Intel",
      sublabel: "Instalador Universal .dmg",
    },
    linux: {
      os: "linux",
      name: `IDE.Gestor_${FALLBACK_VERSION}_amd64.AppImage`,
      downloadUrl: `https://github.com/idedigitalbr/gestor-ide/releases/download/${FALLBACK_VERSION}/IDE.Gestor_${FALLBACK_VERSION}_amd64.AppImage`,
      version: FALLBACK_VERSION,
      available: true,
      label: "Baixar para Linux (.AppImage)",
      badge: "Linux x64 • AppImage / Deb",
      sublabel: "Executável Portátil ou .deb",
    },
    android: {
      os: "android",
      name: "ide-gestor.apk",
      downloadUrl: `${RELEASES_PAGE_URL}/latest`,
      version: FALLBACK_VERSION,
      available: false,
      label: "Versão Android (Em Breve)",
      badge: "Em Compilação",
      sublabel: "Build em andamento no GitHub",
    },
  };

  const activePlatform =
    requestedPlatform && fallbackPlatforms[requestedPlatform]
      ? fallbackPlatforms[requestedPlatform]
      : fallbackPlatforms.windows;

  return NextResponse.json({
    version: FALLBACK_VERSION,
    name: activePlatform.name,
    downloadUrl: activePlatform.downloadUrl,
    releaseUrl: `${RELEASES_PAGE_URL}/tag/${FALLBACK_VERSION}`,
    platforms: fallbackPlatforms,
  });
}
