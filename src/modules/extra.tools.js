import {
  tool,
  transform,
  modes,
  num,
  select,
  area,
  line,
  json,
  esc,
  rows,
  integer,
  decode64,
  bytes64,
} from "./fields.js";
const xmlSample = "<note><to>Lima</to><message>Hello</message></note>";
async function formatXml(s) {
  const { XMLValidator, XMLBuilder, XMLParser } =
    await import("fast-xml-parser");
  const valid = XMLValidator.validate(s);
  if (valid !== true) throw Error(valid.err.msg);
  const options = {
    ignoreAttributes: false,
    preserveOrder: true,
    parseTagValue: false,
    trimValues: false,
    commentPropName: "#comment",
  };
  return new XMLBuilder({ ...options, format: true }).build(
    new XMLParser(options).parse(s),
  );
}
function schema(v) {
  if (v === null) return { type: "null" };
  if (Array.isArray(v))
    return {
      type: "array",
      ...(v.length
        ? {
            items: {
              anyOf: [
                ...new Map(
                  v.map((i) => [JSON.stringify(schema(i)), schema(i)]),
                ).values(),
              ],
            },
          }
        : {}),
    };
  if (typeof v === "object")
    return {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(v).map(([k, x]) => [k, schema(x)]),
      ),
      required: Object.keys(v),
    };
  return {
    type: typeof v === "number" && Number.isInteger(v) ? "integer" : typeof v,
  };
}
const letters = (s) =>
  s
    .normalize("NFKD")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "");
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  codes =
    ".- -... -.-. -.. . ..-. --. .... .. .--- -.- .-.. -- -. --- .--. --.- .-. ... - ..- ...- .-- -..- -.-- --.. ----- .---- ..--- ...-- ....- ..... -.... --... ---.. ----.".split(
      " ",
    );
async function regex(v) {
  const worker = new Worker(new URL("./regex.worker.js", import.meta.url), {
    type: "module",
  });
  return new Promise((resolve, reject) => {
    const done = (func, msg) => {
      clearTimeout(timeout);
      worker.terminate();
      func(msg);
    };
    const timeout = setTimeout(
      () => done(reject, Error("Expression exceeded the time limit.")),
      1500,
    );
    worker.onmessage = (e) =>
      e.data.error
        ? done(reject, Error(e.data.error))
        : done(resolve, e.data.output);
    worker.onerror = (e) => done(reject, Error(e.message));
    worker.postMessage(v);
  });
}
const textFile = (id, language, filename, lines) =>
  tool(
    id,
    "Generate a " + language + " starter for your chosen runtime.",
    [select("runtime", "Runtime", Object.keys(lines))],
    (v) => "# " + filename + "\n" + lines[v.runtime].join("\n"),
  );
