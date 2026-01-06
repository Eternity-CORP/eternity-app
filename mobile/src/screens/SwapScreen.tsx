import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
  Linking,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainStackParamList } from '../navigation/MainNavigator';
import { useTheme } from '../context/ThemeContext';
import { KeyboardAwareScreen } from '../components/common/KeyboardAwareScreen';
import { TokenInfo, SUPPORTED_TOKENS } from '../constants/tokens';
import Card from '../components/common/Card';
import TokenIcon from '../components/common/TokenIcon';
import { ethers } from 'ethers';
import { getProvider } from '../services/blockchain/ethereumProvider';
import { getSigner } from '../services/walletService';
import { ERC20_ABI } from '../constants/abis';
import { useWallet } from '../context/WalletContext';
import { getSwapQuote, executeSwap, SwapQuote } from '../services/api/swapService';
import { authenticateWithBiometrics } from '../services/biometricService';
import { getExplorerUrl } from '../constants/etherscanApi';

type Props = NativeStackScreenProps<MainStackParamList, 'Swap'>;

// Mock Sepolia Tokens for testing if not present in SUPPORTED_TOKENS
const SEPOLIA_TOKENS: TokenInfo[] = [
  {
    name: 'Sepolia ETH',
    symbol: 'ETH',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    logoUri: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png', // High quality
    networks: { sepolia: '0x0000000000000000000000000000000000000000' }
  },
  {
    name: 'Wrapped Ether',
    symbol: 'WETH',
    address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    decimals: 18,
    logoUri: 'https://assets.coingecko.com/coins/images/2518/large/weth.png', // High quality
    networks: { sepolia: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' }
  },
  {
    name: 'Test USDC',
    symbol: 'USDC',
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC
    decimals: 6,
    logoUri: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png', // High quality
    networks: { sepolia: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' }
  },
  {
    name: 'Test DAI',
    symbol: 'DAI',
    address: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357', // Sepolia DAI
    decimals: 18,
    logoUri: 'https://assets.coingecko.com/coins/images/9956/thumb/4943.png',
    networks: { sepolia: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357' }
  }
];

export default function SwapScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { activeAccount } = useWallet();
  const insets = useSafeAreaInsets();
  const wallet = activeAccount;

  // Get prefill params from navigation
  const prefillFromToken = route.params?.fromToken;
  const prefillToToken = route.params?.toToken;
  const prefillAmount = route.params?.amount;

  // Find token by symbol
  const findTokenBySymbol = (symbol?: string): TokenInfo | null => {
    if (!symbol) return null;
    return SEPOLIA_TOKENS.find(t => t.symbol.toUpperCase() === symbol.toUpperCase()) || null;
  };

  // State with prefill values
  const [fromToken, setFromToken] = useState<TokenInfo | null>(
    findTokenBySymbol(prefillFromToken) || SEPOLIA_TOKENS[0]
  );
  const [toToken, setToToken] = useState<TokenInfo | null>(
    findTokenBySymbol(prefillToToken) || SEPOLIA_TOKENS[1]
  );
  const [fromAmount, setFromAmount] = useState(prefillAmount || '');
  const [toAmount, setToAmount] = useState('');
  const [balance, setBalance] = useState('0.0');
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  
  // Modal State
  const [isTokenModalVisible, setIsTokenModalVisible] = useState(false);
  const [selectingSide, setSelectingSide] = useState<'from' | 'to'>('from');

  const chainId = 11155111; // Sepolia
  const chainName = 'Sepolia (testnet)';

  // Normalize amount input - remove leading zeros except for "0.x"
  const normalizeAmount = (value: string): string => {
    // Remove non-numeric except dot
    let cleaned = value.replace(/[^0-9.]/g, '');
    // Only allow one dot
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    // Remove leading zeros (but keep "0" or "0.x")
    if (cleaned.length > 1 && cleaned.startsWith('0') && cleaned[1] !== '.') {
      cleaned = cleaned.replace(/^0+/, '') || '0';
    }
    return cleaned;
  };

  // Fetch Balance for From Token
  const fetchBalance = useCallback(async () => {
    if (!activeAccount || !fromToken) return;
    try {
      const provider = getProvider();
      if (fromToken.symbol === 'ETH') {
        const bal = await provider.getBalance(activeAccount.address);
        setBalance(ethers.utils.formatEther(bal));
      } else {
        const contract = new ethers.Contract(fromToken.address, ERC20_ABI, provider);
        const bal = await contract.balanceOf(activeAccount.address);
        setBalance(ethers.utils.formatUnits(bal, fromToken.decimals));
      }
    } catch (e) {
      console.error('Failed to fetch balance', e);
      setBalance('0.0');
    }
  }, [activeAccount, fromToken]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Quote Fetching
  useEffect(() => {
    if (!fromAmount || parseFloat(fromAmount) === 0 || !fromToken || !toToken) {
      setToAmount('');
      setQuote(null);
      return;
    }

    if (fromToken.address === toToken.address) {
      setQuoteError('Select different tokens');
      return;
    }

    const getQuote = async () => {
      if (!activeAccount) return;

      // FIX: Sepolia is not supported by backend provider (LI.FI). 
      // Generate local quote immediately to prevent 400 errors and enable Testnet Faucet flow.
      if (chainId === 11155111) {
        setIsLoadingQuote(true);
        setQuoteError(null);
        
        try {
          // Simulate network delay
          await new Promise(r => setTimeout(r, 600));

          const amountBN = ethers.utils.parseUnits(fromAmount, fromToken.decimals);
          // Simple 1:1 mock rate for testing
          const mockQuote: SwapQuote = {
            routeId: 'mock-route-sepolia',
            router: 'MOCK_ROUTER', // This triggers the Mint logic in confirmSwap
            fromAmount: amountBN.toString(),
            toAmount: ethers.utils.parseUnits(fromAmount, toToken.decimals).toString(),
            estimatedGas: '150000',
            estimatedTimeSeconds: 5,
            fromTokenAddress: fromToken.address,
            toTokenAddress: toToken.address,
            fromChainId: chainId,
            toChainId: chainId,
            to: activeAccount.address, 
            value: fromToken.symbol === 'ETH' ? amountBN.toString() : '0',
            txData: '0x',
          };
          
          setQuote(mockQuote);
          const toAmt = ethers.utils.formatUnits(mockQuote.toAmount, toToken.decimals);
          setToAmount(parseFloat(toAmt).toFixed(6));
        } catch (e: any) {
          setQuoteError('Failed to generate test quote');
        } finally {
          setIsLoadingQuote(false);
        }
        return; // Skip backend call
      }

      setIsLoadingQuote(true);
      setQuoteError(null);
      
      try {
        const fetchedQuote = await getSwapQuote({
          fromChainId: chainId,
          toChainId: chainId,
          fromTokenAddress: fromToken.address,
          toTokenAddress: toToken.address,
          amount: ethers.utils.parseUnits(fromAmount, fromToken.decimals).toString(),
          fromAddress: activeAccount.address,
        });
        
        setQuote(fetchedQuote);
        const toAmt = ethers.utils.formatUnits(fetchedQuote.toAmount, toToken.decimals);
        setToAmount(parseFloat(toAmt).toFixed(6));
      } catch (e: any) {
        console.error(e);
        const serverError = e.response?.data?.message || e.message;

        // FALLBACK: If Sepolia is not supported by backend provider, use Mock Quote for testing
        if (chainId === 11155111 && (serverError?.includes('allowed values') || serverError?.includes('LIFI_ERROR'))) {
          console.log('⚠️ Backend provider rejects Sepolia. Using MOCK quote for testing.');
          const amountBN = ethers.utils.parseUnits(fromAmount, fromToken.decimals);
          const mockQuote: SwapQuote = {
            routeId: 'mock-route-sepolia',
            router: 'MOCK_ROUTER',
            fromAmount: amountBN.toString(),
            toAmount: ethers.utils.parseUnits(fromAmount, toToken.decimals).toString(), // 1:1 Rate
            estimatedGas: '21000',
            estimatedTimeSeconds: 5,
            fromTokenAddress: fromToken.address,
            toTokenAddress: toToken.address,
            fromChainId: chainId,
            toChainId: chainId,
            // Send to self to allow testing transaction signing/broadcast without losing funds
            to: activeAccount.address, 
            value: fromToken.symbol === 'ETH' ? amountBN.toString() : '0',
            txData: '0x', // Empty data for ETH transfer
          };
          
          setQuote(mockQuote);
          const toAmt = ethers.utils.formatUnits(mockQuote.toAmount, toToken.decimals);
          setToAmount(parseFloat(toAmt).toFixed(6));
          // Show a toast or small indication? For now just log.
          return;
        }

        // Clean up error message if it contains JSON
        const cleanError = typeof serverError === 'object' ? JSON.stringify(serverError) : serverError;
        setQuoteError(cleanError || 'Failed to fetch quote');
        setQuote(null);
        setToAmount('');
      } finally {
        setIsLoadingQuote(false);
      }
    };

    const timer = setTimeout(getQuote, 500);
    return () => clearTimeout(timer);
  }, [fromAmount, fromToken, toToken, activeAccount]);

  const handleSwapDirection = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
  };

  const handleTokenSelect = (token: TokenInfo) => {
    if (selectingSide === 'from') {
      if (token.symbol === toToken?.symbol) {
        setToToken(fromToken); // Swap if selecting same
      }
      setFromToken(token);
    } else {
      if (token.symbol === fromToken?.symbol) {
        setFromToken(toToken); // Swap if selecting same
      }
      setToToken(token);
    }
    setIsTokenModalVisible(false);
  };

  const handleMax = () => {
    if (balance) {
      setFromAmount(balance);
    }
  };

  const confirmSwap = async () => {
    if (!activeAccount || !quote) {
      Alert.alert('Error', 'Wallet not ready');
      return;
    }

    setIsExecuting(true);
    try {
      // 1. Authenticate
      const auth = await authenticateWithBiometrics('Authenticate to swap');
      if (!auth.success) {
        setIsExecuting(false);
        return;
      }

      // 2. Build Transaction
      const signer = await getSigner();
      const provider = getProvider();
      const nonce = await provider.getTransactionCount(activeAccount.address);
      const feeData = await provider.getFeeData();

      if (!quote.to || !quote.txData) {
        Alert.alert('Error', 'Transaction data missing from quote');
        setIsExecuting(false);
        return;
      }

      const txRequest: any = {
        to: quote.to,
        data: quote.txData,
        value: quote.value ? ethers.BigNumber.from(quote.value) : ethers.BigNumber.from(0),
        gasLimit: ethers.BigNumber.from(quote.estimatedGas || '500000'),
        chainId: chainId,
        nonce,
      };

      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        txRequest.maxFeePerGas = feeData.maxFeePerGas;
        txRequest.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
        txRequest.type = 2;
      } else if (feeData.gasPrice) {
        txRequest.gasPrice = feeData.gasPrice;
      }

      // Sign
      const signedTx = await signer.signTransaction(txRequest);

      // 3. Execute
      let resultTxHash: string;

      if (quote.router === 'MOCK_ROUTER') {
        // Try to MINT (Faucet) or DEPOSIT (WETH)
        console.log('🚀 Attempting to MINT/WRAP tokens on Sepolia...');
        const provider = getProvider();
        
        try {
           if (toToken?.symbol === 'WETH') {
               // WETH Deposit (Wrap ETH)
               console.log('✨ Wrapping ETH to WETH...');
               // Use 'deposit()' signature 0xd0e30db0
               const tx = {
                   to: quote.toTokenAddress,
                   value: ethers.BigNumber.from(quote.toAmount), // ETH Amount to wrap
                   data: '0xd0e30db0', // deposit()
                   gasLimit: ethers.BigNumber.from(100000),
                   chainId,
                   nonce,
                   maxFeePerGas: feeData.maxFeePerGas || undefined,
                   maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || undefined,
                   type: 2
               };
               const signed = await signer.signTransaction(tx);
               const resp = await provider.sendTransaction(signed);
               resultTxHash = resp.hash;
               console.log('✅ WETH Deposit sent:', resultTxHash);
           } 
           // Attempt to call mint(to, amount) for other tokens (USDC, DAI)
           else if (quote.toTokenAddress && quote.toTokenAddress !== ethers.constants.AddressZero) {
               const tokenContract = new ethers.Contract(
                   quote.toTokenAddress, 
                   ['function mint(address to, uint256 amount) external'], 
                   signer
               );
               console.log(`✨ Minting ${quote.toAmount} to ${activeAccount.address}`);
               
               const mintTx = await tokenContract.mint(activeAccount.address, quote.toAmount, {
                   gasLimit: 300000,
                   maxFeePerGas: feeData.maxFeePerGas,
                   maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
                   type: 2
               });
               resultTxHash = mintTx.hash;
               console.log('✅ Mint transaction sent:', resultTxHash);
           } else {
               throw new Error('Target is ETH or invalid'); 
           }
        } catch (err) {
           console.log('⚠️ Minting failed, falling back to self-transfer simulation.', err);
           Alert.alert(
             'Simulation Mode',
             'Minting new tokens failed (contract restricted). The transaction will proceed as a simulation (self-transfer) but no new tokens will be received.'
           );
           // Fallback: Send the original mock transaction (self-transfer of ETH)
           const txResponse = await provider.sendTransaction(signedTx);
           resultTxHash = txResponse.hash;
        }
      } else {
        const result = await executeSwap({
          routeId: quote.routeId,
          router: quote.router,
          signedTx,
        });
        resultTxHash = result.transactionHash;
      }

      setIsExecuting(false);

      // 4. Success
      Alert.alert(
        'Swap Submitted',
        'Your transaction has been submitted to the network.',
        [
          {
            text: 'View on Explorer',
            onPress: () => Linking.openURL(`${getExplorerUrl('sepolia')}/tx/${resultTxHash}`)
          },
          {
            text: 'Done',
            onPress: () => {
              setFromAmount('');
              setToAmount('');
              setQuote(null);
              fetchBalance();
            }
          }
        ]
      );

    } catch (e: any) {
      setIsExecuting(false);
      Alert.alert('Swap Failed', e.message || 'Unknown error occurred');
    }
  };

  const handleReview = () => {
    if (!quote) return;

    Alert.alert(
      'Confirm Swap',
      `Swap ${fromAmount} ${fromToken?.symbol} for ~${toAmount} ${toToken?.symbol}?\n\nNetwork: ${chainName}\nEst. Gas: ~${quote.estimatedGas}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: confirmSwap }
      ]
    );
  };

  const isReviewDisabled = !fromToken || !toToken || !fromAmount || parseFloat(fromAmount) <= 0 || isLoadingQuote || parseFloat(fromAmount) > parseFloat(balance);

  // Token Modal Component
  const TokenModal = () => (
    <Modal visible={isTokenModalVisible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Token</Text>
          <TouchableOpacity onPress={() => setIsTokenModalVisible(false)}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={SEPOLIA_TOKENS} // Using mock list for Sepolia focus
          keyExtractor={(item) => item.symbol}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.tokenItem} onPress={() => handleTokenSelect(item)}>
              <TokenIcon uri={item.logoUri} symbol={item.symbol} size={48} />
              <View style={styles.tokenInfo}>
                <Text style={[styles.tokenName, { color: theme.colors.text }]}>{item.name}</Text>
                <Text style={[styles.tokenSymbol, { color: theme.colors.textSecondary }]}>{item.symbol}</Text>
              </View>
              {(selectingSide === 'from' ? fromToken : toToken)?.symbol === item.symbol && (
                <Ionicons name="checkmark" size={24} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );

  return (
    <KeyboardAwareScreen style={[styles.container, { backgroundColor: theme.colors.background }]} withSafeArea={true}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: theme.colors.text }]}>Swap</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Exchange on same network</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Network Info */}
        <View style={[styles.networkBadge, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.networkDot, { backgroundColor: '#10B981' }]} />
          <Text style={[styles.networkText, { color: theme.colors.text }]}>{chainName}</Text>
        </View>

        {/* From Block */}
        <Card style={styles.swapCard}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>From</Text>
            <Text style={[styles.balanceText, { color: theme.colors.textSecondary }]}>
              Balance: {balance}
            </Text>
          </View>
          
          <View style={styles.inputRow}>
            <TouchableOpacity 
              style={[styles.tokenSelector, { backgroundColor: theme.colors.background }]}
              onPress={() => { setSelectingSide('from'); setIsTokenModalVisible(true); }}
            >
              {fromToken ? (
                <>
                  <TokenIcon uri={fromToken.logoUri} symbol={fromToken.symbol} size={32} />
                  <Text style={[styles.tokenSelectorText, { color: theme.colors.text }]}>{fromToken.symbol}</Text>
                </>
              ) : (
                <Text style={[styles.tokenSelectorText, { color: theme.colors.text }]}>Select</Text>
              )}
              <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TextInput
              style={[styles.amountInput, { color: theme.colors.text }]}
              placeholder="0.0"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
              value={fromAmount}
              onChangeText={(text) => setFromAmount(normalizeAmount(text))}
            />
          </View>
          
          <TouchableOpacity onPress={handleMax} style={styles.maxButton}>
            <Text style={[styles.maxButtonText, { color: theme.colors.primary }]}>MAX</Text>
          </TouchableOpacity>
        </Card>

        {/* Swap Direction Toggle */}
        <View style={styles.swapDivider}>
          <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
          <TouchableOpacity 
            style={[styles.swapButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={handleSwapDirection}
          >
            <Ionicons name="arrow-down" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
        </View>

        {/* To Block */}
        <Card style={styles.swapCard}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>To</Text>
          </View>
          
          <View style={styles.inputRow}>
            <TouchableOpacity 
              style={[styles.tokenSelector, { backgroundColor: theme.colors.background }]}
              onPress={() => { setSelectingSide('to'); setIsTokenModalVisible(true); }}
            >
               {toToken ? (
                <>
                  <TokenIcon uri={toToken.logoUri} symbol={toToken.symbol} size={32} />
                  <Text style={[styles.tokenSelectorText, { color: theme.colors.text }]}>{toToken.symbol}</Text>
                </>
              ) : (
                <Text style={[styles.tokenSelectorText, { color: theme.colors.text }]}>Select</Text>
              )}
              <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.amountContainer}>
              {isLoadingQuote ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <TextInput
                  style={[styles.amountInput, { color: theme.colors.text }]}
                  placeholder="0.0"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={toAmount}
                  editable={false}
                />
              )}
            </View>
          </View>
        </Card>

        {/* Quote Info */}
        {fromAmount && toAmount && !isLoadingQuote && !quoteError && (
          <View style={styles.quoteInfo}>
            <View style={styles.quoteRow}>
              <Text style={[styles.quoteLabel, { color: theme.colors.textSecondary }]}>Rate</Text>
              <Text style={[styles.quoteValue, { color: theme.colors.text }]}>
                1 {fromToken?.symbol} ≈ {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(4)} {toToken?.symbol}
              </Text>
            </View>
            <View style={styles.quoteRow}>
              <Text style={[styles.quoteLabel, { color: theme.colors.textSecondary }]}>Est. Gas</Text>
              <Text style={[styles.quoteValue, { color: theme.colors.text }]}>~$0.05</Text>
            </View>
            <View style={styles.quoteRow}>
              <Text style={[styles.quoteLabel, { color: theme.colors.textSecondary }]}>Slippage</Text>
              <Text style={[styles.quoteValue, { color: theme.colors.text }]}>0.5%</Text>
            </View>
          </View>
        )}

        {/* Error Banner */}
        {quoteError && (
          <View style={[styles.errorBanner, { backgroundColor: theme.colors.error + '15' }]}>
             <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
             <Text style={[styles.errorText, { color: theme.colors.error }]}>{quoteError}</Text>
          </View>
        )}

        {/* Insufficient Balance Warning */}
        {parseFloat(fromAmount) > parseFloat(balance) && (
           <Text style={[styles.inlineError, { color: theme.colors.error }]}>Insufficient balance</Text>
        )}

      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.reviewButton,
            { backgroundColor: theme.colors.primary },
            isReviewDisabled && { opacity: 0.5 }
          ]}
          disabled={isReviewDisabled}
          onPress={handleReview}
        >
          {isLoadingQuote ? (
             <ActivityIndicator color="#FFFFFF" />
          ) : (
             <Text style={styles.reviewButtonText}>Review Swap</Text>
          )}
        </TouchableOpacity>
      </View>

      <TokenModal />

      {/* Loading Overlay during swap execution */}
      <Modal visible={isExecuting} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingCard, { backgroundColor: theme.colors.surface }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingTitle, { color: theme.colors.text }]}>Processing Swap</Text>
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Please wait while your transaction is being processed...
            </Text>
          </View>
        </View>
      </Modal>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 11,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    padding: 16,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 24,
    gap: 6,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  networkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  swapCard: {
    padding: 16,
    borderRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceText: {
    fontSize: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tokenSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingRight: 12,
    borderRadius: 6,
    gap: 6,
  },
  tokenSelectorText: {
    fontSize: 16,
    fontWeight: '600',
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'right',
    padding: 0, // remove default padding
  },
  amountContainer: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 40,
  },
  maxButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    padding: 4,
  },
  maxButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  swapDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: -12, // Overlap cards slightly or pull them closer
    zIndex: 1,
    height: 40,
    justifyContent: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 0, // transparent
  },
  swapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteInfo: {
    marginTop: 24,
    gap: 8,
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quoteLabel: {
    fontSize: 14,
  },
  quoteValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  inlineError: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
  },
  footer: {
    marginTop: 'auto', // Push to bottom
    padding: 16,
  },
  reviewButton: {
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
  },
  reviewButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tokenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  tokenInfo: {
    flex: 1,
  },
  tokenName: {
    fontSize: 16,
    fontWeight: '500',
  },
  tokenSymbol: {
    fontSize: 14,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    padding: 32,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 32,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
