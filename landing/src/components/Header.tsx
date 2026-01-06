'use client';

import { useState } from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b" style={{ 
      background: 'var(--header-bg)', 
      borderColor: 'var(--card-border)' 
    }}>
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo - Minimal */}
          <a href="#" className="flex items-center gap-2">
            <span style={{ color: 'var(--text-primary)' }} className="font-semibold text-lg tracking-tight">E-Y</span>
          </a>

          {/* Desktop Navigation - Bittensor style */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" style={{ color: 'var(--text-secondary)' }} className="hover:opacity-100 transition-opacity text-sm font-medium">FEATURES</a>
            <a href="#how-it-works" style={{ color: 'var(--text-secondary)' }} className="hover:opacity-100 transition-opacity text-sm font-medium">HOW IT WORKS</a>
            <a href="#security" style={{ color: 'var(--text-secondary)' }} className="hover:opacity-100 transition-opacity text-sm font-medium">SECURITY</a>
            
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-md transition-colors hover:bg-[var(--card-bg)]"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            <a href="#beta" className="btn-primary">JOIN BETA</a>
          </nav>

          {/* Mobile Controls */}
          <div className="md:hidden flex items-center gap-2">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-md"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button 
              className="p-2"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden mt-6 pb-4 flex flex-col gap-1 border-t pt-6" style={{ borderColor: 'var(--card-border)' }}>
            <a href="#features" style={{ color: 'var(--text-secondary)' }} className="py-3 text-sm font-medium">FEATURES</a>
            <a href="#how-it-works" style={{ color: 'var(--text-secondary)' }} className="py-3 text-sm font-medium">HOW IT WORKS</a>
            <a href="#security" style={{ color: 'var(--text-secondary)' }} className="py-3 text-sm font-medium">SECURITY</a>
            <a href="#beta" className="btn-primary text-center mt-4">JOIN BETA</a>
          </nav>
        )}
      </div>
    </header>
  );
}
