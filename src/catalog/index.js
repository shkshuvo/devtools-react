import reference from "./reference.json";
const files = import.meta.glob("../modules/*.tools.{js,jsx}", {
  eager: true,
  import: "default",
});
const implementations = new Map();
for (const entry of Object.values(files).flat()) {
  if (implementations.has(entry.id))
    throw Error("Duplicate module: " + entry.id);
  implementations.set(entry.id, entry);
}
export const origin = "https://www.devtools.tools";
export const groups = reference.map((group) => ({
  ...group,
  tools: group.tools.map((t) => ({
    ...t,
    category: group.id,
    ...implementations.get(t.id),
    local: implementations.has(t.id),
  })),
}));
for (const entry of implementations.values()) {
  if (groups.some((g) => g.tools.some((t) => t.id === entry.id))) continue;
  const group = groups.find((g) => g.id === entry.category);
  if (!group || !entry.name)
    throw Error(
      "New modules need a name and an existing category: " + entry.id,
    );
  group.tools.push({ ...entry, local: true });
}
export const tools = groups.flatMap((g) => g.tools);
export const byId = new Map(tools.map((t) => [t.id, t]));
export const localCount = tools.filter((t) => t.local).length;
export const feature = [
  "national-identity-generator",
  "tax-number-generator",
  "iban-generator",
  "tin-generator",
  "drivers-license-generator",
  "vat-validator",
];
export const devices = ["digital-compass", "screen-ruler", "decibel-meter"];
export const newest = [
  "bill-tracker",
  "pill-tracker",
  "javascript-playground",
  "typescript-playground",
  "dart-playground",
  "ruby-playground",
  "numerology-analyzer",
  "human-design-bodygraph",
  "biorhythm-calculator",
  "golden-blue-hour",
];
export const popular = [
  "json-formatter",
  "base64",
  "uuid-generator",
  "password-generator",
  "qr-code-generator",
  "diff-checker",
  "color-converter",
];
export const toolHref = (t) =>
  t.local ? "#/tool/" + encodeURIComponent(t.id) : origin + "/" + t.id;
