/**
 * Swap Screen
 * Token swap interface using LI.FI DEX aggregator
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ethers } from 'ethers';

import { theme } from '@/src/constants/theme';
import { useAppDispatch, useAppSelector } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import {
  setFromToken,
  setToToken,
  setFromAmount,
  swapTokens,
  fetchTokensThunk,
  fetchQuoteThunk,
  setSwapStatus,
  setSwapTxHash,
  setSwapError,
  resetSwap,
  setNeedsApproval,
} from '@/src/store/slices/swap-slice';
import {
  parseTokenAmount,
  formatTokenAmount,
  checkAllowance,
  getApprovalData,
  getLiFiContractAddress,
  executeSwap,
  NATIVE_TOKEN_ADDRESS,
} from '@/src/services/swap-service';
import { getProvider } from '@/src/services/network-service';
import { SUPPORTED_NETWORKS } from '@/src/constants/networks';
import TokenSelector from './token-selector';

export default function SwapScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const wallet = useAppSelector((state) => state.wallet);
  const swap = useAppSelector((state) => state.swap);
  const currentAccount = getCurrentAccount(wallet);
  const walletAddress = currentAccount?.address || '';

  const [showFromTokenSelector, setShowFromTokenSelector] = useState(false);
  const [showToTokenSelector, setShowToTokenSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [slippageInput, setSlippageInput] = useState(swap.slippage.toString());

  // Load tokens on mount
  useEffect(() => {
    dispatch(fetchTokensThunk({ networkId: swap.fromNetworkId, side: 'from' }));
    dispatch(fetchTokensThunk({ networkId: swap.toNetworkId, side: 'to' }));
  }, [dispatch, swap.fromNetworkId, swap.toNetworkId]);

  // Fetch quote when inputs change
  useEffect(() => {
    const fetchQuote = async () => {
      if (!swap.fromToken || !swap.toToken || !swap.fromAmount || !walletAddress) {
        return;
      }

      const amount = parseFloat(swap.fromAmount);
      if (isNaN(amount) || amount <= 0) {
        return;
      }

      const fromAmountWei = parseTokenAmount(swap.fromAmount, swap.fromToken.decimals);
      if (fromAmountWei === '0') return;

      const fromNetwork = SUPPORTED_NETWORKS[swap.fromNetworkId];
      const toNetwork = SUPPORTED_NETWORKS[swap.toNetworkId];

      dispatch(
        fetchQuoteThunk({
          fromChainId: fromNetwork.chainId,
          toChainId: toNetwork.chainId,
          fromToken: swap.fromToken.address,
          toToken: swap.toToken.address,
          fromAmount: fromAmountWei,
          fromAddress: walletAddress,
          slippage: swap.slippage,
        })
      );
    };

    const debounce = setTimeout(fetchQuote, 500);
    return () => clearTimeout(debounce);
  }, [
    swap.fromToken,
    swap.toToken,
    swap.fromAmount,
    swap.fromNetworkId,
    swap.toNetworkId,
    swap.slippage,
    walletAddress,
    dispatch,
  ]);

  // Check approval when quote is ready
  useEffect(() => {
    const checkApprovalNeeded = async () => {
      if (!swap.quote || !swap.fromToken || !walletAddress) return;

      // Native tokens don't need approval
      if (swap.fromToken.address === NATIVE_TOKEN_ADDRESS) {
        dispatch(setNeedsApproval(false));
        return;
      }

      try {
        const provider = getProvider(swap.fromNetworkId);
        const spender = await getLiFiContractAddress(
          SUPPORTED_NETWORKS[swap.fromNetworkId].chainId
        );
        const allowance = await checkAllowance(
          swap.fromToken.address,
          walletAddress,
          spender,
          provider
        );

        const fromAmountWei = parseTokenAmount(swap.fromAmount, swap.fromToken.decimals);
        dispatch(setNeedsApproval(allowance < BigInt(fromAmountWei)));
      } catch (error) {
        console.error('Failed to check allowance:', error);
      }
    };

    checkApprovalNeeded();
  }, [swap.quote, swap.fromToken, swap.fromAmount, swap.fromNetworkId, walletAddress, dispatch]);

  const handleSwapTokens = () => {
    dispatch(swapTokens());
  };

  const handleApprove = async () => {
    if (!swap.fromToken || !wallet.mnemonic) return;

    dispatch(setSwapStatus('approving'));

    try {
      const provider = getProvider(swap.fromNetworkId);
      const walletInstance = ethers.Wallet.fromPhrase(wallet.mnemonic).connect(provider);

      const spender = await getLiFiContractAddress(
        SUPPORTED_NETWORKS[swap.fromNetworkId].chainId
      );
      const { to, data } = await getApprovalData(
        swap.fromToken.address,
        spender,
        ethers.MaxUint256.toString()
      );

      const tx = await walletInstance.sendTransaction({ to, data });
      await tx.wait();

      dispatch(setNeedsApproval(false));
      dispatch(setSwapStatus('idle'));
    } catch (error) {
      console.error('Approval failed:', error);
      dispatch(setSwapError(error instanceof Error ? error.message : 'Approval failed'));
    }
  };

  const handleSwap = async () => {
    if (!swap.quote || !wallet.mnemonic) return;

    dispatch(setSwapStatus('swapping'));

    try {
      const provider = getProvider(swap.fromNetworkId);
      const walletInstance = ethers.Wallet.fromPhrase(wallet.mnemonic).connect(provider);

      const tx = await executeSwap(swap.quote, walletInstance);
      dispatch(setSwapTxHash(tx.hash));

      await tx.wait();

      dispatch(setSwapStatus('succeeded'));
      Alert.alert(
        'Swap Successful',
        `Swapped ${swap.fromAmount} ${swap.fromToken?.symbol} for ${formatTokenAmount(swap.quote.toAmount, swap.toToken?.decimals || 18)} ${swap.toToken?.symbol}`,
        [
          {
            text: 'Done',
            onPress: () => {
              dispatch(resetSwap());
              router.back();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Swap failed:', error);
      dispatch(setSwapError(error instanceof Error ? error.message : 'Swap failed'));
    }
  };

  const canSwap =
    swap.quote &&
    !swap.needsApproval &&
    swap.status !== 'quoting' &&
    swap.status !== 'approving' &&
    swap.status !== 'swapping';

  const getButtonText = () => {
    if (swap.status === 'quoting') return 'Getting quote...';
    if (swap.status === 'approving') return 'Approving...';
    if (swap.status === 'swapping') return 'Swapping...';
    if (swap.needsApproval) return `Approve ${swap.fromToken?.symbol}`;
    if (swap.quoteError) return 'Unable to swap';
    if (!swap.fromToken || !swap.toToken) return 'Select tokens';
    if (!swap.fromAmount) return 'Enter amount';
    if (!swap.quote) return 'Swap';
    return 'Swap';
  };

  const isButtonDisabled = () => {
    if (swap.status === 'quoting' || swap.status === 'approving' || swap.status === 'swapping') {
      return true;
    }
    if (swap.needsApproval) return false;
    return !canSwap;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Swap',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.textPrimary,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={() => setShowSettings(!showSettings)}>
              <Ionicons name="settings-outline" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Settings Panel */}
        {showSettings && (
          <View style={styles.settingsPanel}>
            <Text style={styles.settingsTitle}>Slippage Tolerance</Text>
            <View style={styles.slippageOptions}>
              {[0.5, 1, 2].map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.slippageButton,
                    swap.slippage === value && styles.slippageButtonActive,
                  ]}
                  onPress={() => {
                    setSlippageInput(value.toString());
                    dispatch(setFromAmount(swap.fromAmount)); // Trigger re-quote
                  }}
                >
                  <Text
                    style={[
                      styles.slippageButtonText,
                      swap.slippage === value && styles.slippageButtonTextActive,
                    ]}
                  >
                    {value}%
                  </Text>
                </TouchableOpacity>
              ))}
              <TextInput
                style={styles.slippageInput}
                value={slippageInput}
                onChangeText={setSlippageInput}
                keyboardType="decimal-pad"
                placeholder="Custom"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
          </View>
        )}

        {/* From Token */}
        <View style={styles.tokenCard}>
          <Text style={styles.tokenLabel}>From</Text>
          <View style={styles.tokenRow}>
            <TouchableOpacity
              style={styles.tokenSelector}
              onPress={() => setShowFromTokenSelector(true)}
            >
              {swap.fromToken?.logoURI ? (
                <Image source={{ uri: swap.fromToken.logoURI }} style={styles.tokenIcon} />
              ) : (
                <View style={styles.tokenIconPlaceholder}>
                  <Text style={styles.tokenIconText}>{swap.fromToken?.symbol?.charAt(0) || '?'}</Text>
                </View>
              )}
              <Text style={styles.tokenSymbol}>{swap.fromToken?.symbol || 'Select'}</Text>
              <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TextInput
              style={styles.amountInput}
              value={swap.fromAmount}
              onChangeText={(text) => dispatch(setFromAmount(text))}
              placeholder="0.0"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Swap Button */}
        <TouchableOpacity style={styles.swapButton} onPress={handleSwapTokens}>
          <Ionicons name="swap-vertical" size={24} color={theme.colors.accent} />
        </TouchableOpacity>

        {/* To Token */}
        <View style={styles.tokenCard}>
          <Text style={styles.tokenLabel}>To</Text>
          <View style={styles.tokenRow}>
            <TouchableOpacity
              style={styles.tokenSelector}
              onPress={() => setShowToTokenSelector(true)}
            >
              {swap.toToken?.logoURI ? (
                <Image source={{ uri: swap.toToken.logoURI }} style={styles.tokenIcon} />
              ) : (
                <View style={styles.tokenIconPlaceholder}>
                  <Text style={styles.tokenIconText}>{swap.toToken?.symbol?.charAt(0) || '?'}</Text>
                </View>
              )}
              <Text style={styles.tokenSymbol}>{swap.toToken?.symbol || 'Select'}</Text>
              <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <Text style={styles.amountOutput}>
              {swap.quote
                ? formatTokenAmount(swap.quote.toAmount, swap.toToken?.decimals || 18)
                : '0.0'}
            </Text>
          </View>
        </View>

        {/* Quote Details */}
        {swap.quote && (
          <View style={styles.quoteDetails}>
            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>Rate</Text>
              <Text style={styles.quoteValue}>
                1 {swap.fromToken?.symbol} = {parseFloat(swap.quote.exchangeRate).toFixed(6)}{' '}
                {swap.toToken?.symbol}
              </Text>
            </View>
            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>Price Impact</Text>
              <Text
                style={[
                  styles.quoteValue,
                  parseFloat(swap.quote.priceImpact) > 3 && styles.quoteValueWarning,
                ]}
              >
                {parseFloat(swap.quote.priceImpact).toFixed(2)}%
              </Text>
            </View>
            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>Network Fee</Text>
              <Text style={styles.quoteValue}>~${parseFloat(swap.quote.gasCostUSD).toFixed(2)}</Text>
            </View>
            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>Min. Received</Text>
              <Text style={styles.quoteValue}>
                {formatTokenAmount(swap.quote.toAmountMin, swap.toToken?.decimals || 18)}{' '}
                {swap.toToken?.symbol}
              </Text>
            </View>
          </View>
        )}

        {/* Error Message */}
        {swap.quoteError && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
            <Text style={styles.errorText}>{swap.quoteError}</Text>
          </View>
        )}
      </ScrollView>

      {/* Action Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.actionButton, isButtonDisabled() && styles.actionButtonDisabled]}
          onPress={swap.needsApproval ? handleApprove : handleSwap}
          disabled={isButtonDisabled()}
        >
          {(swap.status === 'quoting' ||
            swap.status === 'approving' ||
            swap.status === 'swapping') && (
            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
          )}
          <Text style={styles.actionButtonText}>{getButtonText()}</Text>
        </TouchableOpacity>
      </View>

      {/* Token Selectors */}
      <TokenSelector
        visible={showFromTokenSelector}
        onClose={() => setShowFromTokenSelector(false)}
        onSelect={(token) => dispatch(setFromToken(token))}
        tokens={swap.availableFromTokens}
        loading={swap.tokensLoading}
        selectedToken={swap.fromToken}
        title="Select Token to Swap"
      />

      <TokenSelector
        visible={showToTokenSelector}
        onClose={() => setShowToTokenSelector(false)}
        onSelect={(token) => dispatch(setToToken(token))}
        tokens={swap.availableToTokens}
        loading={swap.tokensLoading}
        selectedToken={swap.toToken}
        title="Select Token to Receive"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  settingsPanel: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  settingsTitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  slippageOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  slippageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  slippageButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  slippageButtonText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  slippageButtonTextActive: {
    color: '#fff',
  },
  slippageInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  tokenCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tokenLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tokenSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  tokenIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  tokenIconPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenIconText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tokenSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'right',
    marginLeft: 16,
  },
  amountOutput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'right',
    marginLeft: 16,
  },
  swapButton: {
    alignSelf: 'center',
    padding: 12,
    marginVertical: -16,
    zIndex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quoteDetails: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  quoteLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  quoteValue: {
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  quoteValueWarning: {
    color: theme.colors.warning,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.error}15`,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.error,
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    borderRadius: 16,
  },
  actionButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});
