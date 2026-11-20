import {
  tool,
  transform,
  modes,
  area,
  line,
  num,
  select,
  json,
  integer,
} from "./fields.js";
const unitSets = {
  Length: {
    m: 1,
    km: 1000,
    cm: 0.01,
    mm: 0.001,
    mi: 1609.344,
    ft: 0.3048,
    in: 0.0254,
  },
  Mass: { kg: 1, g: 0.001, lb: 0.45359237, oz: 0.028349523125 },
  Volume: {
    litre: 1,
    ml: 0.001,
    "US cup": 0.2365882365,
    "US tablespoon": 0.01478676478125,
    "US teaspoon": 0.00492892159375,
  },
};
const units = (id, set) => {
  const choices = Object.keys(set);
  return tool(
    id,
    "Convert quantities between compatible units.",
    [
      num("v", "Value", 1),
      select("from", "From", choices),
      select("to", "To", [...choices.slice(1), choices[0]]),
    ],
    ({ v, from, to }) => (v * set[from]) / set[to] + " " + to,
  );
};
const money = (x) =>
  new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(x);
const base = num("amount", "Amount", 1000, 0),
  rate = num("rate", "Rate (%)", 10, 0);
const boundedYear = num("years", "Years", 5, 0, 100);
const day = (key, label, value) => ({ type: "date", key, label, value });
const dates = [
  day("a", "Start date", "2026-01-01"),
  day("b", "End date", "2026-12-31"),
];
const random = tool(
  "random-number-picker",
  "Choose an inclusive random integer.",
  [num("min", "Minimum", 1), num("max", "Maximum", 100)],
  ({ min, max }) => integer(min, max),
);
export default [
  units("unit-converter", unitSets.Length),
  units("kitchen-unit-converter", unitSets.Volume),
  tool(
    "temperature-converter",
    "Convert Celsius, Fahrenheit or kelvin.",
    [
      num("v", "Temperature", 25),
      select("from", "Unit", ["Celsius", "Fahrenheit", "Kelvin"]),
    ],
    ({ v, from }) => {
      const c =
        from === "Fahrenheit"
          ? ((v - 32) * 5) / 9
          : from === "Kelvin"
            ? v - 273.15
            : v;
      return [
        c.toFixed(2) + " °C",
        ((c * 9) / 5 + 32).toFixed(2) + " °F",
        (c + 273.15).toFixed(2) + " K",
      ].join("\n");
    },
  ),
  tool(
    "number-base-converter",
    "Convert integers without losing precision.",
    [
      line("v", "Integer", "255"),
      select("base", "Input base", ["10", "16", "2", "8"]),
    ],
    ({ v, base }) => {
      const prefixes = { 10: "", 16: "0x", 2: "0b", 8: "0o" },
        digits = {
          10: /^\d+$/,
          16: /^[\da-f]+$/i,
          2: /^[01]+$/,
          8: /^[0-7]+$/,
        };
      const str = v.trim().replace(/^-/, "");
      if (!digits[base].test(str))
        throw Error("Invalid digits for selected base.");
      const n =
        BigInt(prefixes[base] + str) * (v.trim().startsWith("-") ? -1n : 1n);
      return [2, 8, 10, 16]
        .map((b) => "Base " + b + ": " + n.toString(b))
        .join("\n");
    },
  ),
  tool(
    "scientific-calculator",
    "Evaluate a mathematical expression using math.js.",
    [line("expr", "Expression", "sqrt(144) + sin(pi / 2)")],
    async ({ expr }) => {
      const { evaluate } = await import("mathjs");
      return String(evaluate(expr));
    },
  ),
  tool(
    "percentage-calculator",
    "Find a percentage of a value.",
    [base, rate],
    ({ amount, rate }) => money((amount * rate) / 100),
  ),
  tool(
    "compound-interest-calculator",
    "Calculate compound growth at a fixed annual rate.",
    [
      base,
      rate,
      boundedYear,
      num("n", "Compounding periods per year", 12, 1, 365),
    ],
    ({ amount, rate, years, n }) => {
      const total = amount * (1 + rate / 100 / n) ** (n * years);
      return (
        "Final balance: " +
        money(total) +
        "\nInterest earned: " +
        money(total - amount)
      );
    },
  ),
  tool(
    "loan-mortgage-calculator",
    "Estimate a fixed-rate monthly payment.",
    [base, rate, num("months", "Months", 24, 1, 1200)],
    ({ amount, rate, months }) => {
      const r = rate / 1200,
        p = r ? (amount * r) / (1 - (1 + r) ** -months) : amount / months;
      return (
        "Monthly payment: " +
        money(p) +
        "\nTotal interest: " +
        money(p * months - amount)
      );
    },
  ),
  tool(
    "discount-vat-calculator",
    "Apply a discount, then VAT to the reduced price.",
    [
      base,
      num("discount", "Discount (%)", 10, 0, 100),
      num("vat", "VAT (%)", 5, 0, 100),
    ],
    ({ amount, discount, vat }) => {
      const net = amount * (1 - discount / 100);
      return (
        "After discount: " +
        money(net) +
        "\nVAT: " +
        money((net * vat) / 100) +
        "\nTotal: " +
        money(net * (1 + vat / 100))
      );
    },
  ),
  tool(
    "sales-tax-calculator-us",
    "Calculate sales tax using your supplied local rate.",
    [base, rate],
    ({ amount, rate }) =>
      "Tax: " +
      money((amount * rate) / 100) +
      "\nTotal: " +
      money(amount * (1 + rate / 100)),
  ),
  tool(
    "tip-bill-splitter",
    "Split a bill and tip evenly.",
    [base, num("tip", "Tip (%)", 10, 0), num("people", "People", 2, 1, 10000)],
    ({ amount, tip, people }) =>
      money((amount * (1 + tip / 100)) / people) + " per person",
  ),
  tool(
    "savings-goal-calculator",
    "Estimate months to reach a goal with fixed deposits.",
    [
      num("goal", "Goal", 10000, 0),
      num("saved", "Already saved", 1000, 0),
      num("monthly", "Monthly contribution", 500, 0.01),
    ],
    ({ goal, saved, monthly }) =>
      Math.max(0, Math.ceil((goal - saved) / monthly)) + " months",
  ),
  tool(
    "salary-hourly-converter",
    "Convert annual salary to hourly pay.",
    [
      num("salary", "Annual salary", 60000, 0),
      num("hours", "Hours per week", 40, 0.01),
      num("weeks", "Paid weeks", 52, 0.01, 53),
    ],
    ({ salary, hours, weeks }) => money(salary / hours / weeks) + " per hour",
  ),
  tool(
    "hourly-rate-calculator",
    "Calculate a freelance rate from income target and billable time.",
    [
      num("income", "Annual income target", 60000, 0),
      num("cost", "Annual expenses", 5000, 0),
      num("hours", "Billable hours per year", 1200, 1),
    ],
    ({ income, cost, hours }) => money((income + cost) / hours) + " per hour",
  ),
  tool(
    "minutes-to-decimal-converter",
    "Represent minutes as decimal hours.",
    [num("v", "Minutes", 90)],
    ({ v }) => v / 60 + " hours",
  ),
  tool(
    "date-calculator",
    "Calculate elapsed calendar days.",
    dates,
    ({ a, b }) => (Date.parse(b) - Date.parse(a)) / 86400000 + " days",
  ),
  tool(
    "age-calculator",
    "Calculate completed years between two dates.",
    [
      day("a", "Birth date", "2000-01-01"),
      day("b", "As of", new Date().toISOString().slice(0, 10)),
    ],
    ({ a, b }) => {
      if (b < a) throw Error("As-of date must follow birth date.");
      return (
        +b.slice(0, 4) -
        +a.slice(0, 4) -
        (b.slice(5) < a.slice(5) ? 1 : 0) +
        " completed years"
      );
    },
  ),
  tool(
    "eta-calculator",
    "Calculate travel time at a constant speed.",
    [num("d", "Distance (km)", 120, 0), num("v", "Speed (km/h)", 60, 0.01)],
    ({ d, v }) => money((d / v) * 60) + " minutes",
  ),
  tool(
    "fuel-cost-trip-calculator",
    "Estimate fuel use and cost.",
    [
      num("d", "Distance (km)", 100, 0),
      num("eff", "Efficiency (km/litre)", 12, 0.01),
      num("p", "Price per litre", 1.5, 0),
    ],
    ({ d, eff, p }) =>
      money(d / eff) + " litres\nCost: " + money((d / eff) * p),
  ),
  tool(
    "bandwidth-calculator",
    "Estimate ideal transfer time from size and bitrate.",
    [
      num("size", "Size (MB)", 100, 0),
      num("rate", "Speed (Mbit/s)", 10, 0.001),
    ],
    ({ size, rate }) => money((size * 8) / rate) + " seconds",
  ),
  tool(
    "iot-battery-life-estimator",
    "Estimate ideal battery life under constant load.",
    [
      num("cap", "Capacity (mAh)", 2400, 0.01),
      num("load", "Average current (mA)", 10, 0.001),
    ],
    ({ cap, load }) => money(cap / load) + " hours",
  ),
  tool(
    "rf-antenna-wavelength",
    "Calculate free-space wavelength.",
    [num("mhz", "Frequency (MHz)", 100, 0.001)],
    ({ mhz }) => 299.792458 / mhz + " metres",
  ),
  tool(
    "token-cost-calculator",
    "Estimate model costs at your supplied rates.",
    [
      num("input", "Input tokens", 1000, 0),
      num("output", "Output tokens", 500, 0),
      num("ir", "Input price per million", 1, 0),
      num("or", "Output price per million", 3, 0),
    ],
    (v) => ((v.input * v.ir + v.output * v.or) / 1e6).toFixed(6),
  ),
  random,
  tool(
    "dice-roller-coin-flip",
    "Roll dice or flip a coin.",
    [
      select("sides", "Type", ["D6", "Coin", "D4", "D8", "D12", "D20"]),
      num("count", "Rolls", 3, 1, 100),
    ],
    ({ sides, count }) =>
      Array.from({ length: count }, () =>
        sides === "Coin"
          ? ["Heads", "Tails"][integer(0, 1)]
          : integer(1, +sides.slice(1)),
      ).join(", "),
  ),
  tool(
    "decision-wheel",
    "Draw a random option from a list.",
    [area("input", "One option per line", "Tea\nCoffee\nWater")],
    ({ input }) => {
      const a = input
        .split(/\n/)
        .map((x) => x.trim())
        .filter(Boolean);
      if (!a.length) throw Error("Add an option.");
      return a[integer(0, a.length - 1)];
    },
  ),
];
