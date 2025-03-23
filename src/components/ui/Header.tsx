"use client";

import Link from "next/link";
import Image from "next/image";
import { FaUser, FaBook, FaHome, FaGamepad, FaRobot, FaTrophy, FaStore } from "react-icons/fa";
import { useState, useEffect } from "react";
import WalletConnector from "@/components/ui/WalletConnector";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Add scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  return (
    <header className={`sticky top-0 py-4 px-6 shadow-md transition-all duration-300 z-50 ${
      scrolled ? 'bg-squid-dark bg-opacity-95 backdrop-blur-md' : 'bg-squid-pink'
    }`}>
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center">
          <div className="relative w-40 h-10">
            <Image 
              src="/images/logos/squid-game-logo.svg"
              alt="AI Deathmatch: Squid Game Logo"
              fill
              priority
              sizes="160px"
            />
          </div>
        </Link>
        <nav className="hidden md:flex space-x-6">
          <Link href="/" className="text-squid-white hover:text-opacity-80 transition-colors">Home</Link>
          <Link href="/game" className="text-squid-white hover:text-opacity-80 transition-colors">Games</Link>
          <Link href="/train" className="text-squid-white hover:text-opacity-80 transition-colors">Train AI</Link>
          <Link href="/tournament" className="text-squid-white hover:text-opacity-80 transition-colors">Tournament</Link>
          <Link href="/marketplace" className="text-squid-white hover:text-opacity-80 transition-colors">Marketplace</Link>
          <Link href="/profile" className="text-squid-white hover:text-opacity-80 transition-colors flex items-center gap-1">
            <FaUser /> Profile
          </Link>
          <Link href="/guide" className="text-squid-white hover:text-opacity-80 transition-colors flex items-center gap-1">
            <FaBook /> Guide
          </Link>
        </nav>
        <div className="flex items-center space-x-4">
          <WalletConnector />
          <button 
            className="md:hidden text-squid-white"
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-squid-dark py-4 px-6 shadow-lg backdrop-blur-md bg-opacity-95">
          <nav className="flex flex-col space-y-4">
            <Link 
              href="/" 
              className="text-squid-white hover:text-opacity-80 transition-colors flex items-center gap-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <FaHome /> Home
            </Link>
            <Link 
              href="/game" 
              className="text-squid-white hover:text-opacity-80 transition-colors flex items-center gap-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <FaGamepad /> Games
            </Link>
            <Link 
              href="/train" 
              className="text-squid-white hover:text-opacity-80 transition-colors flex items-center gap-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <FaRobot /> Train AI
            </Link>
            <Link 
              href="/tournament" 
              className="text-squid-white hover:text-opacity-80 transition-colors flex items-center gap-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <FaTrophy /> Tournament
            </Link>
            <Link 
              href="/marketplace" 
              className="text-squid-white hover:text-opacity-80 transition-colors flex items-center gap-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <FaStore /> Marketplace
            </Link>
            <Link 
              href="/profile" 
              className="text-squid-white hover:text-opacity-80 transition-colors flex items-center gap-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <FaUser /> Profile
            </Link>
            <Link 
              href="/guide" 
              className="text-squid-white hover:text-opacity-80 transition-colors flex items-center gap-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <FaBook /> Guide
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
} 