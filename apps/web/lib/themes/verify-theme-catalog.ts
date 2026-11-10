/**
 * Execute na raiz: bun run test:themes
 * Nenhum mock é adicionado ao produto: fixtures vivem somente neste script.
 */
import assert from "node:assert/strict";
import { DARK_THEMES } from "./presets-dark";
import { LIGHT_THEMES } from "./presets-light";
import {
  COLOR_FAMILIES, ORDERED_COLOR_FAMILIES, classifyTheme, matchesThemeSearch, filterThemes, availableColorFamilies,
} from "./theme-catalog";
import { validateThemeCatalog } from "./theme-validation";
import type { ThemeDefinition } from "@/types/theme";

const originals = [...DARK_THEMES, ...LIGHT_THEMES];
assert.equal(originals.length, 24, "Os 24 presets atuais devem ser preservados");
assert.equal(DARK_THEMES.length, 12);
assert.equal(LIGHT_THEMES.length, 12);
assert.equal(ORDERED_COLOR_FAMILIES.length, Object.keys(COLOR_FAMILIES).length);

const current = validateThemeCatalog(originals);
assert.deepEqual(current.errors, [], `Temas oficiais inválidos:\n${current.errors.join("\n")}`);

for (const theme of originals) {
  assert.equal(classifyTheme(theme).primary, theme.primaryColorFamily);
  assert.deepEqual(classifyTheme(theme).secondary, theme.secondaryColorFamilies);
  assert.ok(matchesThemeSearch(theme, theme.name));
  assert.ok(matchesThemeSearch(theme, COLOR_FAMILIES[theme.primaryColorFamily].name));
  assert.ok(matchesThemeSearch(theme, theme.searchKeywords?.split(" ")[0] ?? theme.name));
}

// Stress fixture: mais de 100 temas, sem reescrever o seletor nem mapear IDs.
const fixtures: ThemeDefinition[] = Array.from({ length: 120 }, (_, index) => {
  const source = originals[index % originals.length]!;
  return {
    ...source,
    id: `fixture-tema-${index + 1}`,
    name: `Tema de teste ${index + 1}`,
    searchKeywords: "teste escala fixture",
    tokens: { ...source.tokens },
  };
});
const expanded = [...originals, ...fixtures];
assert.equal(expanded.length, 144);
const mass = validateThemeCatalog(expanded);
assert.deepEqual(mass.errors, [], `Fixture de 120 temas falhou:\n${mass.errors.join("\n")}`);
assert.equal(filterThemes(expanded, "dark", null, "").length, 72);
assert.equal(filterThemes(expanded, "light", null, "").length, 72);
assert.equal(filterThemes(expanded, "dark", null, "fixture").length, 60);
assert.equal(filterThemes(expanded, "light", null, "fixture").length, 60);
const monochrome = filterThemes(expanded, "dark", "preto", "");
assert.ok(monochrome.length > 0);
assert.ok(monochrome.every((t) => t.primaryColorFamily === "preto"));
assert.ok(availableColorFamilies(expanded, "dark").includes("preto"));
assert.equal(expanded.filter((t) => matchesThemeSearch(t, "fixture")).length, 120);

// Falhas deliberadas: nunca aceitar tema sem ID exclusivo, família e tokens.
const sample = originals[0]!;
const badDuplicates = validateThemeCatalog([...originals, { ...sample }]);
assert.ok(badDuplicates.errors.some((e) => e.includes("ID duplicado")));
const badFamily = validateThemeCatalog([
  { ...sample, id: "test-family", primaryColorFamily: "cor-inexistente" as ThemeDefinition["primaryColorFamily"] },
]);
assert.ok(badFamily.errors.some((e) => e.includes("família primária inválida")));
const badToken = validateThemeCatalog([
  { ...sample, id: "test-token", tokens: { ...sample.tokens, background: "not-a-hex" } },
]);
assert.ok(badToken.errors.some((e) => e.includes("token background")));
const missingSecondary = validateThemeCatalog([
  { ...sample, id: "test-no-secondary", secondaryColorFamilies: [] },
]);
assert.ok(missingSecondary.errors.some((e) => e.includes("família secundária")));

console.log(`OK: ${originals.length} temas oficiais e 120 fixtures; IDs/famílias/tokens/busca validados.`);
console.log(`Avisos WCAG AA dos presets atuais (não mutados): ${current.contrastWarnings.length}.`);
for (const warning of current.contrastWarnings) console.log(`  - ${warning}`);
