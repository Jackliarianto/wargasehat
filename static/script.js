const $ = id => document.getElementById(id);
let jurnalTerakhir = null;

// Mood tracker demo: localStorage hanya di browser perangkat ini.
function ambilJurnal() {
  try { return JSON.parse(localStorage.getItem("wargasehat_jurnal") || "[]"); }
  catch { return []; }
}
function renderJurnal() {
  const list = $("daftarMood");
  list.replaceChildren();
  const items = ambilJurnal();
  items.slice(0, 5).forEach(item => {
    const div = document.createElement("div");
    div.className = "result-item";
    const strong = document.createElement("strong");
    strong.textContent = `${item.mood} · ${item.tanggal}`;
    const p = document.createElement("p");
    p.textContent = item.catatan;
    div.append(strong, p);
    list.appendChild(div);
  });
  jurnalTerakhir = items[0] || null;
}
$("simpanMood").addEventListener("click", () => {
  const catatan = $("jurnal").value.trim();
  if (!catatan) return alert("Tulis catatan jurnal terlebih dahulu.");
  const item = {
    mood: $("mood").value,
    catatan,
    tanggal: new Date().toLocaleDateString("id-ID")
  };
  const items = ambilJurnal();
  items.unshift(item);
  try {
    localStorage.setItem("wargasehat_jurnal", JSON.stringify(items.slice(0, 30)));
    $("jurnal").value = "";
    renderJurnal();
    alert("Jurnal tersimpan di browser ini.");
  } catch {
    alert("Jurnal tidak dapat disimpan. Periksa pengaturan browser.");
  }
});
renderJurnal();

function tambahBubble(text, jenis) {
  const bubble = document.createElement("div");
  bubble.className = "bubble " + jenis;
  bubble.textContent = text;
  $("chat").appendChild(bubble);
  $("chat").scrollTop = $("chat").scrollHeight;
}

// Integrasi Chat Anonim Psikolog AI (Gemini)
$("chatForm").addEventListener("submit", async e => {
  e.preventDefault();
  const text = $("pesanChat").value.trim();
  if (!text) return;
  
  tambahBubble(text, "sent");
  $("pesanChat").value = "";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pesan: text })
    });
    const data = await response.json();
    tambahBubble(data.balasan || "Terima kasih telah berbagi cerita.", "received");
  } catch (err) {
    tambahBubble("Maaf, gagal terhubung ke server chat.", "received");
  }
});

// Integrasi Bagikan Jurnal ke AI Psikolog
$("bagikanJurnal").addEventListener("click", async () => {
  const item = jurnalTerakhir || ambilJurnal()[0];
  if (!item) return alert("Simpan jurnal terlebih dahulu.");
  if (!confirm("Tampilkan jurnal terbaru di chat demo?")) return;
  
  const pesanJurnal = `Berikut catatan jurnal saya hari ini (${item.tanggal}):\nMood: ${item.mood}\nCatatan: ${item.catatan}`;
  tambahBubble(pesanJurnal, "sent");

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pesan: pesanJurnal })
    });
    const data = await response.json();
    tambahBubble(data.balasan || "Jurnal berhasil diterima oleh AI Psikolog.", "received");
  } catch (err) {
    tambahBubble("Jurnal ditampilkan di chat, namun terjadi kendala pengiriman.", "received");
  }
});

