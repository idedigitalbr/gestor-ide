import type { FrameEmbedCheckResult } from "@gestor-ide/core";

/**
 * Verifica se um endereço IP ou hostname pertence a redes privadas/locais (Prevenção SSRF).
 */
export function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();

  // Hostnames locais e internos
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "[::1]" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".lan") ||
    host.endsWith(".home") ||
    host.endsWith(".corp")
  ) {
    return true;
  }

  // Verificação IPv4
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = host.match(ipv4Regex);
  if (match) {
    const [, o1, o2, o3, o4] = match.map(Number);
    if (o1 > 255 || o2 > 255 || o3 > 255 || o4 > 255) return true;

    // 127.0.0.0/8 (Loopback)
    if (o1 === 127) return true;
    // 10.0.0.0/8 (Privado)
    if (o1 === 10) return true;
    // 172.16.0.0/12 (Privado 172.16.0.0 - 172.31.255.255)
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;
    // 192.168.0.0/16 (Privado)
    if (o1 === 192 && o2 === 168) return true;
    // 169.254.0.0/16 (Link-local & AWS/Cloud Metadata 169.254.169.254)
    if (o1 === 169 && o2 === 254) return true;
    // 0.0.0.0/8
    if (o1 === 0) return true;
  }

  return false;
}

/**
 * Analisa cabeçalhos HTTP (X-Frame-Options e CSP frame-ancestors) de uma resposta
 * para determinar se a incorporação por iframe é permitida.
 */
export function evaluateFrameHeaders(
  headers: Headers,
  url: string,
  statusCode = 200
): FrameEmbedCheckResult {
  const xFrameOptions = headers.get("x-frame-options")?.trim() || null;
  const csp = headers.get("content-security-policy")?.toLowerCase() || null;

  // 1. Verificação de X-Frame-Options
  if (xFrameOptions) {
    const xfoLower = xFrameOptions.toLowerCase();
    if (xfoLower.includes("deny")) {
      return {
        canEmbed: false,
        status: "blocked",
        reason: "O site bloqueia incorporação através do cabeçalho X-Frame-Options: DENY.",
        suggestedMode: "new_tab",
        details: { xFrameOptions, cspFrameAncestors: null, httpStatus: statusCode },
      };
    }
    if (xfoLower.includes("sameorigin")) {
      return {
        canEmbed: false,
        status: "blocked",
        reason: "O site restringe exibição à mesma origem (X-Frame-Options: SAMEORIGIN).",
        suggestedMode: "new_tab",
        details: { xFrameOptions, cspFrameAncestors: null, httpStatus: statusCode },
      };
    }
    if (xfoLower.includes("allow-from")) {
      return {
        canEmbed: false,
        status: "blocked",
        reason: "O site restringe exibição a origens específicas (X-Frame-Options: ALLOW-FROM).",
        suggestedMode: "new_tab",
        details: { xFrameOptions, cspFrameAncestors: null, httpStatus: statusCode },
      };
    }
  }

  // 2. Verificação de CSP (Content-Security-Policy) frame-ancestors
  if (csp && csp.includes("frame-ancestors")) {
    const directives = csp.split(";").map((d) => d.trim());
    const frameAncestors = directives.find((d) => d.startsWith("frame-ancestors"));

    if (frameAncestors) {
      if (frameAncestors.includes("'none'")) {
        return {
          canEmbed: false,
          status: "blocked",
          reason: "A política CSP (frame-ancestors 'none') proíbe incorporação em qualquer página.",
          suggestedMode: "new_tab",
          details: { xFrameOptions, cspFrameAncestors: frameAncestors, httpStatus: statusCode },
        };
      }
      if (frameAncestors.includes("'self'") && !frameAncestors.includes("*")) {
        return {
          canEmbed: false,
          status: "blocked",
          reason: "A política CSP (frame-ancestors 'self') restringe incorporação ao próprio domínio.",
          suggestedMode: "new_tab",
          details: { xFrameOptions, cspFrameAncestors: frameAncestors, httpStatus: statusCode },
        };
      }
    }
  }

  // 3. Casos conhecidos de grandes plataformas
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host.includes("drive.google.com") || host.includes("docs.google.com")) {
      // Pastas e painéis normais do Drive bloqueiam iframe
      if (!parsed.pathname.includes("/embeddedfolderview") && !parsed.pathname.includes("/preview")) {
        return {
          canEmbed: false,
          status: "blocked",
          reason: "O Google Drive bloqueia incorporação de pastas padrão. Abertura direta em nova guia recomendada.",
          suggestedMode: "new_tab",
          details: { xFrameOptions: "SAMEORIGIN (esperado)", httpStatus: statusCode },
        };
      }
    }
    if (host.includes("chatgpt.com") || host.includes("chat.openai.com")) {
      return {
        canEmbed: false,
        status: "blocked",
        reason: "O ChatGPT restringe a exibição de seus projetos e conversas em iframes de terceiros.",
        suggestedMode: "new_tab",
        details: { cspFrameAncestors: "frame-ancestors 'none' (esperado)", httpStatus: statusCode },
      };
    }
  } catch {
    // URL inválida tratada antes
  }

  // Se nenhum cabeçalho proibitivo foi emitido
  return {
    canEmbed: true,
    status: "compatible",
    reason: "Os cabeçalhos HTTP do site permitem a tentativa de incorporação.",
    suggestedMode: "embed",
    details: { xFrameOptions, cspFrameAncestors: null, httpStatus: statusCode },
  };
}