export default [
  ...["xml-formatter", "wsdl-formatter", "soap-formatter"].map((id) =>
    transform(id, "Validate and indent XML content.", xmlSample, formatXml),
  ),
  transform(
    "json-schema-builder",
    "Infer a draft-07 JSON schema from sample data.",
    '{"name":"Lima","tags":["dev"]}',
    (s) =>
      json({
        $schema: "http://json-schema.org/draft-07/schema#",
        ...schema(JSON.parse(s)),
      }),
  ),
  transform(
    "toml-validator",
    "Parse TOML and inspect the data as JSON.",
    'title = "DevTools"',
    async (s) => json((await import("smol-toml")).parse(s)),
  ),
  transform(
    "toml-to-json-converter",
    "Convert TOML to JSON.",
    'title = "DevTools"',
    async (s) => json((await import("smol-toml")).parse(s)),
  ),
  transform(
    "yaml-to-toml",
    "Convert a YAML mapping into TOML.",
    "title: DevTools",
    async (s) =>
      (await import("smol-toml")).stringify((await import("yaml")).parse(s)),
  ),
  tool(
    "regexp-tester",
    "Match a regular expression against text in a time-limited worker.",
    [
      line("pattern", "Expression", "\\w+"),
      line("flags", "Flags", "g"),
      area("input", "Text", "Hello DevTools"),
    ],
    regex,
  ),
  tool(
    "bcrypt-generator",
    "Hash a password or verify a bcrypt hash locally.",
    [
      select("mode", "Mode", ["Hash", "Verify"]),
      line("password", "Password", "example"),
      line("hash", "Hash to verify", ""),
    ],
    async (v) => {
      const b = await import("bcryptjs");
      return v.mode === "Hash"
        ? b.hash(v.password, 10)
        : String(await b.compare(v.password, v.hash));
    },
  ),
  transform(
    "jwt-decoder",
    "Read the header and payload. Signature verification is separate.",
    "eyJhbGciOiJub25lIn0.eyJzdWIiOiJkZW1vIn0.",
    (s) => {
      const p = s.trim().split(".");
      if (p.length !== 3) throw Error("Expected three JWT segments.");
      const parse = (x) =>
        JSON.parse(decode64(x.replaceAll("-", "+").replaceAll("_", "/")));
      return json({
        header: parse(p[0]),
        payload: parse(p[1]),
        signatureVerified: false,
      });
    },
  ),
  modes(
    "morse-code-translator",
    "Translate letters and digits to Morse code.",
    "HELLO WORLD",
    {
      Encode: (s) =>
        letters(s)
          .split(/ +/)
          .map((w) => [...w].map((c) => codes[alphabet.indexOf(c)]).join(" "))
          .join(" / "),
      Decode: (s) =>
        s
          .trim()
          .split(/\s*\/\s*/)
          .map((w) =>
            w
              .split(/ +/)
              .map((v) => alphabet[codes.indexOf(v)] ?? "?")
              .join(""),
          )
          .join(" "),
    },
  ),
  tool(
    "lorem-generator",
    "Generate placeholder paragraphs.",
    [num("n", "Paragraphs", 3, 1, 100)],
    ({ n }) =>
      Array.from({ length: n }, () =>
        [
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
          "Donec vitae arcu in nibh luctus consequat.",
          "Sed commodo mauris quis justo posuere, at blandit lorem suscipit.",
        ].join(" "),
      ).join("\n\n"),
  ),
  tool(
    "roman-numeral-converter",
    "Convert an integer to Roman numerals.",
    [num("n", "Number", 2026, 1, 3999)],
    ({ n }) => {
      if (!Number.isInteger(n)) throw Error("Use a whole number.");
      let s = "";
      for (const [k, v] of [
        [1000, "M"],
        [900, "CM"],
        [500, "D"],
        [400, "CD"],
        [100, "C"],
        [90, "XC"],
        [50, "L"],
        [40, "XL"],
        [10, "X"],
        [9, "IX"],
        [5, "V"],
        [4, "IV"],
        [1, "I"],
      ])
        while (n >= k) {
          s += v;
          n -= k;
        }
      return s;
    },
  ),
  transform(
    "semver-calculator",
    "Inspect a version and calculate its next releases.",
    "1.6.4",
    async (s) => {
      const sem = await import("semver");
      if (!sem.valid(s)) throw Error("Invalid semantic version.");
      return json(
        Object.fromEntries(
          ["major", "minor", "patch", "prerelease"].map((k) => [
            k,
            sem.inc(s, k),
          ]),
        ),
      );
    },
  ),
  tool(
    "semver-range-intersection",
    "Test whether two semantic version ranges overlap.",
    [line("a", "Range A", "^1.2.0"), line("b", "Range B", ">=1.5.0 <2")],
    async (v) =>
      (await import("semver")).intersects(v.a, v.b)
        ? "Ranges intersect"
        : "No intersection",
  ),
  tool(
    "meta-tag-generator",
    "Generate title and description tags.",
    [
      line("title", "Page title", "Developer tools"),
      area("desc", "Description", "A collection of browser tools."),
    ],
    (v) =>
      "<title>" +
      esc(v.title) +
      '</title>\n<meta name="description" content="' +
      esc(v.desc) +
      '">',
  ),
  tool(
    "ssml-markup-builder",
    "Generate escaped speech markup.",
    [
      line("lang", "Language", "en-US"),
      area("input", "Speech text", "Hello world"),
    ],
    (v) =>
      '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="' +
      esc(v.lang) +
      '">' +
      esc(v.input) +
      "</speak>",
  ),
  tool(
    "email-signature-generator",
    "Generate an HTML email signature.",
    [
      line("name", "Name", "Alex"),
      line("role", "Role", "Developer"),
      line("email", "Email", "alex@example.com"),
    ],
    (v) =>
      "<p><strong>" +
      esc(v.name) +
      "</strong><br>" +
      esc(v.role) +
      '<br><a href="mailto:' +
      esc(v.email) +
      '">' +
      esc(v.email) +
      "</a></p>",
  ),
  textFile("gitignore-generator", "gitignore", ".gitignore", {
    Node: ["node_modules/", "dist/", "coverage/", ".env", "*.log"],
    Python: ["__pycache__/", "*.py[cod]", ".venv/", ".env"],
    Java: ["target/", "build/", "*.class", ".gradle/"],
    ".NET": ["bin/", "obj/", ".vs/", "*.user"],
  }),
  textFile("dockerfile-builder", "Dockerfile", "Dockerfile", {
    Node: [
      "FROM node:24-alpine",
      "WORKDIR /app",
      "COPY package*.json ./",
      "RUN npm ci --omit=dev",
      "COPY . .",
      "USER node",
      'CMD ["npm", "start"]',
    ],
    Python: [
      "FROM python:3.13-slim",
      "WORKDIR /app",
      "COPY requirements.txt .",
      "RUN pip install --no-cache-dir -r requirements.txt",
      "COPY . .",
      'CMD ["python", "app.py"]',
    ],
  }),
  tool(
    "vector-similarity-calculator",
    "Compare two numeric vectors.",
    [line("a", "Vector A", "1,2,3"), line("b", "Vector B", "3,2,1")],
    ({ a, b }) => {
      const parse = (s) =>
          s.split(",").map((x) => (x.trim() ? Number(x) : NaN)),
        x = parse(a),
        y = parse(b);
      if (x.length !== y.length || ![...x, ...y].every(Number.isFinite))
        throw Error("Use equal-length numeric vectors.");
      const dot = x.reduce((s, v, i) => s + v * y[i], 0),
        den = Math.hypot(...x) * Math.hypot(...y);
      return json({
        dotProduct: dot,
        cosine: den ? dot / den : null,
        euclidean: Math.hypot(...x.map((v, i) => v - y[i])),
      });
    },
  ),
  tool(
    "barcode-generator",
    "Generate a CODE128 barcode.",
    [line("input", "Barcode text", "DEVTOOLS-2026")],
    async ({ input }) => {
      const canvas = document.createElement("canvas");
      (await import("jsbarcode")).default(canvas, input, { format: "CODE128" });
      return { image: canvas.toDataURL() };
    },
  ),
  transform(
    "gzip-tools",
    "Compress UTF-8 text to Base64-encoded gzip.",
    "Hello DevTools",
    async (s) =>
      bytes64(
        new Uint8Array(
          await new Response(
            new Blob([s]).stream().pipeThrough(new CompressionStream("gzip")),
          ).arrayBuffer(),
        ),
      ),
  ),
  tool(
    "time-calculator",
    "Add or subtract a duration in minutes.",
    [line("time", "24-hour time", "09:30"), num("mins", "Minutes to add", 90)],
    (v) => {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v.time))
        throw Error("Expected HH:MM.");
      const [h, m] = v.time.split(":").map(Number),
        t = h * 60 + m + v.mins,
        d = Math.floor(t / 1440),
        n = ((t % 1440) + 1440) % 1440;
      return (
        String(Math.floor(n / 60)).padStart(2, "0") +
        ":" +
        String(n % 60).padStart(2, "0") +
        " (day offset " +
        d +
        ")"
      );
    },
  ),
];
