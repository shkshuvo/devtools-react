import React, { useState } from "react";
import { Copy, Download, Play } from "lucide-react";
function Result({ value }) {
  const [status, setStatus] = useState("");
  const output = typeof value === "object" ? value : { text: String(value) };
  const text =
    output.text ??
    output.colors?.join("\n") ??
    (output.table ? JSON.stringify(output.table, null, 2) : "");
  const download = (image = false) => {
    const url = image
      ? output.image
      : URL.createObjectURL(
          new Blob([text], { type: "text/plain;charset=utf-8" }),
        );
    const a = document.createElement("a");
    a.href = url;
    a.download = image
      ? "result." +
        (url.match(/^data:image\/([^;,]+)/)?.[1] || "png").replace(
          "svg+xml",
          "svg",
        )
      : "result.txt";
    a.click();
    if (!image) setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  return (
    <section className="panel output" aria-label="Result">
      <div className="row">
        <h2>Result</h2>
        <div className="actions">
          {text && (
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(text);
                  setStatus("Copied");
                } catch {
                  setStatus("Select the result and press Ctrl+C.");
                }
              }}
            >
              <Copy size={15} /> Copy
            </button>
          )}
          {(text || output.image) && (
            <button onClick={() => download(!!output.image)}>
              <Download size={15} />
              Download
            </button>
          )}
        </div>
      </div>
      {status && <small role="status">{status}</small>}
      {output.colors && (
        <div className="swatches">
          {output.colors.map((color, i) => (
            <div key={i}>
              <i style={{ background: color }} />
              {color}
            </div>
          ))}
        </div>
      )}
      {output.table && (
        <div className="scroll">
          <table>
            {output.table.map((r, i) => (
              <tbody key={i}>
                <tr>
                  {r.map((c, j) => (
                    <td key={j}>{c}</td>
                  ))}
                </tr>
              </tbody>
            ))}
          </table>
        </div>
      )}
      {output.image && (
        <img
          className="result-image"
          src={output.image}
          alt="Generated result"
        />
      )}
      {output.html !== undefined && (
        <iframe
          title="Output preview"
          sandbox={output.script ? "allow-scripts" : ""}
          referrerPolicy="no-referrer"
          srcDoc={output.html}
        />
      )}
      {output.text !== undefined && <pre tabIndex="0">{output.text}</pre>}
    </section>
  );
}
export default function Workbench({ tool }) {
  const [values, set] = useState(() =>
      Object.fromEntries(
        (tool.fields ?? []).map((f) => [f.key, f.value ?? ""]),
      ),
    ),
    [result, show] = useState(null),
    [error, fail] = useState(""),
    [busy, wait] = useState(false),
    [revision, setRevision] = useState(0);
  if (tool.Component) {
    const Custom = tool.Component;
    return <Custom id={tool.id} />;
  }
  const update = (key, value) => set((v) => ({ ...v, [key]: value }));
  async function run(e) {
    e.preventDefault();
    wait(true);
    fail("");
    show(null);
    try {
      const v = { ...values };
      for (const f of tool.fields)
        if (f.type === "number") v[f.key] = Number(v[f.key]);
      const value = await tool.run(v);
      show(value === undefined ? "" : value);
      setRevision((r) => r + 1);
    } catch (e) {
      fail(e.message || String(e));
    } finally {
      wait(false);
    }
  }
  return (
    <>
      <form className="panel" onSubmit={run}>
        <h2>Workspace</h2>
        <div className="fields">
          {tool.fields.map((f) => (
            <label key={f.key} className={f.type === "textarea" ? "wide" : ""}>
              {f.label}
              {f.type === "textarea" ? (
                <textarea
                  value={values[f.key]}
                  onChange={(e) => update(f.key, e.target.value)}
                  spellCheck="false"
                  rows="7"
                />
              ) : f.type === "select" ? (
                <select
                  value={values[f.key]}
                  onChange={(e) => update(f.key, e.target.value)}
                >
                  {f.options.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              ) : f.type === "file" ? (
                <input
                  type="file"
                  required
                  accept={f.accept}
                  onChange={(e) => update(f.key, e.target.files[0])}
                />
              ) : (
                <input
                  type={f.type}
                  min={f.min}
                  max={f.max}
                  step={f.type === "number" ? "any" : undefined}
                  required={f.type === "number" || f.type === "date"}
                  value={values[f.key]}
                  onChange={(e) => update(f.key, e.target.value)}
                />
              )}
            </label>
          ))}
        </div>
        <button className="primary" disabled={busy}>
          <Play size={15} />
          {busy ? "Working…" : "Run tool"}
        </button>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </form>
      {result !== null && <Result key={revision} value={result} />}
    </>
  );
}
