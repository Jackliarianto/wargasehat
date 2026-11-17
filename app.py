import time
import itertools
from datetime import datetime
from flask import Flask, render_template, request, jsonify
from google import genai
from google.genai import types

app = Flask(__name__)

# Masukkan API Key kamu di sini
GEMINI_API_KEY = "AQ.Ab8RN6IbippE0KvwoMXpeP5l1s3kD4MLrafvYq9EmP9E0PZoCA"

client = genai.Client(api_key=GEMINI_API_KEY)

nomor_antrean = itertools.count(1)
laporan = []
jurnal_demo = []
voting = {"setuju": 0, "tidak_setuju": 0}
riwayat_chat = []


def daftar_model_gemini():
    """Mengambil daftar model Gemini aktif dari akun API key ini."""
    model_aktif = ["gemini-3.8-flash"]
    try:
        for m in client.models.list():
            nama = m.name.replace("models/", "")
            if "gemini" in nama and not any(x in nama for x in ["embedding", "imagen", "veo", "aqa", "tts"]):
                if nama not in model_aktif:
                    model_aktif.append(nama)
    except Exception:
        pass
    return model_aktif


@app.route("/")
def index():
    return render_template("index.html")


@app.post("/api/chat")
def chat_psikolog():
    data = request.get_json(silent=True) or {}
    pesan_user = (data.get("pesan") or "").strip()
    mode_video = bool(data.get("video_call", False))

    if not pesan_user:
        return jsonify({"ok": False, "balasan": "Pesan tidak boleh kosong."}), 400

    # Simpan pesan user ke riwayat agar percakapan nyambung seperti Gemini AI
    riwayat_chat.append(types.Content(role="user", parts=[types.Part.from_text(text=pesan_user)]))
    # Batasi 20 pesan terakhir agar tetap ringan dan cepat
    konteks_chat = riwayat_chat[-20:]

    # Sesuaikan gaya bahasa antara mode video call (lisan) dan chat biasa
    if mode_video:
        instruksi_sistem = (
            "Kamu adalah seorang psikolog manusia di Indonesia yang sedang berbicara langsung dalam sesi video call. "
            "Gunakan bahasa Indonesia sehari-hari yang sopan, hangat, empatik, dan natural seperti manusia sungguhan berbicara. "
            "Jangan gunakan simbol markdown seperti tanda bintang, pagar, garis miring, atau poin-poin daftar. "
            "Gunakan kalimat pendek hingga sedang yang nyaman didengar saat diucapkan secara lisan, dengan tanda baca koma dan titik yang jelas."
        )
    else:
        instruksi_sistem = (
            "Kamu adalah Gemini AI yang cerdas, ramah, membantu, dan komunikatif. "
            "Jawablah setiap pertanyaan atau cerita pengguna dalam bahasa Indonesia "
            "secara natural, relevan, dan sesuai dengan keinginan pengguna."
        )

    semua_model = daftar_model_gemini()
    error_terakhir = ""

    for nama_model in semua_model:
        # Coba maksimal 3 kali jika terkena lonjakan trafik 503
        for percobaan in range(3):
            try:
                response = client.models.generate_content(
                    model=nama_model,
                    contents=konteks_chat,
                    config=types.GenerateContentConfig(
                        system_instruction=instruksi_sistem,
                        temperature=0.8
                    )
                )
                teks_balasan = (response.text or "").strip()
                if teks_balasan:
                    # Simpan balasan AI ke riwayat percakapan
                    riwayat_chat.append(
                        types.Content(role="model", parts=[types.Part.from_text(text=teks_balasan)])
                    )
                    return jsonify({"ok": True, "balasan": teks_balasan, "reply": teks_balasan})
            except Exception as err:
                error_terakhir = f"[{nama_model}] {str(err)}"
                print("ERROR GEMINI:", error_terakhir)
                if "503" in error_terakhir or "UNAVAILABLE" in error_terakhir:
                    time.sleep(1.5)
                    continue
                # Jika model tidak mendukung generateContent (404/400), langsung pindah ke model berikutnya
                break

    # Hapus pesan user terakhir dari riwayat jika gagal agar tidak menumpuk
    if riwayat_chat and riwayat_chat[-1].role == "user":
        riwayat_chat.pop()

    pesan_gagal = (
        "Maaf, koneksi sedang sedikit padat. Boleh ulangi ceritamu pelan-pelan?"
        if mode_video
        else f"Server Gemini sedang sangat padat (503). Silakan klik Kirim ulang dalam beberapa detik.\nDetail: {error_terakhir}"
    )

    return jsonify({
        "ok": True,
        "balasan": pesan_gagal,
        "reply": pesan_gagal
    })


@app.post("/api/antrean")
def buat_antrean():
    data = request.get_json(silent=True) or {}
    nama = (data.get("nama") or data.get("nama_panggilan") or "Warga").strip()

    layanan = (
        data.get("layanan")
        or data.get("jenis_layanan")
        or data.get("poli")
        or data.get("unit")
        or data.get("klinik")
        or data.get("service")
        or "Poli Umum"
    ).strip()

    nomor = next(nomor_antrean)
    estimasi_menit = nomor * 10
    jam_sekarang = datetime.now().strftime("%H:%M")
    info = f"Atas nama {nama} (diambil pukul {jam_sekarang})."

    return jsonify({
        "ok": True,
        "nomor": f"A-{nomor:03d}",
        "nama": nama,
        "layanan": layanan,
        "jenis_layanan": layanan,
        "poli": layanan,
        "unit": layanan,
        "klinik": layanan,
        "departemen": layanan,
        "bagian": layanan,
        "service": layanan,
        "estimasi": estimasi_menit,
        "estimasi_menit": estimasi_menit,
        "menit": estimasi_menit,
        "catatan": info,
        "pesan": info,
        "keterangan": info
    })


@app.get("/api/laporan")
def ambil_laporan():
    return jsonify({"ok": True, "laporan": laporan, "voting": voting})


@app.post("/api/laporan")
def tambah_laporan():
    data = request.get_json(silent=True) or {}
    item = {
        "id": len(laporan) + 1,
        "judul": data.get("judul", ""),
        "isi": data.get("isi", ""),
        "waktu": datetime.now().strftime("%d/%m/%Y %H:%M")
    }
    laporan.append(item)
    return jsonify({"ok": True, "item": item})


@app.post("/api/voting")
def kirim_voting():
    data = request.get_json(silent=True) or {}
    pilihan = data.get("pilihan")
    if pilihan in voting:
        voting[pilihan] += 1
    return jsonify({"ok": True, "voting": voting})


if __name__ == "__main__":
    app.run(debug=True, port=5000)