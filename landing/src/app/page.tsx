import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import HowItWorks from '@/components/HowItWorks';
import Security from '@/components/Security';
import BetaForm from '@/components/BetaForm';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* Subtle grid background */}
      <div className="fixed inset-0 grid-bg pointer-events-none" />
      
      {/* Subtle gradient orb - very minimal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl pointer-events-none" style={{ background: 'var(--card-bg)' }} />
      
      <Header />
      <Hero />
      <Features />
      <HowItWorks />
      <Security />
      <BetaForm />
      <Footer />
    </main>
  );
}
