Product Requirements Document (PRD) - "Rummy Spesial"
Item	Deskripsi
Nama Produk	Remi Renjana
Versi Dokumen	1.1 (Diperbarui)
Tanggal Pembuatan	10 Oktober 2025
Pemilik Produk	(Nama Anda/Tim Produk)
Status	Final Draf

Export to Sheets
1. Tujuan dan Target Pengguna
Tujuan utama proyek ini adalah mengembangkan game kartu digital berbasis Remi dengan serangkaian aturan unik, berfokus pada pengalaman bermain 4 pemain yang strategis. Target pengguna adalah penggemar game kartu yang mencari variasi aturan Remi yang kompetitif.

2. Fitur & Fungsionalitas Inti
2.1. Pengaturan Permainan (Game Setup)
ID	Fitur	Deskripsi Kebutuhan
GMS-001	Jumlah Pemain	Permainan dimainkan oleh tepat 4 orang.
GMS-002	Distribusi Kartu	Setiap pemain dibagikan 7 kartu acak dari satu set kartu remi standar (52 kartu).
GMS-003	Penentuan Joker Utama	Satu kartu diacak dan diambil (misal: 7♥). Tiga kartu kembarannya (7♠, 7♦, 7♣) otomatis menjadi Kartu Joker. Kartu penentu (7♥) diletakkan terpisah sebagai pengingat dan tidak digunakan dalam deck.

Export to Sheets
2.2. Mekanisme Bermain (Gameplay Mechanics)
ID	Fitur	Deskripsi Kebutuhan
GMM-001	Struktur Giliran	Pemain bergiliran untuk mengambil dan membuang kartu.
GMM-002	Opsi Mengambil Kartu	Pada gilirannya, pemain dapat memilih: (A) Mengambil 1-3 kartu terakhir yang dibuang di tumpukan buangan. ATAU (B) Mengambil 1 kartu dari sisa deck (tumpukan tertutup).
GMM-003	Wajib Menurunkan Kartu	Jika pemain mengambil dari tumpukan buangan (Opsi A), dia wajib segera menurunkan kombinasi yang cocok (Rul-001 atau Rul-002) pada putaran yang sama.
GMM-004	Membuang Kartu	Setelah mengambil kartu, pemain wajib membuang 1 kartu ke tumpukan buangan untuk mengakhiri gilirannya.
GMM-005	Kartu Buangan 'Memukul'	Saat pemain "Memukul," kartu buangan terakhirnya (GMM-004) dapat menjadi kartu pelengkap untuk kombinasi yang diturunkan.
GMM-006	Fungsi Kartu Joker	Joker adalah kartu spesial yang bisa menggantikan kartu apa pun untuk melengkapi urutan atau set.

Export to Sheets
3. Aturan Kombinasi dan Kemenangan
3.1. Aturan Kombinasi Kartu (Melds/Lays)
ID	Aturan	Deskripsi Kebutuhan
Rul-001	Urutan Dasar (Wajib Pertama)	Kombinasi pertama yang wajib diturunkan adalah Urutan (Run), yaitu kartu berurutan dengan simbol yang sama. Maksimal Urutan adalah 4 kartu.
Jenis Urutan: 1. 2-10 (misal: 7♦, 8♦, 9♦, 10♦); 2. J, Q, K (misal: J♣, Q♣, K♣); 3. 4 Kartu Ace (Set Ace diperlakukan sebagai Urutan wajib).
Rul-002	Set/Rill (Setelah Urutan)	Setelah Rul-001 terpenuhi, pemain boleh menurunkan kombinasi Set/Rill, yaitu kartu dengan angka/huruf yang sama dan jumlah 3 atau 4 kartu (misal: 3♥, 3♦, 3♠). Urutan juga tetap boleh diturunkan.
Rul-003	Penurunan	Kartu yang dikombinasikan harus dijatuhkan ke meja dan ditunjukkan ke semua pemain.

Export to Sheets
3.2. Aturan Akhir Game & Poin Kemenangan (Memukul)
ID	Aturan	Deskripsi Kebutuhan
Rul-004	Kondisi Memukul	Game berakhir jika ada pemain yang berhasil menyisakan 1 kartu di tangan (sebagai Kartu Pemukul).
Rul-005	Nilai Kartu Pemukul	Nilai Kartu Pemukul (kartu sisa 1 di tangan) menjadi poin kemenangan pemain tersebut:
- Kartu 2-10: 50 Poin
- Kartu J, Q, K: 100 Poin
- Kartu ACE: 150 Poin
- Kartu JOKER: 250 Poin

