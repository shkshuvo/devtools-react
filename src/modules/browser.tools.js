import {
  tool,
  transform,
  modes,
  area,
  line,
  num,
  select,
  json,
  esc,
  rows,
} from "./fields.js";
const source = "<h1>Hello, DevTools!</h1>\n<style>h1 { color: teal; }</style>";
const file = (label, accept = "") => ({
  key: "file",
  type: "file",
  label,
  accept,
});
async function encodeImage(f, format, quality, max) {
  const bmp = await createImageBitmap(f);
  try {
    const ratio = Math.min(1, max / Math.max(bmp.width, bmp.height)),
      c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bmp.width * ratio));
    c.height = Math.max(1, Math.round(bmp.height * ratio));
    const ctx = c.getContext("2d");
    if (format === "jpeg") {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
    }
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    return { image: c.toDataURL("image/" + format, quality / 100) };
  } finally {
    bmp.close();
  }
}
const picture = (id, desc, formats) =>
  tool(
    id,
    desc,
    [
      file("Image", "image/*"),
      select("format", "Output format", formats),
      num("quality", "Quality (%)", 85, 1, 100),
      num("max", "Maximum dimension (px)", 2048, 1, 8192),
    ],
    (v) => encodeImage(v.file, v.format, v.quality, v.max),
  );
