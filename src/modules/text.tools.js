import {
  tool,
  transform,
  modes,
  area,
  num,
  line,
  json,
  rows,
  bytes64,
} from "./fields.js";
const sample = "Good tools make everyday work easier.";
const words = (s) =>
  s.trim().match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? [];
const counts = (s) => {
  const w = words(s);
  return json({
    words: w.length,
    characters: [...s].length,
    lines: s ? rows(s).length : 0,
    uniqueWords: new Set(w.map((v) => v.toLowerCase())).size,
    readingMinutes: w.length ? Math.ceil(w.length / 200) : 0,
  });
};
const slug = (s) =>
  s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
async function md(s) {
  const { marked } = await import("marked");
  const { default: purifier } = await import("dompurify");
  return purifier.sanitize(await marked.parse(s));
}
export default [
  transform(
    "word-counter",
    "Count words, characters, lines and reading time.",
    sample,
    counts,
  ),
  transform(
    "text-statistics",
    "Inspect word and character statistics.",
    sample,
    counts,
  ),
  modes(
    "case-converter",
    "Change text capitalization and identifier style.",
    sample,
    {
      Uppercase: (s) => s.toUpperCase(),
      Lowercase: (s) => s.toLowerCase(),
      "Title case": (s) =>
        s.toLowerCase().replace(/(^|\s)\p{L}/gu, (v) => v.toUpperCase()),
      snake_case: (s) => slug(s).replaceAll("-", "_"),
      "kebab-case": slug,
      camelCase: (s) => slug(s).replace(/-(.)/gu, (_, c) => c.toUpperCase()),
    },
  ),
  transform(
    "slug-generator",
    "Create a Unicode-friendly URL slug.",
    sample,
    slug,
  ),
  transform(
    "character-frequency",
    "Count each Unicode code point.",
    sample,
    (s) => {
      const counts = new Map();
      for (const char of s) counts.set(char, (counts.get(char) ?? 0) + 1);
      return json(
        [...counts]
          .map(([char, count]) => ({ char, count }))
          .sort((a, b) => b.count - a.count),
      );
    },
  ),
  transform(
    "unicode-inspector",
    "Inspect Unicode code points.",
    "A বাংলা 🌍",
    (s) =>
      [...s]
        .map(
          (c) =>
            c +
            "   U+" +
            c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0"),
        )
        .join("\n"),
  ),
  modes("string-escape", "Escape and unescape JSON string literals.", sample, {
    Escape: JSON.stringify,
    Unescape: JSON.parse,
  }),
  modes(
    "binary-text-translator",
    "Convert UTF-8 text to binary bytes.",
    "Hello",
    {
      Encode: (s) =>
        [...new TextEncoder().encode(s)]
          .map((x) => x.toString(2).padStart(8, "0"))
          .join(" "),
      Decode: (s) => {
        const a = s.trim().split(/\s+/);
        if (a.some((x) => !/^([01]{8})$/.test(x)))
          throw Error("Enter 8-bit bytes separated by spaces.");
        return new TextDecoder("utf-8", { fatal: true }).decode(
          Uint8Array.from(a, (x) => parseInt(x, 2)),
        );
      },
    },
  ),
  transform(
    "rot13-cipher",
    "Apply the reversible ROT13 alphabet substitution.",
    sample,
    (s) =>
      s.replace(/[A-Za-z]/g, (c) => {
        const base = c < "a" ? 65 : 97;
        return String.fromCharCode(base + ((c.charCodeAt(0) - base + 13) % 26));
      }),
  ),
  tool(
    "find-and-replace",
    "Replace every literal occurrence.",
    [
      area("input", "Text", sample),
      line("find", "Find", "tools"),
      line("replacement", "Replacement", "ideas"),
    ],
    ({ input, find, replacement }) => {
      if (!find) throw Error("Enter a search term.");
      return input.split(find).join(replacement);
    },
  ),
  modes("text-cleaner", "Clean up spacing or sort lines.", sample, {
    "Trim lines": (s) =>
      rows(s)
        .map((x) => x.trim())
        .join("\n"),
    "Collapse whitespace": (s) => s.trim().replace(/\s+/g, " "),
    "Remove blank lines": (s) =>
      rows(s)
        .filter((x) => x.trim())
        .join("\n"),
    "Sort lines": (s) =>
      rows(s)
        .sort((a, b) => a.localeCompare(b))
        .join("\n"),
  }),
  tool(
    "anagram-palindrome-analyzer",
    "Check a palindrome or compare two phrases as anagrams.",
    [line("a", "First phrase", "Listen"), line("b", "Second phrase", "Silent")],
    ({ a, b }) => {
      const norm = (s) => words(s.toLowerCase()).join(""),
        sort = (s) => [...norm(s)].sort().join("");
      return json({
        anagrams: sort(a) === sort(b),
        firstIsPalindrome: norm(a) === [...norm(a)].reverse().join(""),
      });
    },
  ),
  transform(
    "numeronym-generator",
    "Shorten long words using their interior letter count.",
    "internationalization localization",
    (s) =>
      s.replace(/\p{L}{4,}/gu, (w) => {
        const a = [...w];
        return a[0] + (a.length - 2) + a.at(-1);
      }),
  ),
  transform(
    "markdown-to-html-converter",
    "Generate sanitized HTML from Markdown.",
    "# Hello\n\n**Bold** text.",
    md,
  ),
  transform(
    "markdown-previewer",
    "Render Markdown in an isolated preview.",
    "# Hello\n\n- First item\n- Second item",
    async (s) => ({ html: await md(s) }),
  ),
  transform(
    "markdown-to-plain-text",
    "Extract the readable text from Markdown.",
    "# Hello\n\n**Bold** text.",
    async (s) => {
      const t = document.createElement("template");
      t.innerHTML = await md(s);
      return t.content.textContent;
    },
  ),
  tool(
    "text-chunker",
    "Split text by Unicode character count with optional overlap.",
    [
      area("input", "Text", sample),
      num("size", "Characters per chunk", 20, 1, 100000),
      num("overlap", "Overlap", 4, 0, 99999),
    ],
    ({ input, size, overlap }) => {
      if (overlap >= size)
        throw Error("Overlap must be smaller than the chunk.");
      const chars = [...input],
        chunks = [];
      for (let i = 0; i < chars.length; i += size - overlap) {
        chunks.push(chars.slice(i, i + size).join(""));
        if (i + size >= chars.length) break;
      }
      return json(chunks);
    },
  ),
  tool(
    "prompt-template-builder",
    "Fill {{variables}} from a JSON object.",
    [
      area("input", "Template", "Explain {{topic}} in {{language}}."),
      area("vars", "Variables", '{"topic":"React","language":"Bangla"}'),
    ],
    ({ input, vars }) => {
      const values = JSON.parse(vars);
      return input.replace(/{{\s*([\w.-]+)\s*}}/g, (_, k) => {
        if (!Object.hasOwn(values, k)) throw Error("Missing variable " + k);
        return String(values[k]);
      });
    },
  ),
  transform(
    "finetune-jsonl-validator",
    "Check chat-training JSONL messages.",
    '{"messages":[{"role":"user","content":"Hello"},{"role":"assistant","content":"Hi"}]}',
    (s) => {
      const lines = rows(s.trim());
      lines.forEach((v, i) => {
        const m = JSON.parse(v).messages;
        if (
          !Array.isArray(m) ||
          !m.length ||
          !m.every(
            (x) =>
              ["system", "user", "assistant"].includes(x.role) &&
              typeof x.content === "string",
          ) ||
          !m.some((x) => x.role === "assistant")
        )
          throw Error("Check messages on line " + (i + 1));
      });
      return lines.length + " valid chat records";
    },
  ),
  transform(
    "system-prompt-compressor",
    "Remove blank lines and redundant horizontal spaces.",
    sample,
    (s) =>
      rows(s)
        .map((x) => x.trim().replace(/[ \t]+/g, " "))
        .filter(Boolean)
        .join("\n"),
  ),
];