/**
 * Realiza requisição segura ao servidor de destino para checar políticas HTTP.
 */
export async function checkUrlFrameCompatibility(targetUrl: string): Promise<FrameEmbedCheckResult> {
  if (!targetUrl || typeof targetUrl !== "string") {
    return {
      canEmbed: false,
      status: "blocked",
      reason: "URL inválida ou ausente.",
      suggestedMode: "new_tab",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl.trim());
  } catch {
    return {
      canEmbed: false,
      status: "blocked",
      reason: "Endereço URL inválido.",
      suggestedMode: "new_tab",
    };
  }

  // Apenas conexões HTTPS são aceitas
  if (parsed.protocol !== "https:") {
    return {
      canEmbed: false,
      status: "blocked",
      reason: "Apenas conexões seguras HTTPS são aceitas para incorporação.",
      suggestedMode: "new_tab",
    };
  }

  // Proteção contra SSRF
  if (isPrivateOrLocalHost(parsed.hostname)) {
    return {
      canEmbed: false,
      status: "blocked",
      reason: "Endereços locais, privados ou internos não são permitidos por motivos de segurança.",
      suggestedMode: "new_tab",
    };
  }

  // Checagem de domínio conhecido que sempre bloqueia
  const host = parsed.hostname.toLowerCase();
  if (host.includes("drive.google.com") && !parsed.pathname.includes("/embeddedfolderview") && !parsed.pathname.includes("/preview")) {
    return {
      canEmbed: false,
      status: "blocked",
      reason: "O Google Drive bloqueia incorporação de pastas padrão. Aberto diretamente em nova guia.",
      suggestedMode: "new_tab",
      details: { xFrameOptions: "SAMEORIGIN" },
    };
  }
  if (host.includes("chatgpt.com") || host.includes("chat.openai.com")) {
    return {
      canEmbed: false,
      status: "blocked",
      reason: "O ChatGPT proíbe incorporação em iframes externos por política de segurança.",
      suggestedMode: "new_tab",
      details: { cspFrameAncestors: "frame-ancestors 'none'" },
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    // Tenta HEAD primeiro
    let response: Response;
    try {
      response = await fetch(parsed.toString(), {
        method: "HEAD",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: controller.signal,
        redirect: "follow",
      });
    } catch {
      // Se HEAD falhar (muitos servidores rejeitam com 405 ou rede), tenta GET
      response = await fetch(parsed.toString(), {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          Range: "bytes=0-1024",
        },
        signal: controller.signal,
        redirect: "follow",
      });
    }

    clearTimeout(timeoutId);
    return evaluateFrameHeaders(response.headers, parsed.toString(), response.status);
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    return {
      canEmbed: false,
      status: "unknown",
      reason:
        (err instanceof Error ? err.name : "") === "AbortError"
          ? "Tempo limite esgotado ao verificar os cabeçalhos. Modo recomendado: Nova guia."
          : "Não foi possível verificar os cabeçalhos do site com segurança. Modo padrão: Nova guia.",
      suggestedMode: "new_tab",
    };
  }
}
