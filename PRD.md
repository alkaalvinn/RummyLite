-----

# Product Requirements Document (PRD) - "Remi Renjana"

## Pembaruan Spesifikasi Mekanisme Bermain

| Item | Deskripsi |
| :--- | :--- |
| **Nama Produk** | **Remi Renjana** |
| **Versi Dokumen** | **1.2 (Pembaruan Mekanisme)** |
| **Tanggal Pembuatan** | 15 Oktober 2025 |
| **Pemilik Produk** | (Nama Anda/Tim Produk) |
| **Status** | Final Draf |

-----

## 2\. Fitur & Fungsionalitas Inti

### 2.1. Pengaturan Permainan (Game Setup)

*Penambahan detail untuk Giliran Pertama.*

| ID | Fitur | Deskripsi Kebutuhan |
| :--- | :--- | :--- |
| **GMS-001** | Jumlah Pemain | Permainan dimainkan oleh tepat 4 orang. |
| **GMS-002** | Distribusi Kartu (Awal) | Setiap pemain dibagikan **7 kartu acak** dari satu set kartu remi standar (52 kartu). |
| **GMS-002A** | Kartu Awal Deck Terbuka | Setelah distribusi (GMS-002), satu kartu ditarik dari sisa deck dan diletakkan terbuka untuk memulai **Tumpukan Buangan** (*Discard Pile*). |
| **GMS-002B** | Giliran Pertama | Pemain yang mendapat giliran pertama (misalnya, ditentukan secara acak) akan memulai gilirannya dengan **8 kartu** di tangan (7 kartu awal + kartu dari GMS-002A). Pemain ini **WAJIB** membuang 1 kartu untuk mengakhiri gilirannya. |
| **GMS-003** | Penentuan Joker Utama | Satu kartu diacak dan diambil (misal: 7♥). Tiga kartu kembarannya (7♠, 7♦, 7♣) otomatis menjadi **Kartu Joker**. Kartu penentu (7♥) diletakkan terpisah sebagai pengingat dan tidak digunakan dalam deck. |

-----

### 2.2. Mekanisme Bermain (Gameplay Mechanics)

*Mekanisme Giliran diperjelas.*

| ID | Fitur | Deskripsi Kebutuhan |
| :--- | :--- | :--- |
| **GMM-001** | Struktur Giliran | Pemain bergiliran searah jarum jam untuk mengambil, menurunkan (opsional), dan membuang kartu. |
| **GMM-002** | Opsi Mengambil Kartu (Reguler) | Pada awal gilirannya, pemain harus memilih SATU dari dua opsi: **(A) Mengambil 1-3 kartu terakhir yang dibuang di Tumpukan Buangan.** ATAU **(B) Mengambil 1 kartu dari sisa Deck** (Tumpukan Tertutup). |
| **GMM-002A**| Aturan Mengambil dari Buangan | Jika pemain mengambil lebih dari 1 kartu dari Tumpukan Buangan (Opsi A):<br>1. Hanya kartu paling atas/terakhir yang dibutuhkan dan langsung masuk tangan.<br>2. Kartu-kartu di bawahnya yang ikut diambil **WAJIB** segera diturunkan ke meja sebagai bagian dari kombinasi baru pada putaran yang sama (Lihat GMM-003). |
| **GMM-003** | Wajib Menurunkan Kartu (Jika Mengambil) | Jika pemain mengambil dari Tumpukan Buangan (Opsi A), pemain **WAJIB** segera menurunkan kombinasi yang cocok (*Melds*) dengan menggunakan kartu yang diambil (Rul-001 atau Rul-002) pada putaran yang sama. **Jika pemain hanya mengambil 1 kartu dari Deck (Opsi B), penurunan kartu adalah OPSIONAL.** |
| **GMM-004** | Membuang Kartu | Setelah mengambil kartu dan menyelesaikan aksi penurunan kartu (jika ada), pemain **WAJIB** membuang tepat **1 kartu** ke Tumpukan Buangan untuk mengakhiri gilirannya. |
| **GMM-005** | Kartu Buangan 'Memukul' | Saat pemain "Memukul" (Game End), kartu buangan terakhirnya (GMM-004) dapat menjadi kartu pelengkap untuk kombinasi terakhir yang diturunkan, menyisakan 1 kartu di tangan sebagai Kartu Pemukul (Rul-004). |
| **GMM-006** | Fungsi Kartu Joker | Joker adalah kartu spesial yang bisa menggantikan kartu apa pun untuk melengkapi urutan atau set. |

