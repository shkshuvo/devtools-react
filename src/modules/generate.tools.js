import {
  tool,
  transform,
  modes,
  area,
  num,
  line,
  select,
  integer,
  json,
  encode64,
  bytes64,
} from "./fields.js";
const digits = (n) => Array.from({ length: n }, () => integer(0, 9)).join("");
const ibanCountries = [
  "DE",
  "AT",
  "BE",
  "CH",
  "CZ",
  "DK",
  "ES",
  "FI",
  "FR",
  "GB",
  "GR",
  "IE",
  "IT",
  "LU",
  "NL",
  "NO",
  "PL",
  "PT",
  "SE",
];
async function makeIbans({ country, count }) {
  const IBAN = (await import("iban")).default;
  const pattern = IBAN.countries[country].example.slice(4);
  return Array.from({ length: count }, () =>
    IBAN.fromBBAN(
      country,
      pattern.replace(/[0-9A-Z]/g, (c) =>
        /[0-9]/.test(c)
          ? String(integer(0, 9))
          : String.fromCharCode(integer(65, 90)),
      ),
    ),
  ).join("\n");
}
function cpf() {
  const a = [...digits(9)].map(Number);
  if (new Set(a).size === 1) return cpf();
  for (let n = 10; n <= 11; n++) {
    const rem = (a.reduce((s, x, i) => s + x * (n - i), 0) * 10) % 11;
    a.push(rem === 10 ? 0 : rem);
  }
  return a.join("").replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}
function barcode(n) {
  const d = digits(n);
  const sum = [...d]
    .reverse()
    .reduce((s, x, i) => s + Number(x) * (i % 2 ? 1 : 3), 0);
  return d + ((10 - (sum % 10)) % 10);
}
function luhn(base) {
  const sum = [...base].reverse().reduce((s, x, i) => {
    const n = Number(x) * (i % 2 ? 1 : 2);
    return s + (n > 9 ? n - 9 : n);
  }, 0);
  return String((10 - (sum % 10)) % 10);
}
const batch = (id, desc, fn) =>
  tool(
    id,
    desc,
    [num("count", "Number of results", 5, 1, 500)],
    async ({ count }) =>
      (await Promise.all(Array.from({ length: count }, () => fn()))).join("\n"),
  );
const alphabet =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
const randomText = (length, chars) =>
  Array.from({ length }, () => chars[integer(0, chars.length - 1)]).join("");
