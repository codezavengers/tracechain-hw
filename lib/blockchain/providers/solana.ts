import type { Chain, Transaction } from "@/lib/types"
import { AbstractProvider } from "./base"
import { ProviderError } from "@/lib/blockchain/net"
import { getChainConfig, NATIVE_ASSET } from "@/lib/blockchain/config"
import type { TokenTransfer, WalletBalance } from "@/lib/blockchain/data-source"

interface SolanaResponse<T> {
  result?: T
  error?: { message?: string }
}

export class SolanaProvider extends AbstractProvider {
  readonly chain: Chain = "solana"
  readonly name = "solana:rpc"
  readonly nativeSource = "LIVE" as const

  isConfigured(): boolean {
    return getChainConfig(this.chain).configured
  }

  private async rpc<T>(method: string, params: unknown[]): Promise<T> {
    const cfg = getChainConfig(this.chain)
    if (!cfg.configured) throw new ProviderError("Solana RPC is not configured.", "not_configured")
    const response = await fetch(cfg.baseUrl, {
      method: "POST",
      headers: { "content-type": "application/json", ...(cfg.apiKey ? { "x-api-key": cfg.apiKey } : {}) },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      cache: "no-store",
    })
    if (!response.ok) throw new ProviderError(`Solana RPC request failed (${response.status}).`, "http", response.status)
    const payload = (await response.json()) as SolanaResponse<T>
    if (payload.error) throw new ProviderError(payload.error.message ?? "Solana RPC error.", "http")
    if (payload.result === undefined) throw new ProviderError("Solana RPC returned no result.", "parse")
    return payload.result
  }

  async getWalletBalance(address: string): Promise<WalletBalance> {
    const result = await this.rpc<{ value: number }>("getBalance", [address])
    return {
      address,
      chain: this.chain,
      balance: (result.value ?? 0) / 1_000_000_000,
      asset: NATIVE_ASSET.solana,
      usdBalance: null,
    }
  }

  async getTransactions(): Promise<Transaction[]> {
    return []
  }

  async getTransaction(): Promise<Transaction | null> {
    return null
  }

  async getTokenTransfers(): Promise<TokenTransfer[]> {
    return []
  }
}

export { SolanaProvider as SolanaRpcProvider }

// Keep the method name visible to implementors that later add indexed history.
export const SOLANA_HISTORY_NOTE = "Solana RPC balance is live; transaction history requires an indexed provider."
