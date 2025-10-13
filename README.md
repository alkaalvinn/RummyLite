# Rummy Lite - Game Kartu Online Real-time

Rummy Lite adalah implementasi game kartu Rummy berbasis web dengan multiplayer real-time, dibangun menggunakan React + Vite + TypeScript dan Firebase untuk autentikasi dan sinkronisasi data.

## 🎮 Fitur Utama

- **Real-time Multiplayer**: Mainkan dengan 2-4 pemain secara bersamaan
- **Firebase Authentication**: Login dengan email/password atau Google Sign-In
- **Mobile Responsive**: Bisa dimainkan di desktop dan mobile
- **Mekanik Joker**: Pemain dengan poin tertinggi dapat mengambil Joker di ronde berikutnya
- **Room System**: Buat room private atau gabung dengan kode
- **Auto-reconnection**: Handle koneksi terputus dengan baik

## 🛠️ Teknologi

- **Frontend**: React 18 + TypeScript + Vite
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Authentication + Firestore)
- **Routing**: React Router DOM

## 📋 Persyaratan

- Node.js 18+
- npm atau yarn
- Akun Firebase (untuk konfigurasi)

## 🚀 Instalasi

1. Clone repository:
```bash
git clone <repository-url>
cd rummy-lite
```

2. Install dependencies:
```bash
npm install
```

3. Konfigurasi Firebase:
   - Buat project baru di [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password dan Google Sign-In)
   - Buat Firestore Database
   - Copy konfigurasi Firebase ke `src/services/firebase.ts`

4. Jalankan development server:
```bash
npm run dev
```

5. Buka http://localhost:3000 di browser

## 🔧 Konfigurasi Firebase

Update file `src/services/firebase.ts` dengan konfigurasi Firebase Anda:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

## 📱 Cara Bermain

1. **Login/Register**: Masuk menggunakan email/password atau Google
2. **Buat Room**: Klik "Buat Room Baru" untuk membuat room private
3. **Invite Pemain**: Bagikan kode room kepada teman
4. **Gabung Room**: Masukkan kode room untuk bergabung
5. **Ready Up**: Tekan tombol "Ready" saat sudah siap bermain
6. **Mulai Game**: Host dapat memulai game saat semua pemain ready
7. **Main Rummy**:
   - Ambil kartu dari deck
   - Buat meld (set/run) dengan 3+ kartu
   - Buang kartu yang tidak dibutuhkan
   - Pemain pertama yang habis kartunya menang

## 🎯 Aturan Game

### Mekanik Dasar
- Setiap pemain mendapat 7 kartu di awal
- Giliran berjalan searah jarum jam
- Setiap giliran: ambil kartu → buat meld (opsional) → buang kartu

### Meld
- **Set**: 3-4 kartu dengan rank sama, suit berbeda
- **Run**: 3+ kartu dengan suit sama, rank berurutan
- Joker dapat digunakan sebagai kartu pengganti

### Joker Mechanic
- Pemain dengan poin tertinggi di akhir ronde mendapat privilege
- Di awal ronde berikutnya, pemain tersebut dapat mengambil 1 Joker
- Joker diambil dari joker pool yang terbatas

## 🏗️ Struktur Proyek

```
rummy-lite/
├── public/
├── src/
│  ├── components/
│  │  ├── GameBoard/     # Komponen papan permainan
│  │  ├── Room/          # Komponen room/lobby
│  │  ├── Auth/          # Komponen autentikasi
│  │  └── HUD/           # Komponen UI overlay
│  ├── hooks/            # Custom hooks (state management)
│  ├── lib/
│  │  └── rummyEngine.ts # Logic game engine
│  ├── services/
│  │  └── firebase.ts    # Firebase configuration & functions
│  ├── pages/
│  │   └── Home.tsx      # Halaman utama/lobby
│  ├── App.tsx           # Main application component
│  └── main.tsx          # Entry point
├── firebase.rules       # Firebase security rules
├── package.json
└── README.md
```

## 🔒 Security Rules

Project ini menggunakan Firebase Security Rules untuk:

- Memastikan hanya pemain dalam room yang dapat mengakses data room
- Melindungi data pribadi pemain
- Mencegah akses tidak sah ke game state

## 📝 Status Pengembangan

### ✅ Selesai
- [x] Project setup dengan React + Vite + TypeScript
- [x] Firebase Authentication (email/password, Google Sign-In)
- [x] Room system (create, join, ready system)
- [x] Game engine logic (scoring, meld validation)
- [x] Real-time multiplayer dengan Firestore
- [x] Game board UI dengan card interactions
- [x] Joker mechanic implementation
- [x] Mobile responsive design
- [x] Firebase Security Rules

### 🔄 Future Enhancements
- [ ] Spectator mode
- [ ] Game history & statistics
- [ ] Voice chat integration
- [ ] Tournament mode
- [ ] Custom card backs
- [ ] Sound effects & animations

## 🐛 Troubleshooting

### Masalah Umum

1. **Firebase Connection Error**
   - Pastikan konfigurasi Firebase sudah benar
   - Cek Firestore rules di Firebase Console
   - Pastikan API key valid dan tidak expired

2. **Authentication Failed**
   - Pastikan Email/Password authentication sudah di-enable di Firebase Console
   - Verifikasi Google Sign-In configuration
   - Cek authorized domains di Firebase Auth settings

3. **Loading Screen Stuck**
   - Buka browser console (F12) untuk melihat error
   - Pastikan tidak ada network issues
   - Coba refresh browser atau clear cache
   - Periksa Firebase configuration di `src/services/firebase.ts`

4. **Real-time Sync Issues**
   - Cek internet connection
   - Refresh browser untuk reconnect
   - Pastikan Firestore security rules tidak blocking

### Debug Steps

1. **Buka Browser Console**:
   - Tekan F12 atau klik kanan → Inspect → Console
   - Cari error messages (biasanya berwarna merah)

2. **Check Network Tab**:
   - Di DevTools, buka tab Network
   - Coba refresh dan lihat apakah ada failed requests

3. **Verify Firebase Setup**:
   - Pastikan project di Firebase Console aktif
   - Cek apakah Firestore database sudah dibuat
   - Verifikasi Authentication methods sudah di-enable

4. **Environment Variables**:
   - Copy `.env.example` ke `.env`
   - Isi dengan Firebase configuration Anda
   - Restart development server

### Common Error Messages

- **"auth/invalid-api-key"**: API key tidak valid atau salah
- **"auth/network-request-failed"**: Masalah koneksi internet
- **"permission-denied"**: Firestore security rules memblok akses
- **"Failed to initialize authentication"**: Error saat inisialisasi Firebase

## 🤝 Kontribusi

1. Fork repository
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buka Pull Request

## 📄 License

Project ini dilisensikan under MIT License - lihat file [LICENSE](LICENSE) untuk detail.

## 📞 Kontak

Jika ada pertanyaan atau masukan, silakan hubungi:

- Email: your-email@example.com
- GitHub Issues: [Create New Issue](https://github.com/your-username/rummy-lite/issues)

---

**Happy Gaming! 🎮**