// --- SIMULASI VIDEO CALL INTERAKTIF DENGAN PSIKOLOG (SUARA INDONESIA NATURAL) ---
(function initSimulasiVideoCall() {
  const tombolVideoCall =
    document.getElementById("mulaiVideoCall") ||
    Array.from(document.querySelectorAll("button")).find((btn) =>
      btn.textContent.toLowerCase().includes("video call")
    );

  if (!tombolVideoCall) return;

  const btnBaru = tombolVideoCall.cloneNode(true);
  tombolVideoCall.parentNode.replaceChild(btnBaru, tombolVideoCall);

  // Muat daftar suara browser terlebih dahulu agar suara Indonesia tersedia
  let daftarSuaraBrowser = [];
  if ("speechSynthesis" in window) {
    daftarSuaraBrowser = window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      daftarSuaraBrowser = window.speechSynthesis.getVoices();
    };
  }

  function pilihSuaraIndonesia() {
    const voices = daftarSuaraBrowser.length
      ? daftarSuaraBrowser
      : window.speechSynthesis.getVoices();

    // Prioritaskan suara Google Bahasa Indonesia atau suara native id-ID
    return (
      voices.find((v) => v.lang.toLowerCase().includes("id-id") && v.name.toLowerCase().includes("google")) ||
      voices.find((v) => v.lang.toLowerCase().startsWith("id")) ||
      voices.find((v) => v.name.toLowerCase().includes("indonesia")) ||
      null
    );
  }

  function bersihkanTeksUntukSuara(teks) {
    return teks
      .replace(/[*#_`~>•]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  btnBaru.addEventListener("click", async () => {
    const semuaSelect = Array.from(document.querySelectorAll("select"));
    const dropdownPsikolog = semuaSelect.find((s) =>
      s.innerText.toLowerCase().includes("psikolog")
    );
    const namaPsikolog = dropdownPsikolog
      ? dropdownPsikolog.options[dropdownPsikolog.selectedIndex].text.replace("(contoh)", "").trim()
      : "Psikolog Konselor";

    const lama = document.getElementById("modalVideoCallSimulasi");
    if (lama) lama.remove();

    let localStream = null;
    let micAktif = true;
    let camAktif = true;
    let detikBerjalan = 0;
    let intervalTimer = null;
    let sedangBicara = false;

    const overlay = document.createElement("div");
    overlay.id = "modalVideoCallSimulasi";
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(10, 15, 28, 0.88);
      backdrop-filter: blur(6px); display: flex; align-items: center;
      justify-content: center; z-index: 10000; padding: 16px; font-family: inherit;
    `;

    overlay.innerHTML = `
      <div style="background: #0f172a; color: #f8fafc; border-radius: 20px; width: 100%; max-width: 820px; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.6); border: 1px solid #1e293b;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; background: #1e293b; border-bottom: 1px solid #334155;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span id="dotStatusCall" style="width: 10px; height: 10px; border-radius: 50%; background: #f59e0b; display: inline-block;"></span>
            <div>
              <strong style="font-size: 15px; display: block;">${namaPsikolog}</strong>
              <span id="statusKoneksiCall" style="font-size: 12px; color: #94a3b8;">Menghubungkan panggilan...</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="background: rgba(16, 185, 129, 0.15); color: #34d399; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(52, 211, 153, 0.3);">SIMULASI KONSELING</span>
            <span id="timerVideoCall" style="font-variant-numeric: tabular-nums; font-weight: 700; font-size: 14px; color: #e2e8f0; background: #0f172a; padding: 4px 10px; border-radius: 8px;">00:00</span>
          </div>
        </div>

        <div style="position: relative; height: 400px; background: radial-gradient(circle at center, #1e293b 0%, #090d16 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden;">
          
          <div id="avatarPsikologWrapper" style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div id="ringGelombangSuara" style="position: absolute; width: 136px; height: 136px; border-radius: 50%; border: 3px solid #10b981; opacity: 0; transition: all 0.25s ease;"></div>
            <div style="width: 120px; height: 120px; border-radius: 50%; background: linear-gradient(135deg, #0d9488, #0284c7); display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 30px rgba(13, 148, 136, 0.4); border: 3px solid #38bdf8;">
              <svg width="68" height="68" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="22" r="12" fill="#FDE68A"/>
                <path d="M20 20C20 12 44 12 44 20" stroke="#1E293B" stroke-width="5" stroke-linecap="round"/>
                <circle cx="28" cy="22" r="1.8" fill="#1E293B"/>
                <circle cx="36" cy="22" r="1.8" fill="#1E293B"/>
                <path d="M28 27C30 29 34 29 36 27" stroke="#1E293B" stroke-width="2" stroke-linecap="round"/>
                <path d="M12 56C12 43 21 37 32 37C43 37 52 43 52 56" fill="#FFFFFF"/>
                <path d="M26 37L32 47L38 37" stroke="#0D9488" stroke-width="2.5" fill="none"/>
              </svg>
            </div>
            <span style="margin-top: 12px; font-weight: 600; font-size: 16px; color: #f1f5f9;">${namaPsikolog}</span>
            <span id="indikatorBicaraPsikolog" style="font-size: 12px; color: #34d399; margin-top: 4px; height: 18px;">Menunggu koneksi...</span>
          </div>

          <div id="subtitlePsikolog" style="position: absolute; bottom: 18px; left: 20px; right: 200px; background: rgba(15, 23, 42, 0.88); border: 1px solid #334155; padding: 12px 16px; border-radius: 12px; font-size: 13.5px; color: #f1f5f9; line-height: 1.5;">
            "Menghubungkan ke ruang konseling..."
          </div>

          <div style="position: absolute; bottom: 16px; right: 16px; width: 165px; height: 118px; border-radius: 12px; overflow: hidden; background: #1e293b; border: 2px solid #334155; box-shadow: 0 8px 20px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
            <video id="videoKameraUser" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1);"></video>
            <div id="placeholderKameraMati" style="display: none; flex-direction: column; align-items: center; color: #94a3b8; font-size: 11px; text-align: center; padding: 8px;">
              <span style="font-size: 20px; margin-bottom: 4px;">📷</span>
              Kamera Nonaktif
            </div>
            <span style="position: absolute; bottom: 6px; left: 8px; background: rgba(0,0,0,0.6); font-size: 10px; padding: 2px 6px; border-radius: 4px; color: #fff;">Anda</span>
          </div>
        </div>

        <div style="background: #1e293b; padding: 10px 16px; display: flex; gap: 8px; border-top: 1px solid #334155;">
          <input id="inputBicaraVideo" type="text" placeholder="Sampaikan ceritamu kepada psikolog di sini..." style="flex: 1; background: #0f172a; border: 1px solid #334155; color: #f8fafc; padding: 10px 14px; border-radius: 10px; font-size: 13.5px; outline: none;">
          <button id="btnKirimVideo" style="background: #0d9488; color: #fff; border: none; padding: 0 18px; border-radius: 10px; font-weight: 600; cursor: pointer;">Sampaikan</button>
        </div>

        <div style="background: #0f172a; padding: 14px 20px; display: flex; justify-content: center; align-items: center; gap: 16px;">
          <button id="btnToggleMic" title="Mute / Unmute Mikrofon" style="width: 48px; height: 48px; border-radius: 50%; border: 1px solid #334155; background: #1e293b; color: #fff; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;">🎤</button>
          <button id="btnToggleCam" title="Matikan / Nyalakan Kamera" style="width: 48px; height: 48px; border-radius: 50%; border: 1px solid #334155; background: #1e293b; color: #fff; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;">📹</button>
          <button id="btnAkhiriCall" style="padding: 12px 24px; border-radius: 999px; border: none; background: #ef4444; color: #fff; font-weight: 700; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);">
            📞 Akhiri Panggilan
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const videoEl = document.getElementById("videoKameraUser");
    const placeholderCam = document.getElementById("placeholderKameraMati");
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      videoEl.srcObject = localStream;
    } catch {
      videoEl.style.display = "none";
      placeholderCam.style.display = "flex";
      placeholderCam.innerHTML = `<span style="font-size:20px;margin-bottom:4px;">👤</span>Kamera Simulasi`;
    }

    // Berbicara dengan pelafalan Bahasa Indonesia murni & jeda antar kalimat yang natural
    function psikologBerbicara(teksAsli) {
      const teksBersih = bersihkanTeksUntukSuara(teksAsli);
      const subtitleEl = document.getElementById("subtitlePsikolog");
      const indikatorEl = document.getElementById("indikatorBicaraPsikolog");
      const ringEl = document.getElementById("ringGelombangSuara");
      if (!subtitleEl) return;

      subtitleEl.textContent = `"${teksBersih}"`;
      indikatorEl.textContent = "🔊 Sedang berbicara...";
      sedangBicara = true;

      const animasiSuara = setInterval(() => {
        if (!sedangBicara) {
          clearInterval(animasiSuara);
          if (ringEl) {
            ringEl.style.opacity = "0";
            ringEl.style.transform = "scale(1)";
          }
          return;
        }
        const skala = 1 + Math.random() * 0.2;
        if (ringEl) {
          ringEl.style.opacity = "0.75";
          ringEl.style.transform = `scale(${skala.toFixed(2)})`;
        }
      }, 220);

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const suaraIndo = pilihSuaraIndonesia();

        // Pecah per kalimat agar intonasi & jeda napas terdengar seperti manusia
        const daftarKalimat = teksBersih.match(/[^.!?]+[.!?]*/g) || [teksBersih];
        let indeks = 0;

        function ucapkanBerikutnya() {
          if (!sedangBicara || indeks >= daftarKalimat.length) {
            sedangBicara = false;
            if (indikatorEl) indikatorEl.textContent = "🟢 Terhubung · Mendengarkan";
            return;
          }

          const kalimat = daftarKalimat[indeks].trim();
          indeks++;
          if (!kalimat) {
            ucapkanBerikutnya();
            return;
          }

          const ucapan = new SpeechSynthesisUtterance(kalimat);
          ucapan.lang = "id-ID";
          if (suaraIndo) ucapan.voice = suaraIndo;
          ucapan.rate = 0.96;  // Tempo bicara tenang & jelas seperti konselor
          ucapan.pitch = 1.02; // Nada suara hangat & ramah
          ucapan.onend = () => setTimeout(ucapkanBerikutnya, 180);
          ucapan.onerror = () => {
            sedangBicara = false;
            if (indikatorEl) indikatorEl.textContent = "🟢 Terhubung · Mendengarkan";
          };

          window.speechSynthesis.speak(ucapan);
        }

        ucapkanBerikutnya();
      } else {
        setTimeout(() => {
          sedangBicara = false;
          if (indikatorEl) indikatorEl.textContent = "🟢 Terhubung · Mendengarkan";
        }, 4000);
      }
    }

    setTimeout(() => {
      const dot = document.getElementById("dotStatusCall");
      const statusTxt = document.getElementById("statusKoneksiCall");
      if (!dot) return;

      dot.style.background = "#10b981";
      statusTxt.textContent = "Terhubung · Sesi Konseling Video";

      intervalTimer = setInterval(() => {
        detikBerjalan++;
        const m = String(Math.floor(detikBerjalan / 60)).padStart(2, "0");
        const s = String(detikBerjalan % 60).padStart(2, "0");
        const timerEl = document.getElementById("timerVideoCall");
        if (timerEl) timerEl.textContent = `${m}:${s}`;
      }, 1000);

      psikologBerbicara(
        `Halo, selamat datang. Saya ${namaPsikolog}. Terima kasih sudah meluangkan waktu untuk mengobrol hari ini. Silakan ceritakan apa yang sedang kamu rasakan, saya siap mendengarkan.`
      );
    }, 1200);

    async function kirimPesanDalamVideo() {
      const inputEl = document.getElementById("inputBicaraVideo");
      const teks = inputEl.value.trim();
      if (!teks) return;
      inputEl.value = "";

      document.getElementById("indikatorBicaraPsikolog").textContent = "💭 Menyimak ceritamu...";
      document.getElementById("subtitlePsikolog").textContent = `Anda: "${teks}"`;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pesan: teks, video_call: true })
        });
        const data = await res.json();
        const balasanAI = data.balasan || data.reply || "Saya mengerti perasaanmu. Mari kita bicarakan pelan-pelan ya.";
        psikologBerbicara(balasanAI);
      } catch {
        psikologBerbicara("Terima kasih sudah bercerita. Tarik napas perlahan, saya di sini mendengarkanmu.");
      }
    }

    document.getElementById("btnKirimVideo").onclick = kirimPesanDalamVideo;
    document.getElementById("inputBicaraVideo").addEventListener("keydown", (e) => {
      if (e.key === "Enter") kirimPesanDalamVideo();
    });

    document.getElementById("btnToggleMic").onclick = function () {
      micAktif = !micAktif;
      if (localStream) {
        localStream.getAudioTracks().forEach((t) => (t.enabled = micAktif));
      }
      this.textContent = micAktif ? "🎤" : "🔇";
      this.style.background = micAktif ? "#1e293b" : "#dc2626";
    };

    document.getElementById("btnToggleCam").onclick = function () {
      camAktif = !camAktif;
      if (localStream) {
        localStream.getVideoTracks().forEach((t) => (t.enabled = camAktif));
      }
      videoEl.style.display = camAktif && localStream ? "block" : "none";
      placeholderCam.style.display = camAktif && localStream ? "none" : "flex";
      this.textContent = camAktif ? "📹" : "🚫";
      this.style.background = camAktif ? "#1e293b" : "#dc2626";
    };

    document.getElementById("btnAkhiriCall").onclick = () => {
      clearInterval(intervalTimer);
      sedangBicara = false;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      overlay.remove();
    };
  });
})();

