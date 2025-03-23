"use client";

import { useState, useEffect } from 'react';
import { FaWallet, FaKey, FaSignOutAlt, FaCheck, FaSpinner, FaDownload, FaExternalLinkAlt } from 'react-icons/fa';
import { useAptosWallet } from '@/contexts/AptosWalletContext';
import * as PetraWallet from '@/lib/petraWalletService';

export default function WalletConnector() {
  const { wallet, connectWallet, disconnectWallet, isAutoConnecting, refreshBalance } = useAptosWallet();
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Refresh balance periodically
  useEffect(() => {
    if (wallet.isConnected) {
      // Initial fetch
      refreshBalance();
      
      // Set up interval to refresh every 15 seconds
      const interval = setInterval(refreshBalance, 15000);
      
      return () => clearInterval(interval);
    }
  }, [wallet.isConnected, wallet.address, refreshBalance]);
  
  const handleConnectWithPetra = async () => {
    setIsSubmitting(true);
    
    try {
      const success = await connectWallet();
      
      if (success) {
        setShowConnectModal(false);
      }
    } catch (error) {
      console.error("Error connecting wallet with Petra:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleConnectWithPrivateKey = async () => {
    setIsSubmitting(true);
    
    try {
      const success = await connectWallet(privateKey);
      
      if (success) {
        setShowConnectModal(false);
        setPrivateKey('');
      }
    } catch (error) {
      console.error("Error connecting wallet with private key:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleInstallPetra = () => {
    PetraWallet.promptPetraInstallation();
  };
  
  const shortenAddress = (address: string) => {
    if (!address) return '';
    return address.substring(0, 6) + '...' + address.substring(address.length - 4);
  };
  
  // If wallet is already connected, show wallet info and disconnect button
  if (wallet.isConnected) {
    return (
      <div className="flex items-center gap-4">
        <div className="hidden md:flex flex-col items-end text-sm">
          <div className="flex items-center gap-1">
            <span className="text-green-400">
              <FaCheck size={10} />
            </span>
            <span className="text-green-400 font-medium">Connected</span>
          </div>
          <div className="text-gray-300">{shortenAddress(wallet.address || '')}</div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded bg-pink-600 text-white text-sm">
            {wallet.balance} APT
          </span>
          
          <button
            onClick={() => disconnectWallet()}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded flex items-center gap-1 transition-colors"
          >
            <FaSignOutAlt />
            <span className="hidden md:inline">Disconnect</span>
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <button
        onClick={() => setShowConnectModal(true)}
        className="bg-squid-pink hover:bg-squid-pink-dark text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
      >
        <FaWallet />
        <span>Connect Wallet</span>
      </button>
      
      {/* Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-squid-pink rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <FaWallet className="text-squid-pink" />
              Connect Wallet
            </h2>
            
            {!wallet.isPetraInstalled ? (
              <div className="mb-6">
                <div className="bg-yellow-900 bg-opacity-30 border border-yellow-800 rounded-lg p-4 mb-4">
                  <p className="text-yellow-400 mb-2">Petra wallet is not installed</p>
                  <p className="text-gray-300 text-sm mb-4">
                    Petra wallet is required to mint NFT agents and train them on the Aptos blockchain.
                  </p>
                  <button
                    onClick={handleInstallPetra}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
                  >
                    <FaDownload />
                    <span>Install Petra Wallet</span>
                  </button>
                </div>
                
                <p className="text-gray-400 text-sm mb-4 text-center">
                  — OR —
                </p>
              </div>
            ) : (
              <div className="mb-6">
                <button
                  onClick={handleConnectWithPetra}
                  disabled={isSubmitting || wallet.status === 'connecting'}
                  className={`w-full mb-4 px-4 py-3 rounded flex items-center justify-center gap-2 transition-colors ${
                    isSubmitting || wallet.status === 'connecting'
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isSubmitting || wallet.status === 'connecting' ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <FaWallet />
                      Connect with Petra
                    </>
                  )}
                </button>
                
                <p className="text-gray-400 text-sm mb-4 text-center">
                  — OR —
                </p>
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-gray-300 mb-2 flex items-center gap-2">
                <FaKey className="text-squid-pink" />
                Private Key
              </label>
              <input
                type="password"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white focus:border-squid-pink focus:outline-none"
                placeholder="0x..."
              />
              {wallet.status === 'disconnected' && (
                <p className="text-red-500 mt-2">Wallet not connected</p>
              )}
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConnectModal(false)}
                className="px-4 py-2 border border-gray-600 text-gray-300 rounded hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={handleConnectWithPrivateKey}
                disabled={!privateKey || isSubmitting || wallet.status === 'connecting'}
                className={`px-4 py-2 rounded flex items-center gap-2 transition-colors ${
                  !privateKey || isSubmitting || wallet.status === 'connecting'
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-squid-pink hover:bg-squid-pink-dark text-white'
                }`}
              >
                {isSubmitting || wallet.status === 'connecting' ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <FaKey />
                    Connect with Key
                  </>
                )}
              </button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-400">
                For testing, you can use the testnet wallet private key: 0x00a654ef527594d2165fdab60e22ef14e9da2fdf22bd485493e60311638d6801
              </p>
              <div className="mt-2 flex items-center justify-between">
                <a 
                  href="https://explorer.aptoslabs.com/account/0x00a654ef527594d2165fdab60e22ef14e9da2fdf22bd485493e60311638d6801?network=testnet" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                >
                  <span>View on Aptos Explorer</span>
                  <FaExternalLinkAlt size={10} />
                </a>
                <p className="text-gray-500 text-xs">Testnet APT: 0.1</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 