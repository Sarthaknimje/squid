import { AccountAddress } from "@aptos-labs/ts-sdk";
import { BaseSigner } from "./moveAgentKit";

export class RealSigner implements BaseSigner {
  constructor() {
    if (!window.aptos) {
      throw new Error("Aptos wallet not available. Please install the Petra wallet extension.");
    }
  }

  /**
   * Get the wallet address from the connected wallet
   */
  address(): AccountAddress {
    if (!window.aptos) {
      throw new Error("Aptos wallet not connected");
    }
    return window.aptos.account();
  }

  /**
   * Sign a transaction using the connected wallet
   * @param tx Transaction to sign
   * @returns Signed transaction
   */
  async signTransaction(tx: any): Promise<any> {
    if (!window.aptos) {
      throw new Error("Aptos wallet not connected");
    }
    
    // Sign the transaction
    try {
      const signedTx = await window.aptos.signTransaction(tx);
      return signedTx;
    } catch (error) {
      console.error("Error signing transaction:", error);
      throw error;
    }
  }

  /**
   * Sign and submit a transaction in one operation
   * @param tx Transaction to sign and submit
   * @returns Transaction hash
   */
  async signAndSubmitTransaction(tx: any): Promise<{ hash: string }> {
    if (!window.aptos) {
      throw new Error("Aptos wallet not connected");
    }
    
    // Sign and submit the transaction
    try {
      const result = await window.aptos.signAndSubmitTransaction(tx);
      return result;
    } catch (error) {
      console.error("Error signing and submitting transaction:", error);
      throw error;
    }
  }

  /**
   * Check if wallet is connected
   * @returns True if wallet is connected
   */
  async isConnected(): Promise<boolean> {
    if (!window.aptos) {
      return false;
    }
    
    try {
      return await window.aptos.isConnected();
    } catch (error) {
      console.error("Error checking wallet connection:", error);
      return false;
    }
  }

  /**
   * Connect to wallet
   * @returns Wallet address
   */
  async connect(): Promise<{ address: AccountAddress }> {
    if (!window.aptos) {
      throw new Error("Aptos wallet not available. Please install the Petra wallet extension.");
    }
    
    try {
      return await window.aptos.connect();
    } catch (error) {
      console.error("Error connecting to wallet:", error);
      throw error;
    }
  }

  /**
   * Disconnect from wallet
   */
  async disconnect(): Promise<void> {
    if (!window.aptos) {
      return;
    }
    
    try {
      await window.aptos.disconnect();
    } catch (error) {
      console.error("Error disconnecting from wallet:", error);
      throw error;
    }
  }
} 