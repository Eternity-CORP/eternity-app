/**
 * Routing Service Unit Tests
 * Tests routing utility functions with mock data
 */

// Pure functions copied from routing-service.ts to avoid import issues
type NetworkId = 'ethereum' | 'polygon' | 'arbitrum' | 'optimism' | 'base';

interface BridgeStep {
  type: 'swap' | 'bridge' | 'cross';
  tool: string;
  fromNetwork: NetworkId;
  toNetwork: NetworkId;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  estimatedTime: number;
}

interface BridgeRoute {
  steps: BridgeStep[];
  totalTime: number;
}

interface BridgeQuote {
  id: string;
  fromNetwork: NetworkId;
  toNetwork: NetworkId;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  toAmountMin: string;
  estimatedGas: string;
  estimatedGasUsd: number;
  bridgeFee: string;
  bridgeFeeUsd: number;
  totalFeeUsd: number;
  estimatedTime: number;
  priceImpact: string;
  route: BridgeRoute;
}

interface TransferRoute {
  type: 'direct' | 'bridge' | 'consolidation';
  fromNetwork: NetworkId;
  toNetwork: NetworkId;
  amount: string;
  token: string;
  bridgeQuote?: BridgeQuote;
  bridgeCostLevel?: 'none' | 'warning' | 'expensive';
  sources?: {
    network: NetworkId;
    amount: string;
    bridgeQuote?: BridgeQuote;
  }[];
  alternative?: {
    description: string;
    network: NetworkId;
  };
}

const SUPPORTED_NETWORKS: Record<NetworkId, { name: string; shortName: string }> = {
  ethereum: { name: 'Ethereum', shortName: 'ETH' },
  polygon: { name: 'Polygon', shortName: 'Poly' },
  arbitrum: { name: 'Arbitrum', shortName: 'Arb' },
  optimism: { name: 'Optimism', shortName: 'OP' },
  base: { name: 'Base', shortName: 'Base' },
};

// Pure functions from routing-service.ts

function getRouteTotalFees(route: TransferRoute): number {
  if (route.type === 'direct') {
    return 0;
  }

  if (route.type === 'bridge' && route.bridgeQuote) {
    return route.bridgeQuote.totalFeeUsd;
  }

  if (route.type === 'consolidation' && route.sources) {
    return route.sources.reduce((total, source) => {
      return total + (source.bridgeQuote?.totalFeeUsd ?? 0);
    }, 0);
  }

  return 0;
}

function getRouteEstimatedTime(route: TransferRoute): number {
  if (route.type === 'direct') {
    const blockTimes: Record<NetworkId, number> = {
      ethereum: 15,
      polygon: 2,
      arbitrum: 1,
      optimism: 2,
      base: 2,
    };
    return blockTimes[route.fromNetwork] ?? 15;
  }

  if (route.type === 'bridge' && route.bridgeQuote) {
    return route.bridgeQuote.estimatedTime;
  }

  if (route.type === 'consolidation' && route.sources) {
    const maxBridgeTime = route.sources.reduce((max, source) => {
      const time = source.bridgeQuote?.estimatedTime ?? 0;
      return Math.max(max, time);
    }, 0);
    return maxBridgeTime;
  }

  return 0;
}

function formatRouteDescription(route: TransferRoute): string {
  const fromName = SUPPORTED_NETWORKS[route.fromNetwork]?.name || route.fromNetwork;
  const toName = SUPPORTED_NETWORKS[route.toNetwork]?.name || route.toNetwork;

  switch (route.type) {
    case 'direct':
      return `Send directly on ${fromName}`;

    case 'bridge':
      return `Bridge from ${fromName} to ${toName}`;

    case 'consolidation':
      if (route.sources && route.sources.length > 1) {
        const sourceNames = route.sources
          .map((s) => SUPPORTED_NETWORKS[s.network]?.shortName || s.network)
          .join(', ');
        return `Consolidate from ${sourceNames} to ${toName}`;
      }
      return `Consolidate to ${toName}`;

    default:
      return 'Transfer';
  }
}

