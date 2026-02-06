// Jest setup file
// Mock console to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock ethers globally
jest.mock('ethers', () => ({
  ethers: {
    formatUnits: jest.fn((value, decimals) => {
      const num = typeof value === 'bigint' ? value : BigInt(value || '0');
      const divisor = BigInt(10 ** decimals);
      const intPart = num / divisor;
      const fracPart = num % divisor;
      return `${intPart}.${fracPart.toString().padStart(decimals, '0')}`;
    }),
    parseUnits: jest.fn((value, decimals) => {
      const [intPart, fracPart = ''] = value.split('.');
      const paddedFrac = fracPart.padEnd(decimals, '0').slice(0, decimals);
      return BigInt(intPart + paddedFrac).toString();
    }),
    MaxUint256: BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
    Interface: jest.fn().mockImplementation(() => ({
      encodeFunctionData: jest.fn().mockReturnValue('0xmockeddata'),
    })),
    Contract: jest.fn().mockImplementation(() => ({
      allowance: jest.fn().mockResolvedValue(BigInt(0)),
    })),
  },
  formatUnits: jest.fn((value, decimals) => {
    const num = typeof value === 'bigint' ? value : BigInt(value || '0');
    const divisor = BigInt(10 ** decimals);
    const intPart = num / divisor;
    const fracPart = num % divisor;
    return `${intPart}.${fracPart.toString().padStart(decimals, '0')}`;
  }),
  parseUnits: jest.fn((value, decimals) => {
    const [intPart, fracPart = ''] = value.split('.');
    const paddedFrac = fracPart.padEnd(decimals, '0').slice(0, decimals);
    return BigInt(intPart + paddedFrac).toString();
  }),
}));

// Mock fetch globally
global.fetch = jest.fn();

// Mock logger
jest.mock('@/src/utils/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));
