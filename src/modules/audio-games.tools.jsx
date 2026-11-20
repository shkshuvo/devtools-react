import { useState, useEffect, useRef } from "react";
import { integer } from "./fields.js";
function Speech() {
  const [input, set] = useState("Welcome to DevTools."),
    [rate, setRate] = useState(1),
    [status, setStatus] = useState("");
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  return (
    <div className="panel">
      <label>
        Text
        <textarea
          rows="5"
          value={input}
          onChange={(e) => set(e.target.value)}
        />
      </label>
      <label>
        Speech rate
        <input
          type="range"
          min=".5"
          max="2"
          step=".1"
          value={rate}
          onChange={(e) => setRate(+e.target.value)}
        />
      </label>
      <div className="actions">
        <button
          onClick={() => {
            if (!window.speechSynthesis) {
              setStatus("Speech synthesis unavailable.");
              return;
            }
            speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(input);
            u.rate = rate;
            u.onerror = (e) => setStatus(e.error);
            speechSynthesis.speak(u);
          }}
        >
          Speak
        </button>
        <button onClick={() => window.speechSynthesis?.cancel()}>Stop</button>
      </div>
      {status}
    </div>
  );
}
function Recorder({ id }) {
  const screen = id === "screen-recorder";
  const [on, setOn] = useState(false),
    [url, show] = useState(""),
    [error, fail] = useState(""),
    [waiting, wait] = useState(false);
  const session = useRef(null),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      session.current?.stream.getTracks().forEach((t) => t.stop());
      if (session.current?.rec.state === "recording")
        session.current.rec.stop();
    };
  }, []);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  async function start() {
    fail("");
    wait(true);
    let stream;
    try {
      stream = screen
        ? await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          })
        : await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const rec = new MediaRecorder(stream),
        chunks = [];
      session.current = { rec, stream };
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        session.current = null;
        if (alive.current) {
          show(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })));
          setOn(false);
        }
      };
      stream.getTracks().forEach(
        (t) =>
          (t.onended = () => {
            if (rec.state === "recording") rec.stop();
          }),
      );
      rec.start();
      setOn(true);
    } catch (e) {
      stream?.getTracks().forEach((t) => t.stop());
      if (alive.current) fail(e.message);
    } finally {
      if (alive.current) wait(false);
    }
  }
  return (
    <div className="panel">
      <button
        className="primary"
        disabled={waiting}
        onClick={() => (on ? session.current?.rec.stop() : start())}
      >
        {on
          ? "Stop recording"
          : waiting
            ? "Waiting for permission…"
            : "Start recording"}
      </button>
      {error && <p role="alert">{error}</p>}
      {url && (
        <div>
          {screen ? (
            <video src={url} controls style={{ maxWidth: "100%" }} />
          ) : (
            <audio src={url} controls />
          )}
          <p>
            <a className="inline" href={url} download="recording">
              Download recording
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
function Tap() {
  const [taps, set] = useState([]);
  function tap() {
    const now = performance.now();
    set((a) => (now - (a.at(-1) ?? 0) > 3000 ? [now] : [...a.slice(-15), now]));
  }
  return (
    <div className="panel">
      <output className="clock">
        {taps.length > 1
          ? Math.round(((taps.length - 1) * 60000) / (taps.at(-1) - taps[0]))
          : "—"}{" "}
        BPM
      </output>
      <button className="primary" onClick={tap}>
        Tap beat
      </button>{" "}
      <button onClick={() => set([])}>Reset</button>
    </div>
  );
}
function Tone() {
  const [hz, set] = useState(440),
    [wave, shape] = useState("sine"),
    [on, play] = useState(false),
    [error, fail] = useState("");
  useEffect(() => {
    if (!on) return;
    let ctx;
    try {
      ctx = new AudioContext();
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.value = hz;
      gain.gain.value = 0.08;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      ctx.resume().catch((e) => fail(e.message));
    } catch (e) {
      fail(e.message);
    }
    return () => ctx?.close();
  }, [on, hz, wave]);
  return (
    <div className="panel">
      <label>
        Frequency · {hz} Hz
        <input
          type="range"
          min="30"
          max="2000"
          value={hz}
          onChange={(e) => set(+e.target.value)}
        />
      </label>
      <label>
        Waveform
        <select value={wave} onChange={(e) => shape(e.target.value)}>
          {["sine", "square", "triangle", "sawtooth"].map((w) => (
            <option key={w}>{w}</option>
          ))}
        </select>
      </label>
      <button onClick={() => play(!on)}>{on ? "Stop" : "Play tone"}</button>
      {error}
    </div>
  );
}
const cards = () => {
  const a = [..."◆◎△□☆♧♢☀", ..."◆◎△□☆♧♢☀"];
  for (let i = a.length - 1; i > 0; i--) {
    const j = integer(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
function Memory() {
  const [deck, shuffle] = useState(cards),
    [open, setOpen] = useState([]),
    [matched, mark] = useState([]),
    [moves, count] = useState(0);
  useEffect(() => {
    if (open.length !== 2) return;
    const [a, b] = open;
    const id = setTimeout(() => {
      if (deck[a] === deck[b]) mark((v) => [...v, a, b]);
      setOpen([]);
    }, 600);
    return () => clearTimeout(id);
  }, [open, deck]);
  return (
    <div className="panel">
      <div className="row">
        <h2>{matched.length === 16 ? "All pairs found" : moves + " moves"}</h2>
        <button
          onClick={() => {
            shuffle(cards());
            mark([]);
            setOpen([]);
            count(0);
          }}
        >
          New game
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 8,
        }}
      >
        {deck.map((c, i) => (
          <button
            key={i}
            style={{ minHeight: 64, fontSize: 24 }}
            aria-label={
              open.includes(i) || matched.includes(i) ? c : "Card " + (i + 1)
            }
            disabled={
              open.includes(i) || matched.includes(i) || open.length === 2
            }
            onClick={() => {
              if (open.length === 1) count(moves + 1);
              setOpen([...open, i]);
            }}
          >
            {open.includes(i) || matched.includes(i) ? c : "?"}
          </button>
        ))}
      </div>
    </div>
  );
}
function Keycode() {
  const [key, set] = useState(null);
  return (
    <div className="panel">
      <label>
        Press a key in this field
        <input
          placeholder="Click here, then press a key"
          onKeyDown={(e) =>
            set({
              key: e.key,
              code: e.code,
              location: e.location,
              ctrl: e.ctrlKey,
              alt: e.altKey,
              shift: e.shiftKey,
              meta: e.metaKey,
            })
          }
        />
      </label>
      <pre>{key && JSON.stringify(key, null, 2)}</pre>
    </div>
  );
}
function Typing() {
  const sample = "Good software makes difficult tasks easier to understand.";
  const [start, begin] = useState(null),
    [end, finish] = useState(null),
    [s, set] = useState("");
  return (
    <div className="panel">
      <p>{sample}</p>
      <label>
        Type the sentence
        <textarea
          value={s}
          disabled={!!end}
          onPaste={(e) => e.preventDefault()}
          onChange={(e) => {
            if (!start) begin(performance.now());
            set(e.target.value);
            if (e.target.value === sample) finish(performance.now());
          }}
        />
      </label>
      <p>
        {end
          ? "Speed: " +
            Math.round(
              ((sample.length / 5) * 60000) / Math.max(1, end - start),
            ) +
            " WPM"
          : sample.startsWith(s)
            ? s.length + " / " + sample.length + " characters"
            : "Check the highlighted sentence and correct your text."}
      </p>
      <button
        onClick={() => {
          set("");
          begin(null);
          finish(null);
        }}
      >
        Restart
      </button>
    </div>
  );
}
const custom = (id, description, Component) => ({ id, description, Component });
export default [
  custom(
    "text-to-speech",
    "Read text aloud using an installed browser voice.",
    Speech,
  ),
  custom(
    "audio-voice-recorder",
    "Record microphone audio and download the result.",
    Recorder,
  ),
  custom(
    "screen-recorder",
    "Capture a screen or tab you select and download the recording.",
    Recorder,
  ),
  custom(
    "audio-bpm-tap-detector",
    "Tap along to estimate beats per minute.",
    Tap,
  ),
  custom(
    "web-audio-synth-studio",
    "Listen to a waveform at a chosen frequency.",
    Tone,
  ),
  custom("memory-match", "Find eight matching pairs.", Memory),
  custom("keycode-info", "Inspect keyboard codes and modifiers.", Keycode),
  custom(
    "typing-speed-test",
    "Type a sample and measure completion speed.",
    Typing,
  ),
];
