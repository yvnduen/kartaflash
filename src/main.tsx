import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './globals.css';
import LiquidMetalHero from '@/components/ui/liquid-metal-hero';

interface KartaFlashGlobal {
  dashboard?: {
    openDeckModal?: (deckId: string | null) => void;
  };
}

function handleStartStudying() {
  const dashboardEl = document.getElementById('view-dashboard');
  if (dashboardEl) {
    dashboardEl.scrollIntoView({ behavior: 'smooth' });
  }
}

function handleCreateNewDeck() {
  const kf = (window as Window & { KartaFlash?: KartaFlashGlobal }).KartaFlash;
  if (kf?.dashboard?.openDeckModal) {
    kf.dashboard.openDeckModal(null);
    return;
  }
  const newDeckBtn = document.getElementById('btn-new-deck');
  if (newDeckBtn) {
    newDeckBtn.click();
  }
}

const heroRootEl = document.getElementById('liquid-metal-hero-root');

if (heroRootEl) {
  createRoot(heroRootEl).render(
    <StrictMode>
      <LiquidMetalHero
        badge="✨ KartaFlash · Meja Belajar Interaktif"
        title="Hafalan Lebih Cepat & Fokus"
        subtitle="Kuasai kosakata bahasa Arab, istilah teknis, dan catatan belajar lewat kartu 3D bolak-balik serta kuis pilihan ganda adaptif yang bekerja 100% offline di perambanmu."
        primaryCtaLabel="Mulai Belajar Sekarang"
        secondaryCtaLabel="Buat Deck Baru"
        onPrimaryCtaClick={handleStartStudying}
        onSecondaryCtaClick={handleCreateNewDeck}
        features={[
          'Kartu Belajar 3D & Dukungan RTL Arab',
          'Mode Kuis Pilihan Ganda Adaptif',
          '100% Offline & Cadangan JSON Instan',
        ]}
      />
    </StrictMode>
  );
}
