import test from "node:test";
import assert from "node:assert/strict";
import data from "../src/modules/data.tools.js";
import generators from "../src/modules/generate.tools.js";
import numbers from "../src/modules/numbers.tools.js";
import text from "../src/modules/text.tools.js";
import extra from "../src/modules/extra.tools.js";
import { integer } from "../src/modules/fields.js";
import IBAN from "iban";
const all = [...data, ...generators, ...numbers, ...text, ...extra];
const run = (id, args) => all.find((v) => v.id === id).run(args);
test("UTF-8 Base64 round trip", () => {
  const s = "Hello ঢাকা 🌍";
  assert.equal(
    run("base64", {
      input: run("base64", { input: s, mode: "Encode" }),
      mode: "Decode",
    }),
    s,
  );
});
test("CSV supports quoted commas and escaped quotes", () =>
  assert.deepEqual(
    JSON.parse(
      run("csv-to-json", { input: 'name,note\n"A, B","said ""hi"""' }),
    ),
    [{ name: "A, B", note: 'said "hi"' }],
  ));
test("invalid JSON reports an error", () =>
  assert.throws(() => run("json-formatter", { input: "{", mode: "Format" })));
test("IBAN fixtures pass international country format and MOD-97", async () => {
  for (const country of generators.find((t) => t.id === "iban-generator")
    .fields[0].options) {
    const result = await run("iban-generator", { country, count: 3 });
    assert.ok(
      result.split("\n").every((v) => v.startsWith(country) && IBAN.isValid(v)),
      country,
    );
  }
});
test("fixed-rate loan handles a zero rate", () =>
  assert.match(
    run("loan-mortgage-calculator", { amount: 1200, rate: 0, months: 12 }),
    /Monthly payment: 100\nTotal interest: 0/,
  ));
test("numeric bases preserve large integers", () =>
  assert.match(
    run("number-base-converter", { base: "16", v: "20000000000001" }),
    /Base 10: 9007199254740993/,
  ));
test("local TOML parser is browser compatible", async () =>
  assert.deepEqual(
    JSON.parse(await run("toml-to-json-converter", { input: "a = 3" })),
    { a: 3 },
  ));
test("chunk overlap cannot exhaust the loop", () =>
  assert.throws(() =>
    run("text-chunker", { input: "abc", size: 2, overlap: 2 }),
  ));
test("random ranges validate boundaries", () => {
  assert.equal(integer(8, 8), 8);
  assert.throws(() => integer(9, 8));
});
