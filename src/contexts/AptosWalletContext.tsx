"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as PetraWallet from '@/lib/petraWalletService';

// Define wallet context types
export type AptosWalletContextState = {
  isConnected: boolean;
  address: string;
  balance: string;
  privateKey: string;
  publicKey: string;
  status: 'connecting' | 'connected' | 'disconnected';
  isPetraInstalled: boolean;
  network: string | null;
  mintAgentTransaction: (agentName: string) => Promise<{ hash: string } | null>;
  trainAgentTransaction: (agentId: string, attribute: string) => Promise<{ hash: string } | null>;
  buyAgentTransaction: (sellerAddress: string, priceInApt: string) => Promise<{ hash: string } | null>;
};

type AptosWalletContextType = {
  wallet: AptosWalletContextState;
  connectWallet: (privateKey?: string) => Promise<boolean>;
  disconnectWallet: () => void;
  isAutoConnecting: boolean;
  checkPetraInstallation: () => boolean;
  refreshBalance: () => Promise<void>;
};

// Create context with default values
const AptosWalletContext = createContext<AptosWalletContextType>({
  wallet: {
    isConnected: false,
    address: '',
    balance: '0',
    privateKey: '',
    publicKey: '',
    status: 'disconnected',
    isPetraInstalled: false,
    network: null,
    mintAgentTransaction: async () => null,
    trainAgentTransaction: async () => null,
    buyAgentTransaction: async () => null,
  },
  connectWallet: async () => false,
  disconnectWallet: () => {},
  isAutoConnecting: false,
  checkPetraInstallation: () => false,
  refreshBalance: async () => {},
});

