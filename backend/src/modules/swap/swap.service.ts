import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LifiRouterService } from '../../services/routers/LifiRouter.service';
import { EthereumRpcService } from '../../services/EthereumRpc.service';
import { SwapExecution, SwapStatus } from '../../entities/SwapExecution.entity';
import {
  SwapQuoteRequestDto,
  SwapQuoteResponseDto,
  SwapExecuteRequestDto,
  SwapExecuteResponseDto,
  SwapStatusResponseDto,
} from './dto/swap.dto';

@Injectable()
export class SwapService {
  private readonly logger = new Logger(SwapService.name);

  // Temporary mapping for testnet support as per requirement
  private readonly chainIdToName: Record<number, string> = {
    11155111: 'sepolia',
    1: 'ethereum',
    137: 'polygon',
  };

  constructor(
    private readonly lifiRouter: LifiRouterService,
    private readonly ethereumRpc: EthereumRpcService,
    @InjectRepository(SwapExecution)
    private readonly swapExecutionRepository: Repository<SwapExecution>,
  ) {}

  async getQuote(dto: SwapQuoteRequestDto): Promise<SwapQuoteResponseDto> {
    const fromChainName = this.chainIdToName[dto.fromChainId];
    const toChainName = this.chainIdToName[dto.toChainId];

    if (!fromChainName || !toChainName) {
      throw new BadRequestException(`Unsupported chain IDs: ${dto.fromChainId}, ${dto.toChainId}`);
    }

    try {
      const quote = await this.lifiRouter.getQuote({
        fromChainId: fromChainName,
        toChainId: toChainName,
        fromTokenAddress: dto.fromTokenAddress,
        toTokenAddress: dto.toTokenAddress,
        amount: dto.amount,
        fromAddress: dto.fromAddress,
        toAddress: dto.fromAddress, // Assuming send to self for swap
        slippage: dto.slippageBps ? dto.slippageBps / 100 : 0.5, // Convert bps to %
      });

      // If we have transaction data immediately available (LiFi sometimes provides it in quote)
      // But typical flow is quote -> params -> transaction data.
      // The LifiRouterService.getQuote returns CrosschainQuote which has `route`.
      // We need to extract tx data if possible or indicate next step.
      // For LiFi, we usually need to call /transactionRequest separately if it's not in the quote steps?
      // LifiRouterService.prepareTransaction calls /transactionRequest with routeId.
      // So here we just return the routeId.

      this.cacheQuote(quote.route.id, {
        fromChainId: dto.fromChainId,
        toChainId: dto.toChainId,
        fromTokenAddress: dto.fromTokenAddress,
        toTokenAddress: dto.toTokenAddress,
        fromAmount: dto.amount,
        toAmount: quote.estimatedOutput,
      });

      return {
        routeId: quote.route.id,
        router: 'lifi',
        fromAmount: dto.amount,
        toAmount: quote.estimatedOutput,
        estimatedGas: quote.route.steps.reduce((acc, step) => acc + (Number(step.estimatedGas) || 0), 0).toString(),
        estimatedTimeSeconds: quote.durationSeconds,
        fromTokenAddress: dto.fromTokenAddress,
        toTokenAddress: dto.toTokenAddress,
        fromChainId: dto.fromChainId,
        toChainId: dto.toChainId,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get quote: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  async executeSwap(dto: SwapExecuteRequestDto): Promise<SwapExecuteResponseDto> {
    // 1. Broadcast transaction
    let txHash: string;
    try {
      txHash = await this.ethereumRpc.broadcastTransaction(dto.signedTx);
    } catch (error: any) {
      throw new BadRequestException(`Failed to broadcast transaction: ${error.message}`);
    }

    // 2. Save execution record
    // We don't have full details here unless we stored the quote or decode the tx.
    // For MVP, we might have to accept that some fields are missing or passed in DTO.
    // The prompt says "Look up the previously generated quote / route for that routeId (store in memory or DB as needed)."
    // Since I didn't implement quote storage in getQuote, I can't look it up.
    // I should probably store the quote in getQuote or require params in execute.
    // OR, I can just store what I have.
    // The prompt requires: fromChainId, toChainId, fromTokenSymbol, fromAmount, etc. in SwapExecution.
    // I'll assume for this MVP we strictly need to implement quote storage to fulfill the requirement fully.
    // But for "minimal", maybe I can just save the routeId and txHash and status.
    // Let's add a simple in-memory cache or just save basic info.
    // Actually, without the quote info, I can't populate `fromAmount`, `toAmount`, `tokens` in the DB entity.
    // I will skip populating detailed fields for now or set defaults/nulls, 
    // as storing quotes properly requires a new Entity or Cache. 
    // PROMPT: "Look up the previously generated quote / route for that routeId (store in memory or DB as needed)."
    // I'll use a simple in-memory Map for this session since Redis isn't explicitly set up for this module yet (though Redis is in config).
    
    const quoteDetails = this.quoteCache.get(dto.routeId);

    const execution = this.swapExecutionRepository.create({
      routeId: dto.routeId,
      router: dto.router,
      transactionHash: txHash,
      status: SwapStatus.PENDING,
      // Fill from cache if available
      fromChainId: quoteDetails?.fromChainId || 11155111,
      toChainId: quoteDetails?.toChainId || 11155111,
      fromTokenAddress: quoteDetails?.fromTokenAddress || '',
      toTokenAddress: quoteDetails?.toTokenAddress || '',
      fromAmount: quoteDetails?.fromAmount || '0',
      toAmount: quoteDetails?.toAmount || '0',
    });

    await this.swapExecutionRepository.save(execution);

    return {
      executionId: execution.id,
      transactionHash: txHash,
      status: SwapStatus.PENDING,
    };
  }

  async getStatus(executionId: string): Promise<SwapStatusResponseDto> {
    const execution = await this.swapExecutionRepository.findOne({ where: { id: executionId } });
    if (!execution) {
      throw new NotFoundException('Execution not found');
    }

    // If already final, return
    if (execution.status === SwapStatus.CONFIRMED || execution.status === SwapStatus.FAILED) {
      return {
        executionId: execution.id,
        transactionHash: execution.transactionHash,
        status: execution.status,
        fromAmount: execution.fromAmount,
        toAmount: execution.toAmount,
      };
    }

    // Check status via RPC
    try {
      const receipt = await this.ethereumRpc.getTransactionReceipt(execution.transactionHash);
      if (receipt) {
        if (receipt.status === '0x1') {
          execution.status = SwapStatus.CONFIRMED;
        } else {
          execution.status = SwapStatus.FAILED;
        }
        await this.swapExecutionRepository.save(execution);
      }
    } catch (error) {
      this.logger.warn(`Failed to check status for ${execution.transactionHash}: ${error}`);
    }

    return {
      executionId: execution.id,
      transactionHash: execution.transactionHash,
      status: execution.status,
      fromAmount: execution.fromAmount,
      toAmount: execution.toAmount,
    };
  }

  // Simple in-memory cache for quotes (expires not implemented for MVP)
  private quoteCache = new Map<string, any>();

  async cacheQuote(routeId: string, details: any) {
    this.quoteCache.set(routeId, details);
  }
}
