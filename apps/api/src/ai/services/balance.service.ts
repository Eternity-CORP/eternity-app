/**
 * Balance Service for AI Tools
 * Fetches real token balances from Alchemy API
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonRpcProvider, formatEther } from 'ethers';

export interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  balanceUsd: string;
  price: number;
  contractAddress?: string;
}

export interface BalanceResult {
  balances: TokenBalance[];
  totalUsd: string;
  ethPrice: number;
}

interface AlchemyTokenBalance {
  contractAddress: string;
  tokenBalance: string;
}

interface AlchemyTokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logo: string | null;
}

@Injectable()
export class BalanceServiceAi {
  private readonly logger = new Logger(BalanceServiceAi.name);
  private readonly alchemyApiKey: string;
  private readonly network: string;
  private provider: JsonRpcProvider | null = null;

  constructor(private readonly configService: ConfigService) {
    this.alchemyApiKey = this.configService.get<string>('ALCHEMY_API_KEY') || '';
    this.network = this.configService.get<string>('NETWORK') || 'sepolia';
  }

  private getAlchemyUrl(): string {
    return `https://eth-${this.network}.g.alchemy.com/v2/${this.alchemyApiKey}`;
  }

  private getProvider(): JsonRpcProvider {
    if (!this.provider) {
      this.provider = new JsonRpcProvider(this.getAlchemyUrl());
    }
    return this.provider;
  }

  /**
   * Fetch ETH balance for an address
   */
  async fetchEthBalance(address: string): Promise<{ balance: string; balanceRaw: string }> {
    try {
      const provider = this.getProvider();
      const balanceWei = await Promise.race([
        provider.getBalance(address),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('RPC timeout')), 15000)
        ),
      ]);
      const balance = formatEther(balanceWei);

      return {
        balance: parseFloat(balance).toFixed(6),
        balanceRaw: balanceWei.toString(),
      };
    } catch (error) {
      this.logger.warn('Failed to fetch ETH balance', error);
      throw error;
    }
  }

  /**
   * Fetch all ERC-20 token balances using Alchemy API
   */
  async fetchAllTokenBalances(address: string): Promise<AlchemyTokenBalance[]> {
    if (!this.alchemyApiKey) {
      this.logger.warn('Alchemy API key not configured');
      return [];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(this.getAlchemyUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'alchemy_getTokenBalances',
          params: [address, 'erc20'],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        this.logger.warn('Alchemy API error', { status: response.status });
        return [];
      }

      const data = await response.json();
      return (data.result?.tokenBalances || []).filter(
        (token: AlchemyTokenBalance) =>
          token.tokenBalance !== '0x0' && token.tokenBalance !== '0x'
      );
    } catch (error) {
      clearTimeout(timeoutId);
      this.logger.warn('Failed to fetch token balances', error);
      return [];
    }
  }

  /**
   * Fetch token metadata from Alchemy
   */
  async fetchTokenMetadata(
    contractAddress: string
  ): Promise<{ name: string; symbol: string; decimals: number } | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(this.getAlchemyUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'alchemy_getTokenMetadata',
          params: [contractAddress],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const { name, symbol, decimals } = data.result;
      return { name, symbol, decimals };
    } catch (error) {
      clearTimeout(timeoutId);
      this.logger.warn('Failed to fetch token metadata', error);
      return null;
    }
  }

  /**
   * Fetch ETH price from CoinGecko
   */
  async fetchEthPrice(): Promise<number> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
        {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        return 0;
      }

      const data = await response.json();
      return data.ethereum?.usd || 0;
    } catch (error) {
      clearTimeout(timeoutId);
      this.logger.warn('Failed to fetch ETH price', error);
      return 0;
    }
  }

  /**
   * Format raw token balance
   */
  private formatTokenBalance(rawBalance: string, decimals: number): string {
    if (!rawBalance || rawBalance === '0x0' || rawBalance === '0x') {
      return '0';
    }

    const balance = BigInt(rawBalance);
    const divisor = BigInt(10 ** decimals);
    const wholePart = balance / divisor;
    const fractionalPart = balance % divisor;

    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const trimmedFractional = fractionalStr.slice(0, 6).replace(/0+$/, '') || '0';

    if (wholePart === BigInt(0) && balance > BigInt(0)) {
      return `0.${fractionalStr.slice(0, 6)}`;
    }

    return `${wholePart}.${trimmedFractional}`;
  }

  /**
   * Get all balances for an address
   */
  async getBalances(address: string, tokenFilter?: string): Promise<BalanceResult> {
    this.logger.debug(`Fetching balances for ${address}`);

    try {
      // Fetch ETH balance and token balances in parallel
      const [ethBalanceData, tokenBalances, ethPrice] = await Promise.all([
        this.fetchEthBalance(address),
        this.fetchAllTokenBalances(address),
        this.fetchEthPrice(),
      ]);

      const balances: TokenBalance[] = [];

      // Add ETH balance
      const ethBalance = parseFloat(ethBalanceData.balance);
      const ethUsdValue = ethBalance * ethPrice;

      if (!tokenFilter || tokenFilter.toUpperCase() === 'ETH') {
        balances.push({
          symbol: 'ETH',
          name: 'Ethereum',
          balance: ethBalanceData.balance,
          balanceUsd: ethUsdValue.toFixed(2),
          price: ethPrice,
        });
      }

      // Process ERC-20 tokens
      if (!tokenFilter || tokenFilter.toUpperCase() !== 'ETH') {
        for (const token of tokenBalances) {
          const metadata = await this.fetchTokenMetadata(token.contractAddress);
          if (!metadata) continue;

          // Skip if filtering for specific token and this isn't it
          if (tokenFilter && metadata.symbol.toUpperCase() !== tokenFilter.toUpperCase()) {
            continue;
          }

          const balance = this.formatTokenBalance(token.tokenBalance, metadata.decimals);
          const balanceNum = parseFloat(balance);

          if (balanceNum === 0) continue;

          // For stablecoins, assume $1 price
          const isStablecoin = ['USDC', 'USDT', 'DAI', 'BUSD'].includes(
            metadata.symbol.toUpperCase()
          );
          const price = isStablecoin ? 1 : 0;
          const usdValue = balanceNum * price;

          balances.push({
            symbol: metadata.symbol,
            name: metadata.name,
            balance,
            balanceUsd: usdValue.toFixed(2),
            price,
            contractAddress: token.contractAddress,
          });
        }
      }

      // Calculate total USD value
      const totalUsd = balances.reduce(
        (sum, b) => sum + parseFloat(b.balanceUsd),
        0
      );

      return {
        balances,
        totalUsd: totalUsd.toFixed(2),
        ethPrice,
      };
    } catch (error) {
      this.logger.error('Failed to get balances', error);
      throw error;
    }
  }
}