async function scriptPreview(input, ts) {
  if (ts) {
    const compiler = await import("typescript");
    input = compiler.transpileModule(input, {
      compilerOptions: { target: compiler.ScriptTarget.ES2022 },
    }).outputText;
  }
  const wrapper =
    'const out=document.querySelector("pre"); for(const k of ["log","info","warn","error"]){console[k]=(...args)=>out.textContent+=args.map(v=>typeof v==="object"?JSON.stringify(v):String(v)).join(" ")+"\\n";}window.onerror=m=>{out.textContent+=m;};';
  return {
    script: true,
    html:
      '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;unsafe-inline&#39;; style-src &#39;unsafe-inline&#39;"><pre></pre><script>' +
      wrapper +
      "</script><script>" +
      input.replace(/<\/script/gi, "<\\/script") +
      "</script>",
  };
}
export default [
  tool(
    "html-editor",
    "Preview HTML and CSS inside an isolated frame.",
    [area("input", "HTML and CSS", source)],
    ({ input }) => ({
      html:
        '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; img-src data: blob:;">' +
        input,
    }),
  ),
  tool(
    "javascript-playground",
    "Run JavaScript and inspect console output in a sandbox.",
    [area("input", "JavaScript", 'console.log("Hello, DevTools!")')],
    ({ input }) => scriptPreview(input, false),
  ),
  tool(
    "typescript-playground",
    "Compile TypeScript and inspect console output in a sandbox.",
    [
      area(
        "input",
        "TypeScript",
        'const message: string = "Hello!";\nconsole.log(message);',
      ),
    ],
    ({ input }) => scriptPreview(input, true),
  ),
  transform(
    "typescript-to-javascript-converter",
    "Transpile TypeScript to JavaScript.",
    "const count: number = 5;",
    async (s) => {
      const ts = await import("typescript");
      return ts.transpileModule(s, {
        compilerOptions: { target: ts.ScriptTarget.ES2022 },
      }).outputText;
    },
  ),
  transform(
    "url-parser",
    "Inspect a URL and its query parameters.",
    "https://example.com/tools?sort=name#list",
    (s) => {
      const u = new URL(s);
      return json({
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port,
        path: u.pathname,
        query: [...u.searchParams],
        fragment: u.hash,
      });
    },
  ),
  tool(
    "utm-builder",
    "Build a campaign URL.",
    [
      line("url", "URL", "https://example.com"),
      line("source", "Source", "newsletter"),
      line("medium", "Medium", "email"),
      line("campaign", "Campaign", "launch"),
    ],
    (v) => {
      const u = new URL(v.url);
      for (const k of ["source", "medium", "campaign"])
        u.searchParams.set("utm_" + k, v[k]);
      return u.toString();
    },
  ),
  transform(
    "http-header-parser",
    "Read header names and values.",
    "Content-Type: application/json\nAccept: */*",
    (s) =>
      json(
        rows(s)
          .filter(Boolean)
          .map((l) => {
            const i = l.indexOf(":");
            if (i < 1) throw Error("Expected a header name and colon.");
            return { name: l.slice(0, i).trim(), value: l.slice(i + 1).trim() };
          }),
      ),
  ),
  transform(
    "ipv6-expander",
    "Expand an IPv6 address into full notation.",
    "2001:db8::1",
    async (s) => {
      const { default: ip } = await import("ipaddr.js");
      if (!ip.IPv6.isValid(s)) throw Error("Enter an IPv6 address.");
      return ip.IPv6.parse(s).toFixedLengthString();
    },
  ),
  transform(
    "subnet-calculator",
    "Calculate an IPv4 network, broadcast address and netmask.",
    "192.168.1.50/24",
    async (s) => {
      const { default: ip } = await import("ipaddr.js");
      const [, prefix] = ip.IPv4.parseCIDR(s);
      return json({
        network: ip.IPv4.networkAddressFromCIDR(s).toString(),
        broadcast: ip.IPv4.broadcastAddressFromCIDR(s).toString(),
        mask: ip.IPv4.subnetMaskFromPrefixLength(prefix).toString(),
        addresses: 2 ** (32 - prefix),
      });
    },
  ),
  modes(
    "timestamp-converter",
    "Convert Unix seconds or an ISO date-time.",
    "1700000000",
    {
      "Seconds to ISO": (s) => new Date(Number(s) * 1000).toISOString(),
      "ISO to seconds": (s) => {
        const ms = Date.parse(s);
        if (!Number.isFinite(ms)) throw Error("Invalid date.");
        return Math.floor(ms / 1000);
      },
    },
  ),
  tool(
    "timezone-converter",
    "Display the same instant in another time zone.",
    [
      line("input", "ISO time with UTC offset", "2026-01-01T12:00:00Z"),
      line("zone", "IANA time zone", "Asia/Dhaka"),
    ],
    ({ input, zone }) =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone: zone,
        dateStyle: "full",
        timeStyle: "long",
      }).format(new Date(input)),
  ),
  tool(
    "device-information",
    "Read browser, display and language information.",
    [],
    () =>
      json({
        browser: navigator.userAgent,
        language: navigator.language,
        screen: [screen.width, screen.height],
        devicePixelRatio,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        logicalProcessors: navigator.hardwareConcurrency,
      }),
  ),
  tool("network-info", "Show network hints exposed by this browser.", [], () =>
    json({
      online: navigator.onLine,
      type: navigator.connection?.effectiveType ?? "Unavailable",
      downlinkMbps: navigator.connection?.downlink ?? "Unavailable",
      rttMs: navigator.connection?.rtt ?? "Unavailable",
    }),
  ),
  picture("png-to-jpg", "Convert an image to JPEG with a white background.", [
    "jpeg",
  ]),
  picture("webp-to-png", "Convert WebP and other browser images to PNG.", [
    "png",
  ]),
  picture("image-format-converter", "Convert among PNG, JPEG and WebP.", [
    "png",
    "jpeg",
    "webp",
  ]),
  picture("image-compressor", "Resize and re-encode an image locally.", [
    "webp",
    "jpeg",
  ]),
  tool(
    "base64-image-encoder",
    "Read an image as a Base64 data URL.",
    [file("Image", "image/*")],
    ({ file }) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(Error("Cannot read file"));
        reader.readAsDataURL(file);
      }),
  ),
  tool(
    "checksum-calculator",
    "Calculate a file SHA-256 checksum.",
    [file("File")],
    async ({ file }) =>
      [
        ...new Uint8Array(
          await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
        ),
      ]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join(""),
  ),
  tool(
    "hyperlink-generator",
    "Build an escaped hyperlink.",
    [
      line("url", "URL", "https://example.com"),
      line("text", "Text", "Example"),
    ],
    (v) => '<a href="' + esc(new URL(v.url).href) + '">' + esc(v.text) + "</a>",
  ),
  transform(
    "sitemap-xml-generator",
    "Generate sitemap XML from absolute URLs.",
    "https://example.com/\nhttps://example.com/about",
    (s) =>
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      rows(s.trim())
        .map((x) => "  <url><loc>" + esc(new URL(x).href) + "</loc></url>")
        .join("\n") +
      "\n</urlset>",
  ),
  tool(
    "robots-txt-generator",
    "Build crawler directives for your website.",
    [
      line("agent", "User agent", "*"),
      area("paths", "One disallowed path per line", "/private/"),
      line("map", "Sitemap URL", "https://example.com/sitemap.xml"),
    ],
    (v) =>
      "User-agent: " +
      v.agent +
      "\n" +
      rows(v.paths)
        .map((x) => "Disallow: " + x)
        .join("\n") +
      "\nSitemap: " +
      v.map,
  ),
  tool(
    "pwa-manifest-generator",
    "Generate an editable web app manifest.",
    [
      line("name", "App name", "DevTools"),
      line("short", "Short name", "Tools"),
      line("start", "Start URL", "/"),
    ],
    (v) =>
      json({
        name: v.name,
        short_name: v.short,
        start_url: v.start,
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#10766f",
      }),
  ),
  tool(
    "git-commit-builder",
    "Compose a conventional commit subject.",
    [
      select("type", "Type", [
        "feat",
        "fix",
        "docs",
        "refactor",
        "test",
        "chore",
      ]),
      line("scope", "Scope", "tools"),
      line("message", "Summary", "add a new converter"),
    ],
    (v) => v.type + (v.scope ? "(" + v.scope + ")" : "") + ": " + v.message,
  ),
  transform(
    "chmod-calculator",
    "Convert numeric Unix permissions to symbolic notation.",
    "755",
    (s) => {
      if (!/^[0-7]{3}$/.test(s)) throw Error("Enter three octal digits.");
      return [...s]
        .map((n) =>
          [4, 2, 1].map((bit, i) => (n & bit ? "rwx"[i] : "-")).join(""),
        )
        .join("");
    },
  ),
];
