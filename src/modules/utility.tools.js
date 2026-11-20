import {
  tool,
  transform,
  num,
  line,
  area,
  select,
  json,
  esc,
  rows,
  integer,
} from "./fields.js";
const date = {
  type: "date",
  key: "date",
  label: "Calendar date (UTC)",
  value: "2026-11-20",
};
const locationFields = [
  date,
  num("lat", "Latitude", 23.81, -90, 90),
  num("lon", "Longitude", 90.41, -180, 180),
];
function offset(v) {
  const match = /^(\d{2}):(\d{2})$/.exec(v);
  if (!match || +match[1] > 23 || +match[2] > 59)
    throw Error("Use a valid 24-hour HH:MM time.");
  return Number(match[1]) * 60 + Number(match[2]);
}
function hhmm(m) {
  const n = ((m % 1440) + 1440) % 1440;
  return (
    String(Math.floor(n / 60)).padStart(2, "0") +
    ":" +
    String(n % 60).padStart(2, "0")
  );
}
function sqlFields(input) {
  if (!/^[A-Za-z_]\w*(,\s*[A-Za-z_]\w*)*$/.test(input.trim()))
    throw Error("Use comma-separated SQL identifiers.");
  return input.split(",").map((x) => x.trim());
}
export default [
  tool(
    "golden-blue-hour",
    "Estimate sunrise, sunset and twilight for supplied coordinates and date.",
    locationFields,
    async ({ date, lat, lon }) => {
      const s = (await import("suncalc")).default;
      const noon = new Date(date + "T12:00:00Z");
      const t = s.getTimes(noon, lat, lon);
      return Object.entries({
        dawn: t.dawn,
        sunrise: t.sunrise,
        morningGoldenHourEnds: t.goldenHourEnd,
        eveningGoldenHourBegins: t.goldenHour,
        sunset: t.sunset,
        dusk: t.dusk,
      })
        .map(
          ([k, v]) =>
            k +
            " (UTC): " +
            (Number.isNaN(+v) ? "No event for this date" : v.toISOString()),
        )
        .join("\n");
    },
  ),
  tool(
    "intermittent-fasting-planner",
    "Calculate a daily eating window from your chosen schedule.",
    [
      line("start", "Eating window starts", "12:00"),
      num("fast", "Fasting hours", 16, 1, 23),
    ],
    (v) =>
      "Eating window: " +
      v.start +
      " – " +
      hhmm(offset(v.start) + (24 - v.fast) * 60),
  ),
  tool(
    "sleep-cycle-calculator",
    "Calculate bedtime options from a chosen wake time and cycle length.",
    [
      line("wake", "Wake time", "07:00"),
      num("cycle", "Assumed cycle (minutes)", 90, 30, 180),
      num("latency", "Time to fall asleep (minutes)", 15, 0, 120),
    ],
    (v) =>
      [4, 5, 6]
        .map(
          (n) =>
            n + " cycles: " + hhmm(offset(v.wake) - n * v.cycle - v.latency),
        )
        .join("\n"),
  ),
  tool(
    "structured-data-generator",
    "Create JSON-LD for a website or organization.",
    [
      select("type", "Schema.org type", ["WebSite", "Organization", "Person"]),
      line("name", "Name", "Example Tools"),
      line("url", "URL", "https://example.com"),
    ],
    (v) =>
      json({
        "@context": "https://schema.org",
        "@type": v.type,
        name: v.name,
        url: new URL(v.url).href,
      }),
  ),
  tool(
    "rss-feed-generator",
    "Create a minimal RSS 2.0 feed.",
    [
      line("title", "Feed title", "Project news"),
      line("url", "Site URL", "https://example.com"),
      area(
        "items",
        "One title and absolute URL per line, separated by |",
        "First release | https://example.com/release",
      ),
    ],
    (v) =>
      '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>' +
      esc(v.title) +
      "</title><link>" +
      esc(new URL(v.url).href) +
      "</link><description>" +
      esc(v.title) +
      "</description>\n" +
      rows(v.items)
        .map((r) => {
          const [name, url] = r.split("|");
          return (
            "<item><title>" +
            esc(name.trim()) +
            "</title><link>" +
            esc(new URL(url?.trim()).href) +
            "</link></item>"
          );
        })
        .join("\n") +
      "\n</channel></rss>",
  ),
  tool(
    "flexbox-playground",
    "Preview the effect of flexbox layout settings.",
    [
      select("direction", "Direction", [
        "row",
        "column",
        "row-reverse",
        "column-reverse",
      ]),
      select("justify", "Justify content", [
        "flex-start",
        "center",
        "space-between",
        "space-around",
        "flex-end",
      ]),
      num("gap", "Gap (px)", 8, 0, 60),
    ],
    (v) => {
      const css =
        "display: flex; flex-direction: " +
        v.direction +
        "; justify-content: " +
        v.justify +
        "; gap: " +
        v.gap +
        "px;";
      return {
        text: css,
        html:
          "<style>main{" +
          css +
          "}b{background:#10766f;color:white;padding:12px;font:16px system-ui}</style><main><b>A</b><b>B</b><b>C</b></main>",
      };
    },
  ),
  tool(
    "css-filter-generator",
    "Preview CSS brightness, saturation and hue rotation.",
    [
      num("bright", "Brightness (%)", 100, 0, 200),
      num("sat", "Saturation (%)", 100, 0, 300),
      num("hue", "Hue rotation (degrees)", 0, -360, 360),
    ],
    (v) => {
      const css =
        "filter: brightness(" +
        v.bright +
        "%) saturate(" +
        v.sat +
        "%) hue-rotate(" +
        v.hue +
        "deg);";
      return {
        text: css,
        html:
          '<div style="height:100px;background:linear-gradient(120deg,#10766f,#efd66d,#e86d79);' +
          css +
          '"></div>',
      };
    },
  ),
  tool(
    "cubic-bezier-generator",
    "Generate CSS timing functions from control points.",
    [
      num("x1", "X1", 0.25, 0, 1),
      num("y1", "Y1", 0.1),
      num("x2", "X2", 0.25, 0, 1),
      num("y2", "Y2", 1),
    ],
    (v) =>
      "transition-timing-function: cubic-bezier(" +
      [v.x1, v.y1, v.x2, v.y2].join(", ") +
      ");",
  ),
  tool(
    "sql-tools/builder",
    "Build a simple SELECT with sorting.",
    [
      line("table", "Table", "customers"),
      line("columns", "Column names", "id, name"),
      line("order", "Order by", "id"),
      select("dir", "Direction", ["ASC", "DESC"]),
    ],
    (v) => {
      const table = sqlFields(v.table),
        order = sqlFields(v.order);
      if (table.length !== 1 || order.length !== 1)
        throw Error("Use one table and one sort column.");
      return (
        "SELECT " +
        sqlFields(v.columns).join(", ") +
        "\nFROM " +
        table[0] +
        "\nORDER BY " +
        order[0] +
        " " +
        v.dir +
        ";"
      );
    },
  ),
  tool(
    "sql-tools/compare",
    "Format and compare SQL statements.",
    [
      area("a", "Original SQL", "select id from customers"),
      area("b", "Updated SQL", "select id, name from customers"),
    ],
    async (v) => {
      const { format } = await import("sql-formatter"),
        { createTwoFilesPatch } = await import("diff");
      return createTwoFilesPatch(
        "before.sql",
        "after.sql",
        format(v.a),
        format(v.b),
      );
    },
  ),
  transform(
    "stored-procedure-formatter",
    "Indent SQL, including procedural SQL supported by the formatter.",
    "CREATE PROCEDURE list_users() BEGIN SELECT * FROM users; END;",
    async (s) =>
      (await import("sql-formatter")).format(s, { language: "mysql" }),
  ),
  tool(
    "http-header-builder",
    "Build a header block from a JSON object.",
    [
      area(
        "json",
        "Headers",
        '{"Accept":"application/json","Content-Type":"application/json"}',
      ),
    ],
    (v) => {
      const obj = JSON.parse(v.json);
      if (!obj || Array.isArray(obj) || typeof obj !== "object")
        throw Error("Enter an object of header names and strings.");
      return Object.entries(obj)
        .map(([k, x]) => {
          if (!/^[\w-]+$/.test(k) || typeof x !== "string" || /[\r\n]/.test(x))
            throw Error("Invalid header name or value.");
          return k + ": " + x;
        })
        .join("\n");
    },
  ),
  tool(
    "ipv6-ula-generator",
    "Generate an RFC 4193-style random local /48 prefix.",
    [],
    () => {
      const b = [...crypto.getRandomValues(new Uint8Array(5))]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("");
      return (
        "fd" + b.slice(0, 2) + ":" + b.slice(2, 6) + ":" + b.slice(6) + "::/48"
      );
    },
  ),
  tool(
    "bitwise-ieee754-explorer",
    "View the IEEE 754 binary representation of a number.",
    [
      num("n", "Value", 3.14159),
      select("width", "Format", ["Float64", "Float32"]),
    ],
    (v) => {
      const bytes = new ArrayBuffer(v.width === "Float64" ? 8 : 4),
        view = new DataView(bytes);
      view["set" + v.width](0, v.n, false);
      return [...new Uint8Array(bytes)]
        .map((x) => x.toString(2).padStart(8, "0"))
        .join(" ");
    },
  ),
  tool(
    "binary-size-converter",
    "Convert bytes to decimal and binary file-size units.",
    [num("bytes", "Bytes", 1048576, 0)],
    (v) =>
      json({
        bytes: v.bytes,
        KB: v.bytes / 1000,
        KiB: v.bytes / 1024,
        MB: v.bytes / 1e6,
        MiB: v.bytes / 1048576,
      }),
  ),
].map((t) =>
  t.id === "binary-size-converter"
    ? { ...t, name: "File Size Converter", category: "data-processing" }
    : t,
);
