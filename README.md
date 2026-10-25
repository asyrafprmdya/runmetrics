# RunMetrics

Kalkulator metrik lari pribadi: zona heart rate, training pace, prediksi waktu finish, interval planner, dan strategi pacing lomba. Berjalan lokal di browser, tanpa akun, backend, atau layanan cloud.

## Instalasi

Butuh Node.js 20 atau lebih baru.

```bash
npm install
npm run dev
```

Buka http://localhost:3000. Setelah dependensi terpasang, semua kalkulasi jalan tanpa internet.

Perintah lain:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

## Halaman

| Rute | Fungsi |
|---|---|
| `/` | Dashboard: prediksi finish, reference pace, HRmax, zona HR, ringkasan pacing |
| `/calculator` | Pace Calculator: target pace dan HR per jenis latihan (tombol Calculate) |
| `/interval` | Interval Planner: jadwal tiap repetisi dan total durasi |
| `/race-predictor` | Prediksi finish dengan rumus Riegel, perbandingan target, split per km |
| `/split-planner` | Even, negative, positive split, tabel dan grafik, edit split manual |
| `/settings` | Profil HR, data referensi, satuan pace, reset data lokal |

## Metode perhitungan

- HRmax estimasi: `208 - (0,7 x umur)`.
- Target HR: `effort x HRmax`, atau Karvonen `RHR + effort x (HRmax - RHR)`.
- Training pace: model VDOT (Daniels dan Gilbert). Waktu tes diubah jadi VDOT, lalu tiap jenis latihan dipetakan ke persen VO2max (easy 60 sampai 72%, tempo 80 sampai 85%, threshold 86 sampai 89%, interval 95 sampai 99%).
- Prediksi finish: Riegel `T2 = T1 x (D2 / D1)^1,06`.
- Split: bobot pace linear dari awal ke akhir, dinormalisasi supaya total sama dengan target. Detik dialokasikan dengan metode largest remainder agar jumlah split tepat sama dengan total. Split terakhir dihitung dari sisa jarak (marathon 42,195 km punya split sisa 0,195 km).
- Edit split manual: dengan "Kunci total waktu" aktif, split lain menyesuaikan sehingga total tetap. Kalau dimatikan, total mengikuti edit.

Persen effort heart rate tidak pernah diubah langsung menjadi persen pace.

## Struktur

```
app/             rute (server component tipis)
components/      layout, ui, charts, dan view per halaman
lib/calculations fungsi murni: HR, pace, Riegel, split, workout
lib/validation   parsing dan validasi input
lib/storage      localStorage aman SSR (useSyncExternalStore) dan sanitasi
```

Data tersimpan di localStorage dengan kunci `runmetrics:v1`. Data korup atau bertipe salah disanitasi, bukan bikin crash.

## Keterbatasan

- Riegel cenderung terlalu optimis kalau jarak lomba jauh di atas jarak tes (lebih dari 4x). Aplikasi menampilkan peringatan.
- VDOT mengasumsikan hasil tes adalah usaha maksimal. Hasil tes sambil santai membuat semua pace terlalu lambat.
- HRmax dari rumus umur bisa meleset belasan bpm per individu. Pakai HRmax aktual kalau punya.
- Pace tidak memperhitungkan elevasi, cuaca, atau kondisi rute.
- Split terakhir dibulatkan ke detik penuh, jadi pace segmen sisa pendek bisa sedikit berbeda dari segmen lain.
- Satuan mil hanya mengubah tampilan pace. Jarak dan tabel split tetap dalam kilometer.
- Tidak ada sinkronisasi smartwatch, akun, atau cadangan data otomatis. Membersihkan data situs di browser menghapus semuanya.
- Data per browser: profil di Chrome tidak terlihat di Firefox.