// AntreSehat
$("antreanForm").addEventListener("submit", async e => {
  e.preventDefault();
  const response = await fetch("/api/antrean", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({nama: $("namaPasien").value, klinik: $("klinik").value})
  });
  const data = await response.json();
  $("hasilAntrean").textContent = `Nomor: ${data.nomor} · ${data.klinik}. Estimasi demo: ${data.estimasi_menit} menit. ${data.pesan}`;
});

// RuangWarga: file foto tidak diunggah, hanya nama file untuk demo.
$("laporanForm").addEventListener("submit", async e => {
  e.preventDefault();
  const file = $("fotoLaporan").files[0];
  const response = await fetch("/api/laporan", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      judul: $("judulLaporan").value,
      deskripsi: $("deskripsiLaporan").value,
      foto_nama: file ? file.name : ""
    })
  });
  const data = await response.json();
  if (!data.ok) return alert(data.pesan || "Laporan gagal dibuat.");
  $("hasilLaporan").replaceChildren();
  const div = document.createElement("div");
  div.className = "result-item";
  const title = document.createElement("strong");
  title.textContent = `Laporan #${data.laporan.id}: ${data.laporan.judul}`;
  const desc = document.createElement("p");
  desc.textContent = `${data.laporan.deskripsi} · ${data.laporan.tanggal}` +
    (data.laporan.foto ? " · Nama file foto tercatat (file tidak diunggah)." : "");
  div.append(title, desc);
  $("hasilLaporan").appendChild(div);
  $("laporanForm").reset();
});