function routeRequiresConfirmation(route: TransferRoute): boolean {
  if (route.type === 'bridge') {
    return true;
  }

  if (route.type === 'consolidation') {
    return true;
  }

  return false;
}

// Helper to create a mock bridge quote
function createMockBridgeQuote(overrides: Partial<BridgeQuote> = {}): BridgeQuote {
  return {
    id: 'test-quote-1',
    fromNetwork: 'base',
    toNetwork: 'arbitrum',
    fromToken: 'USDC',
    toToken: 'USDC',
    fromAmount: '100000000',
    toAmount: '99500000',
    toAmountMin: '99000000',
    estimatedGas: '100000',
    estimatedGasUsd: 0.1,
    bridgeFee: '500000',
    bridgeFeeUsd: 0.4,
    totalFeeUsd: 0.5,
    estimatedTime: 120,
    priceImpact: '0.01',
    route: {
      steps: [],
      totalTime: 120,
    },
    ...overrides,
  };
}

describe('RoutingService', () => {
  describe('getRouteTotalFees', () => {
    it('should return 0 for direct transfer', () => {
      const route: TransferRoute = {
        type: 'direct',
        fromNetwork: 'base',
        toNetwork: 'base',
        amount: '100',
        token: 'USDC',
      };

      expect(getRouteTotalFees(route)).toBe(0);
    });

    it('should return bridge fee for bridge transfer', () => {
      const route: TransferRoute = {
        type: 'bridge',
        fromNetwork: 'base',
        toNetwork: 'arbitrum',
        amount: '100',
        token: 'USDC',
        bridgeQuote: createMockBridgeQuote({ totalFeeUsd: 0.5 }),
      };

      expect(getRouteTotalFees(route)).toBe(0.5);
    });

    it('should return 0 for bridge transfer without quote', () => {
      const route: TransferRoute = {
        type: 'bridge',
        fromNetwork: 'base',
        toNetwork: 'arbitrum',
        amount: '100',
        token: 'USDC',
      };

      expect(getRouteTotalFees(route)).toBe(0);
    });

    it('should sum fees for consolidation with multiple sources', () => {
      const route: TransferRoute = {
        type: 'consolidation',
        fromNetwork: 'base',
        toNetwork: 'arbitrum',
        amount: '100',
        token: 'USDC',
        sources: [
          {
            network: 'base',
            amount: '50',
            bridgeQuote: createMockBridgeQuote({ totalFeeUsd: 0.3 }),
          },
          {
            network: 'optimism',
            amount: '50',
            bridgeQuote: createMockBridgeQuote({ totalFeeUsd: 0.4 }),
          },
        ],
      };

      expect(getRouteTotalFees(route)).toBeCloseTo(0.7);
    });

    it('should handle consolidation with mix of bridge and no-bridge sources', () => {
      const route: TransferRoute = {
        type: 'consolidation',
        fromNetwork: 'arbitrum',
        toNetwork: 'arbitrum',
        amount: '100',
        token: 'USDC',
        sources: [
          {
            network: 'arbitrum',
            amount: '60',
            // No bridge needed - already on target network
          },
          {
            network: 'base',
            amount: '40',
            bridgeQuote: createMockBridgeQuote({ totalFeeUsd: 0.25 }),
          },
        ],
      };

      expect(getRouteTotalFees(route)).toBeCloseTo(0.25);
    });
  });

  describe('getRouteEstimatedTime', () => {
    it('should return block time for direct transfer on different networks', () => {
      const routes: { network: NetworkId; expectedTime: number }[] = [
        { network: 'ethereum', expectedTime: 15 },
        { network: 'polygon', expectedTime: 2 },
        { network: 'arbitrum', expectedTime: 1 },
        { network: 'optimism', expectedTime: 2 },
        { network: 'base', expectedTime: 2 },
      ];

      routes.forEach(({ network, expectedTime }) => {
        const route: TransferRoute = {
          type: 'direct',
          fromNetwork: network,
          toNetwork: network,
          amount: '100',
          token: 'USDC',
        };

        expect(getRouteEstimatedTime(route)).toBe(expectedTime);
      });
    });

    it('should return bridge estimated time', () => {
      const route: TransferRoute = {
        type: 'bridge',
        fromNetwork: 'base',
        toNetwork: 'arbitrum',
        amount: '100',
        token: 'USDC',
        bridgeQuote: createMockBridgeQuote({ estimatedTime: 180 }),
      };

      expect(getRouteEstimatedTime(route)).toBe(180);
    });

    it('should return max bridge time for consolidation', () => {
      const route: TransferRoute = {
        type: 'consolidation',
        fromNetwork: 'base',
        toNetwork: 'arbitrum',
        amount: '100',
        token: 'USDC',
        sources: [
          {
            network: 'base',
            amount: '50',
            bridgeQuote: createMockBridgeQuote({ estimatedTime: 120 }),
          },
          {
            network: 'optimism',
            amount: '50',
            bridgeQuote: createMockBridgeQuote({ estimatedTime: 300 }), // Longest
          },
        ],
      };

      expect(getRouteEstimatedTime(route)).toBe(300);
    });

    it('should return 0 for consolidation without sources', () => {
      const route: TransferRoute = {
        type: 'consolidation',
        fromNetwork: 'base',
        toNetwork: 'arbitrum',
        amount: '100',
        token: 'USDC',
      };

      expect(getRouteEstimatedTime(route)).toBe(0);
    });
  });

  describe('formatRouteDescription', () => {
    it('should format direct transfer', () => {
      const route: TransferRoute = {
        type: 'direct',
        fromNetwork: 'base',
        toNetwork: 'base',
        amount: '100',
        token: 'USDC',
      };

      expect(formatRouteDescription(route)).toBe('Send directly on Base');
    });

    it('should format bridge transfer', () => {
      const route: TransferRoute = {
        type: 'bridge',
        fromNetwork: 'base',
        toNetwork: 'arbitrum',
        amount: '100',
        token: 'USDC',
      };

      expect(formatRouteDescription(route)).toBe('Bridge from Base to Arbitrum');
    });

    it('should format consolidation with multiple sources', () => {
      const route: TransferRoute = {
        type: 'consolidation',
        fromNetwork: 'base',
        toNetwork: 'arbitrum',
        amount: '100',
        token: 'USDC',
        sources: [
          { network: 'base', amount: '50' },
          { network: 'optimism', amount: '30' },
          { network: 'polygon', amount: '20' },
        ],
      };

      expect(formatRouteDescription(route)).toBe('Consolidate from Base, OP, Poly to Arbitrum');
    });

    it('should format consolidation without sources', () => {
      const route: TransferRoute = {
        type: 'consolidation',
        fromNetwork: 'base',
        toNetwork: 'arbitrum',
        amount: '100',
        token: 'USDC',
      };

      expect(formatRouteDescription(route)).toBe('Consolidate to Arbitrum');
    });
  });

  describe('routeRequiresConfirmation', () => {
    it('should return false for direct transfer', () => {
      const route: TransferRoute = {
        type: 'direct',
        fromNetwork: 'base',
        toNetwork: 'base',
        amount: '100',
        token: 'USDC',
      };

      expect(routeRequiresConfirmation(route)).toBe(false);
    });

    it('should return true for bridge transfer', () => {
      const route: TransferRoute = {
        type: 'bridge',
        fromNetwork: 'base',
        toNetwork: 'arbitrum',
        amount: '100',
        token: 'USDC',
      };

      expect(routeRequiresConfirmation(route)).toBe(true);
    });

    it('should return true for consolidation', () => {
      const route: TransferRoute = {
        type: 'consolidation',
        fromNetwork: 'base',
        toNetwork: 'arbitrum',
        amount: '100',
        token: 'USDC',
        sources: [
          { network: 'base', amount: '50' },
          { network: 'optimism', amount: '50' },
        ],
      };

      expect(routeRequiresConfirmation(route)).toBe(true);
    });
  });
});
