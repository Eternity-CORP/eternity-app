/**
 * Bridge Execution Tests
 */

import {
  waitForBridgeCompletion,
} from '../bridge-service';

// Mock fetch
const originalFetch = global.fetch;
beforeAll(() => {
  global.fetch = jest.fn();
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('Bridge Execution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('waitForBridgeCompletion', () => {
    it('should return DONE when bridge completes', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          status: 'DONE',
          receiving: { txHash: '0xabc123' },
        }),
      });

      const result = await waitForBridgeCompletion('0x123', 8453, 137, 1000);

      expect(result.status).toBe('DONE');
      expect(result.receivingTxHash).toBe('0xabc123');
    });

    it('should return FAILED when bridge fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          status: 'FAILED',
          substatusMessage: 'Bridge transaction reverted',
        }),
      });

      const result = await waitForBridgeCompletion('0x123', 8453, 137, 1000);

      expect(result.status).toBe('FAILED');
      expect(result.message).toBe('Bridge transaction reverted');
    });

    it('should poll until status changes from PENDING to DONE', async () => {
      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: 'PENDING' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'DONE',
            receiving: { txHash: '0xfinal' },
          }),
        });
      });

      const result = await waitForBridgeCompletion('0x123', 8453, 137, 30000);

      expect(result.status).toBe('DONE');
      expect(result.receivingTxHash).toBe('0xfinal');
      expect(callCount).toBeGreaterThan(1);
    }, 20000);

    it('should timeout after specified duration', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'PENDING' }),
      });

      // Use timeout just over one poll interval (5s) to ensure timeout happens
      await expect(
        waitForBridgeCompletion('0x123', 8453, 137, 6000)
      ).rejects.toThrow('Bridge completion timeout');
    }, 15000);

    it('should handle fetch errors gracefully and continue polling', async () => {
      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'DONE',
            receiving: { txHash: '0xrecovery' },
          }),
        });
      });

      const result = await waitForBridgeCompletion('0x123', 8453, 137, 30000);

      expect(result.status).toBe('DONE');
      expect(callCount).toBeGreaterThan(1);
    }, 15000);
  });
});