const fixtureNote = " Synthetic QA fixtures only.";
export default [
  batch(
    "national-identity-generator",
    "Generate Brazilian CPF numbers with check digits." + fixtureNote,
    cpf,
  ),
  batch(
    "tax-number-generator",
    "Generate US EIN-shaped fixtures using the reserved 00 prefix." +
      fixtureNote,
    () => "00-" + digits(7),
  ),
  batch(
    "ein-generator",
    "Create clearly fictitious US employer numbers for form tests.",
    () => "00-" + digits(7),
  ),
  batch(
    "tin-generator",
    "Generate US SSN-shaped test identifiers in the invalid 900 series." +
      fixtureNote,
    () => "9" + digits(2) + "-" + digits(2) + "-" + digits(4),
  ),
  batch(
    "drivers-license-generator",
    "Generate explicitly synthetic license-field values." + fixtureNote,
    () => "TEST-DL-" + digits(8),
  ),
  tool(
    "iban-generator",
    "Generate IBAN fixtures with international check digits for 19 countries." +
      fixtureNote,
    [
      select("country", "Country", ibanCountries),
      num("count", "Count", 5, 1, 500),
    ],
    makeIbans,
  ),
  transform(
    "iban-validator",
    "Check a country-specific IBAN format and checksum.",
    "DE89370400440532013000",
    async (s) =>
      (await import("iban")).default.isValid(s.trim())
        ? "Valid IBAN checksum and format"
        : "Invalid IBAN",
  ),
  transform(
    "vat-validator",
    "Check supported VAT formats and checksums locally. Registration status requires an official lookup.",
    "DE136695976",
    async (s) => {
      const { checkVAT, countries } = await import("jsvat");
      const r = checkVAT(s.trim(), countries);
      return json({
        country: r.country?.name ?? null,
        supported: r.isSupportedCountry,
        format: r.isValidFormat,
        checksum: r.isValid,
      });
    },
  ),
  batch("uuid-generator", "Generate random UUID v4 values.", () =>
    crypto.randomUUID(),
  ),
  tool(
    "ulid-nanoid-generator",
    "Generate ULIDs or Nano IDs.",
    [
      select("format", "Format", ["ULID", "Nano ID"]),
      num("count", "Count", 5, 1, 500),
    ],
    async ({ format, count }) => {
      const fn =
        format === "ULID"
          ? (await import("ulid")).ulid
          : (await import("nanoid")).nanoid;
      return Array.from({ length: count }, () => fn()).join("\n");
    },
  ),
  batch(
    "mac-address-generator",
    "Generate locally administered unicast MAC addresses.",
    () =>
      [
        "02",
        ...Array.from({ length: 5 }, () =>
          integer(0, 255).toString(16).padStart(2, "0"),
        ),
      ].join(":"),
  ),
  batch("imei-generator", "Generate 15-digit Luhn test values.", () => {
    const b = digits(14);
    return b + luhn(b);
  }),
  batch(
    "ean13-upc-generator",
    "Generate EAN-13 fixtures with check digits.",
    () => barcode(12),
  ),
  batch(
    "phone-number-generator",
    "Generate fictional North American 555-01xx phone numbers.",
    () => "+1 202 555 01" + digits(2),
  ),
  batch(
    "address-generator",
    "Generate sample US mailing addresses.",
    async () => {
      const { faker } = await import("@faker-js/faker/locale/en_US");
      return (
        faker.location.streetAddress() +
        ", " +
        faker.location.city() +
        ", " +
        faker.location.state({ abbreviated: true }) +
        " " +
        faker.location.zipCode()
      );
    },
  ),
  batch(
    "random-port-generator",
    "Choose random dynamic/private ports from 49152–65535.",
    () => integer(49152, 65535),
  ),
  tool(
    "password-generator",
    "Generate passwords with the browser’s secure random generator.",
    [num("length", "Length", 24, 4, 512), num("count", "Count", 5, 1, 100)],
    ({ length, count }) =>
      Array.from({ length: count }, () => randomText(length, alphabet)).join(
        "\n",
      ),
  ),
  tool(
    "token-generator",
    "Generate hexadecimal tokens from random bytes.",
    [num("n", "Bytes", 32, 1, 1024)],
    ({ n }) =>
      [...crypto.getRandomValues(new Uint8Array(n))]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join(""),
  ),
  tool(
    "hash-generator",
    "Hash UTF-8 text locally.",
    [
      select("alg", "Algorithm", ["SHA-256", "SHA-384", "SHA-512"]),
      area("input", "Text", "Hello"),
    ],
    async ({ alg, input }) =>
      [
        ...new Uint8Array(
          await crypto.subtle.digest(alg, new TextEncoder().encode(input)),
        ),
      ]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join(""),
  ),
  tool(
    "hmac-generator",
    "Sign a message with HMAC-SHA-256.",
    [line("secret", "Key", "example-key"), area("input", "Message", "Hello")],
    async ({ secret, input }) => {
      const enc = new TextEncoder(),
        key = await crypto.subtle.importKey(
          "raw",
          enc.encode(secret),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"],
        );
      return bytes64(
        new Uint8Array(
          await crypto.subtle.sign("HMAC", key, enc.encode(input)),
        ),
      );
    },
  ),
  tool(
    "basic-auth-generator",
    "Build an HTTP Basic authorization header.",
    [line("user", "Username", "demo"), line("password", "Password", "example")],
    ({ user, password }) =>
      "Authorization: Basic " + encode64(user + ":" + password),
  ),
  tool(
    "qr-code-generator",
    "Generate a downloadable QR code.",
    [area("input", "Text or URL", "https://example.com")],
    async ({ input }) => ({
      image: await (
        await import("qrcode")
      ).default.toDataURL(input, { width: 420, margin: 4 }),
    }),
  ),
  transform(
    "credit-card-validator",
    "Check digit count and the Luhn checksum.",
    "4242 4242 4242 4242",
    (s) => {
      const n = s.replace(/[ -]/g, "");
      return /^\d{12,19}$/.test(n) && luhn(n.slice(0, -1)) === n.at(-1)
        ? "Passes Luhn checksum"
        : "Invalid number";
    },
  ),
  transform(
    "email-validator",
    "Check common email address syntax locally.",
    "demo@example.com",
    (s) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
        ? "Matches basic email syntax"
        : "Invalid syntax",
  ),
  tool(
    "hash-comparison",
    "Compare two hexadecimal digests.",
    [line("a", "First digest", "abcd"), line("b", "Second digest", "ABCD")],
    ({ a, b }) => {
      if (![a, b].every((v) => /^(?:[a-f\d]{2})+$/i.test(v.trim())))
        throw Error("Use hexadecimal byte pairs.");
      return a.trim().toLowerCase() === b.trim().toLowerCase()
        ? "Digests match"
        : "Different digests";
    },
  ),
];
