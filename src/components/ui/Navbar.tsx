"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaBars, 
  FaTimes,
  FaHome,
  FaGamepad,
  FaDumbbell,
  FaTrophy,
  FaStore,
  FaUser,
  FaSignOutAlt,
  FaSignInAlt
} from "react-icons/fa";
import { useAIAgent } from "@/contexts/AIAgentContext";
import BotIcon from "./BotIcon";

type NavigationItem = {
  name: string;
  href: string;
  icon: JSX.Element;
};

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const { agent } = useAIAgent();

  // Check if the user has scrolled
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const navigation: NavigationItem[] = [
    { name: "Home", href: "/", icon: <FaHome /> },
    { name: "Games", href: "/game", icon: <FaGamepad /> },
    { name: "Train", href: "/train", icon: <FaDumbbell /> },
    { name: "Tournament", href: "/tournament", icon: <FaTrophy /> },
    { name: "Marketplace", href: "/marketplace", icon: <FaStore /> },
    { name: "Profile", href: "/profile", icon: <FaUser /> },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-gray-900 shadow-lg backdrop-blur-lg bg-opacity-90" 
          : "bg-gray-900 bg-opacity-70 backdrop-blur-sm"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <div className="text-squid-pink font-bold text-xl flex items-center">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600 text-2xl">
                SQUID
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`relative px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "text-white"
                    : "text-gray-300 hover:text-white hover:bg-gray-800"
                }`}
              >
                <div className="flex items-center space-x-1">
                  <span className="text-squid-pink">{item.icon}</span>
                  <span>{item.name}</span>
                </div>
                {isActive(item.href) && (
                  <motion.div
                    layoutId="navIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-squid-pink"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </Link>
            ))}
          </div>

          {/* User Menu (Desktop) */}
          <div className="hidden md:flex items-center">
            {agent ? (
              <div className="flex items-center">
                <Link 
                  href="/profile" 
                  className="flex items-center mr-4 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all duration-300"
                >
                  <div className="w-8 h-8 mr-2 flex-shrink-0 relative">
                    <BotIcon type={agent.botType} className="w-full h-full" size="sm" />
                    <div className="absolute -bottom-1 -right-1 bg-squid-pink text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center text-white">
                      {agent.level}
                    </div>
                  </div>
                  <span className="text-white font-medium">{agent.name}</span>
                </Link>
                <button
                  className="flex items-center bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg transition duration-200 text-sm"
                >
                  <FaSignOutAlt className="mr-1" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button
                className="flex items-center bg-squid-pink hover:bg-opacity-80 text-white px-4 py-2 rounded-lg transition duration-200 text-sm"
              >
                <FaSignInAlt className="mr-1" />
                <span>Connect Wallet</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white p-2 rounded-md focus:outline-none"
            >
              {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-gray-900 shadow-lg overflow-hidden"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium ${
                    isActive(item.href)
                      ? "bg-gray-800 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <span className="text-squid-pink">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              ))}
              
              {/* User Menu (Mobile) */}
              <div className="pt-4 border-t border-gray-700">
                {agent ? (
                  <div className="space-y-2">
                    <Link 
                      href="/profile" 
                      className="flex items-center px-3 py-3 rounded-md bg-gray-800 hover:bg-gray-700 transition-all duration-300"
                    >
                      <div className="w-8 h-8 mr-3 flex-shrink-0 relative">
                        <BotIcon type={agent.botType} className="w-full h-full" size="sm" />
                        <div className="absolute -bottom-1 -right-1 bg-squid-pink text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center text-white">
                          {agent.level}
                        </div>
                      </div>
                      <span className="text-white font-medium">{agent.name}</span>
                    </Link>
                    <button
                      className="w-full flex items-center bg-gray-800 hover:bg-gray-700 text-white px-3 py-3 rounded-md transition duration-200 text-base"
                    >
                      <FaSignOutAlt className="mr-3" />
                      <span>Logout</span>
                    </button>
                  </div>
                ) : (
                  <button
                    className="w-full flex items-center justify-center bg-squid-pink hover:bg-opacity-80 text-white px-4 py-3 rounded-md transition duration-200 text-base"
                  >
                    <FaSignInAlt className="mr-2" />
                    <span>Connect Wallet</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
} 