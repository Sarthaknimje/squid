"use client";

import { useEffect } from "react";
import { FaExclamationTriangle, FaRedo } from "react-icons/fa";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="bg-red-100 dark:bg-red-900 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <FaExclamationTriangle className="text-red-600 dark:text-red-300 text-3xl" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Game Error</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Something went wrong in the Squid Game Tournament.
          </p>
        </div>
        
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md mb-6">
          <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">
            {error.message || "An unexpected error occurred"}
          </p>
        </div>
        
        <button
          onClick={reset}
          className="w-full bg-squid-pink text-white py-3 rounded-md font-bold hover:bg-opacity-90 transition-colors flex items-center justify-center"
        >
          <FaRedo className="mr-2" /> Try Again
        </button>
      </div>
    </div>
  );
} 