Export to Sheets
4. Perhitungan Poin Akhir (Kartu Habis)
Jika game berakhir karena kartu deck habis (tidak ada yang memukul), poin dihitung berdasarkan kartu yang tersisa di tangan pemain dan apakah mereka telah memenuhi syarat kombinasi.

4.1. Nilai Dasar Kartu (Untuk Kartu Sisa di Tangan)
ID	Kartu	Nilai Poin Dasar
Rul-007	Kartu 2-10	5 Poin
Kartu J, Q, K	10 Poin
Kartu ACE	15 Poin

Export to Sheets
4.2. Aturan Khusus Poin Joker
ID	Aturan	Deskripsi Kebutuhan
Rul-007A	Poin Joker Terpakai	Jika Joker digunakan dalam kombinasi yang sudah diturunkan, nilainya dihitung sesuai kartu yang digantikan (misal: ganti 7/5 Poin, ganti King/10 Poin, ganti Ace/15 Poin).
Rul-007B	Poin Joker Tidak Terpakai	Jika Joker tersisa di tangan dan tidak melengkapi kombinasi, Joker tersebut bernilai MINUS 25 POIN.

Export to Sheets
4.3. Perhitungan Poin Akhir (Plus atau Minus)
Kondisi Pemain	Syarat Pemenuhan Kombinasi	Hasil Poin
POIN POSITIF (Menang)	Rul-001 (Urutan) DAN Rul-002 (Set/Rill) terpenuhi semua.	Total nilai kartu sisa di tangan (Rul-007 + Rul-007A) dihitung sebagai Poin PLUS.
POIN NEGATIF (Kalah) 1	TIDAK ADA kombinasi yang diturunkan (Rul-001 dan Rul-002 tidak terpenuhi).	Total nilai semua kartu di tangan (termasuk penalti Joker Rul-007B) dihitung sebagai Poin MINUS.
POIN NEGATIF (Kalah) 2	Hanya Rul-001 (Urutan) terpenuhi, Rul-002 (Set/Rill) tidak terpenuhi.	Poin dari kartu yang tidak masuk kombinasi (di tangan) akan dikumulatifkan nilainya, dan totalnya dihitung sebagai Poin MINUS (termasuk penalti Joker Rul-007B).

5. Kebutuhan Desain (User Flow and Design)
5.1. Alur Dasar Pengguna (Basic User Flow)
Pemain masuk ke game (Lobby).

Membuat atau bergabung dengan Ruangan 4-Pemain.

Permainan dimulai, kartu dibagikan (GMS-002), dan Kartu Penentu Joker ditampilkan (GMS-003).

Pemain bergiliran mengambil/membuang kartu (GMM-002, GMM-004).

Pemain menurunkan kombinasi (Rul-001, Rul-002). (Penting: UI harus memberikan feedback visual yang jelas bahwa Rul-001 harus diturunkan sebelum Rul-002).

Permainan berakhir dengan Memukul atau Kartu Habis (Rul-004, Rul-006).

Perhitungan dan tampilan Skor (Rul-005, Rul-008).

Kembali ke Lobby/Mulai Putaran Baru.

5.2. Kebutuhan Antarmuka Pengguna (UI Requirements)
Tampilan kartu di tangan yang jelas, dengan kemampuan sorting (sortir) berdasarkan angka/jenis.

Area Discard Pile (Tumpukan Buangan) yang menampilkan 3 kartu terakhir yang dibuang dengan jelas.

Kartu Penentu Joker harus ditampilkan secara permanen di area bermain.

Tombol/aksi yang jelas untuk: Mengambil dari Buangan, Mengambil dari Deck, Menurunkan Kartu, dan Membuang Kartu.

6. Pertimbangan Teknis (Technical Considerations)
Platform: (Misal: Aplikasi Mobile iOS/Android, Web/Desktop)

Teknologi: (Misal: Unity, React Native, dsb.)

Backend: Diperlukan server untuk menangani multiplayer real-time dan validasi aturan main.

Algoritma: Dibutuhkan algoritma shuffling yang adil dan algoritma validasi kombinasi kartu (Rul-001 & Rul-002), serta penentuan Joker.