import { describe, expect, it } from "bun:test";
import {
  evaluateFrameHeaders,
  isPrivateOrLocalHost,
} from "./frame-embed-checker";

describe("Frame Embed Checker & Security", () => {
  it("blocks SSRF targets: loopback, private ranges, metadata IPs and local hostnames", () => {
    expect(isPrivateOrLocalHost("localhost")).toBe(true);
    expect(isPrivateOrLocalHost("127.0.0.1")).toBe(true);
    expect(isPrivateOrLocalHost("10.0.0.5")).toBe(true);
    expect(isPrivateOrLocalHost("192.168.1.100")).toBe(true);
    expect(isPrivateOrLocalHost("172.16.0.1")).toBe(true);
    expect(isPrivateOrLocalHost("172.31.255.255")).toBe(true);
    expect(isPrivateOrLocalHost("169.254.169.254")).toBe(true);
    expect(isPrivateOrLocalHost("dev.internal")).toBe(true);
    expect(isPrivateOrLocalHost("printer.local")).toBe(true);

    expect(isPrivateOrLocalHost("figma.com")).toBe(false);
    expect(isPrivateOrLocalHost("suporteide.digital")).toBe(false);
    expect(isPrivateOrLocalHost("8.8.8.8")).toBe(false);
  });

  it("detects X-Frame-Options DENY and SAMEORIGIN as blocked", () => {
    const denyHeaders = new Headers({ "x-frame-options": "DENY" });
    const resDeny = evaluateFrameHeaders(denyHeaders, "https://example.com");
    expect(resDeny.canEmbed).toBe(false);
    expect(resDeny.status).toBe("blocked");
    expect(resDeny.suggestedMode).toBe("new_tab");

    const sameOriginHeaders = new Headers({ "x-frame-options": "SAMEORIGIN" });
    const resSame = evaluateFrameHeaders(sameOriginHeaders, "https://example.com");
    expect(resSame.canEmbed).toBe(false);
    expect(resSame.status).toBe("blocked");
  });

  it("detects CSP frame-ancestors 'none' and 'self' as blocked", () => {
    const cspHeaders = new Headers({
      "content-security-policy": "default-src 'self'; frame-ancestors 'none';",
    });
    const res = evaluateFrameHeaders(cspHeaders, "https://example.com");
    expect(res.canEmbed).toBe(false);
    expect(res.status).toBe("blocked");

    const cspSelfHeaders = new Headers({
      "content-security-policy": "frame-ancestors 'self'",
    });
    const resSelf = evaluateFrameHeaders(cspSelfHeaders, "https://example.com");
    expect(resSelf.canEmbed).toBe(false);
    expect(resSelf.status).toBe("blocked");
  });

  it("identifies Google Drive and ChatGPT standard URLs as blocked for iframe", () => {
    const cleanHeaders = new Headers();
    const driveRes = evaluateFrameHeaders(
      cleanHeaders,
      "https://drive.google.com/drive/folders/12345"
    );
    expect(driveRes.canEmbed).toBe(false);
    expect(driveRes.status).toBe("blocked");

    const chatRes = evaluateFrameHeaders(
      cleanHeaders,
      "https://chatgpt.com/g/p-1234-my-project"
    );
    expect(chatRes.canEmbed).toBe(false);
    expect(chatRes.status).toBe("blocked");
  });

  it("marks permissive headers as compatible", () => {
    const cleanHeaders = new Headers({ "content-type": "text/html" });
    const res = evaluateFrameHeaders(cleanHeaders, "https://open-dashboard.org");
    expect(res.canEmbed).toBe(true);
    expect(res.status).toBe("compatible");
    expect(res.suggestedMode).toBe("embed");
  });
});
