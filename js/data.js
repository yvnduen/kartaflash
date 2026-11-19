/**
 * KartaFlash - Sample Default Decks
 */
(function (global) {
  'use strict';

  var KF = (global.KartaFlash = global.KartaFlash || {});

  function getDefaultDecks() {
    var now = new Date().toISOString();
    return [
      {
        id: 'deck_mufrodat_arab',
        title: 'Mufrodat Bahasa Arab',
        description: 'Kosakata dasar bahasa Arab sehari-hari lengkap dengan harakat dan artinya (mendukung RTL).',
        color: 'emerald',
        createdAt: now,
        cards: [
          { id: 'arab_1', front: 'كِتَابٌ', back: 'Buku', mastered: false },
          { id: 'arab_2', front: 'مَدْرَسَةٌ', back: 'Sekolah', mastered: false },
          { id: 'arab_3', front: 'قَلَمٌ', back: 'Pena / Pulpen', mastered: false },
          { id: 'arab_4', front: 'بَيْتٌ', back: 'Rumah', mastered: false },
          { id: 'arab_5', front: 'مَاءٌ', back: 'Air', mastered: false },
          { id: 'arab_6', front: 'شَمْسٌ', back: 'Matahari', mastered: false },
          { id: 'arab_7', front: 'قَمَرٌ', back: 'Bulan', mastered: false },
          { id: 'arab_8', front: 'عِلْمٌ', back: 'Ilmu Pengetahuan', mastered: false },
          { id: 'arab_9', front: 'صَبَاحُ الْخَيْرِ', back: 'Selamat Pagi', mastered: false },
          { id: 'arab_10', front: 'شُكْرًا جَزِيلًا', back: 'Terima Kasih Banyak', mastered: false }
        ]
      },
      {
        id: 'deck_web_dev',
        title: 'Istilah Web Development',
        description: 'Konsep inti HTML, CSS, JavaScript, dan arsitektur web modern yang wajib dikuasai developer.',
        color: 'indigo',
        createdAt: now,
        cards: [
          {
            id: 'web_1',
            front: 'DOM (Document Object Model)',
            back: 'Representasi struktur dokumen HTML berbentuk pohon objek yang bisa dimanipulasi JavaScript',
            mastered: false
          },
          {
            id: 'web_2',
            front: 'localStorage',
            back: 'Penyimpanan lokal browser berpasangan key-value yang bertahan secara persisten meski tab ditutup',
            mastered: false
          },
          {
            id: 'web_3',
            front: 'Semantic HTML',
            back: 'Penggunaan tag HTML bermakna jelas seperti <header>, <main>, <article>, dan <footer>',
            mastered: false
          },
          {
            id: 'web_4',
            front: 'REST API',
            back: 'Antarmuka komunikasi web berbasis metode HTTP (GET, POST, PUT, DELETE) untuk pertukaran data',
            mastered: false
          },
          {
            id: 'web_5',
            front: 'Responsive Design',
            back: 'Pendekatan desain antarmuka agar tata letak otomatis menyesuaikan ukuran layar HP hingga desktop',
            mastered: false
          },
          {
            id: 'web_6',
            front: 'CSS Flexbox',
            back: 'Sistem tata letak CSS satu dimensi untuk menyusun elemen secara baris atau kolom dengan fleksibel',
            mastered: false
          },
          {
            id: 'web_7',
            front: 'CORS (Cross-Origin Resource Sharing)',
            back: 'Mekanisme keamanan browser yang mengatur izin akses resource dari domain atau origin berbeda',
            mastered: false
          },
          {
            id: 'web_8',
            front: 'Event Bubbling',
            back: 'Perambatan event dari elemen anak naik ke elemen induknya di dalam pohon DOM',
            mastered: false
          },
          {
            id: 'web_9',
            front: 'JSON (JavaScript Object Notation)',
            back: 'Format pertukaran data berbasis teks yang ringan dan mudah dibaca manusia maupun mesin',
            mastered: false
          },
          {
            id: 'web_10',
            front: 'Debounce',
            back: 'Teknik menunda eksekusi fungsi sampai jeda waktu tertentu setelah pemicu terakhir berhenti',
            mastered: false
          }
        ]
      },
      {
        id: 'deck_english_tech',
        title: 'Kosakata Inggris (Tech & Karier)',
        description: 'Istilah bahasa Inggris yang sering dipakai di lingkungan kerja teknologi dan pengembangan produk.',
        color: 'sky',
        createdAt: now,
        cards: [
          { id: 'eng_1', front: 'Deployment', back: 'Proses merilis aplikasi ke server agar dapat diakses pengguna', mastered: false },
          { id: 'eng_2', front: 'Refactor', back: 'Merapikan struktur internal kode tanpa mengubah perilaku eksternalnya', mastered: false },
          { id: 'eng_3', front: 'Scalability', back: 'Kemampuan sistem menangani peningkatan beban kerja dan jumlah pengguna', mastered: false },
          { id: 'eng_4', front: 'Deadline', back: 'Batas waktu terakhir penyelesaian suatu tugas atau proyek', mastered: false },
          { id: 'eng_5', front: 'Prototype', back: 'Purwarupa awal produk untuk menguji konsep dan alur desain', mastered: false },
          { id: 'eng_6', front: 'Debugging', back: 'Proses mencari, melacak, dan memperbaiki kesalahan dalam kode program', mastered: false },
          { id: 'eng_7', front: 'Feedback', back: 'Umpan balik atau masukan konstruktif untuk perbaikan', mastered: false },
          { id: 'eng_8', front: 'Bandwidth', back: 'Kapasitas maksimum jalur jaringan untuk mentransfer data per satuan waktu', mastered: false }
        ]
      }
    ];
  }

  KF.data = {
    getDefaultDecks: getDefaultDecks
  };
})(typeof window !== 'undefined' ? window : globalThis);