async function muatVoting() {
  const r = await fetch("/api/voting");
  const v = await r.json();
  $("hasilVoting").textContent = `Setuju: ${v.setuju} suara · Tidak setuju: ${v.tidak_setuju} suara (data demo)`;
}
document.querySelectorAll("[data-vote]").forEach(button => {
  button.addEventListener("click", async () => {
    const r = await fetch("/api/voting", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({pilihan: button.dataset.vote})
    });
    const data = await r.json();
    if (data.ok) {
      $("hasilVoting").textContent = `Setuju: ${data.hasil.setuju} suara · Tidak setuju: ${data.hasil.tidak_setuju} suara (data demo)`;
    }
  });
});
muatVoting();

// simulasi pembayaran
$("simulasiBayar").addEventListener("click", () => {
  const nominal = Number($("nominalIuran").value).toLocaleString("id-ID");
  const kodeTransaksi = "WS-" + Math.floor(100000 + Math.random() * 900000);

  // Kumpulan logo SVG inline agar tajam & selalu tampil tanpa internet/file eksternal
  const logos = {
    qris: `<svg width="42" height="18" viewBox="0 0 84 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="84" height="32" rx="4" fill="#1E293B"/>
      <path d="M10 8H18V16H10V8ZM12 10V14H16V10H12ZM20 8H28V16H20V8ZM22 10V14H26V10H22ZM10 18H18V26H10V18ZM12 20V24H16V20H12ZM20 18H23V21H20V18ZM25 18H28V23H25V18ZM20 23H28V26H20V23Z" fill="#EF4444"/>
      <text x="33" y="21" fill="#FFFFFF" font-family="Arial, sans-serif" font-weight="800" font-size="13" letter-spacing="0.5">QRIS</text>
    </svg>`,

    gopay: `<svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="15" fill="#00AED6"/>
      <circle cx="16" cy="16" r="7" fill="#FFFFFF"/>
      <circle cx="16" cy="16" r="3.5" fill="#00AED6"/>
    </svg>`,

    dana: `<svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#118EEA"/>
      <path d="M7 13.5C11 11.5 15 15.5 25 13V19C15 21.5 11 17.5 7 19.5V13.5Z" fill="#FFFFFF"/>
    </svg>`,

    ovo: `<svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#4C3494"/>
      <circle cx="16" cy="16" r="7.5" stroke="#FFFFFF" stroke-width="3.2"/>
    </svg>`,

    bca: `<svg width="44" height="22" viewBox="0 0 64 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="30" rx="5" fill="#0060AF"/>
      <text x="32" y="20" text-anchor="middle" fill="#FFFFFF" font-family="Arial, sans-serif" font-weight="900" font-style="italic" font-size="15">BCA</text>
    </svg>`,

    bri: `<svg width="44" height="22" viewBox="0 0 64 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="30" rx="5" fill="#00529C"/>
      <text x="32" y="20" text-anchor="middle" fill="#FFFFFF" font-family="Arial, sans-serif" font-weight="900" font-size="15" letter-spacing="1">BRI</text>
    </svg>`,

    mandiri: `<svg width="52" height="22" viewBox="0 0 76 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="76" height="30" rx="5" fill="#003D79"/>
      <path d="M12 8C24 5 46 5 64 9C48 7 26 8 12 8Z" fill="#FFB81C"/>
      <text x="38" y="21" text-anchor="middle" fill="#FFFFFF" font-family="Arial, sans-serif" font-weight="800" font-size="12.5">mandiri</text>
    </svg>`
  };

  // Hapus modal lama jika sudah ada
  const modalLama = document.getElementById("modalPembayaranWarga");
  if (modalLama) modalLama.remove();

  const overlay = document.createElement("div");
  overlay.id = "modalPembayaranWarga";
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6);
    display: flex; align-items: center; justify-content: center;
    z-index: 9999; padding: 16px; font-family: inherit;
  `;

  overlay.innerHTML = `
    <div style="background: #ffffff; border-radius: 16px; max-width: 430px; width: 100%; padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px;">
        <div>
          <span style="font-size: 12px; color: #059669; font-weight: 700; text-transform: uppercase;">WargaSehat Pay (Simulasi)</span>
          <h3 style="margin: 2px 0 0; font-size: 18px; color: #0f172a;">Pilih Metode Pembayaran</h3>
        </div>
        <button id="tutupModalPay" style="background: none; border: none; font-size: 22px; cursor: pointer; color: #64748b;">&times;</button>
      </div>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 14px; color: #166534;">Total Iuran Warga</span>
        <strong style="font-size: 18px; color: #15803d;">Rp${nominal}</strong>
      </div>

      <div id="langkahPilihMetode">
        <p style="font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 8px;">E-Wallet & QRIS</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
          <button class="opsi-bayar" data-logo="qris" data-metode="QRIS (Semua E-Wallet)" data-kode="QRIS-${kodeTransaksi}" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; cursor: pointer; font-weight: 600; color: #0f172a;">
            ${logos.qris}
            <span>QRIS</span>
          </button>
          <button class="opsi-bayar" data-logo="gopay" data-metode="GoPay" data-kode="0812-8899-${Math.floor(1000+Math.random()*9000)}" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; cursor: pointer; font-weight: 600; color: #0f172a;">
            ${logos.gopay}
            <span>GoPay</span>
          </button>
          <button class="opsi-bayar" data-logo="dana" data-metode="DANA" data-kode="0857-4411-${Math.floor(1000+Math.random()*9000)}" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; cursor: pointer; font-weight: 600; color: #0f172a;">
            ${logos.dana}
            <span>DANA</span>
          </button>
          <button class="opsi-bayar" data-logo="ovo" data-metode="OVO" data-kode="0821-7733-${Math.floor(1000+Math.random()*9000)}" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; cursor: pointer; font-weight: 600; color: #0f172a;">
            ${logos.ovo}
            <span>OVO</span>
          </button>
        </div>

        <p style="font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 8px;">Transfer Bank (Virtual Account)</p>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button class="opsi-bayar" data-logo="bca" data-metode="BCA Virtual Account" data-kode="88010${Math.floor(1000000000+Math.random()*9000000000)}" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; cursor: pointer; font-weight: 600; color: #0f172a;">
            <span style="display: flex; align-items: center; gap: 12px;">${logos.bca} BCA Virtual Account</span>
            <span style="color: #94a3b8;">&rsaquo;</span>
          </button>
          <button class="opsi-bayar" data-logo="bri" data-metode="BRI Virtual Account" data-kode="88810${Math.floor(1000000000+Math.random()*9000000000)}" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; cursor: pointer; font-weight: 600; color: #0f172a;">
            <span style="display: flex; align-items: center; gap: 12px;">${logos.bri} BRI Virtual Account</span>
            <span style="color: #94a3b8;">&rsaquo;</span>
          </button>
          <button class="opsi-bayar" data-logo="mandiri" data-metode="Mandiri Virtual Account" data-kode="89508${Math.floor(1000000000+Math.random()*9000000000)}" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; cursor: pointer; font-weight: 600; color: #0f172a;">
            <span style="display: flex; align-items: center; gap: 12px;">${logos.mandiri} Mandiri Virtual Account</span>
            <span style="color: #94a3b8;">&rsaquo;</span>
          </button>
        </div>
      </div>

      <div id="langkahKonfirmasi" style="display: none; text-align: center;">
        <div id="logoMetodeTerpilih" style="display: flex; justify-content: center; margin-bottom: 8px; transform: scale(1.25);"></div>
        <p id="labelMetode" style="font-size: 14px; color: #334155; margin-bottom: 8px;"></p>
        <div style="background: #f8fafc; border: 1px dashed #94a3b8; border-radius: 10px; padding: 14px; margin-bottom: 14px;">
          <span style="font-size: 12px; color: #64748b; display: block;">Nomor VA / Tujuan Pembayaran</span>
          <strong id="nomorTujuanBayar" style="font-size: 18px; letter-spacing: 1px; color: #0f172a;"></strong>
        </div>
        <button id="btnKonfirmasiSelesai" style="width: 100%; padding: 12px; background: #0d9488; color: #fff; border: none; border-radius: 10px; font-weight: 700; font-size: 15px; cursor: pointer;">
          Saya Sudah Membayar (Simulasi)
        </button>
        <button id="btnKembaliMetode" style="width: 100%; margin-top: 8px; padding: 8px; background: transparent; color: #64748b; border: none; font-size: 13px; cursor: pointer;">
          &larr; Ganti metode pembayaran
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("tutupModalPay").onclick = () => overlay.remove();
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  let metodeDipilih = "";
  overlay.querySelectorAll(".opsi-bayar").forEach((btn) => {
    btn.addEventListener("mouseenter", () => (btn.style.borderColor = "#0d9488"));
    btn.addEventListener("mouseleave", () => (btn.style.borderColor = "#cbd5e1"));
    btn.addEventListener("click", () => {
      metodeDipilih = btn.dataset.metode;
      const keyLogo = btn.dataset.logo;
      document.getElementById("logoMetodeTerpilih").innerHTML = logos[keyLogo] || "";
      document.getElementById("labelMetode").textContent = `Selesaikan pembayaran melalui ${metodeDipilih}:`;
      document.getElementById("nomorTujuanBayar").textContent = btn.dataset.kode;
      document.getElementById("langkahPilihMetode").style.display = "none";
      document.getElementById("langkahKonfirmasi").style.display = "block";
    });
  });

  document.getElementById("btnKembaliMetode").onclick = () => {
    document.getElementById("langkahKonfirmasi").style.display = "none";
    document.getElementById("langkahPilihMetode").style.display = "block";
  };

  document.getElementById("btnKonfirmasiSelesai").onclick = () => {
    overlay.remove();
    $("statusBayar").textContent =
      `✅ Simulasi pembayaran Rp${nominal} via ${metodeDipilih} berhasil (ID: ${kodeTransaksi}). Tidak ada transaksi uang sungguhan.`;
  };
});