-----

## 5\. Kebutuhan Desain (User Flow and Design)

### 5.1. Alur Dasar Pengguna (Basic User Flow)

*Alur diubah agar lebih mencerminkan logika giliran Rummy.*

1.  Pemain masuk ke game (Lobby).
2.  Membuat atau bergabung dengan Ruangan 4-Pemain.
3.  Permainan dimulai:
      * Kartu dibagikan (GMS-002).
      * Kartu Awal Deck Terbuka dibuat (GMS-002A).
      * Kartu Penentu Joker ditampilkan (GMS-003).
4.  **Giliran Pertama:** Pemain 1 memulai dengan 8 kartu, **WAJIB** membuang 1 kartu (GMS-002B).
5.  **Giliran Reguler (Pemain 2, 3, 4, dan seterusnya):**
      * Pemain dihadapkan pada pilihan: **Mengambil dari Buangan (Opsi A) atau Mengambil dari Deck (Opsi B)** (GMM-002).
      * **Jika Opsi A dipilih:** Pemain mengambil kartu dan **WAJIB** menurunkan kombinasi yang cocok (GMM-003).
      * **Jika Opsi B dipilih:** Pemain mengambil kartu, penurunan kombinasi **OPSIONAL**.
      * Pemain **membuang 1 kartu** untuk mengakhiri giliran (GMM-004).
6.  Pemain menurunkan kombinasi (Rul-001, Rul-002). (Penting: UI harus memberikan feedback visual yang jelas bahwa Rul-001 harus diturunkan sebelum Rul-002).
7.  Permainan berakhir dengan **Memukul** (Rul-004) atau **Kartu Deck Habis** (Rul-006).
8.  Perhitungan dan tampilan Skor (Rul-005, Rul-008).
9.  Kembali ke Lobby/Mulai Putaran Baru.

-----

### 5.2. Kebutuhan Antarmuka Pengguna (UI Requirements)

*Penambahan kebutuhan visual untuk pilihan pengambilan kartu.*

| ID | Kebutuhan | Deskripsi Tambahan |
| :--- | :--- | :--- |
| **UI-001** | Tampilan Kartu Tangan | Tampilan kartu di tangan yang jelas, dengan kemampuan sorting (sortir) berdasarkan angka/jenis. |
| **UI-002** | Area Tumpukan Buangan | Area *Discard Pile* yang menampilkan 3 kartu terakhir yang dibuang dengan jelas (untuk memfasilitasi pilihan pengambilan). **Kartu paling atas harus sangat jelas untuk diambil sebagai Opsi A.** |
| **UI-003** | Kartu Penentu Joker | Kartu Penentu Joker harus ditampilkan secara permanen di area bermain. |
| **UI-004** | Aksi Giliran | Tombol/aksi yang jelas: **Mengambil dari Buangan**, **Mengambil dari Deck**, **Menurunkan Kartu (*Meld*)**, dan **Membuang Kartu (*Discard*)**. |
| **UI-004A**| Indikator Wajib | UI harus menampilkan **Pilihan Wajib** (Mengambil dari Deck atau Buangan) di awal setiap giliran (kecuali giliran pertama). |
| **UI-004B**| Indikator *Meld* Wajib | Setelah pemain mengambil dari Tumpukan Buangan, UI harus memberikan **indikasi visual yang kuat** bahwa tindakan penurunan kartu (*Meld*) **wajib** dilakukan segera, sebelum pembuangan kartu. |
| **UI-005** | Validasi Kombinasi | Sistem harus memberikan *real-time feedback* kepada pemain tentang validitas kombinasi yang sedang mereka siapkan untuk diturunkan (memastikan Rul-001 vs Rul-002 terpenuhi). |