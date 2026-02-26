/**
 * Business Create Wizard Screen
 * 4-step wizard: Basic Info -> Founders -> Governance -> Review & Deploy
 * Ported from web: apps/web/src/app/wallet/business/create/page.tsx
 */

import { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ethers } from 'ethers';
import { FontAwesome } from '@expo/vector-icons';
import { deriveWalletFromMnemonic } from '@e-y/crypto';
import { getMnemonic } from '@/src/services/wallet-service';
import {
  validateBusinessParams,
  lookupUsername,
  saveBusiness,
  createBusiness,
  BUSINESS_FACTORY_ADDRESS,
  type CreateBusinessParams,
  type TransferPolicy,
} from '@e-y/shared';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount, addBusinessAccountThunk } from '@/src/store/slices/wallet-slice';
import { selectIsTestAccount } from '@/src/store/slices/wallet-slice';
import { apiClient } from '@/src/services/api-client';
import { getTestnetRpcUrl } from '@/src/constants/networks-testnet';
import { ethersContractFactory } from '@/src/utils/contract-factory';

// --------------------------------------------------
// Types
// --------------------------------------------------

interface FounderEntry {
  input: string;
  address: string;
  username?: string;
  shares: number;
  resolved: boolean;
  error?: string;
}

type Step = 1 | 2 | 3 | 4;

// --------------------------------------------------
// Constants
// --------------------------------------------------

const VOTING_PERIOD_OPTIONS = [
  { label: '1 hour', seconds: 3600 },
  { label: '24 hours', seconds: 86400 },
  { label: '3 days', seconds: 259200 },
  { label: '7 days', seconds: 604800 },
] as const;

const DIVIDEND_FREQUENCY_OPTIONS = ['manual', 'weekly', 'monthly', 'quarterly'] as const;

const SHARE_COLORS = ['#3388FF', '#00E5FF', '#22c55e', '#F59E0B', '#EF4444', '#A855F7', '#EC4899', '#14B8A6'];

// --------------------------------------------------
// Step Indicator
// --------------------------------------------------

