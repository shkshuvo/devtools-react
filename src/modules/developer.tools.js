import {
  tool,
  transform,
  num,
  select,
  line,
  area,
  json,
  esc,
  rows,
  integer,
} from "./fields.js";
import Papa from "papaparse";
const data = '[{"id":1,"name":"Lima","active":true}]';
const words = (s) => s.trim().split(/\s+/).filter(Boolean);
const profile = (s) => {
  const { data, errors } = Papa.parse(s.trim(), {
    header: true,
    skipEmptyLines: true,
  });
  if (errors.length) throw Error(errors[0].message);
  return Object.keys(data[0] || {}).map((key) => {
    const v = data.map((r) => r[key]),
      nonempty = v.filter((x) => x?.trim());
    return {
      column: key,
      rows: v.length,
      missing: v.length - nonempty.length,
      distinct: new Set(nonempty).size,
      type:
        nonempty.length && nonempty.every((x) => /^-?\d+(\.\d+)?$/.test(x))
          ? "numeric"
          : nonempty.length && nonempty.every((x) => /^(true|false)$/i.test(x))
            ? "boolean"
            : "text",
    };
  });
};
function ts(v) {
  if (v === null) return "null";
  if (Array.isArray(v))
    return v.length
      ? "Array<" + [...new Set(v.map(ts))].join(" | ") + ">"
      : "unknown[]";
  if (typeof v === "object")
    return (
      "{ " +
      Object.entries(v)
        .map(([k, x]) => JSON.stringify(k) + ": " + ts(x))
        .join("; ") +
      " }"
    );
  return typeof v;
}
function morph(s) {
  return words(
    s.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[^A-Za-z0-9]+/g, " "),
  )
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("");
}
function go(v) {
  if (v === null) return "any";
  if (Array.isArray(v)) {
    const types = [...new Set(v.map(go))];
    return "[]" + (types.length === 1 ? types[0] : "any");
  }
  if (typeof v === "object") {
    const keys = Object.keys(v),
      seen = new Set();
    return (
      "struct {\n" +
      keys
        .map((k, i) => {
          let name = morph(k);
          if (!/^[A-Z]/.test(name)) name = "Field" + name;
          if (seen.has(name)) name += "_" + i;
          seen.add(name);
          return (
            "\t" +
            name +
            " " +
            go(v[k]) +
            " `json:" +
            JSON.stringify(k.replaceAll("`", "")) +
            "`"
          );
        })
        .join("\n") +
      "\n}"
    );
  }
  return { number: "float64", boolean: "bool", string: "string" }[typeof v];
}
export default [
  transform(
    "json-to-typescript",
    "Infer a TypeScript type from JSON.",
    data,
    (s) => "export type Root = " + ts(JSON.parse(s)) + ";",
  ),
  transform(
    "json-to-go",
    "Infer a Go type with JSON field tags.",
    data,
    (s) => "type Root " + go(JSON.parse(s)),
  ),
  transform(
    "csv-type-inference-profiler",
    "Profile missing values, distinct values and simple data types.",
    "name,score\nLima,95\nSam,88",
    (s) => json(profile(s)),
  ),
  transform(
    "html-to-markdown",
    "Convert common HTML headings, links, lists and emphasis to Markdown.",
    "<h1>Example</h1><p>Hello <strong>world</strong>.</p>",
    (s) => {
      const t = document.createElement("template");
      t.innerHTML = s;
      t.content.querySelectorAll("script,style").forEach((x) => x.remove());
      function render(n) {
        if (n.nodeType === 3) return n.textContent;
        const text = Array.from(n.childNodes).map(render).join("");
        const tag = n.nodeName.toLowerCase();
        if (/^h[1-6]$/.test(tag))
          return "#".repeat(+tag[1]) + " " + text + "\n\n";
        switch (tag) {
          case "p":
            return text + "\n\n";
          case "br":
            return "\n";
          case "strong":
          case "b":
            return "**" + text + "**";
          case "em":
          case "i":
            return "*" + text + "*";
          case "li":
            return "- " + text + "\n";
          case "a":
            return "[" + text + "](" + n.getAttribute("href") + ")";
          default:
            return text;
        }
      }
      return render(t.content).trim();
    },
  ),
  tool(
    "mock-data-generator",
    "Generate synthetic user records as JSON.",
    [num("count", "Records", 10, 1, 2000)],
    async ({ count }) => {
      const { faker } = await import("@faker-js/faker/locale/en_US");
      return json(
        Array.from({ length: count }, (_, i) => ({
          id: i + 1,
          name: faker.person.fullName(),
          email: "user" + (i + 1) + "@example.test",
          city: faker.location.city(),
        })),
      );
    },
  ),
  tool(
    "synthetic-data-faker",
    "Generate synthetic transaction fixtures.",
    [
      num("count", "Transactions", 5, 1, 2000),
      line("currency", "Currency", "BDT"),
    ],
    ({ count, currency }) =>
      json(
        Array.from({ length: count }, (_, i) => ({
          reference: "TEST-" + (i + 1),
          currency,
          amount: integer(100, 1000000) / 100,
          status: ["pending", "settled", "declined"][integer(0, 2)],
        })),
      ),
  ),
  transform(
    "json-to-protobuf-converter",
    "Generate a proto3 message for flat scalar JSON fields.",
    '{"id":1,"name":"Demo"}',
    (s) => {
      const v = JSON.parse(s);
      if (!v || Array.isArray(v) || typeof v !== "object")
        throw Error("Enter a flat object.");
      return (
        'syntax = "proto3";\n\nmessage Record {\n' +
        Object.entries(v)
          .map(([k, x], i) => {
            if (
              !/^[a-zA-Z_][a-zA-Z_0-9]*$/.test(k) ||
              x === null ||
              typeof x === "object"
            )
              throw Error("Use scalar fields with valid protobuf names.");
            return (
              "  " +
              { number: "double", boolean: "bool", string: "string" }[
                typeof x
              ] +
              " " +
              k +
              " = " +
              (i + 1) +
              ";"
            );
          })
          .join("\n") +
        "\n}"
      );
    },
  ),
  tool(
    "biorhythm-calculator",
    "Plot the conventional 23-, 28- and 33-day cycles as a 30-day table for entertainment.",
    [
      { type: "date", key: "birth", label: "Birth date", value: "2000-01-01" },
      {
        type: "date",
        key: "date",
        label: "Start date",
        value: new Date().toISOString().slice(0, 10),
      },
    ],
    (v) => {
      const start = Date.parse(v.date),
        age = (start - Date.parse(v.birth)) / 86400000;
      return {
        table: [
          ["Date", "Physical", "Emotional", "Intellectual"],
          ...Array.from({ length: 30 }, (_, i) => [
            new Date(start + i * 86400000).toISOString().slice(0, 10),
            ...[23, 28, 33].map(
              (p) =>
                Math.round(100 * Math.sin((2 * Math.PI * (age + i)) / p)) + "%",
            ),
          ]),
        ],
      };
    },
  ),
  tool(
    "numerology-analyzer",
    "Calculate traditional life-path and name numbers for entertainment.",
    [
      line("name", "Birth name", "Alex Rivera"),
      { type: "date", key: "date", label: "Birth date", value: "2000-01-01" },
    ],
    ({ name, date }) => {
      const reduce = (n) => {
        while (n > 9 && ![11, 22, 33].includes(n))
          n = [...String(n)].reduce((s, c) => s + Number(c), 0);
        return n;
      };
      const letters = [...name.toUpperCase().replace(/[^A-Z]/g, "")];
      if (!letters.length) throw Error("Use a Latin-script name.");
      const sum = (l) =>
        reduce(l.reduce((s, c) => s + ((c.charCodeAt(0) - 65) % 9) + 1, 0));
      return json({
        lifePath: reduce(
          [...date.replaceAll("-", "")].reduce((s, c) => s + Number(c), 0),
        ),
        destiny: sum(letters),
        soulUrge: sum(letters.filter((c) => "AEIOU".includes(c))),
        personality: sum(letters.filter((c) => !"AEIOU".includes(c))),
      });
    },
  ),
  tool(
    "gpa-grade-calculator",
    "Calculate a credit-weighted GPA.",
    [
      area(
        "input",
        "Course, credits, grade points (one per line)",
        "Algorithms,3,4\nDatabases,4,3.7",
      ),
    ],
    (v) => {
      let credits = 0,
        sum = 0;
      for (const l of rows(v.input.trim())) {
        const [, c, g] = l.split(",");
        if (
          !c?.trim() ||
          !g?.trim() ||
          !Number.isFinite(+c) ||
          !Number.isFinite(+g) ||
          +c <= 0 ||
          +g < 0
        )
          throw Error("Enter a course, positive credits and grade points.");
        credits += +c;
        sum += c * g;
      }
      return "GPA: " + (sum / credits).toFixed(3) + "\nCredits: " + credits;
    },
  ),
  tool(
    "life-in-weeks",
    "Estimate elapsed and remaining weeks for a chosen lifespan.",
    [
      num("age", "Current age (years)", 30, 0, 150),
      num("span", "Assumed lifespan (years)", 80, 1, 150),
    ],
    ({ age, span }) =>
      "Elapsed: " +
      Math.round((age * 365.2425) / 7) +
      " weeks\nRemaining: " +
      Math.max(0, Math.round(((span - age) * 365.2425) / 7)) +
      " weeks",
  ),
  tool(
    "fire-retirement-calculator",
    "Estimate a portfolio target from spending and a chosen withdrawal rate.",
    [
      num("spend", "Annual spending", 30000, 0),
      num("rate", "Assumed withdrawal rate (%)", 4, 0.01, 100),
    ],
    (v) => "Target portfolio: " + (v.spend / (v.rate / 100)).toFixed(2),
  ),
  tool(
    "pwm-duty-cycle-motor",
    "Calculate PWM period and on/off time.",
    [
      num("hz", "Frequency (Hz)", 1000, 0.001),
      num("d", "Duty cycle (%)", 50, 0, 100),
    ],
    (v) => {
      const p = 1000 / v.hz;
      return json({
        periodMs: p,
        onMs: (p * v.d) / 100,
        offMs: p * (1 - v.d / 100),
      });
    },
  ),
  tool(
    "uart-baud-rate-calculator",
    "Estimate UART data throughput including framing bits.",
    [
      num("baud", "Baud", 115200, 1),
      select("bits", "Data bits", ["8", "7", "6", "5"]),
      select("parity", "Parity bit", ["0", "1"]),
      select("stop", "Stop bits", ["1", "2"]),
    ],
    (v) =>
      (
        v.baud /
        (1 + Number(v.bits) + Number(v.parity) + Number(v.stop))
      ).toFixed(2) + " characters/second",
  ),
  tool(
    "context-assembler",
    "Combine labeled context and a task for an LLM prompt.",
    [
      area("background", "Background", "The app uses React."),
      area("task", "Task", "Explain the component tree."),
      area("constraints", "Constraints", "Use plain language."),
    ],
    (v) =>
      [
        "# Background",
        v.background,
        "# Task",
        v.task,
        "# Constraints",
        v.constraints,
      ].join("\n\n"),
  ),
  tool(
    "llm-cost-budget-forecaster",
    "Forecast monthly spend from daily prompt usage.",
    [
      num("daily", "Requests per day", 100, 0),
      num("input", "Input tokens per request", 1500, 0),
      num("output", "Output tokens per request", 300, 0),
      num("ir", "Input price per million", 1, 0),
      num("or", "Output price per million", 3, 0),
    ],
    (v) =>
      (((v.input * v.ir + v.output * v.or) * v.daily * 30) / 1e6).toFixed(4) +
      " per 30 days",
  ),
];
