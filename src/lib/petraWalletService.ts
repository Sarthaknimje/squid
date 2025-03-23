// PetraWalletService.ts - Service for interacting with the Petra wallet

// Types for the Petra wallet API
type AptosWindow = Window & {
  aptos?: {
    connect: () => Promise<{ address: string; publicKey: string }>;
    disconnect: () => Promise<void>;
    isConnected: () => Promise<boolean>;
    network: () => Promise<string>;
    account: () => Promise<{ address: string; publicKey: string }>;
    signAndSubmitTransaction: (transaction: any) => Promise<{ hash: string }>;
    onNetworkChange: (callback: (network: string) => void) => void;
    onAccountChange: (callback: (account: { address: string; publicKey: string } | null) => void) => void;
    onDisconnect: (callback: () => void) => void;
  };
};

// Check if Petra wallet is installed
export const isPetraInstalled = (): boolean => {
  return typeof window !== 'undefined' && !!(window as AptosWindow).aptos;
};

// Get the Petra wallet if installed
export const getPetraWallet = () => {
  if (isPetraInstalled()) {
    return (window as AptosWindow).aptos!;
  }
  return null;
};

// Open Petra wallet installation page if not installed
export const promptPetraInstallation = () => {
  window.open('https://petra.app/', '_blank');
};

// Connect to Petra wallet
export const connectPetraWallet = async (): Promise<{ address: string; publicKey: string } | null> => {
  try {
    const wallet = getPetraWallet();
    if (!wallet) {
      console.error('Petra wallet not found');
      return null;
    }

    const response = await wallet.connect();
    console.log('Connected to Petra wallet:', response);
    return response;
  } catch (error) {
    console.error('Error connecting to Petra wallet:', error);
    return null;
  }
};

// Disconnect from Petra wallet
export const disconnectPetraWallet = async (): Promise<boolean> => {
  try {
    const wallet = getPetraWallet();
    if (!wallet) return false;

    await wallet.disconnect();
    return true;
  } catch (error) {
    console.error('Error disconnecting from Petra wallet:', error);
    return false;
  }
};

// Check if wallet is connected
export const isPetraConnected = async (): Promise<boolean> => {
  try {
    const wallet = getPetraWallet();
    if (!wallet) return false;
    
    return await wallet.isConnected();
  } catch (error) {
    console.error('Error checking Petra connection:', error);
    return false;
  }
};

// Get current account
export const getPetraAccount = async (): Promise<{ address: string; publicKey: string } | null> => {
  try {
    const wallet = getPetraWallet();
    if (!wallet) return null;
    
    return await wallet.account();
  } catch (error) {
    console.error('Error getting Petra account:', error);
    return null;
  }
};

// Get current network
export const getPetraNetwork = async (): Promise<string | null> => {
  try {
    const wallet = getPetraWallet();
    if (!wallet) return null;
    
    const network = await wallet.network();
    console.log('Getting network from Petra:', network);
    return network;
  } catch (error) {
    console.error('Error getting Petra network:', error);
    // Default to testnet if we can't detect network
    return 'Testnet';
  }
};

// Sign and submit a transaction
export const sendTransaction = async (transaction: any): Promise<{ hash: string } | null> => {
  try {
    const wallet = getPetraWallet();
    if (!wallet) {
      console.error('Petra wallet not available for transaction');
      return null;
    }
    
    console.log('Sending transaction:', transaction);
    const response = await wallet.signAndSubmitTransaction(transaction);
    console.log('Transaction sent successfully:', response);
    return response;
  } catch (error) {
    console.error('Error signing and submitting transaction:', error);
    return null;
  }
};