function StepIndicator({ current, colors }: { current: Step; colors: ReturnType<typeof useTheme>['theme']['colors'] }) {
  const steps = [
    { num: 1, label: 'Info' },
    { num: 2, label: 'Founders' },
    { num: 3, label: 'Rules' },
    { num: 4, label: 'Deploy' },
  ] as const;

  return (
    <View style={stepStyles.container}>
      {steps.map((step, i) => (
        <View key={step.num} style={stepStyles.stepWrapper}>
          <View style={stepStyles.stepColumn}>
            <View
              style={[
                stepStyles.circle,
                step.num < current && { backgroundColor: '#22c55e' },
                step.num === current && { backgroundColor: colors.accent },
                step.num > current && { backgroundColor: colors.surface },
              ]}
            >
              {step.num < current ? (
                <FontAwesome name="check" size={12} color="#fff" />
              ) : (
                <Text
                  style={[
                    stepStyles.circleText,
                    { color: step.num === current ? colors.buttonPrimaryText : colors.textTertiary },
                  ]}
                >
                  {step.num}
                </Text>
              )}
            </View>
            <Text
              style={[
                stepStyles.label,
                { color: step.num === current ? colors.textPrimary : colors.textTertiary },
              ]}
            >
              {step.label}
            </Text>
          </View>
          {i < steps.length - 1 && (
            <View style={[stepStyles.line, { backgroundColor: colors.border }]}>
              <View
                style={[
                  stepStyles.lineFill,
                  {
                    backgroundColor: step.num < current ? '#22c55e' : 'transparent',
                    width: step.num < current ? '100%' : '0%',
                  },
                ]}
              />
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xl,
  },
  stepWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepColumn: {
    alignItems: 'center',
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    fontSize: 10,
    marginTop: 4,
  },
  line: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    marginTop: 13,
    marginHorizontal: 4,
    overflow: 'hidden',
  },
  lineFill: {
    height: '100%',
    borderRadius: 1,
  },
});

// --------------------------------------------------
// Main Component
// --------------------------------------------------

export function BusinessCreateScreen() {
  const { theme: dynamicTheme } = useTheme();
  const colors = dynamicTheme.colors;
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const currentAccount = getCurrentAccount(wallet);
  const isTestAccount = useAppSelector(selectIsTestAccount);
  const address = currentAccount?.address ?? '';

  // Step state
  const [step, setStep] = useState<Step>(1);

  // Step 1: Basic Info
  const [name, setName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenSupply, setTokenSupply] = useState('');
  const [description, setDescription] = useState('');

  // Step 2: Founders
  const [founders, setFounders] = useState<FounderEntry[]>([
    { input: address, address, shares: 0, resolved: true },
  ]);
  const [newFounderInput, setNewFounderInput] = useState('');
  const [resolvingFounder, setResolvingFounder] = useState(false);
  const [founderError, setFounderError] = useState('');

  // Step 3: Governance
  const [transferPolicy, setTransferPolicy] = useState<TransferPolicy>('FREE');
  const [quorumBps, setQuorumBps] = useState(5100);
  const [votingPeriod, setVotingPeriod] = useState(86400);
  const [vestingEnabled, setVestingEnabled] = useState(false);
  const [vestingCliff, setVestingCliff] = useState('6');
  const [vestingDuration, setVestingDuration] = useState('24');
  const [dividendsEnabled, setDividendsEnabled] = useState(false);
  const [dividendFrequency, setDividendFrequency] = useState<typeof DIVIDEND_FREQUENCY_OPTIONS[number]>('monthly');
  const [dividendPercentage, setDividendPercentage] = useState('10');

  // Step 4: Deploy
  const [deployStatus, setDeployStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle');
  const [deployError, setDeployError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // --------------------------------------------------
  // Computed values
  // --------------------------------------------------

  const supply = parseInt(tokenSupply) || 0;
  const totalShares = founders.reduce((sum, f) => sum + f.shares, 0);
  const sharesRemaining = supply - totalShares;

  const step1Valid = useMemo(() => {
    if (name.length < 3 || name.length > 50) return false;
    if (!/^[A-Z]{2,6}$/.test(tokenSymbol)) return false;
    if (supply < 2 || supply > 1000000) return false;
    return true;
  }, [name, tokenSymbol, supply]);

  const step2Valid = useMemo(() => {
    if (founders.length === 0) return false;
    if (!founders.every((f) => f.resolved && !f.error)) return false;
    if (totalShares !== supply) return false;
    if (founders.some((f) => f.shares <= 0)) return false;
    return true;
  }, [founders, totalShares, supply]);

  const step3Valid = useMemo(() => {
    if (quorumBps < 5100 || quorumBps > 10000) return false;
    if (vestingEnabled) {
      const cliff = parseInt(vestingCliff);
      const dur = parseInt(vestingDuration);
      if (!cliff || cliff < 1 || !dur || dur < 1 || cliff >= dur) return false;
    }
    if (dividendsEnabled) {
      const pct = parseFloat(dividendPercentage);
      if (!pct || pct <= 0 || pct > 100) return false;
    }
    return true;
  }, [quorumBps, vestingEnabled, vestingCliff, vestingDuration, dividendsEnabled, dividendPercentage]);

  const fullValidation = useMemo(() => {
    return validateBusinessParams({
      name,
      tokenSymbol,
      tokenSupply: supply,
      founders: founders.map((f) => ({ shares: f.shares })),
    });
  }, [name, tokenSymbol, supply, founders]);

  const canProceed =
    step === 1 ? step1Valid : step === 2 ? step2Valid : step === 3 ? step3Valid : fullValidation.valid;

  // --------------------------------------------------
  // Founder management
  // --------------------------------------------------

  const handleAddFounder = useCallback(async () => {
    const input = newFounderInput.trim();
    if (!input) return;

    if (founders.some((f) => f.input.toLowerCase() === input.toLowerCase())) {
      setFounderError('Founder already added');
      return;
    }

    setFounderError('');
    setResolvingFounder(true);

    try {
      let resolvedAddress = '';
      let username: string | undefined;

      if (input.startsWith('@')) {
        const result = await lookupUsername(apiClient as never, input);
        if (!result?.address) {
          setFounderError(`Username ${input} not found`);
          setResolvingFounder(false);
          return;
        }
        resolvedAddress = result.address;
        username = input.slice(1);
      } else if (ethers.isAddress(input)) {
        resolvedAddress = input;
      } else {
        setFounderError('Enter a valid address or @username');
        setResolvingFounder(false);
        return;
      }

      if (founders.some((f) => f.address.toLowerCase() === resolvedAddress.toLowerCase())) {
        setFounderError('This address is already a founder');
        setResolvingFounder(false);
        return;
      }

      setFounders((prev) => [
        ...prev,
        { input, address: resolvedAddress, username, shares: 0, resolved: true },
      ]);
      setNewFounderInput('');
    } catch {
      setFounderError('Failed to resolve address');
    } finally {
      setResolvingFounder(false);
    }
  }, [newFounderInput, founders]);

  const handleRemoveFounder = useCallback((index: number) => {
    if (index === 0) return;
    setFounders((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleShareChange = useCallback((index: number, value: string) => {
    const shares = parseInt(value) || 0;
    setFounders((prev) => prev.map((f, i) => (i === index ? { ...f, shares } : f)));
  }, []);

  // --------------------------------------------------
  // Deploy
  // --------------------------------------------------

  const handleDeploy = useCallback(async () => {
    if (!currentAccount) return;

    const mnemonic = await getMnemonic();
    if (!mnemonic) return;

    setDeployStatus('loading');
    setDeployError('');

    try {
      // For mobile, we derive the wallet directly from the mnemonic (no password encryption layer)
      const signerWallet = deriveWalletFromMnemonic(mnemonic, currentAccount.accountIndex);
      const rpcUrl = getTestnetRpcUrl('sepolia');
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const signer = signerWallet.connect(provider);

      const params: CreateBusinessParams = {
        name,
        description: description || undefined,
        tokenSymbol,
        tokenSupply: supply,
        founders: founders.map((f) => ({
          address: f.address,
          username: f.username,
          shares: f.shares,
        })),
        transferPolicy,
        quorumThreshold: quorumBps,
        votingPeriod,
        vestingEnabled,
        vestingConfig: vestingEnabled
          ? {
              cliffMonths: parseInt(vestingCliff),
              durationMonths: parseInt(vestingDuration),
              schedule: 'linear' as const,
            }
          : undefined,
        dividendsEnabled,
        dividendsConfig: dividendsEnabled
          ? { frequency: dividendFrequency, percentage: parseFloat(dividendPercentage) }
          : undefined,
      };

      // 1. Deploy on-chain
      const result = await createBusiness(ethersContractFactory, BUSINESS_FACTORY_ADDRESS, signer, params);

      setTxHash(result.txHash);

      // 2. Save metadata to backend
      const savedBusiness = await saveBusiness(apiClient as never, {
        name,
        description: description || undefined,
        tokenSymbol,
        tokenSupply: supply,
        contractAddress: result.tokenAddress,
        treasuryAddress: result.treasuryAddress,
        factoryTxHash: result.txHash,
        network: 'sepolia',
        transferPolicy,
        quorumThreshold: quorumBps,
        votingPeriod,
        vestingEnabled,
        vestingConfig: vestingEnabled
          ? ({
              cliffMonths: parseInt(vestingCliff),
              durationMonths: parseInt(vestingDuration),
              schedule: 'linear',
            } as unknown as Record<string, unknown>)
          : undefined,
        dividendsEnabled,
        dividendsConfig: dividendsEnabled
          ? ({
              frequency: dividendFrequency,
              percentage: parseFloat(dividendPercentage),
            } as unknown as Record<string, unknown>)
          : undefined,
        createdBy: address,
        members: founders.map((f) => ({
          address: f.address,
          username: f.username,
          shares: f.shares,
          role: 'founder',
        })),
      });

      // 3. Add business account to local storage
      await dispatch(
        addBusinessAccountThunk({
          businessId: savedBusiness.id,
          label: name,
          treasuryAddress: result.treasuryAddress,
        }),
      ).unwrap();

      setDeployStatus('succeeded');
    } catch (err) {
      console.error('[BusinessCreate] Deploy error:', err);
      const raw = err instanceof Error ? err.message : String(err);
      const reasonMatch = raw.match(/reason="([^"]+)"/);
      const msg = reasonMatch
        ? reasonMatch[1]
        : raw.length > 200
          ? raw.slice(0, raw.indexOf('(') > 0 ? raw.indexOf('(') : 200)
          : raw;
      setDeployError(msg);
      setDeployStatus('failed');
    }
  }, [
    currentAccount,
    address,
    name,
    description,
    tokenSymbol,
    supply,
    founders,
    transferPolicy,
    quorumBps,
    votingPeriod,
    vestingEnabled,
    vestingCliff,
    vestingDuration,
    dividendsEnabled,
    dividendFrequency,
    dividendPercentage,
    dispatch,
  ]);

  // --------------------------------------------------
  // Navigation
  // --------------------------------------------------

  const handleNext = () => {
    if (step < 4) setStep((step + 1) as Step);
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as Step);
  };

  // --------------------------------------------------
  // Success state
  // --------------------------------------------------

  if (deployStatus === 'succeeded') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ScreenHeader title="Business Created" showBackButton={false} />
        <View style={styles.successContent}>
          <View style={[styles.successCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.successIcon, { backgroundColor: '#22c55e20' }]}>
              <FontAwesome name="check" size={32} color="#22c55e" />
            </View>
            <Text style={[styles.successTitle, { color: colors.textPrimary }]}>Business Created</Text>
            <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
              {name} ({tokenSymbol}) has been deployed successfully.
            </Text>

            {txHash ? (
              <Text style={[styles.txHash, { color: colors.textTertiary }]}>
                Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </Text>
            ) : null}

            <View style={styles.successActions}>
              <Pressable
                style={[styles.secondaryButton, { borderColor: colors.border }]}
                onPress={() => router.replace('/(tabs)' as any)}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>
                  Back to Wallet
                </Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, { backgroundColor: colors.buttonPrimary }]}
                onPress={() => router.replace('/business/dashboard' as any)}
              >
                <Text style={[styles.primaryButtonText, { color: colors.buttonPrimaryText }]}>
                  View Business
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // --------------------------------------------------
  // Render steps
  // --------------------------------------------------

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Basic Information</Text>

      <View style={[styles.fieldCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>BUSINESS NAME</Text>
        <TextInput
          style={[styles.fieldInput, { color: colors.textPrimary }]}
          value={name}
          onChangeText={setName}
          placeholder="My Business"
          placeholderTextColor={colors.textTertiary}
          maxLength={50}
        />
        <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>
          {name.length}/50 characters (min 3)
        </Text>
      </View>

      <View style={[styles.fieldCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>TOKEN SYMBOL</Text>
        <TextInput
          style={[styles.fieldInput, { color: colors.textPrimary }, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}
          value={tokenSymbol}
          onChangeText={(text) => setTokenSymbol(text.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6))}
          placeholder="BIZ"
          placeholderTextColor={colors.textTertiary}
          maxLength={6}
          autoCapitalize="characters"
        />
        <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>2-6 uppercase letters</Text>
      </View>

      <View style={[styles.fieldCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>TOTAL TOKEN SUPPLY</Text>
        <TextInput
          style={[styles.fieldInput, styles.fieldInputLarge, { color: colors.textPrimary }]}
          value={tokenSupply}
          onChangeText={setTokenSupply}
          placeholder="1000"
          placeholderTextColor={colors.textTertiary}
          keyboardType="number-pad"
        />
        <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>2 - 1,000,000 tokens</Text>
      </View>

      <View style={[styles.fieldCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>DESCRIPTION (OPTIONAL)</Text>
        <TextInput
          style={[styles.fieldInput, styles.fieldInputMultiline, { color: colors.textPrimary }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Brief description of the business..."
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Founders & Shares</Text>

      {/* Share distribution bar */}
      {supply > 0 && (
        <View style={styles.distributionSection}>
          <View style={styles.distributionHeader}>
            <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>SHARE DISTRIBUTION</Text>
            <Text
              style={[
                styles.distributionCount,
                {
                  color:
                    totalShares === supply
                      ? '#22c55e'
                      : totalShares > supply
                        ? '#EF4444'
                        : colors.textTertiary,
                },
              ]}
            >
              {totalShares} / {supply}
            </Text>
          </View>
          <View style={[styles.distributionBar, { backgroundColor: colors.surface }]}>
            {founders.map((f, i) => {
              const pct = supply > 0 ? (f.shares / supply) * 100 : 0;
              if (pct <= 0) return null;
              return (
                <View
                  key={i}
                  style={{
                    width: `${Math.min(pct, 100)}%`,
                    height: '100%',
                    backgroundColor: SHARE_COLORS[i % SHARE_COLORS.length],
                  }}
                />
              );
            })}
          </View>
          {/* Legend */}
          <View style={styles.legendRow}>
            {founders.map((f, i) => {
              const pct = supply > 0 ? ((f.shares / supply) * 100).toFixed(1) : '0';
              return (
                <View key={i} style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: SHARE_COLORS[i % SHARE_COLORS.length] }]}
                  />
                  <Text style={[styles.legendText, { color: colors.textTertiary }]}>
                    {f.username ? `@${f.username}` : `${f.address.slice(0, 6)}...${f.address.slice(-4)}`}{' '}
                    {pct}%
                  </Text>
                </View>
              );
            })}
            {sharesRemaining > 0 && (
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
                <Text style={[styles.legendText, { color: colors.textTertiary }]}>
                  Unallocated {sharesRemaining}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Founders list */}
      {founders.map((f, i) => (
        <View key={i} style={[styles.fieldCard, { backgroundColor: colors.surface }]}>
          <View style={styles.founderHeader}>
            <View style={styles.founderHeaderLeft}>
              <View
                style={[styles.legendDot, { backgroundColor: SHARE_COLORS[i % SHARE_COLORS.length] }]}
              />
              <Text style={[styles.founderName, { color: colors.textSecondary }]} numberOfLines={1}>
                {i === 0
                  ? 'You (creator)'
                  : f.username
                    ? `@${f.username}`
                    : `${f.address.slice(0, 8)}...${f.address.slice(-6)}`}
              </Text>
            </View>
            {i > 0 && (
              <Pressable onPress={() => handleRemoveFounder(i)} hitSlop={8}>
                <FontAwesome name="times" size={16} color={colors.textTertiary} />
              </Pressable>
            )}
          </View>
          <View style={styles.sharesRow}>
            <Text style={[styles.sharesLabel, { color: colors.textTertiary }]}>Shares:</Text>
            <TextInput
              style={[styles.sharesInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
              value={f.shares ? String(f.shares) : ''}
              onChangeText={(v) => handleShareChange(i, v)}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
            />
            {supply > 0 && (
              <Text style={[styles.sharesPct, { color: colors.textTertiary }]}>
                {((f.shares / supply) * 100).toFixed(1)}%
              </Text>
            )}
          </View>
        </View>
      ))}

      {/* Add founder */}
      <View style={[styles.fieldCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>ADD FOUNDER</Text>
        <View style={styles.addFounderRow}>
          <TextInput
            style={[styles.addFounderInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
            value={newFounderInput}
            onChangeText={(t) => {
              setNewFounderInput(t);
              setFounderError('');
            }}
            placeholder="0x... or @username"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={handleAddFounder}
          />
          <Pressable
            style={[styles.addFounderButton, { backgroundColor: colors.accent + '20', borderColor: colors.accent + '40' }]}
            onPress={handleAddFounder}
            disabled={!newFounderInput.trim() || resolvingFounder}
          >
            {resolvingFounder ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={[styles.addFounderButtonText, { color: colors.accent }]}>Add</Text>
            )}
          </Pressable>
        </View>
        {founderError ? (
          <Text style={[styles.errorText, { color: '#EF4444' }]}>{founderError}</Text>
        ) : null}
      </View>

      {/* Validation feedback */}
      {supply > 0 && totalShares !== supply && (
        <View
          style={[
            styles.validationBanner,
            {
              backgroundColor: totalShares > supply ? '#EF444410' : '#F59E0B10',
              borderColor: totalShares > supply ? '#EF444430' : '#F59E0B30',
            },
          ]}
        >
          <Text style={{ color: totalShares > supply ? '#f87171' : '#F59E0B', fontSize: 13 }}>
            {totalShares > supply
              ? `Shares exceed supply by ${totalShares - supply}`
              : `${sharesRemaining} shares remaining to allocate`}
          </Text>
        </View>
      )}

      {totalShares === supply && supply > 0 && (
        <View style={[styles.validationBanner, { backgroundColor: '#22c55e10', borderColor: '#22c55e30' }]}>
          <Text style={{ color: '#22c55e', fontSize: 13 }}>All {supply} shares allocated</Text>
        </View>
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Governance Settings</Text>

      {/* Transfer Policy */}
      <View style={[styles.fieldCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>TRANSFER POLICY</Text>
        <View style={styles.policyRow}>
          <Pressable
            style={[
              styles.policyOption,
              { backgroundColor: colors.background, borderColor: colors.border },
              transferPolicy === 'FREE' && { borderColor: colors.accent, backgroundColor: colors.accent + '10' },
            ]}
            onPress={() => setTransferPolicy('FREE')}
          >
            <FontAwesome
              name="exchange"
              size={16}
              color={transferPolicy === 'FREE' ? colors.accent : colors.textTertiary}
            />
            <Text
              style={[
                styles.policyText,
                { color: transferPolicy === 'FREE' ? colors.accent : colors.textTertiary },
              ]}
            >
              Free Transfer
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.policyOption,
              { backgroundColor: colors.background, borderColor: colors.border },
              transferPolicy === 'APPROVAL_REQUIRED' && {
                borderColor: colors.accent,
                backgroundColor: colors.accent + '10',
              },
            ]}
            onPress={() => setTransferPolicy('APPROVAL_REQUIRED')}
          >
            <FontAwesome
              name="lock"
              size={16}
              color={transferPolicy === 'APPROVAL_REQUIRED' ? colors.accent : colors.textTertiary}
            />
            <Text
              style={[
                styles.policyText,
                { color: transferPolicy === 'APPROVAL_REQUIRED' ? colors.accent : colors.textTertiary },
              ]}
            >
              Approval Required
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Quorum Threshold */}
      <View style={[styles.fieldCard, { backgroundColor: colors.surface }]}>
        <View style={styles.fieldHeaderRow}>
          <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>QUORUM THRESHOLD</Text>
          <Text style={[styles.quorumValue, { color: colors.accent }]}>
            {(quorumBps / 100).toFixed(0)}%
          </Text>
        </View>
        <View style={styles.quorumButtons}>
          {[51, 60, 67, 75, 100].map((pct) => (
            <Pressable
              key={pct}
              style={[
                styles.quorumButton,
                { backgroundColor: colors.background, borderColor: colors.border },
                quorumBps === pct * 100 && { borderColor: colors.accent, backgroundColor: colors.accent + '10' },
              ]}
              onPress={() => setQuorumBps(pct * 100)}
            >
              <Text
                style={[
                  styles.quorumButtonText,
                  { color: quorumBps === pct * 100 ? colors.accent : colors.textTertiary },
                ]}
              >
                {pct}%
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Voting Period */}
      <View style={[styles.fieldCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>VOTING PERIOD</Text>
        <View style={styles.votingGrid}>
          {VOTING_PERIOD_OPTIONS.map((opt) => (
            <Pressable
              key={opt.seconds}
              style={[
                styles.votingOption,
                { backgroundColor: colors.background, borderColor: colors.border },
                votingPeriod === opt.seconds && {
                  borderColor: colors.accent,
                  backgroundColor: colors.accent + '10',
                },
              ]}
              onPress={() => setVotingPeriod(opt.seconds)}
            >
              <Text
                style={[
                  styles.votingText,
                  { color: votingPeriod === opt.seconds ? colors.accent : colors.textTertiary },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Vesting */}
      <View style={[styles.fieldCard, { backgroundColor: colors.surface }]}>
        <View style={styles.toggleRow}>
          <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>VESTING</Text>
          <Pressable
            style={[styles.toggle, { backgroundColor: vestingEnabled ? colors.accent : colors.border }]}
            onPress={() => setVestingEnabled(!vestingEnabled)}
          >
            <View
              style={[
                styles.toggleThumb,
                vestingEnabled ? styles.toggleThumbOn : styles.toggleThumbOff,
              ]}
            />
          </Pressable>
        </View>
        {vestingEnabled && (
          <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
            <View style={styles.twoColumns}>
              <View style={styles.column}>
                <Text style={[styles.smallLabel, { color: colors.textTertiary }]}>Cliff (months)</Text>
                <TextInput
                  style={[styles.smallInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                  value={vestingCliff}
                  onChangeText={setVestingCliff}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.column}>
                <Text style={[styles.smallLabel, { color: colors.textTertiary }]}>Duration (months)</Text>
                <TextInput
                  style={[styles.smallInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                  value={vestingDuration}
                  onChangeText={setVestingDuration}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Dividends */}
      <View style={[styles.fieldCard, { backgroundColor: colors.surface }]}>
        <View style={styles.toggleRow}>
          <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>DIVIDENDS</Text>
          <Pressable
            style={[styles.toggle, { backgroundColor: dividendsEnabled ? colors.accent : colors.border }]}
            onPress={() => setDividendsEnabled(!dividendsEnabled)}
          >
            <View
              style={[
                styles.toggleThumb,
                dividendsEnabled ? styles.toggleThumbOn : styles.toggleThumbOff,
              ]}
            />
          </Pressable>
        </View>
        {dividendsEnabled && (
          <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.smallLabel, { color: colors.textTertiary }]}>Frequency</Text>
            <View style={styles.votingGrid}>
              {DIVIDEND_FREQUENCY_OPTIONS.map((freq) => (
                <Pressable
                  key={freq}
                  style={[
                    styles.votingOption,
                    { backgroundColor: colors.background, borderColor: colors.border },
                    dividendFrequency === freq && {
                      borderColor: colors.accent,
                      backgroundColor: colors.accent + '10',
                    },
                  ]}
                  onPress={() => setDividendFrequency(freq)}
                >
                  <Text
                    style={[
                      styles.votingText,
                      { color: dividendFrequency === freq ? colors.accent : colors.textTertiary },
                      { textTransform: 'capitalize' },
                    ]}
                  >
                    {freq}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.smallLabel, { color: colors.textTertiary, marginTop: 12 }]}>
              Percentage
            </Text>
            <View style={styles.percentageRow}>
              <TextInput
                style={[styles.smallInput, { flex: 1, backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                value={dividendPercentage}
                onChangeText={setDividendPercentage}
                keyboardType="decimal-pad"
              />
              <Text style={[styles.percentSign, { color: colors.textTertiary }]}>%</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Review & Deploy</Text>

      {/* Business summary */}
      <View style={[styles.fieldCard, { backgroundColor: colors.surface }]}>
        <View style={styles.summaryHeader}>
          <View style={[styles.summaryIcon, { backgroundColor: colors.accent + '15' }]}>
            <FontAwesome name="briefcase" size={18} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.summaryName, { color: colors.textPrimary }]}>{name}</Text>
            <Text style={[styles.summaryMeta, { color: colors.textTertiary }]}>
              {tokenSymbol} -- {supply.toLocaleString()} tokens
            </Text>
          </View>
        </View>
        {description ? (
          <Text style={[styles.summaryDesc, { color: colors.textSecondary }]}>{description}</Text>
        ) : null}
      </View>

      {/* Founders */}
      <View style={[styles.fieldCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>
          FOUNDERS ({founders.length})
        </Text>
        {founders.map((f, i) => (
          <View key={i} style={styles.reviewRow}>
            <View style={styles.reviewRowLeft}>
              <View
                style={[styles.legendDot, { backgroundColor: SHARE_COLORS[i % SHARE_COLORS.length] }]}
              />
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>
                {i === 0
                  ? 'You'
                  : f.username
                    ? `@${f.username}`
                    : `${f.address.slice(0, 6)}...${f.address.slice(-4)}`}
              </Text>
            </View>
            <Text style={[styles.reviewValue, { color: colors.textSecondary }]}>
              {f.shares} ({supply > 0 ? ((f.shares / supply) * 100).toFixed(1) : 0}%)
            </Text>
          </View>
        ))}
      </View>

      {/* Governance */}
      <View style={[styles.fieldCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>GOVERNANCE</Text>
        <View style={styles.reviewRow}>
          <Text style={[styles.reviewLabel, { color: colors.textTertiary }]}>Transfer Policy</Text>
          <Text style={[styles.reviewValue, { color: colors.textSecondary }]}>
            {transferPolicy === 'FREE' ? 'Free Transfer' : 'Approval Required'}
          </Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={[styles.reviewLabel, { color: colors.textTertiary }]}>Quorum</Text>
          <Text style={[styles.reviewValue, { color: colors.textSecondary }]}>
            {(quorumBps / 100).toFixed(0)}%
          </Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={[styles.reviewLabel, { color: colors.textTertiary }]}>Voting Period</Text>
          <Text style={[styles.reviewValue, { color: colors.textSecondary }]}>
            {VOTING_PERIOD_OPTIONS.find((o) => o.seconds === votingPeriod)?.label}
          </Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={[styles.reviewLabel, { color: colors.textTertiary }]}>Vesting</Text>
          <Text style={[styles.reviewValue, { color: colors.textSecondary }]}>
            {vestingEnabled ? `${vestingCliff}mo cliff, ${vestingDuration}mo duration` : 'Disabled'}
          </Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={[styles.reviewLabel, { color: colors.textTertiary }]}>Dividends</Text>
          <Text style={[styles.reviewValue, { color: colors.textSecondary }]}>
            {dividendsEnabled ? `${dividendPercentage}% ${dividendFrequency}` : 'Disabled'}
          </Text>
        </View>
      </View>

      {/* Gas estimate warning */}
      <View style={[styles.validationBanner, { backgroundColor: '#F59E0B10', borderColor: '#F59E0B30' }]}>
        <FontAwesome name="bolt" size={14} color="#F59E0B" style={{ marginRight: 8 }} />
        <Text style={{ color: '#F59E0B', fontSize: 12, flex: 1 }}>
          Estimated gas: ~0.01-0.05 ETH (depends on network conditions)
        </Text>
      </View>

      {/* Validation errors */}
      {!fullValidation.valid && (
        <View style={[styles.validationBanner, { backgroundColor: '#EF444410', borderColor: '#EF444430' }]}>
          <Text style={{ color: '#f87171', fontSize: 13 }}>{fullValidation.error}</Text>
        </View>
      )}

      {/* Network */}
      <View style={[styles.fieldCard, { backgroundColor: colors.surface, paddingVertical: 10 }]}>
        <View style={styles.networkRow}>
          <View style={styles.networkDot} />
          <Text style={[styles.networkText, { color: colors.textTertiary }]}>
            Deploying on Sepolia Testnet
          </Text>
        </View>
      </View>
    </View>
  );

  // --------------------------------------------------
  // Main render
  // --------------------------------------------------

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Create Business" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <StepIndicator current={step} colors={colors} />

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          {deployError ? (
            <View style={[styles.deployErrorBanner, { backgroundColor: '#EF444408', borderColor: '#EF444420' }]}>
              <Text style={{ color: '#f87171', fontSize: 13 }}>{deployError}</Text>
            </View>
          ) : null}

          <View style={styles.footerButtons}>
            {step > 1 && (
              <Pressable
                style={[styles.secondaryButton, { borderColor: colors.border }]}
                onPress={handleBack}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>Back</Text>
              </Pressable>
            )}
            {step < 4 ? (
              <Pressable
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.buttonPrimary },
                  !canProceed && { backgroundColor: colors.buttonDisabled },
                  step === 1 && { flex: 1 },
                ]}
                onPress={handleNext}
                disabled={!canProceed}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    { color: canProceed ? colors.buttonPrimaryText : colors.buttonDisabledText },
                  ]}
                >
                  Next
                </Text>
              </Pressable>
            ) : (
              <Pressable
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.accent },
                  (!fullValidation.valid || deployStatus === 'loading') && {
                    backgroundColor: colors.buttonDisabled,
                  },
                ]}
                onPress={() => {
                  if (deployStatus === 'loading') return;
                  Alert.alert(
                    'Deploy Business',
                    `Deploy "${name}" (${tokenSymbol}) on Sepolia?\n\nThis will cost gas fees.`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Deploy', onPress: handleDeploy },
                    ],
                  );
                }}
                disabled={!fullValidation.valid || deployStatus === 'loading'}
              >
                {deployStatus === 'loading' ? (
                  <View style={styles.deployingRow}>
                    <ActivityIndicator size="small" color={colors.buttonPrimaryText} />
                    <Text
                      style={[styles.primaryButtonText, { color: colors.buttonPrimaryText, marginLeft: 8 }]}
                    >
                      Deploying...
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.primaryButtonText,
                      {
                        color:
                          fullValidation.valid ? colors.buttonPrimaryText : colors.buttonDisabledText,
                      },
                    ]}
                  >
                    Create Business
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --------------------------------------------------
// Styles
// --------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  stepContent: {
    gap: theme.spacing.md,
  },
  stepTitle: {
    ...theme.typography.heading,
    marginBottom: theme.spacing.xs,
  },
  fieldCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  fieldInput: {
    fontSize: 16,
  },
  fieldInputLarge: {
    fontSize: 22,
    fontWeight: '700',
  },
  fieldInputMultiline: {
    minHeight: 60,
  },
  fieldHint: {
    fontSize: 10,
    marginTop: theme.spacing.xs,
  },
  fieldHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Distribution
  distributionSection: {
    gap: theme.spacing.sm,
  },
  distributionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distributionCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  distributionBar: {
    height: 10,
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
  },

  // Founders
  founderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  founderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  founderName: {
    fontSize: 13,
    flex: 1,
  },
  sharesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  sharesLabel: {
    fontSize: 12,
  },
  sharesInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 14,
  },
  sharesPct: {
    fontSize: 12,
    width: 44,
    textAlign: 'right',
  },
  addFounderRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  addFounderInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 14,
  },
  addFounderButton: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  addFounderButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    marginTop: theme.spacing.sm,
  },
  validationBanner: {
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Governance
  policyRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  policyOption: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  policyText: {
    fontSize: 12,
    fontWeight: '500',
  },
  quorumValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  quorumButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  quorumButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  quorumButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  votingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  votingOption: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    minWidth: '46%',
    alignItems: 'center',
  },
  votingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    padding: 2,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  toggleThumbOff: {
    alignSelf: 'flex-start',
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
  },
  expandedSection: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    gap: theme.spacing.sm,
  },
  twoColumns: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  column: {
    flex: 1,
  },
  smallLabel: {
    fontSize: 10,
    marginBottom: 4,
  },
  smallInput: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 14,
  },
  percentageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  percentSign: {
    fontSize: 14,
  },

  // Review
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryName: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  summaryMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  summaryDesc: {
    fontSize: 13,
    marginTop: theme.spacing.md,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  reviewRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  reviewLabel: {
    fontSize: 12,
  },
  reviewValue: {
    fontSize: 12,
  },
  networkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  networkText: {
    fontSize: 12,
  },

  // Footer
  footer: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    borderTopWidth: 1,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  deployingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deployErrorBanner: {
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
  },

  // Success
  successContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  successCard: {
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  successTitle: {
    ...theme.typography.heading,
    marginBottom: theme.spacing.sm,
  },
  successSubtitle: {
    ...theme.typography.caption,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  txHash: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: theme.spacing.xl,
  },
  successActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    width: '100%',
  },
});
