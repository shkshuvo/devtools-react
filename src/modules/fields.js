// Each module exports an array. Fields are rendered by the shared Workbench.
export const area = (key, label, value = "") => ({
  key,
  label,
  value,
  type: "textarea",
});
export const line = (key, label, value = "") => ({
  key,
  label,
  value,
  type: "text",
});
export const num = (key, label, value, min, max) => ({
  key,
  label,
  value,
  min,
  max,
  type: "number",
});
export const select = (key, label, options) => ({
  key,
  label,
  options,
  value: options[0],
  type: "select",
});
export const tool = (id, description, fields, run) => ({
  id,
  description,
  fields,
  run,
});
export const transform = (id, description, sample, fn) =>
  tool(id, description, [area("input", "Input", sample)], ({ input }) =>
    fn(input),
  );
export const modes = (id, description, sample, actions) =>
  tool(
    id,
    description,
    [
      select("mode", "Operation", Object.keys(actions)),
      area("input", "Input", sample),
    ],
    ({ mode, input }) => actions[mode](input),
  );
export const json = (value) => JSON.stringify(value, null, 2);
export function rows(text) {
  return text.split(/\r?\n/);
}
export function bytes64(bytes) {
  return btoa(Array.from(bytes, (x) => String.fromCharCode(x)).join(""));
}
export const encode64 = (text) => bytes64(new TextEncoder().encode(text));
export const decode64 = (text) =>
  new TextDecoder("utf-8", { fatal: true }).decode(
    Uint8Array.from(atob(text), (x) => x.charCodeAt(0)),
  );
export const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function integer(min, max) {
  if (
    !Number.isSafeInteger(min) ||
    !Number.isSafeInteger(max) ||
    max < min ||
    max - min >= 2 ** 32
  )
    throw Error("Choose whole numbers with a range below 2³².");
  const span = max - min + 1,
    limit = 2 ** 32 - (2 ** 32 % span),
    buf = new Uint32Array(1);
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return min + (buf[0] % span);
}