// Mint agent transaction (0.1 APT fee)
export const mintAgentTransaction = async (agentName: string): Promise<{ hash: string } | null> => {
  try {
    console.log('Starting mint transaction for agent:', agentName);
    
    // Testnet treasury address - receiver of the transaction
    const treasuryAddress = '0x00a654ef527594d2165fdab60e22ef14e9da2fdf22bd485493e60311638d6801';
    
    // 0.1 APT = 10^8 * 0.1 = 10,000,000 octas
    const paymentAmount = '10000000';
    
    // Dummy function call for minting an agent using a simple transfer transaction as an example
    const transaction = {
      type: 'entry_function_payload',
      function: '0x1::aptos_account::transfer',
      arguments: [treasuryAddress, paymentAmount], // 0.1 APT in octas
      type_arguments: [],
    };
    
    console.log('Sending mint transaction with amount:', paymentAmount, 'octas (0.1 APT)');
    return await sendTransaction(transaction);
  } catch (error) {
    console.error('Error minting agent:', error);
    return null;
  }
};

// Helper function to ensure Aptos addresses are properly formatted
const formatAptosAddress = (address: string): string => {
  if (!address) return '';
  
  // Remove 0x prefix if it exists
  const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
  
  // Pad to 64 characters
  const paddedAddress = cleanAddress.padEnd(64, '0');
  
  // Add 0x prefix back
  return `0x${paddedAddress}`;
};

// Buy agent transaction (send exact price in APT to seller)
export const buyAgentTransaction = async (
  sellerAddress: string,
  priceInApt: string
): Promise<{ hash: string } | null> => {
  try {
    console.log('Starting buy transaction for NFT');
    
    // Format the seller address properly
    const formattedAddress = formatAptosAddress(sellerAddress);
    console.log('Original seller address:', sellerAddress);
    console.log('Formatted seller address:', formattedAddress);
    
    // Convert APT to octas (1 APT = 10^8 octas)
    const priceInOctas = Math.floor(parseFloat(priceInApt) * 100000000).toString();
    
    // Create transaction to transfer APT to seller
    const transaction = {
      type: 'entry_function_payload',
      function: '0x1::aptos_account::transfer',
      arguments: [formattedAddress, priceInOctas],
      type_arguments: [],
    };
    
    console.log('Sending buy transaction with amount:', priceInOctas, 'octas (', priceInApt, 'APT) to seller:', formattedAddress);
    return await sendTransaction(transaction);
  } catch (error) {
    console.error('Error buying NFT agent:', error);
    return null;
  }
};

// Train agent transaction (0.1 APT fee)
export const trainAgentTransaction = async (
  agentId: string, 
  attribute: string
): Promise<{ hash: string } | null> => {
  try {
    console.log('Starting train transaction for agent:', agentId, 'attribute:', attribute);
    
    // Testnet treasury address - receiver of the transaction
    const treasuryAddress = '0x00a654ef527594d2165fdab60e22ef14e9da2fdf22bd485493e60311638d6801';
    
    // 0.1 APT = 10^8 * 0.1 = 10,000,000 octas
    const paymentAmount = '10000000';
    
    // Dummy function call for training an agent using a simple transfer transaction as an example
    const transaction = {
      type: 'entry_function_payload',
      function: '0x1::aptos_account::transfer',
      arguments: [treasuryAddress, paymentAmount], // 0.1 APT in octas
      type_arguments: [],
    };
    
    console.log('Sending training transaction with amount:', paymentAmount, 'octas (0.1 APT)');
    return await sendTransaction(transaction);
  } catch (error) {
    console.error('Error training agent:', error);
    return null;
  }
};

// Subscribe to network changes
export const subscribeToNetworkChanges = (callback: (network: string) => void): void => {
  const wallet = getPetraWallet();
  if (wallet) {
    wallet.onNetworkChange(callback);
  }
};

// Subscribe to account changes
export const subscribeToAccountChanges = (
  callback: (account: { address: string; publicKey: string } | null) => void
): void => {
  const wallet = getPetraWallet();
  if (wallet) {
    wallet.onAccountChange(callback);
  }
};

// Subscribe to disconnect events
export const subscribeToDisconnect = (callback: () => void): void => {
  const wallet = getPetraWallet();
  if (wallet) {
    wallet.onDisconnect(callback);
  }
}; 