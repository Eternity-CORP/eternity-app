import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class EthereumRpcService {
  private readonly logger = new Logger(EthereumRpcService.name);
  private readonly rpcUrl: string;

  constructor(private configService: ConfigService) {
    this.rpcUrl = this.configService.get<string>('ethersRpcUrl') || '';
    if (!this.rpcUrl) {
      this.logger.warn('ETHEREUM_RPC_URL is not set');
    }
  }

  async broadcastTransaction(signedTx: string): Promise<string> {
    try {
      const response = await axios.post(this.rpcUrl, {
        jsonrpc: '2.0',
        method: 'eth_sendRawTransaction',
        params: [signedTx],
        id: 1,
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data.result; // txHash
    } catch (error: any) {
      this.logger.error(`Failed to broadcast transaction: ${error.message}`);
      throw error;
    }
  }

  async getTransactionReceipt(txHash: string): Promise<any> {
    try {
      const response = await axios.post(this.rpcUrl, {
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash],
        id: 1,
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data.result;
    } catch (error: any) {
      this.logger.error(`Failed to get transaction receipt: ${error.message}`);
      throw error;
    }
  }
}
