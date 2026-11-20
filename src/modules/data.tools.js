import {
  tool,
  transform,
  modes,
  area,
  select,
  json,
  rows,
  encode64,
  decode64,
  esc,
  line,
} from "./fields.js";
import Papa from "papaparse";
import { parse as yaml, stringify as toYaml } from "yaml";
import JSON5 from "json5";
import { diffLines, createTwoFilesPatch } from "diff";
import { XMLParser, XMLValidator } from "fast-xml-parser";
const sample = '{"name":"Lima","city":"Dhaka","active":true}';
const csv = "name,city\nLima,Dhaka\nSam,Sydney";
function table(input, header = true) {
  const { data, errors } = Papa.parse(input.trim(), {
    header,
    skipEmptyLines: true,
  });
  if (errors.length) throw Error(errors[0].message);
  return data;
}
function tableMarkdown(input) {
  const [head, ...body] = table(input, false);
  const row = (cells) =>
    "| " +
    cells
      .map((s) => s.replaceAll("|", "\\|").replace(/\s*\n\s*/g, " "))
      .join(" | ") +
    " |";
  return [row(head), row(head.map(() => "---")), ...body.map(row)].join("\n");
}
function xml(input) {
  const valid = XMLValidator.validate(input);
  if (valid !== true) throw Error(valid.err.msg);
  return new XMLParser({ ignoreAttributes: false }).parse(input);
}
async function pretty(text, parser) {
  const { format } = await import("prettier/standalone");
  const plugins =
    parser === "graphql"
      ? [await import("prettier/plugins/graphql")]
      : [await import("prettier/plugins/html")];
  return format(text, { parser, plugins });
}
const comparison = (id, description, fn) =>
  tool(
    id,
    description,
    [
      area("a", "Original", "Line one\nLine two"),
      area("b", "Updated", "Line one\nNew line"),
    ],
    ({ a, b }) => fn(a, b),
  );
