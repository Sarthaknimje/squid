'use client';

import { useState } from 'react';
import { useAptosWallet } from '@/contexts/AptosWalletContext';
import { FaWallet, FaKey, FaCheckCircle, FaSpinner, FaDownload, FaExternalLinkAlt } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

export default function WalletConnector() {
  const { wallet, connectWallet, disconnectWallet, isAutoConnecting, checkPetraInstallation } = useAptosWallet();
  const [privateKey, setPrivateKey] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  
  const isPetraInstalled = checkPetraInstallation();
  
  // Handle Petra wallet installation
  const handleInstallPetra = () => {
    window.open('https://petra.app/', '_blank');
    toast('Redirecting to Petra wallet website', {
      icon: '🔗'
    });
  };
  
  // Connect with Petra wallet
  const handleConnectPetra = async () => {
    setIsConnecting(true);
    
    try {
      const success = await connectWallet();
      
      if (success) {
        toast.success('Petra wallet connected');
        setShowConnectModal(false);
      } else {
        toast.error('Failed to connect Petra wallet');
      }
    } catch (error) {
      console.error('Error connecting Petra wallet:', error);
      toast.error('Error connecting Petra wallet');
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Connect with private key
  const handleConnectWithKey = async () => {
    if (!privateKey.trim()) {
      toast.error('Please enter a private key');
      return;
    }
    
    setIsConnecting(true);
    
    try {
      const success = await connectWallet(privateKey);
      
      if (success) {
        toast.success('Wallet connected with private key');
        setPrivateKey('');
        setShowConnectModal(false);
      } else {
        toast.error('Failed to connect wallet');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('An error occurred while connecting wallet');
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Disconnect wallet
  const handleDisconnect = () => {
    disconnectWallet();
    toast.success('Wallet disconnected');
  };
  
  // If auto-connecting, show loading state
  if (isAutoConnecting) {
    return (
      <div className="flex items-center justify-center p-4 bg-gray-800 rounded-lg">
        <FaSpinner className="animate-spin mr-2 text-blue-500" />
        <span>Connecting wallet...</span>
      </div>
    );
  }
  
  // If wallet is connected, show connected state
  if (wallet.isConnected) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <FaWallet className="text-green-500 mr-2" />
            <span className="font-medium">Wallet Connected</span>
          </div>
          <FaCheckCircle className="text-green-500" />
        </div>
        
        <div className="mb-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Address:</span>
            <span className="text-gray-200 truncate max-w-[200px]">
              {wallet.address.substring(0, 6)}...{wallet.address.substring(wallet.address.length - 4)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Balance:</span>
            <span className="text-gray-200">{wallet.balance} APT</span>
          </div>
        </div>
        
        <button
          onClick={handleDisconnect}
          className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
        >
          Disconnect Wallet
        </button>
      </div>
    );
  }
  
  // Show wallet connect modal
  const renderConnectModal = () => {
    if (!showConnectModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
          <h3 className="text-xl font-bold mb-4">Connect Wallet</h3>
          
          {isPetraInstalled ? (
            <button
              onClick={handleConnectPetra}
              disabled={isConnecting}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-md text-white mb-4 flex items-center justify-center"
            >
              {isConnecting ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Connecting Petra...
                </>
              ) : (
                <>
                  <FaWallet className="mr-2" />
                  Connect with Petra
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleInstallPetra}
              className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 rounded-md text-white mb-4 flex items-center justify-center"
            >
              <FaDownload className="mr-2" />
              Install Petra Wallet
            </button>
          )}
          
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">or continue with</span>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">Private Key</label>
            <div className="relative">
              <input
                type={showPrivateKey ? 'text' : 'password'}
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="Enter your Aptos wallet private key"
                className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPrivateKey(!showPrivateKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <FaKey />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Your key is only stored locally and never sent to any server
            </p>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setShowConnectModal(false)}
              className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-md text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleConnectWithKey}
              disabled={isConnecting || !privateKey.trim()}
              className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center ${
                isConnecting || !privateKey.trim()
                  ? 'bg-gray-700 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isConnecting ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </button>
          </div>
          
          <div className="mt-4 text-xs text-center text-gray-500">
            For testnet: 0x7beda0a337c568c6c1c9a0cce330b48a52e52a271594749b4df32cce507b12c8
          </div>
        </div>
      </div>
    );
  };
  
  // If wallet is not connected, show connect button
  return (
    <>
      <button
        onClick={() => setShowConnectModal(true)}
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center justify-center"
      >
        <FaWallet className="mr-2" />
        Connect Wallet
      </button>
      
      {renderConnectModal()}
    </>
  );
} 