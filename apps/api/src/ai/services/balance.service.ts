/**
 * Balance Service for AI Tools
 * Fetches real token balances from Alchemy API across multiple networks.
 * Uses shared helpers for Alchemy calls and price fetching.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonRpcProvider, formatEther } from 'ethers';
import {
  SUPPORTED_NETWORKS,
  type NetworkId,
  TIER1_NETWORK_IDS,
  fetchAlchemyTokenBalances,
  fetchAlchemyTokenMetadata,
  fetchTokenPricesBySymbol,
  formatRawTokenBalance,
} from '@e-y/shared';

export interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  balanceUsd: string;
  price: number;
  network: string;
  contractAddress?: string;
}

export interface BalanceResult {
  balances: TokenBalance[];
  totalUsd: string;
  ethPrice: number;
}

interface NetworkTarget {
  id: string;
  name: string;
  alchemyUrl: string;
  rpcUrl: string;
  nativeSymbol: string;
  nativeName: string;
}

@Injectable()
export class BalanceServiceAi {
  private readonly logger = new Logger(BalanceServiceAi.name);
  private readonly alchemyApiKey: string;
  private readonly isTestnet: boolean;
  private providers: Record<string, JsonRpcProvider> = {};

  constructor(private readonly configService: ConfigService) {
    this.alchemyApiKey = this.configService.get<string>('ALCHEMY_API_KEY') || '';
    const network = this.configService.get<string>('NETWORK') || 'sepolia';
    this.isTestnet = network === 'sepolia' || network === 'testnet';
  }

  private getProvider(rpcUrl: string): JsonRpcProvider {
    if (!this.providers[rpcUrl]) {
      this.providers[rpcUrl] = new JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true });
    }
    return this.providers[rpcUrl];
  }

  private getNetworksToQuery(accountType?: string): NetworkTarget[] {
    // Use accountType to determine networks: 'real' = mainnet, 'test' = sepolia
    // Falls back to env NETWORK if accountType is not provided (backward compat)
    const useTestnet = accountType
      ? accountType === 'test'
      : this.isTestnet;

    if (useTestnet) {
      const alchemyUrl = `https://eth-sepolia.g.alchemy.com/v2/${this.alchemyApiKey}`;
      return [{
        id: 'sepolia',
        name: 'Sepolia (Testnet)',
        alchemyUrl,
        rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
        nativeSymbol: 'ETH',
        nativeName: 'Ether',
      }];
    }

    return TIER1_NETWORK_IDS.map((id: NetworkId) => {
      const net = SUPPORTED_NETWORKS[id];
      const alchemyUrl = `https://${net.alchemyNetwork}.g.alchemy.com/v2/${this.alchemyApiKey}`;
      return {
        id: net.id,
        name: net.name,
        alchemyUrl,
        rpcUrl: net.rpcUrlTemplate.replace('{apiKey}', this.alchemyApiKey),
        nativeSymbol: net.nativeCurrency.symbol,
        nativeName: net.nativeCurrency.name,
      };
    });
  }

  private async fetchNetworkBalances(
    address: string,
    net: NetworkTarget,
    prices: Record<string, number>,
    tokenFilter?: string,
  ): Promise<TokenBalance[]> {
    const balances: TokenBalance[] = [];

    // Native balance
    try {
      const provider = this.getProvider(net.rpcUrl);
      const balanceWei = await Promise.race([
        provider.getBalance(address),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('RPC timeout')), 15000),
        ),
      ]);
      const balance = formatEther(balanceWei);
      const balanceNum = parseFloat(balance);

      if (balanceNum > 0 && (!tokenFilter || tokenFilter.toUpperCase() === net.nativeSymbol)) {
        const price = prices[net.nativeSymbol] || 0;
        balances.push({
          symbol: net.nativeSymbol,
          name: net.nativeName,
          balance: balanceNum.toFixed(6),
          balanceUsd: (balanceNum * price).toFixed(2),
          price,
          network: net.name,
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch native balance on ${net.name}`, error);
    }

    // ERC-20 tokens
    if (!tokenFilter || tokenFilter.toUpperCase() !== net.nativeSymbol) {
      try {
        const tokens = await fetchAlchemyTokenBalances(net.alchemyUrl, address);
        for (const token of tokens) {
          const metadata = await fetchAlchemyTokenMetadata(net.alchemyUrl, token.contractAddress);
          if (!metadata) continue;
          if (tokenFilter && metadata.symbol.toUpperCase() !== tokenFilter.toUpperCase()) continue;

          const balance = formatRawTokenBalance(token.tokenBalance, metadata.decimals);
          if (parseFloat(balance) === 0) continue;

          const price = prices[metadata.symbol.toUpperCase()] || 0;
          balances.push({
            symbol: metadata.symbol,
            name: metadata.name,
            balance,
            balanceUsd: (parseFloat(balance) * price).toFixed(2),
            price,
            network: net.name,
            contractAddress: token.contractAddress,
          });
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch token balances on ${net.name}`, error);
      }
    }

    return balances;
  }

  /**
   * Get all balances for an address across all supported networks
   * @param accountType - Optional account type override ('test' | 'real').
   *   If provided, overrides the env NETWORK setting for network selection.
   */
  async getBalances(address: string, tokenFilter?: string, accountType?: string): Promise<BalanceResult> {
    this.logger.debug(`Fetching multi-network balances for ${address} (accountType: ${accountType || 'default'})`);

    const networks = this.getNetworksToQuery(accountType);

    // Fetch prices for common tokens
    const prices = await fetchTokenPricesBySymbol([
      'ETH', 'MATIC', 'USDC', 'USDT', 'DAI', 'WETH', 'WBTC', 'LINK', 'UNI', 'AAVE',
    ]);

    // Fetch balances from all networks in parallel
    const results = await Promise.allSettled(
      networks.map((net) => this.fetchNetworkBalances(address, net, prices, tokenFilter)),
    );

    const allBalances: TokenBalance[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allBalances.push(...result.value);
      }
    }

    const totalUsd = allBalances.reduce((sum, b) => sum + parseFloat(b.balanceUsd), 0);

    return {
      balances: allBalances,
      totalUsd: totalUsd.toFixed(2),
      ethPrice: prices['ETH'] || 0,
    };
  }
}