export default [
  modes("json-formatter", "Format, validate or compact JSON.", sample, {
    Format: (s) => json(JSON.parse(s)),
    Minify: (s) => JSON.stringify(JSON.parse(s)),
    Validate: (s) => {
      JSON.parse(s);
      return "Valid JSON";
    },
  }),
  modes("base64", "Encode or decode UTF-8 text.", "Hello, ঢাকা!", {
    Encode: encode64,
    Decode: decode64,
  }),
  modes(
    "url-encoder-decoder",
    "Encode and decode URL components.",
    "hello world & more",
    { Encode: encodeURIComponent, Decode: decodeURIComponent },
  ),
  transform("json-to-yaml", "Convert a JSON document to YAML.", sample, (s) =>
    toYaml(JSON.parse(s)),
  ),
  modes(
    "yaml-validator",
    "Parse YAML and inspect its JSON representation.",
    "name: Lima\ncity: Dhaka",
    {
      Validate: (s) => {
        yaml(s);
        return "Valid YAML";
      },
      "To JSON": (s) => json(yaml(s)),
    },
  ),
  transform(
    "csv-to-json",
    "Convert CSV headers and records into JSON.",
    csv,
    (s) => json(table(s)),
  ),
  transform("csv-data-viewer", "Inspect CSV records as a table.", csv, (s) => ({
    table: table(s, false),
  })),
  transform(
    "json-to-csv-converter",
    "Export an array of JSON records as CSV.",
    "[" + sample + "]",
    (s) => Papa.unparse(JSON.parse(s)),
  ),
  transform(
    "csv-to-markdown-converter",
    "Build a Markdown table from CSV.",
    csv,
    tableMarkdown,
  ),
  transform(
    "markdown-table-generator",
    "Turn comma-separated rows into a Markdown table.",
    csv,
    tableMarkdown,
  ),
  transform(
    "html-table-generator",
    "Build an escaped HTML table from CSV.",
    csv,
    (s) =>
      "<table>\n" +
      table(s, false)
        .map((r, i) => {
          const tag = i ? "td" : "th";
          return (
            "  <tr>" +
            r.map((c) => "<" + tag + ">" + esc(c) + "</" + tag + ">").join("") +
            "</tr>"
          );
        })
        .join("\n") +
      "\n</table>",
  ),
  tool(
    "csv-to-sql",
    "Generate SQL INSERT statements from CSV.",
    [line("tableName", "Table", "customers"), area("input", "CSV", csv)],
    ({ tableName, input }) => {
      const ident = (s) => '"' + s.replaceAll('"', '""') + '"';
      return table(input)
        .map(
          (r) =>
            "INSERT INTO " +
            ident(tableName) +
            " (" +
            Object.keys(r).map(ident).join(", ") +
            ") VALUES (" +
            Object.values(r)
              .map((s) => "'" + String(s).replaceAll("'", "''") + "'")
              .join(", ") +
            ");",
        )
        .join("\n");
    },
  ),
  modes(
    "jsonl-converter",
    "Switch between JSON arrays and newline-delimited JSON.",
    "[" + sample + "]",
    {
      "Array to JSONL": (s) =>
        JSON.parse(s)
          .map((x) => JSON.stringify(x))
          .join("\n"),
      "JSONL to array": (s) =>
        json(
          rows(s)
            .filter(Boolean)
            .map((x) => JSON.parse(x)),
        ),
    },
  ),
  transform(
    "json5-validator",
    "Parse JSON5 and emit strict JSON.",
    "{name:'DevTools',}",
    (s) => json(JSON5.parse(s)),
  ),
  transform(
    "xml-to-json-converter",
    "Read XML elements and attributes as JSON.",
    '<user id="1"><name>Lima</name></user>',
    (s) => json(xml(s)),
  ),
  transform(
    "graphql-formatter",
    "Format GraphQL operations.",
    "query User {user {id name}}",
    (s) => pretty(s, "graphql"),
  ),
  transform(
    "list-deduplicator",
    "Keep the first occurrence of each line.",
    "alpha\nbeta\nalpha",
    (s) => [...new Set(rows(s))].join("\n"),
  ),
  transform(
    "email-normalizer",
    "Trim addresses, normalize domain case and remove duplicate lines.",
    "hello@EXAMPLE.COM\nhello@example.com",
    (s) =>
      [
        ...new Set(
          rows(s)
            .map((x) =>
              x.trim().replace(/@(.+)$/, (_, d) => "@" + d.toLowerCase()),
            )
            .filter(Boolean),
        ),
      ].join("\n"),
  ),
  comparison("diff-checker", "Compare text line by line.", (a, b) =>
    diffLines(a, b)
      .map((p) =>
        rows(p.value.replace(/\n$/, ""))
          .map((l) => (p.added ? "+ " : p.removed ? "- " : "  ") + l)
          .join("\n"),
      )
      .join("\n"),
  ),
  comparison(
    "code-diff-patch-generator",
    "Create a unified patch for two text files.",
    (a, b) => createTwoFilesPatch("original", "updated", a, b),
  ),
  comparison(
    "prompt-diff-comparator",
    "Inspect changes between prompt versions.",
    (a, b) => createTwoFilesPatch("before", "after", a, b),
  ),
  tool(
    "json-diff",
    "Compare two formatted JSON documents.",
    [
      area("a", "Original", sample),
      area("b", "Updated", sample.replace("Dhaka", "Paris")),
    ],
    ({ a, b }) =>
      createTwoFilesPatch(
        "before.json",
        "after.json",
        json(JSON.parse(a)),
        json(JSON.parse(b)),
      ),
  ),
  modes(
    "html-encoder-decoder",
    "Convert text to HTML entities and back.",
    "<strong>Hello & welcome</strong>",
    {
      Encode: esc,
      Decode: (s) => {
        const e = document.createElement("textarea");
        e.innerHTML = s.replaceAll("<", "&lt;");
        return e.value;
      },
    },
  ),
  transform(
    "html-to-text-converter",
    "Extract text from an inert HTML template.",
    "<p>Hello <b>world</b></p>",
    (s) => {
      const t = document.createElement("template");
      t.innerHTML = s;
      t.content.querySelectorAll("script,style").forEach((x) => x.remove());
      return t.content.textContent;
    },
  ),
  transform(
    "sql-tools",
    "Format SQL queries.",
    "select id,name from customers where active=1 order by name",
    async (s) => (await import("sql-formatter")).format(s),
  ),
  transform(
    "tsv-matrix-transposer",
    "Swap columns and rows in tab-separated text.",
    "A\tB\n1\t2",
    (s) => {
      const r = rows(s).map((l) => l.split("\t"));
      return Array.from(
        { length: Math.max(...r.map((x) => x.length)) },
        (_, i) => r.map((x) => x[i] ?? "").join("\t"),
      ).join("\n");
    },
  ),
  tool(
    "json-schema-validator",
    "Validate JSON using a draft-07 schema.",
    [
      area("schema", "Schema", '{"type":"object","required":["name"]}'),
      area("data", "JSON document", sample),
    ],
    async ({ schema, data }) => {
      const { default: Ajv } = await import("ajv");
      const ajv = new Ajv({ allErrors: true });
      (await import("ajv-formats")).default(ajv);
      return ajv.validate(JSON.parse(schema), JSON.parse(data))
        ? "Valid document"
        : json(ajv.errors);
    },
  ),
];
