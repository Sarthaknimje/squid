import React, { useEffect, useState } from 'react';
import { checkWalletStatus } from '@/utils/wallet';

interface WalletConnectorProps {
  onWalletStatusChange: (status: { available: boolean, connected: boolean, address: string | null }) => void;
}

const SimpleWalletConnector: React.FC<WalletConnectorProps> = ({ onWalletStatusChange }) => {
  const [walletStatus, setWalletStatus] = useState<{
    available: boolean;
    connected: boolean;
    address: string | null;
  }>({
    available: false,
    connected: false,
    address: null
  });

  // Check wallet status on component mount
  useEffect(() => {
    const checkStatus = async () => {
      const status = await checkWalletStatus();
      setWalletStatus(status);
      onWalletStatusChange(status);
    };

    checkStatus();

    // Set up interval to check wallet status
    const intervalId = setInterval(checkStatus, 5000);

    return () => clearInterval(intervalId);
  }, [onWalletStatusChange]);

  // Handle connect button click
  const handleConnect = async () => {
    if (typeof window === 'undefined' || !window.petra) return;

    try {
      await window.petra.connect();
      const status = await checkWalletStatus();
      setWalletStatus(status);
      onWalletStatusChange(status);
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  // Handle disconnect button click
  const handleDisconnect = async () => {
    if (typeof window === 'undefined' || !window.petra) return;

    try {
      await window.petra.disconnect();
      const status = await checkWalletStatus();
      setWalletStatus(status);
      onWalletStatusChange(status);
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {!walletStatus.available ? (
        <div className="flex items-center gap-2">
          <span className="text-red-500">Petra wallet not detected</span>
          <a 
            href="https://petra.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 underline"
          >
            Install Petra
          </a>
        </div>
      ) : walletStatus.connected ? (
        <div className="flex items-center gap-2">
          <div className="bg-green-500 w-3 h-3 rounded-full"></div>
          <span className="text-sm">
            {walletStatus.address ? 
              `${walletStatus.address.substring(0, 6)}...${walletStatus.address.substring(walletStatus.address.length - 4)}` 
              : 'Connected'}
          </span>
          <button
            onClick={handleDisconnect}
            className="px-2 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="bg-red-500 w-3 h-3 rounded-full"></div>
          <span className="text-sm">Wallet disconnected</span>
          <button
            onClick={handleConnect}
            className="px-2 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Connect
          </button>
        </div>
      )}
    </div>
  );
};

export default SimpleWalletConnector; 