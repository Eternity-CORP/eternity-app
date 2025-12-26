import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import HowItWorks from '@/components/HowItWorks';
import Security from '@/components/Security';
import BetaForm from '@/components/BetaForm';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen gradient-bg relative overflow-hidden">
      {/* Background Orbs */}
      <div className="orb w-[500px] h-[500px] bg-[#0098EA] top-[-200px] left-[-200px]" />
      <div className="orb w-[400px] h-[400px] bg-[#7B61FF] top-[30%] right-[-150px]" style={{ animationDelay: '-5s' }} />
      <div className="orb w-[350px] h-[350px] bg-[#00D9FF] bottom-[20%] left-[-100px]" style={{ animationDelay: '-10s' }} />
      
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
