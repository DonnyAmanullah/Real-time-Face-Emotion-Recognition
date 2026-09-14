import sys
import types
import os
os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"
import importlib.util

# Compatibility shim jika pkg_resources tidak ada di environment (misal di uv / modern Python)
if "pkg_resources" not in sys.modules:
    try:
        import pkg_resources
    except ImportError:
        mock_pkg = types.ModuleType("pkg_resources")
        def _resource_filename(package_or_req, resource_name):
            spec = importlib.util.find_spec(package_or_req)
            if spec and spec.origin:
                base_dir = os.path.dirname(spec.origin)
                return os.path.join(base_dir, resource_name)
            return resource_name
        mock_pkg.resource_filename = _resource_filename
        sys.modules["pkg_resources"] = mock_pkg

import cv2
import numpy as np
import streamlit as st
import pandas as pd
from PIL import Image
import time
from fer import FER


# -------------------------------------------------------------
# Konfigurasi Halaman Streamlit
# -------------------------------------------------------------
st.set_page_config(
    page_title="Facial Emotion Recognition",
    page_icon="😊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# -------------------------------------------------------------
# Custom Styling (Futuristik & Modern)
# -------------------------------------------------------------
st.markdown("""
<style>
    .main-header {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-weight: 700;
        color: #00ADB5;
        font-size: 2.2rem;
        margin-bottom: 0.2rem;
    }
    .sub-header {
        color: #A6B1E1;
        font-size: 1.0rem;
        margin-bottom: 1.5rem;
    }
    .emotion-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
    }
    .dominant-badge {
        display: inline-block;
        font-size: 1.4rem;
        font-weight: 700;
        padding: 6px 18px;
        border-radius: 20px;
        background: linear-gradient(135deg, #00ADB5, #393E46);
        color: #EEEEEE;
        margin: 10px 0;
    }
</style>
""", unsafe_allow_html=True)

# -------------------------------------------------------------
# Cache Model FER agar tidak reload berulang kali
# -------------------------------------------------------------
@st.cache_resource(show_spinner="Memuat model deteksi emosi (FER)...")
def load_detector(use_mtcnn=False):
    """
    Load FER detector.
    use_mtcnn=False menggunakan OpenCV Haar Cascade (jauh lebih cepat untuk real-time).
    use_mtcnn=True menggunakan MTCNN (lebih akurat untuk foto/gambar statis).
    """
    return FER(mtcnn=use_mtcnn)

# -------------------------------------------------------------
# Dictionary Warna & Emoticon untuk Setiap Emosi
# -------------------------------------------------------------
EMOTION_META = {
    "happy":    {"emoji": "😄", "color": (46, 204, 113),  "label_id": "Senang"},
    "neutral":  {"emoji": "😐", "color": (149, 165, 166), "label_id": "Netral"},
    "surprise": {"emoji": "😲", "color": (241, 196, 15),  "label_id": "Terkejut"},
    "sad":      {"emoji": "😢", "color": (52, 152, 219),  "label_id": "Sedih"},
    "angry":    {"emoji": "😠", "color": (231, 76, 60),   "label_id": "Marah"},
    "fear":     {"emoji": "😨", "color": (155, 89, 182),  "label_id": "Takut"},
    "disgust":  {"emoji": "🤢", "color": (230, 126, 34),  "label_id": "Jijik"}
}

def annotate_frame(image_rgb, detector):
    """
    Mendeteksi emosi pada gambar RGB, menggambar bounding box, dan mengembalikan hasil.
    """
    predictions = detector.detect_emotions(image_rgb)
    annotated_img = image_rgb.copy()
    
    faces_data = []
    
    for i, pred in enumerate(predictions):
        (x, y, w, h) = pred["box"]
        emotions = pred["emotions"]
        dominant_emotion = max(emotions, key=emotions.get)
        dominant_score = emotions[dominant_emotion]
        
        meta = EMOTION_META.get(dominant_emotion, {"emoji": "🎭", "color": (0, 255, 0), "label_id": dominant_emotion.title()})
        bgr_color = meta["color"]
        rgb_color = (bgr_color[2], bgr_color[1], bgr_color[0]) # invert to RGB for display
        
        # Gambar Bounding Box
        cv2.rectangle(annotated_img, (x, y), (x + w, y + h), rgb_color, 3)
        
        # Label emosi di atas kotak wajah
        label = f"{meta['emoji']} {dominant_emotion.upper()} ({int(dominant_score * 100)}%)"
        
        # Background teks label
        (text_w, text_h), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
        cv2.rectangle(annotated_img, (x, y - text_h - 12), (x + text_w + 10, y), rgb_color, -1)
        cv2.putText(annotated_img, label, (x + 5, y - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2, cv2.LINE_AA)
        
        faces_data.append({
            "face_index": i + 1,
            "dominant": dominant_emotion,
            "score": dominant_score,
            "emotions": emotions
        })
        
    return annotated_img, faces_data

# -------------------------------------------------------------
# Sidebar Kontrol
# -------------------------------------------------------------
with st.sidebar:
    st.image("https://img.icons8.com/clouds/200/facial-recognition-scan.png", width=110)
    st.title("Pengaturan Sistem")
    
    mode = st.radio(
        "Pilih Mode Input:",
        ("📹 Webcam Real-Time", "📸 Ambil Foto (Snapshot)", "📁 Upload Gambar"),
        index=0
    )
    
    st.markdown("---")
    use_mtcnn = st.checkbox(
        "Gunakan MTCNN (Deteksi Wajah Lebih Akurat)",
        value=False,
        help="MTCNN lebih akurat namun lebih lambat. Default menggunakan Haar Cascade yang sangat responsif untuk webcam real-time."
    )
    
    st.markdown("---")
    st.caption("Proyek UAS Computer Vision: Real-time Face Emotion Recognition")

# Load model sesuai opsi
detector = load_detector(use_mtcnn=use_mtcnn)

# -------------------------------------------------------------
# Tampilan Utama
# -------------------------------------------------------------
st.markdown('<div class="main-header">🎭 Real-Time Facial Emotion Recognition</div>', unsafe_allow_html=True)
st.markdown('<div class="sub-header">Aplikasi pendeteksi emosi wajah secara real-time berbasis Deep Learning & Streamlit</div>', unsafe_allow_html=True)

# -------------------------------------------------------------
# MODE 1: Webcam Real-Time
# -------------------------------------------------------------
if mode == "📹 Webcam Real-Time":
    st.info("💡 **Catatan Penggunaan:** Mode streaming OpenCV ini berjalan jika aplikasi diakses di laptop/PC lokal (`localhost`). Jika sedang dibuka melalui **Streamlit Cloud**, gunakan mode **📸 Ambil Foto (Snapshot)** untuk mengakses kamera browser Anda.")
    
    col_ctrl1, col_ctrl2 = st.columns([1, 4])
    with col_ctrl1:
        run_webcam = st.toggle("🔴 Aktifkan Webcam", value=False)
        camera_idx = st.number_input("Pilih Index Kamera", min_value=0, max_value=5, value=0, step=1)
    
    col_video, col_stats = st.columns([3, 2])
    
    video_placeholder = col_video.empty()
    stats_placeholder = col_stats.empty()
    
    if run_webcam:
        cap = cv2.VideoCapture(camera_idx)
        
        if not cap.isOpened():
            st.error(f"Gagal membuka kamera index {camera_idx}. Pastikan kamera terpasang dan tidak sedang digunakan oleh aplikasi lain.")
        else:
            stop_warning = col_video.caption("Untuk menghentikan streaming, matikan toggle 'Aktifkan Webcam'.")
            
            while run_webcam:
                ret, frame = cap.read()
                if not ret:
                    st.warning("Tidak dapat membaca frame dari kamera.")
                    break
                
                # Flip horizontal agar seperti cermin
                frame = cv2.flip(frame, 1)
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                
                # Deteksi emosi & anotasi frame
                annotated_frame, faces = annotate_frame(rgb_frame, detector)
                
                # Update gambar video di Streamlit
                video_placeholder.image(annotated_frame, channels="RGB", use_container_width=True)
                
                # Update visualisasi emosi di kolom kanan
                with stats_placeholder.container():
                    if faces:
                        for face in faces:
                            dom = face["dominant"]
                            meta = EMOTION_META.get(dom, {"emoji": "🎭", "label_id": dom})
                            st.markdown(f"### Wajah #{face['face_index']}: {meta['emoji']} **{dom.upper()}** ({int(face['score']*100)}%)")
                            
                            # Tampilkan 7 Progress Bar Emosi
                            for emo, score in face["emotions"].items():
                                m = EMOTION_META.get(emo, {"emoji": ""})
                                pct = int(score * 100)
                                st.write(f"{m['emoji']} **{emo.capitalize()}**: {pct}%")
                                st.progress(score)
                    else:
                        st.markdown("🔍 *Mencari wajah di kamera...*")
                
                time.sleep(0.03)  # Interval pemrosesan frame
                
            cap.release()
            video_placeholder.empty()
            stats_placeholder.empty()

# -------------------------------------------------------------
# MODE 2: Ambil Foto (Snapshot)
# -------------------------------------------------------------
elif mode == "📸 Ambil Foto (Snapshot)":
    st.write("Gunakan kamera browser Anda untuk mengambil gambar secara langsung:")
    camera_photo = st.camera_input("Ambil Foto")
    
    if camera_photo is not None:
        image = Image.open(camera_photo)
        image_np = np.array(image.convert("RGB"))
        
        with st.spinner("Menganalisis emosi wajah..."):
            annotated_img, faces = annotate_frame(image_np, detector)
            
        col_img, col_detail = st.columns([3, 2])
        col_img.image(annotated_img, caption="Hasil Deteksi Emosi", use_container_width=True)
        
        with col_detail:
            if faces:
                st.subheader("📊 Analisis Emosi Terdeteksi:")
                for face in faces:
                    dom = face["dominant"]
                    meta = EMOTION_META.get(dom, {"emoji": "🎭", "label_id": dom})
                    st.success(f"Emosi Dominan: {meta['emoji']} **{dom.upper()}** ({int(face['score']*100)}%)")
                    
                    df = pd.DataFrame({
                        "Emosi": [e.capitalize() for e in face["emotions"].keys()],
                        "Probabilitas (%)": [round(s * 100, 1) for s in face["emotions"].values()]
                    })
                    st.bar_chart(df.set_index("Emosi"))
            else:
                st.warning("Tidak ada wajah yang terdeteksi pada foto ini. Pastikan wajah terlihat jelas dan cukup cahaya.")

# -------------------------------------------------------------
# MODE 3: Upload Gambar
# -------------------------------------------------------------
elif mode == "📁 Upload Gambar":
    uploaded_file = st.file_uploader("Pilih file gambar wajah (JPG, PNG, JPEG, WEBP):", type=["jpg", "png", "jpeg", "webp"])
    
    if uploaded_file is not None:
        image = Image.open(uploaded_file)
        image_np = np.array(image.convert("RGB"))
        
        with st.spinner("Menganalisis emosi wajah pada gambar..."):
            annotated_img, faces = annotate_frame(image_np, detector)
            
        col_img, col_detail = st.columns([3, 2])
        col_img.image(annotated_img, caption="Hasil Deteksi Emosi", use_container_width=True)
        
        with col_detail:
            if faces:
                st.subheader("📊 Analisis Emosi Terdeteksi:")
                for face in faces:
                    dom = face["dominant"]
                    meta = EMOTION_META.get(dom, {"emoji": "🎭", "label_id": dom})
                    st.success(f"Wajah #{face['face_index']}: {meta['emoji']} **{dom.upper()}** ({int(face['score']*100)}%)")
                    
                    df = pd.DataFrame({
                        "Emosi": [e.capitalize() for e in face["emotions"].keys()],
                        "Probabilitas (%)": [round(s * 100, 1) for s in face["emotions"].values()]
                    })
                    st.bar_chart(df.set_index("Emosi"))
            else:
                st.warning("Tidak ada wajah yang terdeteksi pada gambar ini. Pastikan wajah menghadap kamera dan tidak terhalang.")
