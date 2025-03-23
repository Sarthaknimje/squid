import { AccountAddress } from "@aptos-labs/ts-sdk";
import { BaseSigner } from "./moveAgentKit";

export class MockSigner implements BaseSigner {
  private _address: string;

  constructor(address: string = "0x1a2b3c4d5e6f7g8h9i0j") {
    this._address = address;
  }

  address(): AccountAddress {
    return this._address as unknown as AccountAddress;
  }

  async signTransaction(tx: any): Promise<any> {
    console.log("Signing transaction:", tx);
    return {
      signature: "mock-signature",
      signedTx: tx
    };
  }
} 