import { Controller, Get, Post, Query, Body, Param, BadRequestException } from '@nestjs/common';
import { CrosschainService } from '../../services/Crosschain.service';
import { CrosschainQuoteParams, CrosschainExecuteParams } from '../../types/crosschain.types';

@Controller('crosschain')
export class CrosschainController {
  constructor(private readonly crosschainService: CrosschainService) {}

  /**
   * Map token symbol to address (native tokens use zero address)
   */
  private getTokenAddress(tokenSymbol: string, chainId: string): string {
    const upperSymbol = tokenSymbol.toUpperCase();
    
    // Native tokens use zero address
    const nativeTokens: Record<string, string[]> = {
      ethereum: ['ETH'],
      mainnet: ['ETH'],
      sepolia: ['ETH', 'SEPOLIAETH'],
      holesky: ['ETH', 'HOLESKYETH'],
      polygon: ['MATIC'],
      bsc: ['BNB'],
      avalanche: ['AVAX'],
    };

    const chainLower = chainId.toLowerCase();
    if (nativeTokens[chainLower]?.includes(upperSymbol)) {
      return '0x0000000000000000000000000000000000000000';
    }

    // If it's already an address, return as-is
    if (tokenSymbol.startsWith('0x') && tokenSymbol.length === 42) {
      return tokenSymbol;
    }

    // Default: assume it's a native token
    return '0x0000000000000000000000000000000000000000';
  }

  /**
   * GET /api/crosschain/quote
   * Get best quote for crosschain swap
   */
  @Get('quote')
  async getQuote(@Query() query: any) {
    const params: CrosschainQuoteParams = {
      fromChainId: query.fromChainId,
      toChainId: query.toChainId,
      fromTokenAddress: this.getTokenAddress(query.fromToken, query.fromChainId),
      toTokenAddress: this.getTokenAddress(query.toToken, query.toChainId),
      amount: query.amount,
      fromAddress: query.fromAddress,
      toAddress: query.toAddress,
      slippage: query.slippage ? parseFloat(query.slippage) : undefined,
    };

    const result = await this.crosschainService.getBestQuote(params);

    return {
      estimatedOutput: result.quote.estimatedOutput,
      fee: result.quote.fee,
      feeToken: result.quote.feeToken,
      durationSeconds: result.quote.durationSeconds,
      priceImpact: result.quote.priceImpact,
      route: result.quote.route,
      router: result.router,
      provider: result.router.toLowerCase() as 'lifi' | 'rango',
      routeId: result.quote.route.id,
    };
  }

  /**
   * GET /api/crosschain/quotes/compare
   * Compare quotes from all routers
   */
  @Get('quotes/compare')
  async compareQuotes(@Query() query: any) {
    const params: CrosschainQuoteParams = {
      fromChainId: query.fromChainId,
      toChainId: query.toChainId,
      fromTokenAddress: this.getTokenAddress(query.fromToken, query.fromChainId),
      toTokenAddress: this.getTokenAddress(query.toToken, query.toChainId),
      amount: query.amount,
      fromAddress: query.fromAddress,
      toAddress: query.toAddress,
    };

    const quotes = await this.crosschainService.getAllQuotes(params);

    return {
      quotes: quotes.map((q) => ({
        router: q.router,
        estimatedOutput: q.quote.estimatedOutput,
        fee: q.quote.fee,
        feeToken: q.quote.feeToken,
        durationSeconds: q.quote.durationSeconds,
        priceImpact: q.quote.priceImpact,
        routeId: q.quote.route.id,
      })),
      bestRouter: quotes[0].router,
      recommended: quotes[0], // Full details of best quote
    };
  }

  /**
   * POST /api/crosschain/prepare
   * Prepare transaction for signing
   */
  @Post('prepare')
  async prepareTransaction(@Body() body: { router: string; routeId: string; fromAddress: string; toAddress: string }) {
    const { router, routeId, fromAddress, toAddress } = body;

    const params: CrosschainExecuteParams = {
      routeId,
      fromAddress,
      toAddress,
    };

    return await this.crosschainService.prepareTransaction(router, params);
  }

  /**
   * GET /api/crosschain/status/:txHash
   * Get crosschain transaction status
   */
  @Get('status/:txHash')
  async getStatus(@Param('txHash') txHash: string, @Query('router') router: string) {
    if (!router) {
      throw new BadRequestException('Router parameter is required');
    }

    return await this.crosschainService.getTransactionStatus(router, txHash);
  }

  /**
   * GET /api/crosschain/routers
   * Get list of available routers
   */
  @Get('routers')
  async getRouters() {
    const routers = this.crosschainService.getAvailableRouters();
    return { routers };
  }
}
