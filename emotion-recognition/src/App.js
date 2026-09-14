import React, { useRef, useEffect } from "react";
import "./App.css";
// ✅ HAPUS: import logo from './logo.svg'; — tidak dipakai lagi
import * as tf from "@tensorflow/tfjs";
import Webcam from "react-webcam";
import { drawMesh } from "./utilities";

// ── Konfigurasi 7 emosi (urutan sesuai FER model) ───────────────
const EMOTION_CONFIG = [
  { id: "Angry",    label: "ANGRY",    colorClass: "angry"    },
  { id: "Neutral",  label: "NEUTRAL",  colorClass: "neutral"  },
  { id: "Happy",    label: "HAPPY",    colorClass: "happy"    },
  { id: "Fear",     label: "FEAR",     colorClass: "fear"     },
  { id: "Surprise", label: "SURPRISE", colorClass: "surprise" },
  { id: "Sad",      label: "SAD",      colorClass: "sad"      },
  { id: "Disgust",  label: "DISGUST",  colorClass: "disgust"  },
];

function App() {
  const webcamRef     = useRef(null);
  const canvasRef     = useRef(null);
  const frameCountRef = useRef(0);          // ✅ BARU: frame counter
  const blazeface     = require("@tensorflow-models/blazeface");

  // ────────────────────────────────────────────────────────────────
  // TIDAK DIUBAH: Load model Blazeface
  // ────────────────────────────────────────────────────────────────
  const runFaceDetectorModel = async () => {
    const model = await blazeface.load();
    console.log("FaceDetection Model is Loaded..");
    setInterval(() => {
      detect(model);
    }, 100);
  };

  // ────────────────────────────────────────────────────────────────
  // TIDAK DIUBAH (+ penambahan kecil): detect()
  // Penambahan: frame counter, percentage labels, uppercase emotion,
  //             status dot connected
  // ────────────────────────────────────────────────────────────────
  const detect = async (net) => {
    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      const video       = webcamRef.current.video;
      const videoWidth  = webcamRef.current.video.videoWidth;
      const videoHeight = webcamRef.current.video.videoHeight;

      webcamRef.current.video.width  = videoWidth;
      webcamRef.current.video.height = videoHeight;
      canvasRef.current.width        = videoWidth;
      canvasRef.current.height       = videoHeight;

      const face = await net.estimateFaces(video);

      // ✅ BARU: increment dan tampilkan frame counter
      frameCountRef.current += 1;
      const fcEl = document.getElementById("frame-counter");
      if (fcEl) {
        fcEl.textContent =
          "FRAME: " + String(frameCountRef.current).padStart(5, "0");
      }

      // ── TIDAK DIUBAH: WebSocket ──────────────────────────────────
      var socket   = new WebSocket("ws://localhost:8000");
      var imageSrc = webcamRef.current.getScreenshot();
      var apiCall  = {
        event: "localhost:subscribe",
        data : { image: imageSrc },
      };

      socket.onopen = () => {
        socket.send(JSON.stringify(apiCall));

        // ✅ BARU: tandai status dot sebagai connected
        const dot = document.getElementById("conn-dot");
        if (dot) dot.classList.add("connected");
      };

      socket.onmessage = function (event) {
        var pred_log = JSON.parse(event.data);

        // ── TIDAK DIUBAH: update progress bars ──────────────────────
        document.getElementById("Angry").value =
          Math.round(pred_log["predictions"]["angry"]    * 100);
        document.getElementById("Neutral").value =
          Math.round(pred_log["predictions"]["neutral"]  * 100);
        document.getElementById("Happy").value =
          Math.round(pred_log["predictions"]["happy"]    * 100);
        document.getElementById("Fear").value =
          Math.round(pred_log["predictions"]["fear"]     * 100);
        document.getElementById("Surprise").value =
          Math.round(pred_log["predictions"]["surprise"] * 100);
        document.getElementById("Sad").value =
          Math.round(pred_log["predictions"]["sad"]      * 100);
        document.getElementById("Disgust").value =
          Math.round(pred_log["predictions"]["disgust"]  * 100);

        // ── TIDAK DIUBAH: dominant emotion — ✅ +toUpperCase() ──────
        document.getElementById("emotion_text").value =
          pred_log["emotion"].toUpperCase();

        // ✅ BARU: update label persentase di sebelah kanan bar
        document.getElementById("Angry_pct").textContent =
          Math.round(pred_log["predictions"]["angry"]    * 100) + "%";
        document.getElementById("Neutral_pct").textContent =
          Math.round(pred_log["predictions"]["neutral"]  * 100) + "%";
        document.getElementById("Happy_pct").textContent =
          Math.round(pred_log["predictions"]["happy"]    * 100) + "%";
        document.getElementById("Fear_pct").textContent =
          Math.round(pred_log["predictions"]["fear"]     * 100) + "%";
        document.getElementById("Surprise_pct").textContent =
          Math.round(pred_log["predictions"]["surprise"] * 100) + "%";
        document.getElementById("Sad_pct").textContent =
          Math.round(pred_log["predictions"]["sad"]      * 100) + "%";
        document.getElementById("Disgust_pct").textContent =
          Math.round(pred_log["predictions"]["disgust"]  * 100) + "%";

        // ── TIDAK DIUBAH: render face detection ─────────────────────
        const ctx = canvasRef.current.getContext("2d");
        requestAnimationFrame(() => {
          drawMesh(face, pred_log, ctx);
        });
      };
    }
  };

  // ── TIDAK DIUBAH: init model ─────────────────────────────────────
  useEffect(() => {
    runFaceDetectorModel();
  }, []); // eslint-disable-line

  // ✅ BARU: system clock — update setiap detik
  useEffect(() => {
    const pad  = (n) => String(n).padStart(2, "0");
    const tick = () => {
      const now = new Date();
      const el  = document.getElementById("sys-clock");
      if (el) {
        el.textContent =
          pad(now.getHours()) + ":" +
          pad(now.getMinutes()) + ":" +
          pad(now.getSeconds());
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  // ══════════════════════════════════════════════════════════════════
  // JSX — Futuristic HUD Layout
  // ID yang WAJIB dipertahankan agar JS tetap berfungsi:
  //   progress: Angry, Neutral, Happy, Fear, Surprise, Sad, Disgust
  //   input   : emotion_text
  //   span    : Angry_pct, Neutral_pct, dst
  //   nav     : conn-dot, sys-clock
  //   div     : frame-counter
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="App">

      {/* ══ TOP NAVIGATION ══════════════════════════════════════════ */}
      <nav className="hud-nav">
        <div className="brand">
          <div className="brand-icon">⚡</div>
          <div className="brand-text">
            <span className="brand-name">FACEEMO</span>
            <span className="brand-tagline">REAL-TIME EMOTION RECOGNITION</span>
          </div>
        </div>

        <div className="nav-right">
          <span className="sys-clock-label">
            SYS:{" "}
            <span id="sys-clock" className="sys-clock-value">
              00:00:00
            </span>
          </span>
          <div className="status-badge">
            {/* conn-dot mendapat class "connected" via socket.onopen */}
            <span className="status-dot" id="conn-dot"></span>
            <span className="status-label">ONLINE</span>
          </div>
        </div>
      </nav>

      {/* ══ MAIN CONTENT ════════════════════════════════════════════ */}
      <main className="hud-main">

        {/* ── KIRI: Webcam + Dominant Emotion ──────────────────────── */}
        <section className="cam-section">
          <div className="cam-inner">
            {/* Sudut HUD kamera */}
            <div className="corner corner-tl"></div>
            <div className="corner corner-tr"></div>
            <div className="corner corner-bl"></div>
            <div className="corner corner-br"></div>

            {/* Garis scanner yang bergerak */}
            <div className="scan-line"></div>

            {/* Status tag atas */}
            <div className="cam-target-tag">▸ TARGET ACQUIRED</div>

            {/* Webcam — ukuran dan z-index TIDAK DIUBAH */}
            <Webcam
              ref={webcamRef}
              style={{
                position: "absolute",
                top     : 0,
                left    : 0,
                width   : 640,
                height  : 480,
                zIndex  : 1,
                display : "block",
              }}
            />

            {/* Canvas face detection overlay */}
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                top     : 0,
                left    : 0,
                width   : 640,
                height  : 480,
                zIndex  : 9,
              }}
            />

            {/* Info bar bawah */}
            <div className="cam-bottom-bar">
              <span id="frame-counter" className="cam-info">
                FRAME: 00000
              </span>
              <span className="cam-info cam-model">CNN2 · FER2013</span>
              <span className="cam-info">640 × 480</span>
            </div>
          </div>

          {/* Dominant Emotion — input ID "emotion_text" TIDAK DIUBAH */}
          <div className="dom-strip">
            <span className="dom-label">DOMINANT EMOTION</span>
            <div className="dom-divider"></div>
            <input
              id="emotion_text"
              className="dom-value"
              defaultValue="DETECTING..."
              readOnly
            />
          </div>
        </section>

        {/* ── KANAN: Emotion Analysis Panel ───────────────────────── */}
        <section className="emo-panel">

          <div className="panel-hdr">
            <div className="panel-title">EMOTION ANALYSIS</div>
            <div className="panel-sub">NEURAL INFERENCE ACTIVE</div>
          </div>

          {/* Metrik akurasi model */}
          <div className="sys-metrics">
            <div className="metric">
              <div className="metric-label">ACCURACY</div>
              <div className="metric-val">60.3%</div>
            </div>
            <div className="metric">
              <div className="metric-label">CLASSES</div>
              <div className="metric-val">7</div>
            </div>
            <div className="metric">
              <div className="metric-label">LATENCY</div>
              <div className="metric-val">~150ms</div>
            </div>
          </div>

          {/* 7 Emotion Rows — dibangun dari EMOTION_CONFIG array */}
          <div className="emo-list">
            {EMOTION_CONFIG.map((e) => (
              <div className="emo-row" key={e.id}>
                <span className={`emo-dot ${e.colorClass}-dot`}></span>
                <span className={`emo-name ${e.colorClass}-name`}>
                  {e.label}
                </span>
                {/* progress ID WAJIB sama: Angry, Neutral, dst */}
                <div className="bar-wrapper">
                  <progress id={e.id} value="0" max="100"></progress>
                </div>
                {/* span ID: Angry_pct, Neutral_pct, dst */}
                <span
                  id={`${e.id}_pct`}
                  className={`emo-pct ${e.colorClass}-pct`}
                >
                  0%
                </span>
              </div>
            ))}
          </div>

          <div className="panel-footer">
            <span className="footer-text">TF.JS · BLAZEFACE · FASTAPI</span>
            <span className="footer-text">WS://CONNECTED</span>
          </div>

        </section>
      </main>
    </div>
  );
}

export default App;