export function AptosWalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<AptosWalletContextState>({
    isConnected: false,
    address: '',
    balance: '0',
    privateKey: '',
    publicKey: '',
    status: 'disconnected',
    isPetraInstalled: false,
    network: null,
    mintAgentTransaction: async () => null,
    trainAgentTransaction: async () => null,
    buyAgentTransaction: async () => null,
  });
  
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  
  // Check Petra installation on mount
  useEffect(() => {
    const isPetraInstalled = checkPetraInstallation();
    setWallet(prev => ({ 
      ...prev, 
      isPetraInstalled,
      // Add the transaction functions to the wallet state
      mintAgentTransaction: mintAgentTransaction,
      trainAgentTransaction: trainAgentTransaction,
      buyAgentTransaction: buyAgentTransaction,
    }));
  }, []);
  
  // Subscribe to Petra wallet events
  useEffect(() => {
    if (!wallet.isPetraInstalled) return;
    
    // Subscribe to network changes
    PetraWallet.subscribeToNetworkChanges((network) => {
      console.log('Network changed to:', network);
      setWallet(prev => ({ ...prev, network }));
    });
    
    // Subscribe to account changes
    PetraWallet.subscribeToAccountChanges((account) => {
      if (account) {
        console.log('Account changed:', account);
        // Try to get the balance
        fetchAccountBalance(account.address);
        
        setWallet(prev => ({
          ...prev,
          address: account.address,
          publicKey: account.publicKey,
          isConnected: true,
          status: 'connected',
        }));
      } else {
        // If account is null, it means the wallet is disconnected
        disconnectWallet();
      }
    });
    
    // Subscribe to disconnect events
    PetraWallet.subscribeToDisconnect(() => {
      console.log('Wallet disconnected');
      disconnectWallet();
    });
  }, [wallet.isPetraInstalled]);
  
  // Auto-connect on component mount if private key exists
  useEffect(() => {
    const savedPrivateKey = localStorage.getItem('aptosPrivateKey');
    if (savedPrivateKey || wallet.isPetraInstalled) {
      setIsAutoConnecting(true);
      connectWallet(savedPrivateKey).finally(() => {
        setIsAutoConnecting(false);
      });
    }
  }, [wallet.isPetraInstalled]);
  
  // Fetch account balance from the Aptos API
  const fetchAccountBalance = async (address: string) => {
    try {
      console.log('Fetching balance for:', address);
      
      // Using Aptos testnet API
      const response = await fetch(`https://fullnode.testnet.aptoslabs.com/v1/accounts/${address}/resources`);
      
      if (!response.ok) {
        console.error('Error fetching balance, status:', response.status);
        throw new Error(`API responded with status ${response.status}`);
      }
      
      const resources = await response.json();
      
      // Find the coin resource
      const coinResource = resources.find(
        (r: any) => r.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
      );
      
      if (coinResource && coinResource.data && coinResource.data.coin) {
        // Convert from octas to APT (1 APT = 100,000,000 octas)
        const balanceInOctas = parseInt(coinResource.data.coin.value);
        const balanceInApt = balanceInOctas / 100000000;
        
        console.log('Updated balance:', balanceInApt.toFixed(2));
        
        setWallet(prev => ({
          ...prev,
          balance: balanceInApt.toFixed(2)
        }));
      } else {
        console.error('Coin resource not found in API response:', resources);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };
  
  // Check if Petra is installed
  const checkPetraInstallation = (): boolean => {
    return PetraWallet.isPetraInstalled();
  };
  
  // Connect wallet 
  const connectWallet = async (privateKey?: string): Promise<boolean> => {
    try {
      setWallet(prev => ({ 
        ...prev, 
        status: 'connecting',
        // Keep the transaction functions when updating state
        mintAgentTransaction: mintAgentTransaction,
        trainAgentTransaction: trainAgentTransaction,
        buyAgentTransaction: buyAgentTransaction,
      }));
      
      // First try to connect with Petra if installed
      if (wallet.isPetraInstalled) {
        const response = await PetraWallet.connectPetraWallet();
        
        if (response) {
          let network = null;
          try {
            network = await PetraWallet.getPetraNetwork();
            console.log('Connected to network:', network);
          } catch (error) {
            console.error('Error getting network, assuming testnet:', error);
            network = 'Testnet';
          }
          
          // Fetch account balance
          await fetchAccountBalance(response.address);
          
          // Update wallet state
          setWallet({
            isConnected: true,
            address: response.address,
            publicKey: response.publicKey,
            balance: wallet.balance, // Keep existing balance until we fetch the updated one
            privateKey: privateKey || '',
            status: 'connected',
            isPetraInstalled: true,
            network,
            mintAgentTransaction: mintAgentTransaction,
            trainAgentTransaction: trainAgentTransaction,
            buyAgentTransaction: buyAgentTransaction,
          });
          
          // Save private key if provided
          if (privateKey) {
            localStorage.setItem('aptosPrivateKey', privateKey);
          }
          
          console.log('Wallet connected:', response.address);
          return true;
        }
      } 
      // Fallback to private key connection if Petra is not available or fails
      else if (privateKey) {
        // For compatibility with the previous implementation
        // In a real app with testnet private key, you would import the key into Petra
        // Or use a different approach for key management
        const mockAddress = `0x${privateKey.slice(0, 8)}${Date.now().toString(16).slice(0, 8)}`;
        
        // Update wallet state
        setWallet({
          isConnected: true,
          address: mockAddress,
          publicKey: '',
          balance: '10.00', // Hardcoded for testnet to show non-zero balance
          privateKey: privateKey,
          status: 'connected',
          isPetraInstalled: false,
          network: 'Testnet',
          mintAgentTransaction: mintAgentTransaction,
          trainAgentTransaction: trainAgentTransaction,
          buyAgentTransaction: buyAgentTransaction,
        });
        
        // Save to local storage
        localStorage.setItem('aptosPrivateKey', privateKey);
        
        console.log('Wallet connected with private key:', mockAddress);
        return true;
      }
      
      // If we reach here, neither method succeeded
      throw new Error('Failed to connect wallet');
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setWallet({
        isConnected: false,
        address: '',
        publicKey: '',
        balance: '0',
        privateKey: '',
        status: 'disconnected',
        isPetraInstalled: wallet.isPetraInstalled,
        network: null,
        mintAgentTransaction: mintAgentTransaction,
        trainAgentTransaction: trainAgentTransaction,
        buyAgentTransaction: buyAgentTransaction,
      });
      return false;
    }
  };
  
  // Disconnect wallet
  const disconnectWallet = async () => {
    if (wallet.isPetraInstalled) {
      await PetraWallet.disconnectPetraWallet();
    }
    
    setWallet({
      isConnected: false,
      address: '',
      publicKey: '',
      balance: '0',
      privateKey: '',
      status: 'disconnected',
      isPetraInstalled: wallet.isPetraInstalled,
      network: null,
      mintAgentTransaction: mintAgentTransaction,
      trainAgentTransaction: trainAgentTransaction,
      buyAgentTransaction: buyAgentTransaction,
    });
    localStorage.removeItem('aptosPrivateKey');
  };
  
  // Mint agent transaction
  const mintAgentTransaction = async (agentName: string) => {
    console.log('Minting agent with name:', agentName);
    return await PetraWallet.mintAgentTransaction(agentName);
  };
  
  // Train agent transaction
  const trainAgentTransaction = async (agentId: string, attribute: string) => {
    console.log('Training agent:', agentId, 'attribute:', attribute);
    return await PetraWallet.trainAgentTransaction(agentId, attribute);
  };
  
  // Buy agent transaction
  const buyAgentTransaction = async (sellerAddress: string, priceInApt: string) => {
    console.log('Buying agent from:', sellerAddress, 'for price:', priceInApt, 'APT');
    return await PetraWallet.buyAgentTransaction(sellerAddress, priceInApt);
  };
  
  // Make this function public
  const refreshBalance = async (): Promise<void> => {
    if (wallet.address) {
      await fetchAccountBalance(wallet.address);
    }
  };
  
  return (
    <AptosWalletContext.Provider
      value={{
        wallet,
        connectWallet,
        disconnectWallet,
        isAutoConnecting,
        checkPetraInstallation,
        refreshBalance,
      }}
    >
      {children}
    </AptosWalletContext.Provider>
  );
}

export const useAptosWallet = () => useContext(AptosWalletContext); 