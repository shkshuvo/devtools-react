import Color from "colorjs.io";
import {
  tool,
  transform,
  area,
  line,
  num,
  select,
  integer,
  esc,
} from "./fields.js";
const picker = (key, label, value) => ({ type: "color", key, label, value });
const teal = picker("color", "Color", "#10766f");
const second = picker("end", "Second color", "#2dd4bf");
const swatch = (c) => new Color(c).to("srgb").toString({ format: "hex" });
const palette = (colors) => ({ colors: colors.map(swatch) });
const diagram = (css, code) => ({
  html:
    "<style>body{margin:0;display:grid;place-items:center;min-height:150px;background:#f1f5f9}.box{width:70%;height:85px;background:#10766f;" +
    css +
    '}</style><div class="box"></div>',
  text: code,
});
const converter = (id, desc) =>
  tool(id, desc, [line("color", "CSS color", "#10766f")], ({ color }) => {
    const c = new Color(color);
    return (
      ["srgb", "hsl", "oklch", "lab"]
        .map((space) => space + ": " + c.to(space).toString())
        .join("\n") +
      "\nHEX: " +
      swatch(c)
    );
  });
export default [
  converter(
    "color-converter",
    "Convert CSS colors to RGB, HSL, OKLCH, Lab and hex.",
  ),
  converter(
    "oklch-color-converter",
    "Inspect OKLCH and browser color representations.",
  ),
  tool(
    "color-contrast-checker",
    "Calculate WCAG 2 text contrast.",
    [teal, picker("bg", "Background", "#ffffff")],
    ({ color, bg }) => {
      const r = Math.abs(new Color(color).contrast(new Color(bg), "WCAG21"));
      return (
        r.toFixed(2) +
        ":1\nAA normal text: " +
        (r >= 4.5 ? "Pass" : "Fail") +
        "\nAAA normal text: " +
        (r >= 7 ? "Pass" : "Fail") +
        "\nAA large text: " +
        (r >= 3 ? "Pass" : "Fail")
      );
    },
  ),
  tool(
    "color-mixer",
    "Mix two colors in sRGB.",
    [teal, second, num("mix", "Second color (%)", 50, 0, 100)],
    ({ color, end, mix }) =>
      palette([new Color(color).mix(end, mix / 100, { space: "srgb" })]),
  ),
  tool(
    "color-shades-generator",
    "Generate tints and shades of one color.",
    [teal],
    ({ color }) =>
      palette(
        Array.from({ length: 9 }, (_, i) =>
          new Color(color).mix(
            i <= 4 ? "white" : "black",
            Math.abs(i - 4) / 5,
            { space: "srgb" },
          ),
        ),
      ),
  ),
  tool(
    "gradient-palette-builder",
    "Generate a smooth OKLab color ramp.",
    [teal, second, num("count", "Steps", 6, 2, 32)],
    ({ color, end, count }) =>
      palette(
        Array.from({ length: count }, (_, i) =>
          new Color(color).mix(end, i / (count - 1), { space: "oklab" }),
        ),
      ),
  ),
  ...["random-palette-generator", "color-generator"].map((id) =>
    tool(
      id,
      "Generate random hex colors.",
      [num("count", "Colors", 5, 1, 32)],
      ({ count }) =>
        palette(
          Array.from(
            { length: count },
            () => "#" + integer(0, 0xffffff).toString(16).padStart(6, "0"),
          ),
        ),
    ),
  ),
  tool(
    "css-gradient-generator",
    "Preview a two-stop CSS gradient.",
    [teal, second, num("deg", "Angle (degrees)", 135, -360, 360)],
    ({ color, end, deg }) => {
      const css =
        "background: linear-gradient(" +
        deg +
        "deg, " +
        color +
        ", " +
        end +
        ");";
      return diagram(css, css);
    },
  ),
  tool(
    "border-radius-generator",
    "Preview CSS corner radii.",
    [
      num("tl", "Top left", 16, 0, 100),
      num("tr", "Top right", 16, 0, 100),
      num("br", "Bottom right", 16, 0, 100),
      num("bl", "Bottom left", 16, 0, 100),
    ],
    (v) => {
      const css =
        "border-radius: " + [v.tl, v.tr, v.br, v.bl].join("px ") + "px;";
      return diagram(css, css);
    },
  ),
  tool(
    "box-shadow-generator",
    "Create a CSS shadow.",
    [
      num("x", "Horizontal offset", 4, -100, 100),
      num("y", "Vertical offset", 8, -100, 100),
      num("blur", "Blur", 16, 0, 100),
      teal,
    ],
    ({ x, y, blur, color }) => {
      const css =
        "box-shadow: " + x + "px " + y + "px " + blur + "px " + color + ";";
      return diagram(css, css);
    },
  ),
  tool(
    "px-to-rem",
    "Convert pixels using your root font size.",
    [num("px", "Pixels", 24, 0), num("base", "Root font size", 16, 0.01)],
    ({ px, base }) => px / base + "rem",
  ),
  tool(
    "aspect-ratio-calculator",
    "Reduce dimensions to a ratio and resize proportionally.",
    [
      num("w", "Width", 1920, 1),
      num("h", "Height", 1080, 1),
      num("target", "New width", 1280, 1),
    ],
    ({ w, h, target }) => {
      if (![w, h, target].every(Number.isInteger))
        throw Error("Enter whole pixel dimensions.");
      const gcd = (a, b) => (b ? gcd(b, a % b) : a);
      const d = gcd(w, h);
      return (
        "Aspect ratio: " +
        w / d +
        ":" +
        h / d +
        "\nNew size: " +
        target +
        " × " +
        Math.round((h * target) / w)
      );
    },
  ),
  tool(
    "svg-placeholder-generator",
    "Create a labeled SVG placeholder.",
    [
      num("w", "Width", 640, 1, 4096),
      num("h", "Height", 360, 1, 4096),
      teal,
      line("label", "Label", "Preview"),
    ],
    ({ w, h, color, label }) => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
        w +
        " " +
        h +
        '"><rect width="100%" height="100%" fill="' +
        color +
        '"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="sans-serif" font-size="32">' +
        esc(label) +
        "</text></svg>";
      return {
        image: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg),
        text: svg,
      };
    },
  ),
  tool(
    "css-grid-generator",
    "Generate grid container CSS.",
    [num("cols", "Columns", 3, 1, 24), num("gap", "Gap (px)", 16, 0, 200)],
    ({ cols, gap }) =>
      ".grid {\n  display: grid;\n  grid-template-columns: repeat(" +
      cols +
      ", minmax(0, 1fr));\n  gap: " +
      gap +
      "px;\n}",
  ),
  transform(
    "svg-previewer",
    "Preview SVG in an isolated image element.",
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="teal"/></svg>',
    (s) => ({
      image: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s),
    }),
  ),
];
