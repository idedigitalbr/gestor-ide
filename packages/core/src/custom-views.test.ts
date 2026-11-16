import { describe, expect, it } from "bun:test";
import {
  getDefaultProjectViews,
  isSafeHttpsUrl,
  sanitizeExternalUrl,
  PREDEFINED_VIEW_IDS,
} from "./index";

describe("Custom Project Views - Core Helpers", () => {
  it("generates default predefined views for a project in order", () => {
    const views = getDefaultProjectViews("proj-123");
    expect(views).toHaveLength(2);

    const [gdrive, chatgpt] = views;
    expect(gdrive.id).toBe(`${PREDEFINED_VIEW_IDS.GDRIVE}_proj-123`);
    expect(gdrive.name).toBe("Arquivos & Documentos");
    expect(gdrive.icon).toBe("Folder");
    expect(gdrive.openMode).toBe("new_tab");
    expect(gdrive.type).toBe("predefined");
    expect(gdrive.order).toBe(0);

    expect(chatgpt.id).toBe(`${PREDEFINED_VIEW_IDS.CHATGPT}_proj-123`);
    expect(chatgpt.name).toBe("IA");
    expect(chatgpt.icon).toBe("Sparkles");
    expect(chatgpt.openMode).toBe("new_tab");
    expect(chatgpt.type).toBe("predefined");
    expect(chatgpt.order).toBe(1);
  });

  it("validates https URLs correctly and rejects insecure schemes", () => {
    expect(isSafeHttpsUrl("https://figma.com/file/123")).toBe(true);
    expect(isSafeHttpsUrl("https://chatgpt.com/g/p-123")).toBe(true);
    expect(isSafeHttpsUrl("http://insecure.com")).toBe(false);
    expect(isSafeHttpsUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpsUrl("data:text/html;base64,PHNjcmlwdD4=")).toBe(false);
    expect(isSafeHttpsUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeHttpsUrl("")).toBe(false);
  });

  it("sanitizes URLs and prepends https when missing", () => {
    expect(sanitizeExternalUrl("figma.com/file/123")).toBe("https://figma.com/file/123");
    expect(sanitizeExternalUrl("https://drive.google.com/drive/folders/abc")).toBe(
      "https://drive.google.com/drive/folders/abc"
    );
    expect(sanitizeExternalUrl("javascript:evil()")).toBe("");
    expect(sanitizeExternalUrl("data:image/svg+xml,...")).toBe("");
  });
});
