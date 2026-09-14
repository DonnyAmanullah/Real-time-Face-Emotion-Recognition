// ================================================================
// utilities.js — HUD-style Face Detection Renderer
// Mengganti kotak persegi menjadi corner brackets ala military HUD
// ================================================================

const EMOTION_COLORS = {
  angry   : "#ff4060",
  neutral : "#00c878",
  happy   : "#ffb020",
  fear    : "#4098ff",
  surprise: "#c8a000",
  sad     : "#7a8898",
  disgust : "#f060b0",
};

const CORNER_SIZE = 20;  // panjang setiap kaki bracket dalam pixel

export const drawMesh = (predictions, emotions, ctx) => {
  if (!predictions || predictions.length === 0) return;

  const emo   = emotions["emotion"] || "neutral";
  const color = EMOTION_COLORS[emo] || "#00c4ff";
  const label = emo.toUpperCase();
  const CS    = CORNER_SIZE;

  predictions.forEach((pred) => {
    const [startX, startY] = pred.topLeft;
    const [endX,   endY  ] = pred.bottomRight;
    const w = endX - startX;
    const h = endY - startY;

    // ── 1. Semitransparent area fill ──────────────────────────────
    ctx.globalAlpha = 0.07;
    ctx.fillStyle   = color;
    ctx.fillRect(startX, startY, w, h);
    ctx.globalAlpha = 1;

    // ── 2. Setup glow untuk bracket ───────────────────────────────
    ctx.shadowColor  = color;
    ctx.shadowBlur   = 12;
    ctx.strokeStyle  = color;
    ctx.lineWidth    = 2;
    ctx.lineCap      = "square";

    // ── 3. Corner Brackets (4 sudut, bukan persegi penuh) ─────────

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(startX + CS, startY);
    ctx.lineTo(startX,       startY);
    ctx.lineTo(startX,       startY + CS);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(endX - CS, startY);
    ctx.lineTo(endX,       startY);
    ctx.lineTo(endX,       startY + CS);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(startX + CS, endY);
    ctx.lineTo(startX,       endY);
    ctx.lineTo(startX,       endY - CS);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(endX - CS, endY);
    ctx.lineTo(endX,       endY);
    ctx.lineTo(endX,       endY - CS);
    ctx.stroke();

    // ── 4. Center crosshair ───────────────────────────────────────
    ctx.shadowBlur   = 5;
    ctx.globalAlpha  = 0.45;
    ctx.strokeStyle  = color;
    ctx.lineWidth    = 1;

    const cx = startX + w / 2;
    const cy = startY + h / 2;

    // Lingkaran kecil di tengah wajah
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Tanda silang kecil
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy); ctx.lineTo(cx + 4, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - 4); ctx.lineTo(cx, cy + 4);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;

    // ── 5. Emotion label pill (di bawah face box) ─────────────────
    if (label) {
      ctx.font         = "bold 11px Orbitron, 'Share Tech Mono', monospace";
      ctx.shadowColor  = color;
      ctx.shadowBlur   = 8;

      const textW = ctx.measureText(label).width;
      const pillW = textW + 20;
      const pillH = 20;
      const pillX = cx - pillW / 2;
      const pillY = endY + 8;

      // Background pill
      ctx.globalAlpha = 0.92;
      ctx.fillStyle   = color;

      // Gunakan roundRect jika tersedia (Chrome 99+), fallback ke rect
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, 3);
        ctx.fill();
      } else {
        ctx.fillRect(pillX, pillY, pillW, pillH);
      }

      // Teks label
      ctx.shadowBlur   = 0;
      ctx.globalAlpha  = 1;
      ctx.fillStyle    = "#000000";
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, cx, pillY + pillH / 2);

      // Reset text state
      ctx.textAlign    = "left";
      ctx.textBaseline = "alphabetic";
    }

    // ── Reset seluruh canvas state ────────────────────────────────
    ctx.globalAlpha  = 1;
    ctx.shadowBlur   = 0;
    ctx.shadowColor  = "transparent";
    ctx.lineCap      = "butt";
  });
};