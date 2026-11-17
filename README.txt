PROJECT: WargaSehat - Layanan Masyarakat & Kesehatan

CARA MENJALANKAN (Windows):
1. Ekstrak ZIP ini.
2. Buka folder hasil ekstrak di Visual Studio Code.
3. Buka Terminal > New Terminal.
4. Jalankan: py -m venv .venv
5. Aktifkan:
   PowerShell: .venv\Scripts\Activate.ps1
   CMD: .venv\Scripts\activate.bat
6. Instal dependensi: pip install -r requirements.txt
7. Jalankan: py app.py
8. Buka browser di: http://127.0.0.1:5000

Catatan:
- Ini prototipe untuk pembelajaran, bukan sistem produksi.
- Chat dan video call bukan layanan profesional nyata.
- SMS/WhatsApp belum diintegrasikan.
- Data antrean, laporan, dan voting disimpan di memori server dan akan reset saat server restart.
- Foto tidak benar-benar diunggah.
- Jurnal disimpan di localStorage browser dan tidak dienkripsi khusus.
- Fitur pembayaran hanya simulasi, tidak memproses uang.
- Untuk penggunaan nyata, tambahkan database, autentikasi, kontrol akses,
  validasi keamanan, perlindungan data, dan integrasi resmi.
