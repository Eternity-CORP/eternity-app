/**
 * Swap Screen
 * Token swap interface using LI.FI DEX aggregator
 * Supports cross-chain swaps with network selection
 */

import { useState, useEffect } from 'react';
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
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { deriveWalletFromMnemonic } from '@e-y/crypto';

import { theme } from '@/src/constants/theme';
import { useTheme } from '@/src/contexts';
import { useAppDispatch, useAppSelector } from '@/src/store/hooks';
import { getCurrentAccount, selectIsTestAccount } from '@/src/store/slices/wallet-slice';
import { TestModeWarning } from '@/src/components/TestModeWarning';
import {
  setFromNetwork,
  setToNetwork,
  setFromToken,
  setToToken,
  setFromAmount,
  setSlippage,
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
import { SUPPORTED_NETWORKS, TIER1_NETWORK_IDS, type NetworkId } from '@/src/constants/networks';
import {
  SLIPPAGE_OPTIONS,
  SLIPPAGE_LABELS,
  PRICE_IMPACT_WARNING_THRESHOLD,
} from '@e-y/shared';
import TokenSelector from './token-selector';

export default function SwapScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { theme: dynamicTheme } = useTheme();

  const wallet = useAppSelector((state) => state.wallet);
  const swap = useAppSelector((state) => state.swap);
  const currentAccount = getCurrentAccount(wallet);
  const isTestAccount = useAppSelector(selectIsTestAccount);
  const walletAddress = currentAccount?.address || '';

  const [showFromTokenSelector, setShowFromTokenSelector] = useState(false);
  const [showToTokenSelector, setShowToTokenSelector] = useState(false);

  const isCrossChain = swap.fromNetworkId !== swap.toNetworkId;

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
        const spender = getLiFiContractAddress(
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

  const handleFromNetworkChange = (networkId: NetworkId) => {
    if (networkId === swap.fromNetworkId) return;
    dispatch(setFromNetwork(networkId));
  };

  const handleToNetworkChange = (networkId: NetworkId) => {
    if (networkId === swap.toNetworkId) return;
    dispatch(setToNetwork(networkId));
  };

  const handleApprove = async () => {
    if (!swap.fromToken || !wallet.mnemonic) return;

    dispatch(setSwapStatus('approving'));

    try {
      const provider = getProvider(swap.fromNetworkId);
      const walletInstance = deriveWalletFromMnemonic(wallet.mnemonic, currentAccount?.accountIndex ?? 0).connect(provider);

      const spender = getLiFiContractAddress(
        SUPPORTED_NETWORKS[swap.fromNetworkId].chainId
      );
      const fromAmountWei = parseTokenAmount(swap.fromAmount, swap.fromToken.decimals);
      const { to, data } = getApprovalData(
        swap.fromToken.address,
        spender,
        fromAmountWei,
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
      const walletInstance = deriveWalletFromMnemonic(wallet.mnemonic, currentAccount?.accountIndex ?? 0).connect(provider);

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
    if (!swap.quote && isCrossChain) return 'Cross-chain Swap';
    if (!swap.quote) return 'Swap';
    return isCrossChain ? 'Cross-chain Swap' : 'Swap';
  };

  const isButtonDisabled = () => {
    if (swap.status === 'quoting' || swap.status === 'approving' || swap.status === 'swapping') {
      return true;
    }
    if (swap.needsApproval) return false;
    return !canSwap;
  };

  // Network selector chips
  const NetworkChips = ({
    selectedId,
    onChange,
    label,
  }: {
    selectedId: NetworkId;
    onChange: (id: NetworkId) => void;
    label: string;
  }) => (
    <View style={styles.networkChipsContainer}>
      <Text style={[styles.networkChipsLabel, { color: dynamicTheme.colors.textSecondary }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.networkChipsRow}>
        {TIER1_NETWORK_IDS.map((id) => {
          const net = SUPPORTED_NETWORKS[id];
          const isSelected = id === selectedId;
          return (
            <Pressable
              key={id}
              onPress={() => onChange(id)}
              style={[
                styles.networkChip,
                {
                  backgroundColor: isSelected ? net.color + '25' : 'transparent',
                  borderColor: isSelected ? net.color + '60' : dynamicTheme.colors.border,
                },
              ]}
            >
              <View style={[styles.networkDot, { backgroundColor: net.color }]} />
              <Text
                style={[
                  styles.networkChipText,
                  { color: isSelected ? net.color : dynamicTheme.colors.textSecondary },
                ]}
              >
                {net.shortName}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Swap',
          headerStyle: { backgroundColor: dynamicTheme.colors.background },
          headerTintColor: dynamicTheme.colors.textPrimary,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={dynamicTheme.colors.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Cross-chain indicator */}
        {isCrossChain && (
          <View style={styles.crossChainBadge}>
            <Ionicons name="git-branch-outline" size={14} color="#3388FF" />
            <Text style={styles.crossChainText}>
              Cross-chain ({SUPPORTED_NETWORKS[swap.fromNetworkId].shortName} {'->'} {SUPPORTED_NETWORKS[swap.toNetworkId].shortName})
            </Text>
          </View>
        )}

        {/* Slippage selector */}
        <View style={styles.slippageRow}>
          <Text style={[styles.slippageLabel, { color: dynamicTheme.colors.textSecondary }]}>Slippage:</Text>
          {SLIPPAGE_OPTIONS.map((opt) => {
            const isSelected = swap.slippage === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => dispatch(setSlippage(opt))}
                style={[
                  styles.slippageChip,
                  {
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.12)' : 'transparent',
                    borderColor: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                  },
                ]}
              >
                <Text style={[styles.slippageChipText, { color: isSelected ? '#fff' : dynamicTheme.colors.textSecondary }]}>
                  {SLIPPAGE_LABELS[opt]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* From Token */}
        <View style={[styles.tokenCard, { backgroundColor: dynamicTheme.colors.surface, borderColor: dynamicTheme.colors.border }]}>
          <NetworkChips selectedId={swap.fromNetworkId} onChange={handleFromNetworkChange} label="From network" />

          <Text style={[styles.tokenLabel, { color: dynamicTheme.colors.textSecondary }]}>You pay</Text>
          <View style={styles.tokenRow}>
            <TouchableOpacity
              style={[styles.tokenSelector, { backgroundColor: dynamicTheme.colors.background }]}
              onPress={() => setShowFromTokenSelector(true)}
            >
              {swap.fromToken?.logoURI ? (
                <Image source={{ uri: swap.fromToken.logoURI }} style={styles.tokenIcon} />
              ) : (
                <View style={[styles.tokenIconPlaceholder, { backgroundColor: dynamicTheme.colors.border }]}>
                  <Text style={[styles.tokenIconText, { color: dynamicTheme.colors.textSecondary }]}>{swap.fromToken?.symbol?.charAt(0) || '?'}</Text>
                </View>
              )}
              <Text style={[styles.tokenSymbol, { color: dynamicTheme.colors.textPrimary }]}>{swap.fromToken?.symbol || 'Select'}</Text>
              <Ionicons name="chevron-down" size={16} color={dynamicTheme.colors.textSecondary} />
            </TouchableOpacity>

            <TextInput
              style={[styles.amountInput, { color: dynamicTheme.colors.textPrimary }]}
              value={swap.fromAmount}
              onChangeText={(text) => dispatch(setFromAmount(text))}
              placeholder="0.0"
              placeholderTextColor={dynamicTheme.colors.textSecondary}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Swap Button */}
        <TouchableOpacity style={[styles.swapButton, { backgroundColor: dynamicTheme.colors.surface, borderColor: dynamicTheme.colors.border }]} onPress={handleSwapTokens}>
          <Ionicons name="swap-vertical" size={24} color={dynamicTheme.colors.accent} />
        </TouchableOpacity>

        {/* To Token */}
        <View style={[styles.tokenCard, { backgroundColor: dynamicTheme.colors.surface, borderColor: dynamicTheme.colors.border }]}>
          <NetworkChips selectedId={swap.toNetworkId} onChange={handleToNetworkChange} label="To network" />

          <Text style={[styles.tokenLabel, { color: dynamicTheme.colors.textSecondary }]}>You receive</Text>
          <View style={styles.tokenRow}>
            <TouchableOpacity
              style={[styles.tokenSelector, { backgroundColor: dynamicTheme.colors.background }]}
              onPress={() => setShowToTokenSelector(true)}
            >
              {swap.toToken?.logoURI ? (
                <Image source={{ uri: swap.toToken.logoURI }} style={styles.tokenIcon} />
              ) : (
                <View style={[styles.tokenIconPlaceholder, { backgroundColor: dynamicTheme.colors.border }]}>
                  <Text style={[styles.tokenIconText, { color: dynamicTheme.colors.textSecondary }]}>{swap.toToken?.symbol?.charAt(0) || '?'}</Text>
                </View>
              )}
              <Text style={[styles.tokenSymbol, { color: dynamicTheme.colors.textPrimary }]}>{swap.toToken?.symbol || 'Select'}</Text>
              <Ionicons name="chevron-down" size={16} color={dynamicTheme.colors.textSecondary} />
            </TouchableOpacity>

            <Text style={[styles.amountOutput, { color: dynamicTheme.colors.textPrimary }]}>
              {swap.quote
                ? formatTokenAmount(swap.quote.toAmount, swap.toToken?.decimals || 18)
                : '0.0'}
            </Text>
          </View>
        </View>

        {/* Quote Details */}
        {swap.quote && (
          <View style={[styles.quoteDetails, { backgroundColor: dynamicTheme.colors.surface, borderColor: dynamicTheme.colors.border }]}>
            <View style={styles.quoteRow}>
              <Text style={[styles.quoteLabel, { color: dynamicTheme.colors.textSecondary }]}>Rate</Text>
              <Text style={[styles.quoteValue, { color: dynamicTheme.colors.textPrimary }]}>
                1 {swap.fromToken?.symbol} = {parseFloat(swap.quote.exchangeRate).toFixed(6)}{' '}
                {swap.toToken?.symbol}
              </Text>
            </View>
            <View style={styles.quoteRow}>
              <Text style={[styles.quoteLabel, { color: dynamicTheme.colors.textSecondary }]}>Price Impact</Text>
              <Text
                style={[
                  styles.quoteValue,
                  { color: dynamicTheme.colors.textPrimary },
                  parseFloat(swap.quote.priceImpact) / 100 > PRICE_IMPACT_WARNING_THRESHOLD && styles.quoteValueWarning,
                ]}
              >
                {parseFloat(swap.quote.priceImpact).toFixed(2)}%
              </Text>
            </View>
            <View style={styles.quoteRow}>
              <Text style={[styles.quoteLabel, { color: dynamicTheme.colors.textSecondary }]}>Network Fee</Text>
              <Text style={[styles.quoteValue, { color: dynamicTheme.colors.textPrimary }]}>~${parseFloat(swap.quote.gasCostUSD).toFixed(2)}</Text>
            </View>
            <View style={styles.quoteRow}>
              <Text style={[styles.quoteLabel, { color: dynamicTheme.colors.textSecondary }]}>Min. Received</Text>
              <Text style={[styles.quoteValue, { color: dynamicTheme.colors.textPrimary }]}>
                {formatTokenAmount(swap.quote.toAmountMin, swap.toToken?.decimals || 18)}{' '}
                {swap.toToken?.symbol}
              </Text>
            </View>
            {/* Route info for cross-chain */}
            {isCrossChain && swap.quote.route && swap.quote.route.totalDuration > 0 && (
              <View style={styles.quoteRow}>
                <Text style={[styles.quoteLabel, { color: dynamicTheme.colors.textSecondary }]}>Est. Time</Text>
                <Text style={[styles.quoteValue, { color: dynamicTheme.colors.textPrimary }]}>
                  ~{Math.ceil(swap.quote.route.totalDuration / 60)} min
                </Text>
              </View>
            )}
            {isCrossChain && swap.quote.route && swap.quote.route.steps.length > 1 && (
              <View style={styles.quoteRow}>
                <Text style={[styles.quoteLabel, { color: dynamicTheme.colors.textSecondary }]}>Route</Text>
                <Text style={[styles.quoteValue, { color: dynamicTheme.colors.textPrimary }]} numberOfLines={1}>
                  {swap.quote.route.steps.map((s) => s.toolDetails.name).join(' -> ')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Price impact warning */}
        {swap.quote && parseFloat(swap.quote.priceImpact) / 100 > PRICE_IMPACT_WARNING_THRESHOLD && (
          <View style={styles.priceImpactWarning}>
            <Text style={styles.priceImpactWarningText}>
              High price impact: {parseFloat(swap.quote.priceImpact).toFixed(2)}%. Consider reducing the amount or using a different route.
            </Text>
          </View>
        )}

        {/* Error Message */}
        {swap.quoteError && (
          <View style={[styles.errorContainer, { backgroundColor: dynamicTheme.colors.error + '15' }]}>
            <Ionicons name="alert-circle" size={20} color={dynamicTheme.colors.error} />
            <Text style={[styles.errorText, { color: dynamicTheme.colors.error }]}>{swap.quoteError}</Text>
          </View>
        )}

        {/* Test Account Warning */}
        {isTestAccount && <TestModeWarning style={{ marginTop: 16 }} />}
      </ScrollView>

      {/* Action Button */}
      <View style={[styles.footer, { borderTopColor: dynamicTheme.colors.border }]}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: dynamicTheme.colors.accent }, isButtonDisabled() && { backgroundColor: dynamicTheme.colors.border }]}
          onPress={swap.needsApproval ? handleApprove : handleSwap}
          disabled={isButtonDisabled()}
        >
          {(swap.status === 'quoting' ||
            swap.status === 'approving' ||
            swap.status === 'swapping') && (
            <ActivityIndicator size="small" color={dynamicTheme.colors.buttonPrimaryText} style={{ marginRight: 8 }} />
          )}
          <Text style={[styles.actionButtonText, { color: dynamicTheme.colors.buttonPrimaryText }]}>{getButtonText()}</Text>
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
  crossChainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(51, 136, 255, 0.12)',
    marginBottom: 12,
  },
  crossChainText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3388FF',
  },
  networkChipsContainer: {
    marginBottom: 12,
  },
  networkChipsLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  networkChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  networkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
  },
  networkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  networkChipText: {
    fontSize: 12,
    fontWeight: '500',
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
    flexShrink: 1,
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
  slippageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  slippageLabel: {
    fontSize: 12,
  },
  slippageChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  slippageChipText: {
    fontSize: 12,
  },
  priceImpactWarning: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  priceImpactWarningText: {
    fontSize: 12,
    color: '#eab308',
  },
});
