import { useState, useEffect, useCallback } from 'react';

// Simple wallet interface
interface Wallet {
  address: string;
  balance: string;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export function useWallet() {
  const [wallet, setWallet] = useState<Wallet>({
    address: '',
    balance: '0',
    isConnected: false,
    isConnecting: false,
    error: null
  });
  
  // Mock balance for demo purposes
  const [balance, setBalance] = useState(1000);
  
  // Connect wallet function
  const connectWallet = useCallback(async () => {
    setWallet(prev => ({ ...prev, isConnecting: true, error: null }));
    
    try {
      // In a real implementation, this would connect to an actual wallet
      // For demo purposes, we'll just simulate a successful connection
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockAddress = '0x' + Math.random().toString(36).substring(2, 15);
      const mockBalance = '100.0';
      
      setWallet({
        address: mockAddress,
        balance: mockBalance,
        isConnected: true,
        isConnecting: false,
        error: null
      });
      
      return true;
    } catch (error) {
      setWallet(prev => ({
        ...prev,
        isConnecting: false,
        error: 'Failed to connect wallet'
      }));
      
      return false;
    }
  }, []);
  
  // Disconnect wallet function
  const disconnectWallet = useCallback(() => {
    setWallet({
      address: '',
      balance: '0',
      isConnected: false,
      isConnecting: false,
      error: null
    });
  }, []);
  
  // Functions to add/subtract from the mock balance
  const addBalance = useCallback((amount: number) => {
    setBalance(prev => prev + amount);
  }, []);
  
  const subtractBalance = useCallback((amount: number) => {
    setBalance(prev => Math.max(0, prev - amount));
  }, []);
  
  return {
    wallet,
    connectWallet,
    disconnectWallet,
    balance,
    addBalance,
    subtractBalance
  };
} 