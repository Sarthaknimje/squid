"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { FaHome, FaGamepad } from "react-icons/fa";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-9xl font-bold text-squid-pink">404</h1>
        <h2 className="text-4xl font-bold mb-6 text-gray-800 dark:text-gray-200">Game Over</h2>
        <p className="text-xl mb-8 text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          The page you're looking for has been eliminated from the game.
        </p>
      </motion.div>
      
      <div className="bg-white dark:bg-squid-dark shadow-xl p-8 rounded-lg max-w-md w-full">
        <p className="text-lg mb-6 text-gray-700 dark:text-gray-300">
          You have two choices:
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <Link 
            href="/"
            className="flex items-center justify-center gap-2 bg-squid-pink text-white py-3 px-6 rounded-md font-bold hover:bg-opacity-90 transition-colors"
          >
            <FaHome /> Go Home
          </Link>
          
          <Link 
            href="/game"
            className="flex items-center justify-center gap-2 bg-gray-800 text-white py-3 px-6 rounded-md font-bold hover:bg-opacity-90 transition-colors"
          >
            <FaGamepad /> Play Games
          </Link>
        </div>
      </div>
    </div>
  );
} 