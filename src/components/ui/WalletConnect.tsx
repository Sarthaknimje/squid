"use client";

import { useState } from "react";
import { FaWallet } from "react-icons/fa";

// This is a mock wallet connection component
// In a real implementation, we would use the Aptos wallet adapter
export default function WalletConnect() {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const connectWallet = () => {
    // Mock wallet connection
    // In a real implementation, we would use the Aptos wallet adapter
    const mockAddress = "0x1a2b3c4d5e6f7g8h9i0j";
    setWalletAddress(mockAddress);
    setIsConnected(true);
  };

  const disconnectWallet = () => {
    setWalletAddress("");
    setIsConnected(false);
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <div className="relative">
      {isConnected ? (
        <button
          className="flex items-center bg-squid-pink text-white px-4 py-2 rounded-full hover:bg-opacity-90 transition-colors"
          onClick={toggleDropdown}
        >
          <FaWallet className="mr-2" />
          <span>{walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}</span>
        </button>
      ) : (
        <button
          className="flex items-center bg-squid-pink text-white px-4 py-2 rounded-full hover:bg-opacity-90 transition-colors"
          onClick={connectWallet}
        >
          <FaWallet className="mr-2" />
          Connect Wallet
        </button>
      )}

      {isConnected && isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
          <div className="py-1">
            <button
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
              onClick={disconnectWallet}
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 