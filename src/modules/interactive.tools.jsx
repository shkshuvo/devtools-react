import React, { useEffect, useRef, useState } from "react";
const display = (ms) => {
  const t = Math.max(0, Math.floor(ms));
  return (
    [
      Math.floor(t / 3600000),
      Math.floor(t / 60000) % 60,
      Math.floor(t / 1000) % 60,
    ]
      .map((v) => String(v).padStart(2, "0"))
      .join(":") +
    "." +
    String(t % 1000).padStart(3, "0")
  );
};
function Timer({ id }) {
  const stopwatch = id === "stopwatch-lap-timer";
  const [minutes, setMinutes] = useState(id === "pomodoro-timer" ? 25 : 5),
    [elapsed, setElapsed] = useState(0),
    [started, setStarted] = useState(null),
    [now, tick] = useState(Date.now),
    [laps, setLaps] = useState([]);
  const total = elapsed + (started === null ? 0 : Math.max(0, now - started));
  useEffect(() => {
    if (started === null) return;
    const it = setInterval(() => tick(Date.now()), 50);
    return () => clearInterval(it);
  }, [started]);
  useEffect(() => {
    if (!stopwatch && started !== null && total >= minutes * 60000) {
      setStarted(null);
      setElapsed(minutes * 60000);
    }
  }, [total, minutes, started, stopwatch]);
  function reset() {
    setStarted(null);
    setElapsed(0);
    setLaps([]);
  }
  return (
    <div className="panel">
      {!stopwatch && (
        <label>
          Duration (minutes)
          <input
            type="number"
            min="0.01"
            max="1439"
            step="any"
            value={minutes}
            disabled={started !== null}
            onChange={(e) => {
              setMinutes(e.target.value);
              reset();
            }}
          />
        </label>
      )}
      <output className="clock">
        {display(stopwatch ? total : minutes * 60000 - total)}
      </output>
      <div className="actions">
        <button
          className="primary"
          disabled={!stopwatch && !(minutes > 0 && minutes < 1440)}
          onClick={() => {
            const n = Date.now();
            if (started === null) {
              if (!stopwatch && elapsed >= minutes * 60000) setElapsed(0);
              tick(n);
              setStarted(n);
            } else {
              setElapsed(elapsed + n - started);
              setStarted(null);
            }
          }}
        >
          {started === null ? "Start" : "Pause"}
        </button>
        <button onClick={reset}>Reset</button>
        {stopwatch && (
          <button onClick={() => setLaps([...laps, display(total)])}>
            Lap
          </button>
        )}
        <button
          onClick={(e) =>
            e.currentTarget.closest(".panel").requestFullscreen?.()
          }
        >
          Full screen
        </button>
      </div>
      <ol>
        {laps.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ol>
    </div>
  );
}
function Ruler() {
  const [scale, setScale] = useState(
    Number(localStorage.getItem("ruler-scale")) || 37.8,
  );
  return (
    <div className="panel">
      <label>
        Calibration · pixels per centimetre
        <input
          type="range"
          min="20"
          max="110"
          step=".1"
          value={scale}
          onChange={(e) => {
            setScale(+e.target.value);
            localStorage.setItem("ruler-scale", e.target.value);
          }}
        />
      </label>
      <p>
        Adjust until the line below matches the long edge of a standard payment
        card (85.60 mm).
      </p>
      <hr
        style={{
          width: scale * 8.56,
          maxWidth: "none",
          marginLeft: 0,
          border: "2px solid var(--primary)",
        }}
      />
      <div className="ruler">
        {Array.from({ length: 21 }, (_, i) => (
          <span key={i} style={{ minWidth: scale }}>
            {i}
          </span>
        ))}
      </div>
      <small>Centimetres</small>
    </div>
  );
}
function Compass() {
  const [value, setValue] = useState("Awaiting permission"),
    cleanup = useRef(() => {});
  useEffect(() => () => cleanup.current(), []);
  async function start() {
    try {
      cleanup.current();
      if (!window.DeviceOrientationEvent)
        throw Error("This device does not expose orientation readings.");
      if (
        DeviceOrientationEvent.requestPermission &&
        (await DeviceOrientationEvent.requestPermission()) !== "granted"
      )
        throw Error("Permission was declined.");
      const fn = (e) => {
        const h =
          e.webkitCompassHeading ??
          (e.absolute && e.alpha != null ? (360 - e.alpha) % 360 : null);
        setValue(
          h === null ? "Absolute heading unavailable" : Math.round(h) + "°",
        );
      };
      const type =
        "ondeviceorientationabsolute" in window
          ? "deviceorientationabsolute"
          : "deviceorientation";
      window.addEventListener(type, fn);
      cleanup.current = () => window.removeEventListener(type, fn);
      setValue("Waiting for absolute heading…");
    } catch (e) {
      setValue(e.message);
    }
  }
  return (
    <div className="panel">
      <output className="reading">{value}</output>
      <button onClick={start}>Enable compass</button>
    </div>
  );
}
function Meter() {
  const [reading, setReading] = useState("Stopped"),
    [on, setOn] = useState(false);
  useEffect(() => {
    if (!on) return;
    let alive = true,
      stream,
      ctx,
      raf;
    async function listen() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!alive) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        ctx = new AudioContext();
        await ctx.resume();
        if (!alive) return;
        const analyser = ctx.createAnalyser();
        ctx.createMediaStreamSource(stream).connect(analyser);
        const samples = new Float32Array(analyser.fftSize);
        function frame() {
          analyser.getFloatTimeDomainData(samples);
          const rms = Math.sqrt(
            samples.reduce((s, x) => s + x * x, 0) / samples.length,
          );
          setReading(
            rms ? (20 * Math.log10(rms)).toFixed(1) + " dBFS" : "Silence",
          );
          raf = requestAnimationFrame(frame);
        }
        frame();
      } catch (e) {
        if (alive) {
          setReading(e.message);
          setOn(false);
        }
      }
    }
    listen();
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close();
    };
  }, [on]);
  return (
    <div className="panel">
      <p>
        Microphone signal level in dBFS. Sound-pressure measurement requires
        calibration.
      </p>
      <output className="reading">{reading}</output>
      <button
        onClick={() => {
          if (on) setReading("Stopped");
          setOn(!on);
        }}
      >
        {on ? "Stop microphone" : "Enable microphone"}
      </button>
    </div>
  );
}
function WorldClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="grid">
      {[
        "Asia/Dhaka",
        "Asia/Tokyo",
        "Europe/London",
        "America/New_York",
        "Australia/Sydney",
        "UTC",
      ].map((zone) => (
        <div className="card" key={zone}>
          <small>{zone}</small>
          <h2>{now.toLocaleTimeString("en-GB", { timeZone: zone })}</h2>
          <p>
            {now.toLocaleDateString("en-GB", {
              timeZone: zone,
              dateStyle: "full",
            })}
          </p>
        </div>
      ))}
    </div>
  );
}
function Tracker({ id }) {
  const key = "records:" + id,
    [items, setItems] = useState(() =>
      JSON.parse(localStorage.getItem(key) || "[]"),
    ),
    [name, setName] = useState(""),
    [date, setDate] = useState(new Date().toLocaleDateString("en-CA")),
    [amount, setAmount] = useState("");
  const save = (a) => {
    setItems(a);
    localStorage.setItem(key, JSON.stringify(a));
  };
  return (
    <div className="panel">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          save([
            ...items,
            {
              id: crypto.randomUUID(),
              name: name.trim(),
              date,
              amount,
              status: "Pending",
            },
          ]);
          setName("");
        }}
      >
        <label>
          {id === "bill-tracker" ? "Bill name" : "Supplement or medication"}
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Scheduled date
          <input
            type="date"
            value={date}
            required
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        {id === "bill-tracker" && (
          <label>
            Amount
            <input
              type="number"
              min="0"
              step=".01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
        )}
        <button className="primary">Add entry</button>
      </form>
      <div className="records">
        {[...items]
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((t) => (
            <div key={t.id}>
              <strong>{t.name}</strong> · {t.date}{" "}
              {id === "bill-tracker" && t.amount}
              <select
                aria-label={"Status for " + t.name}
                value={t.status}
                onChange={(e) =>
                  save(
                    items.map((x) =>
                      x.id === t.id ? { ...x, status: e.target.value } : x,
                    ),
                  )
                }
              >
                {[
                  "Pending",
                  id === "bill-tracker" ? "Paid" : "Taken",
                  "Skipped",
                ].map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
              <button onClick={() => save(items.filter((x) => x.id !== t.id))}>
                Remove
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
const entry = (id, description, Component, extra = {}) => ({
  id,
  description,
  Component,
  ...extra,
});
export default [
  entry(
    "screen-ruler",
    "Calibrate an on-screen ruler for this display.",
    Ruler,
  ),
  entry(
    "digital-compass",
    "Read absolute heading from supported mobile sensors.",
    Compass,
  ),
  entry(
    "decibel-meter",
    "Monitor microphone signal levels in your browser.",
    Meter,
  ),
  entry(
    "world-time",
    "Compare live local times across six cities.",
    WorldClock,
    { name: "World Time Live", category: "time-productivity" },
  ),
  ...[
    "stopwatch-lap-timer",
    "fullscreen-countdown-timer",
    "pomodoro-timer",
  ].map((id) => entry(id, "Start, pause and reset a local timer.", Timer)),
  ...["bill-tracker", "pill-tracker"].map((id) =>
    entry(
      id,
      "Schedule dated entries and track their status on this device.",
      Tracker,
    ),
  ),
];
