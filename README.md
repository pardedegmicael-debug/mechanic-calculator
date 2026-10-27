# mechanic-calculator
# Simulasi Ruang Bakar 3D

Aplikasi edukasi untuk melihat hubungan ukuran silinder dengan volume dan rasio
kompresi. Antarmuka 3D merender aset GLB di browser dengan WebGL tanpa paket
eksternal; kode C++17 di `src/` menyediakan mesin hitung yang sama untuk
penggunaan terminal atau pengembangan lanjutan.

## Menjalankan simulasi 3D

1. Buka terminal di folder proyek dan jalankan server lokal:

   ```powershell
   py -m http.server 8000
   ```

   Jika perintah `py` tidak tersedia, gunakan `python -m http.server 8000`.
2. Buka `http://localhost:8000` di browser modern yang mendukung WebGL (misalnya
   Edge, Chrome, atau Firefox). Server lokal diperlukan agar browser dapat
   memuat `model/ruang-bakar-3d.glb`; membuka `index.html` langsung sebagai
   `file://` akan diblokir oleh kebijakan keamanan browser.
3. Ubah bore, stroke, dan volume ruang sisa dengan kolom angka atau slider.
4. Tekan **Mulai** untuk memutar siklus empat langkah; sesuaikan kecepatan,
   jeda, atau seret model untuk mengubah sudut pandang.
5. Tekan **Unduh model 3D (.glb)** untuk menyimpan model yang bisa dibuka di
   Blender atau aplikasi lain yang mendukung glTF 2.0.
6. Tekan **Atur ulang** untuk memulihkan nilai awal.

Tidak ada dependency eksternal atau koneksi internet yang dibutuhkan.

## Menjalankan mesin hitung C++17

Pada komputer ini, GCC C++ versi 16.2 telah dipasang melalui MSYS2 UCRT64.
Jalankan `build.bat` dari folder proyek atau klik dua kali untuk mengompilasi
dan menjalankan `build\simulasi.exe`. Di komputer lain dengan MSYS2, buka
terminal UCRT64 dan jalankan `pacman -S mingw-w64-ucrt-x86_64-gcc`.

Kompilasi dari folder proyek:

```sh
g++ -std=c++17 -Wall -Wextra -pedantic src/main.cpp -o simulasi
```

Di Windows dengan MinGW, jalankan `g++ -std=c++17 -Wall -Wextra -pedantic
src/main.cpp -o simulasi.exe`, lalu buka `simulasi.exe`. Program meminta diameter
silinder (mm), langkah piston (mm), volume ruang sisa (cm³), lalu opsional sudut
engkol dalam derajat untuk menghitung volume sesaat.

## Perhitungan dan batas model

- Volume langkah per silinder: `π / 4 × bore² × stroke ÷ 1000` (cm³).
- Volume total: `volume langkah + volume ruang sisa` (cm³).
- Rasio kompresi geometris: `volume total ÷ volume ruang sisa`.
- Volume sesaat menggunakan gerak slider-engkol ideal dengan rasio panjang
  batang penghubung terhadap jari-jari engkol tetap sebesar 3,5.
- Antarmuka browser menyediakan AFR (rasio massa udara:bahan bakar) dan RPM.
  Estimasi energi bahan bakar per siklus memakai massa udara dalam volume
  langkah pada kondisi udara 25 °C dan 1 atm, efisiensi volumetrik 85%, serta
  nilai kalor bensin 44 MJ/kg. Kerja berguna diperkirakan dengan efisiensi
  termal tetap 25%; daya satu silinder empat-langkah dihitung dari kerja per
  siklus dikali `RPM ÷ 120`.
- Tekanan browser diperbarui mengikuti sudut siklus. Langkah hisap dan buang
  diasumsikan pada 1 atm; langkah kompresi memakai hubungan politropik
  `P × V^1,3 = konstan`; langkah usaha memakai tekanan puncak kompresi ditambah
  kenaikan sederhana yang diturunkan dari estimasi kerja berguna, lalu ekspansi
  politropik. Grafik menampilkan tekanan absolut sepanjang siklus 720°.
- Diameter katup/port masuk dan buang dapat diatur terpisah. Nilai diameter
  memperbesar kepala katup pada model 3D dan mengubah luas port serta luas tirai
  katup yang digunakan untuk memperkirakan kecepatan udara/gas dan tekanan port.
  Aliran diperkirakan dari laju perubahan volume piston dan RPM; bukaan katup
  memakai lift sinusoidal ideal maksimum 6,5 mm dan koefisien aliran 0,72.
  Angka tekanan/kecepatan port bersifat model 1D sederhana, tanpa aliran balik,
  gelombang tekanan, atau simulasi dinamika fluida.

Visualisasi browser dan tombol unduh menggunakan berkas GLB yang sama.
Visualisasi memuat geometri serta warna material model, menyesuaikan tampilannya
ke viewport, dan menskalakan model secara visual mengikuti bore (lebar pada
sumbu horizontal) dan stroke (tinggi pada sumbu vertikal), dengan ukuran awal
86 mm sebagai skala acuan. Model dibuat dari komponen terpisah; animasi glTF
menggerakkan piston, batang penghubung, pin dan lengan engkol, roda gigi, serta
katup sepanjang siklus 720°. Katup masuk dan buang beserta dudukannya terlihat
di sisi depan kepala silinder pada model potongan.
Animasi juga menampilkan partikel campuran udara-bahan bakar biru yang menyebar
di ruang bakar saat langkah hisap, kilatan pembakaran saat langkah usaha, lalu
partikel gelap yang bergerak menuju katup buang pada langkah buang. Efek ini
merupakan ilustrasi visual yang diselaraskan dengan fase, bukan simulasi fisika
atau prediksi pembakaran. Perubahan volume ruang sisa tidak
digunakan untuk menskalakan celah 3D. Estimasi tekanan, energi, dan daya di
antarmuka bersifat ideal dan bukan hasil pengukuran atau simulasi termodinamika;
model tidak menghitung aliran gas, pembakaran nyata, kehilangan panas, atau
efisiensi mesin yang sesungguhnya.

## Berkas model 3D

Model yang dapat dipakai secara terpisah ada di `model/ruang-bakar-3d.glb`.
Berkas glTF biner ini merupakan sumber geometri untuk tampilan 3D browser dan
tombol unduh, serta menyertakan animasi `Siklus Mekanisme`.

Generator model tersedia di `tools/generate_model.js`. Buat ulang model beserta
animasi dari folder proyek dengan `node tools/generate_model.js`.
This calculator can help u to calculating ur machine engine to works. And also u can improve the system tho.
