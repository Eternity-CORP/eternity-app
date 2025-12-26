'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[#0a0a0f]/80 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0098EA] to-[#7B61FF] flex items-center justify-center">
              <span className="text-white font-bold text-sm">E-Y</span>
            </div>
            <span className="text-xl font-bold text-white">E-Y Wallet</span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-white/70 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-white/70 hover:text-white transition-colors">How It Works</a>
            <a href="#security" className="text-white/70 hover:text-white transition-colors">Security</a>
            <a href="#beta" className="btn-primary text-sm">Join Beta</a>
          </nav>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-white p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 flex flex-col gap-4">
            <a href="#features" className="text-white/70 hover:text-white transition-colors py-2">Features</a>
            <a href="#how-it-works" className="text-white/70 hover:text-white transition-colors py-2">How It Works</a>
            <a href="#security" className="text-white/70 hover:text-white transition-colors py-2">Security</a>
            <a href="#beta" className="btn-primary text-sm text-center">Join Beta</a>
          </nav>
        )}
      </div>
    </header>
  );
}
