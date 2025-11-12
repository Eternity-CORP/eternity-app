/**
 * Anvil Reset Script
 * 
 * Deploys test contracts to local Anvil node
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const ANVIL_RPC = process.env.ANVIL_RPC_URL || 'http://127.0.0.1:8545';
const ANVIL_CHAIN_ID = parseInt(process.env.ANVIL_CHAIN_ID || '31337', 10);
const ANVIL_PRIVKEY = process.env.ANVIL_PRIVKEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

// Test accounts (Anvil defaults)
const TEST_ACCOUNTS = [
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Account 0
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Account 1
  '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', // Account 2
];

// TestToken bytecode (compiled from TestToken.sol)
const TEST_TOKEN_BYTECODE = '0x608060405234801561001057600080fd5b506040516107e83803806107e88339818101604052810190610032919061014a565b806002819055508060008060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055503373ffffffffffffffffffffffffffffffffffffffff16600073ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040516100db9190610186565b60405180910390a350506101a1565b600080fd5b6000819050919050565b610102816100ef565b811461010d57600080fd5b50565b60008151905061011f816100f9565b92915050565b60006020828403121561013b5761013a6100ea565b5b600061014984828501610110565b91505092915050565b6000602082840312156101605761015f6100ea565b5b600061016e84828501610110565b91505092915050565b610180816100ef565b82525050565b600060208201905061019b6000830184610177565b92915050565b6106388061020f6000396000f3fe608060405234801561001057600080fd5b50600436106100935760003560e01c8063313ce56711610066578063313ce567146101a257806370a08231146101c057806395d89b41146101f0578063a9059cbb1461020e578063dd62ed3e1461023e57610093565b806306fdde0314610098578063095ea7b3146100b657806318160ddd146100e657806323b872dd14610104575b600080fd5b6100a061026e565b6040516100ad9190610475565b60405180910390f35b6100d060048036038101906100cb9190610530565b6102fc565b6040516100dd919061058b565b60405180910390f35b6100ee6103ee565b6040516100fb91906105b5565b60405180910390f35b61011e600480360381019061011991906105d0565b6103f4565b60405161012b919061058b565b60405180910390f35b61014c60048036038101906101479190610623565b6105c9565b604051610159919061058b565b60405180910390f35b610162610709565b60405161016f919061058b565b60405180910390f35b610188610711565b60405161019591906105b5565b60405180910390f35b6101aa610717565b6040516101b7919061066f565b60405180910390f35b6101da60048036038101906101d5919061068a565b61071c565b6040516101e791906105b5565b60405180910390f35b6101f8610734565b6040516102059190610475565b60405180910390f35b61022860048036038101906102239190610530565b6107c2565b604051610235919061058b565b60405180910390f35b610258600480360381019061025391906106b7565b610909565b60405161026591906105b5565b60405180910390f35b6060600380546102a09061072c565b80601f01602080910402602001604051908101604052809291908181526020018280546102cc9061072c565b80156103195780601f106102ee57610100808354040283529160200191610319565b820191906000526020600020905b8154815290600101906020018083116102fc57829003601f168201915b5050505050905090565b600081600160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925846040516103dc91906105b5565b60405180910390a36001905092915050565b60025481565b60008060008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054821115610477576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161046e906107a9565b60405180910390fd5b600160008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054821115610536576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161052d90610815565b60405180910390fd5b816000808673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546105849190610864565b92505081905550816000808573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546105d99190610898565b92505081905550816001600086';

// TestToken ABI
const TEST_TOKEN_ABI = [
  'constructor(uint256 _initialSupply)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function mint(address to, uint256 amount)',
];

async function resetAnvil() {
  console.log('🔧 Resetting Anvil...\n');

  try {
    // Connect to Anvil
    const provider = new ethers.providers.JsonRpcProvider(ANVIL_RPC);
    const deployer = new ethers.Wallet(ANVIL_PRIVKEY, provider);

    // Check connection
    const network = await provider.getNetwork();
    console.log(`📍 Network: ${ANVIL_RPC}`);
    console.log(`📍 Chain ID: ${network.chainId}`);
    console.log(`📍 Deployer: ${deployer.address}\n`);

    if (network.chainId !== ANVIL_CHAIN_ID) {
      console.log(`⚠️  Warning: Expected chain ID ${ANVIL_CHAIN_ID}, got ${network.chainId}`);
    }

    // Check balance
    const balance = await provider.getBalance(deployer.address);
    console.log(`💰 Deployer Balance: ${ethers.utils.formatEther(balance)} ETH\n`);

    // Deploy TestToken
    console.log('📦 Deploying TestToken...');
    
    const initialSupply = ethers.utils.parseEther('1000000'); // 1M tokens
    const factory = new ethers.ContractFactory(TEST_TOKEN_ABI, TEST_TOKEN_BYTECODE, deployer);
    const token = await factory.deploy(initialSupply);
    await token.deployed();

    console.log(`   ✅ Deployed at: ${token.address}`);

    // Get token info
    const name = await token.name();
    const symbol = await token.symbol();
    const decimals = await token.decimals();
    const totalSupply = await token.totalSupply();

    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Decimals: ${decimals}`);
    console.log(`   Total Supply: ${ethers.utils.formatEther(totalSupply)} ${symbol}\n`);

    // Mint tokens to test accounts
    console.log('💸 Minting tokens to test accounts...');
    
    for (const account of TEST_ACCOUNTS) {
      const mintAmount = ethers.utils.parseEther('10000'); // 10k tokens each
      const tx = await token.mint(account, mintAmount);
      await tx.wait();
      
      const balance = await token.balanceOf(account);
      console.log(`   ✅ Minted ${ethers.utils.formatEther(balance)} ${symbol} to ${account.slice(0, 8)}...`);
    }

    console.log('\n✅ Anvil reset complete!\n');

    // Print test configuration
    console.log('📝 Test Configuration:');
    console.log(`   RPC: ${ANVIL_RPC}`);
    console.log(`   Chain ID: ${ANVIL_CHAIN_ID}`);
    console.log(`   Test Token: ${token.address}\n`);
    
    for (let i = 0; i < TEST_ACCOUNTS.length; i++) {
      const ethBalance = await provider.getBalance(TEST_ACCOUNTS[i]);
      const tokenBalance = await token.balanceOf(TEST_ACCOUNTS[i]);
      console.log(`   Account ${i}: ${TEST_ACCOUNTS[i].slice(0, 8)}... (${ethers.utils.formatEther(ethBalance)} ETH, ${ethers.utils.formatEther(tokenBalance)} ${symbol})`);
    }

    // Update .env file with token address
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
      
      // Update or add TEST_TOKEN_ADDRESS
      if (envContent.includes('TEST_TOKEN_ADDRESS=')) {
        envContent = envContent.replace(
          /TEST_TOKEN_ADDRESS=.*/,
          `TEST_TOKEN_ADDRESS=${token.address}`
        );
      } else {
        envContent += `\nTEST_TOKEN_ADDRESS=${token.address}\n`;
      }
    } else {
      // Create new .env from example
      const examplePath = path.join(__dirname, '.env.example');
      if (fs.existsSync(examplePath)) {
        envContent = fs.readFileSync(examplePath, 'utf-8');
        envContent = envContent.replace(
          /TEST_TOKEN_ADDRESS=.*/,
          `TEST_TOKEN_ADDRESS=${token.address}`
        );
      }
    }

    fs.writeFileSync(envPath, envContent);
    console.log(`\n💾 Updated .env with token address`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'NETWORK_ERROR' || error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Tip: Make sure Anvil is running:');
      console.log('   anvil\n');
    }
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  resetAnvil();
}

export { resetAnvil };
