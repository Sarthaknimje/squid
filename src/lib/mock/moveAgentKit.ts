import { AccountAddress, Aptos, MoveStructId } from "@aptos-labs/ts-sdk";

export interface BaseSigner {
  address: () => AccountAddress;
  signTransaction: (tx: any) => Promise<any>;
}

export class AgentRuntime {
  public account: BaseSigner;
  public aptos: Aptos;
  public config: any;

  constructor(account: BaseSigner, aptos: Aptos, config?: any) {
    this.account = account;
    this.aptos = aptos;
    this.config = config || {};
  }

  async createToken(name: string, symbol: string, iconURI: string, projectURI: string) {
    console.log(`Creating token: ${name} (${symbol})`);
    return `token-${Date.now()}`;
  }

  async mintToken(to: AccountAddress, mint: string, amount: number) {
    console.log(`Minting ${amount} tokens of ${mint} to ${to}`);
    return {
      success: true,
      owner: to.toString(),
      token: mint,
    };
  }

  async transferTokens(to: AccountAddress, amount: number, mint: string) {
    console.log(`Transferring ${amount} of ${mint} to ${to}`);
    return {
      success: true,
      hash: `tx-${Date.now()}`,
    };
  }

  async getTransaction(hash: string) {
    console.log(`Getting transaction: ${hash}`);
    return {
      hash: hash,
      success: true,
      status: "success",
    };
  }

  async getTokenDetails(token: string) {
    console.log(`Getting token details: ${token}`);
    return {
      name: `SquidGame-${token.substring(0, 5)}`,
      symbol: "SQUID",
      supply: 1,
      decimals: 0,
      uri: "https://your-icon-url.com/icon.png",
    };
  }

  async getBalance(mint?: string | MoveStructId) {
    console.log(`Getting balance for: ${mint || "native token"}`);
    if (mint === "default-agent") return 0;
    return 1; // Return 1 for NFTs
  }

  async stakeTokensWithAmnis(to: AccountAddress, amount: number) {
    console.log(`Staking ${amount} tokens to ${to}`);
    return {
      success: true,
      hash: `stake-${Date.now()}`,
    };
  }

  async withdrawStakeFromAmnis(to: AccountAddress, amount: number) {
    console.log(`Withdrawing ${amount} staked tokens to ${to}`);
    return {
      success: true,
      hash: `unstake-${Date.now()}`,
    };
  }

  async transferNFT(to: AccountAddress, mint: AccountAddress) {
    console.log(`Transferring NFT ${mint} to ${to}`);
    return {
      success: true,
      hash: `transfer-nft-${Date.now()}`,
    };
  }

  async burnNFT(mint: AccountAddress) {
    console.log(`Burning NFT ${mint}`);
    return {
      success: true,
      hash: `burn-nft-${Date.now()}`,
    };
  }
} 