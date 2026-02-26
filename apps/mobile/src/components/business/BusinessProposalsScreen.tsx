/**
 * Business Proposals Screen
 * Lists on-chain proposals with voting and creation capabilities.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { AbiCoder, formatEther, getBytes, parseEther } from 'ethers';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useTheme } from '@/src/contexts';
import { useAppSelector } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import { getWalletFromMnemonic, getMnemonic } from '@/src/services/wallet-service';
import { getTestnetProvider } from '@/src/services/network-service';
import { API_BASE_URL } from '@/src/config/api';
import { theme } from '@/src/constants/theme';
import { ethersContractFactory } from '@/src/utils/contract-factory';
import {
  type ProposalType,
  type ProposalStatus,
  type OnChainProposal,
  getProposalCount,
  getProposal,
  createProposal as createProposalOnChain,
  vote as voteOnChain,
  indexToProposalType,
  indexToProposalStatus,
  isQuorumReached,
  proposalTypeToIndex,
  getBusiness,
  saveProposal,
  createApiClient,
  type BusinessWallet,
  getShareBalance,
  hasVoted as checkHasVoted,
} from '@e-y/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EnrichedProposal extends OnChainProposal {
  typeLabel: ProposalType;
  statusLabel: ProposalStatus;
  quorumMet: boolean;
  timeRemaining: string;
  isExpired: boolean;
}

type ViewMode = 'list' | 'create';

const PROPOSAL_TYPE_OPTIONS: { value: ProposalType; label: string }[] = [
  { value: 'WITHDRAW_ETH', label: 'Withdraw ETH' },
  { value: 'DISTRIBUTE_DIVIDENDS', label: 'Distribute Dividends' },
  { value: 'TRANSFER_SHARES', label: 'Transfer Shares' },
  { value: 'CHANGE_SETTINGS', label: 'Change Settings' },
  { value: 'CUSTOM', label: 'Custom' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimeRemaining(deadlineUnix: number): { text: string; expired: boolean } {
  const now = Math.floor(Date.now() / 1000);
  const remaining = deadlineUnix - now;
  if (remaining <= 0) return { text: 'Ended', expired: true };

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);

  if (days > 0) return { text: `${days}d ${hours}h`, expired: false };
  if (hours > 0) return { text: `${hours}h ${minutes}m`, expired: false };
  return { text: `${minutes}m`, expired: false };
}

function statusBadgeColor(status: ProposalStatus): string {
  switch (status) {
    case 'active':
      return '#3388FF';
    case 'passed':
      return '#22C55E';
    case 'rejected':
      return '#EF4444';
    case 'executed':
      return '#8B5CF6';
    case 'canceled':
      return '#999999';
    default:
      return '#999999';
  }
}

function typeBadgeColor(type: ProposalType): string {
  switch (type) {
    case 'WITHDRAW_ETH':
      return '#F59E0B';
    case 'WITHDRAW_TOKEN':
      return '#3388FF';
    case 'DISTRIBUTE_DIVIDENDS':
      return '#00E5FF';
    case 'TRANSFER_SHARES':
      return '#8B5CF6';
    case 'CHANGE_SETTINGS':
      return '#22C55E';
    case 'CUSTOM':
      return '#999999';
    default:
      return '#999999';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BusinessProposalsScreen() {
  const { id: businessId } = useLocalSearchParams<{ id: string }>();
  const { theme: dynamicTheme } = useTheme();

  const wallet = useAppSelector((state) => state.wallet);
  const currentAccount = getCurrentAccount(wallet);
  const address = currentAccount?.address ?? '';

  // Personal (non-business) accounts that can sign transactions
  const personalAccounts = useMemo(
    () => wallet.accounts.filter((a) => a.type !== 'business'),
    [wallet.accounts],
  );

  // Per-wallet info: ETH balance + shares + voted
  const [walletInfos, setWalletInfos] = useState<Record<string, { ethBalance: string; shares: number; voted: boolean }>>({});

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [business, setBusiness] = useState<BusinessWallet | null>(null);
  const [proposals, setProposals] = useState<EnrichedProposal[]>([]);
  const [loadingStatus, setLoadingStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [votingId, setVotingId] = useState<number | null>(null);

  // Create form state
  const [createType, setCreateType] = useState<ProposalType>('CUSTOM');
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createAmount, setCreateAmount] = useState('');
  const [createRecipient, setCreateRecipient] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const apiClient = useMemo(() => createApiClient({ baseUrl: API_BASE_URL }), []);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const loadData = useCallback(async () => {
    if (!businessId) return;
    setLoadingStatus('loading');
    setError(null);

    try {
      // Fetch business metadata from API
      const biz = await getBusiness(apiClient, businessId);
      setBusiness(biz);

      if (!biz.treasuryAddress) {
        setProposals([]);
        setLoadingStatus('succeeded');
        return;
      }

      // Fetch on-chain proposals
      const provider = getTestnetProvider('sepolia');
      const count = await getProposalCount(ethersContractFactory, biz.treasuryAddress, provider);

      if (count === 0) {
        setProposals([]);
        setLoadingStatus('succeeded');
        return;
      }

      const proposalPromises: Promise<OnChainProposal>[] = [];
      for (let i = 0; i < count; i++) {
        proposalPromises.push(getProposal(ethersContractFactory, biz.treasuryAddress, provider, i));
      }
      const rawProposals = await Promise.all(proposalPromises);

      const enriched: EnrichedProposal[] = rawProposals.map((p) => {
        const typeLabel = indexToProposalType(p.proposalType);
        const statusLabel = indexToProposalStatus(p.status);
        const quorumMet = isQuorumReached(p.forVotes, p.snapshotSupply, biz.quorumThreshold);
        const { text: timeRemaining, expired: isExpired } = formatTimeRemaining(p.deadline);

        return {
          ...p,
          typeLabel,
          statusLabel,
          quorumMet,
          timeRemaining,
          isExpired,
        };
      });

      // Sort: active first, then by id descending
      enriched.sort((a, b) => {
        if (a.statusLabel === 'active' && b.statusLabel !== 'active') return -1;
        if (b.statusLabel === 'active' && a.statusLabel !== 'active') return 1;
        return b.id - a.id;
      });

      setProposals(enriched);

      // Load per-wallet info (ETH balance + shares)
      const infos: Record<string, { ethBalance: string; shares: number; voted: boolean }> = {};
      await Promise.all(
        personalAccounts.map(async (acc) => {
          const [ethBal, shares] = await Promise.all([
            provider.getBalance(acc.address),
            getShareBalance(ethersContractFactory, biz.contractAddress, provider, acc.address),
          ]);
          infos[acc.id] = {
            ethBalance: formatEther(ethBal),
            shares,
            voted: false, // will be checked per-proposal when voting
          };
        }),
      );
      setWalletInfos(infos);

      setLoadingStatus('succeeded');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load proposals';
      setError(message);
      setLoadingStatus('failed');
    }
  }, [businessId, apiClient, personalAccounts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // Voting
  // ---------------------------------------------------------------------------

  // Auto-find the personal wallet that holds shares
  const holderAccount = personalAccounts.find((a) => {
    const info = walletInfos[a.id];
    return info && info.shares > 0;
  });

  const handleVote = useCallback(
    (proposalId: number, support: boolean) => {
      if (!business?.treasuryAddress || !holderAccount) {
        Alert.alert('Error', 'None of your wallets hold shares in this business.');
        return;
      }

      const info = walletInfos[holderAccount.id];
      const shares = info?.shares ?? 0;

      Alert.alert(
        support ? 'Vote For' : 'Vote Against',
        `Sign with ${holderAccount.label || 'Wallet'} (${shares} shares)\n${holderAccount.address.slice(0, 6)}...${holderAccount.address.slice(-4)}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: async () => {
              setVotingId(proposalId);
              try {
                const mnemonic = await getMnemonic();
                if (!mnemonic) throw new Error('Wallet locked');
                const hdWallet = getWalletFromMnemonic(mnemonic, holderAccount.accountIndex);
                const provider = getTestnetProvider('sepolia');
                const signer = hdWallet.connect(provider);

                await voteOnChain(ethersContractFactory, business.treasuryAddress, signer, proposalId, support);

                Alert.alert('Success', `Vote ${support ? 'for' : 'against'} submitted successfully.`);
                await loadData();
              } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to vote';
                Alert.alert('Error', message);
              } finally {
                setVotingId(null);
              }
            },
          },
        ],
      );
    },
    [business, holderAccount, walletInfos, loadData],
  );

  // ---------------------------------------------------------------------------
  // Create proposal
  // ---------------------------------------------------------------------------

  const handleCreate = useCallback(async () => {
    if (!business?.treasuryAddress || !businessId) return;

    const mnemonic = await getMnemonic();
    if (!mnemonic) return;

    if (!createTitle.trim()) {
      Alert.alert('Error', 'Please enter a proposal title.');
      return;
    }

    // Use the wallet that holds shares, or first personal wallet
    const signerAccount = holderAccount ?? personalAccounts[0];
    if (!signerAccount) {
      Alert.alert('Error', 'No personal wallet available to sign.');
      return;
    }

    setSubmitting(true);
    try {
      const hdWallet = getWalletFromMnemonic(mnemonic, signerAccount.accountIndex);
      const provider = getTestnetProvider('sepolia');
      const signer = hdWallet.connect(provider);

      // Encode proposal data based on type
      const coder = AbiCoder.defaultAbiCoder();
      let dataBytes: Uint8Array;
      try {
        switch (createType) {
          case 'WITHDRAW_ETH':
            dataBytes = getBytes(
              coder.encode(['address', 'uint256'], [createRecipient || signerAccount.address, parseEther(createAmount || '0')]),
            );
            break;
          case 'DISTRIBUTE_DIVIDENDS': {
            // Load holders from business members
            const biz = await getBusiness(apiClient, businessId);
            const holders = (biz.members ?? []).map((m: { address: string }) => m.address);
            dataBytes = getBytes(
              coder.encode(['uint256', 'address[]'], [parseEther(createAmount || '0'), holders]),
            );
            break;
          }
          case 'TRANSFER_SHARES':
            dataBytes = getBytes(
              coder.encode(['address', 'address', 'uint256'], [signerAccount.address, createRecipient || signerAccount.address, BigInt(createAmount || '0')]),
            );
            break;
          case 'CHANGE_SETTINGS':
            dataBytes = getBytes(
              coder.encode(['uint256', 'uint256'], [BigInt(createAmount || '5100'), BigInt('86400')]),
            );
            break;
          case 'CUSTOM':
            dataBytes = getBytes(
              coder.encode(['string', 'string'], [createTitle, createDescription]),
            );
            break;
          default:
            dataBytes = new Uint8Array(0);
        }
      } catch {
        dataBytes = new Uint8Array(0);
      }

      const result = await createProposalOnChain(
        ethersContractFactory,
        business.treasuryAddress,
        signer,
        createType,
        dataBytes,
      );

      // Save metadata to API
      const deadline = new Date();
      deadline.setSeconds(deadline.getSeconds() + business.votingPeriod);

      await saveProposal(apiClient, businessId, {
        onChainId: result.proposalId,
        type: createType,
        title: createTitle.trim(),
        description: createDescription.trim() || undefined,
        data: createAmount
          ? { amount: createAmount, recipient: createRecipient }
          : undefined,
        deadline: deadline.toISOString(),
        createdBy: signerAccount.address,
      });

      Alert.alert('Success', 'Proposal created successfully.');

      // Reset form and switch to list
      setCreateTitle('');
      setCreateDescription('');
      setCreateAmount('');
      setCreateRecipient('');
      setCreateType('CUSTOM');
      setViewMode('list');
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create proposal';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  }, [
    business,
    holderAccount,
    personalAccounts,
    businessId,
    createType,
    createTitle,
    createDescription,
    createAmount,
    createRecipient,
    apiClient,
    loadData,
  ]);

  // ---------------------------------------------------------------------------
  // Voting progress bar
  // ---------------------------------------------------------------------------

  const VotingBar = ({ forVotes, againstVotes, snapshotSupply }: {
    forVotes: number;
    againstVotes: number;
    snapshotSupply: number;
  }) => {
    const total = snapshotSupply || 1;
    const forPct = Math.round((forVotes / total) * 100);
    const againstPct = Math.round((againstVotes / total) * 100);

    return (
      <View style={styles.votingBarContainer}>
        <View style={styles.votingBarRow}>
          <Text style={[styles.votingBarLabel, { color: '#22C55E' }]}>For {forPct}%</Text>
          <Text style={[styles.votingBarLabel, { color: '#EF4444' }]}>Against {againstPct}%</Text>
        </View>
        <View style={[styles.votingBarTrack, { backgroundColor: dynamicTheme.colors.surface }]}>
          {forPct > 0 && (
            <View style={[styles.votingBarFill, { width: `${forPct}%`, backgroundColor: '#22C55E' }]} />
          )}
          {againstPct > 0 && (
            <View
              style={[
                styles.votingBarFill,
                {
                  width: `${againstPct}%`,
                  backgroundColor: '#EF4444',
                  position: 'absolute',
                  right: 0,
                },
              ]}
            />
          )}
        </View>
        <Text style={[styles.votingBarVotes, { color: dynamicTheme.colors.textTertiary }]}>
          {forVotes} for / {againstVotes} against of {snapshotSupply} total
        </Text>
      </View>
    );
  };

  // ---------------------------------------------------------------------------
  // Render: Proposal card
  // ---------------------------------------------------------------------------

  const renderProposalCard = (proposal: EnrichedProposal) => {
    const isExpanded = expandedId === proposal.id;
    const isVoting = votingId === proposal.id;
    const canVote = proposal.statusLabel === 'active' && !proposal.isExpired;

    return (
      <TouchableOpacity
        key={proposal.id}
        style={[styles.card, { backgroundColor: dynamicTheme.colors.glass, borderColor: dynamicTheme.colors.glassBorder }]}
        onPress={() => setExpandedId(isExpanded ? null : proposal.id)}
        activeOpacity={0.7}
      >
        {/* Header row: type badge + status */}
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: typeBadgeColor(proposal.typeLabel) + '20' }]}>
            <Text style={[styles.badgeText, { color: typeBadgeColor(proposal.typeLabel) }]}>
              {proposal.typeLabel.replace(/_/g, ' ')}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusBadgeColor(proposal.statusLabel) + '20' }]}>
            <Text style={[styles.badgeText, { color: statusBadgeColor(proposal.statusLabel) }]}>
              {proposal.statusLabel.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.cardTitle, { color: dynamicTheme.colors.textPrimary }]}>
          Proposal #{proposal.id}
        </Text>

        {/* Voting bars */}
        <VotingBar
          forVotes={proposal.forVotes}
          againstVotes={proposal.againstVotes}
          snapshotSupply={proposal.snapshotSupply}
        />

        {/* Quorum + time */}
        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <FontAwesome
              name="check-circle"
              size={12}
              color={proposal.quorumMet ? '#22C55E' : dynamicTheme.colors.textTertiary}
            />
            <Text
              style={[
                styles.footerText,
                { color: proposal.quorumMet ? '#22C55E' : dynamicTheme.colors.textTertiary },
              ]}
            >
              {proposal.quorumMet ? 'Quorum reached' : 'Quorum not met'}
            </Text>
          </View>
          <View style={styles.footerItem}>
            <FontAwesome name="clock-o" size={12} color={dynamicTheme.colors.textTertiary} />
            <Text style={[styles.footerText, { color: dynamicTheme.colors.textTertiary }]}>
              {proposal.timeRemaining}
            </Text>
          </View>
        </View>

        {/* Expanded: vote buttons */}
        {isExpanded && canVote && (
          <View style={styles.voteActions}>
            {isVoting ? (
              <ActivityIndicator size="small" color={dynamicTheme.colors.accent} />
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.voteButton, styles.voteForButton]}
                  onPress={() => handleVote(proposal.id, true)}
                >
                  <FontAwesome name="thumbs-up" size={14} color="#FFFFFF" />
                  <Text style={styles.voteButtonText}>Vote For</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.voteButton, styles.voteAgainstButton]}
                  onPress={() => handleVote(proposal.id, false)}
                >
                  <FontAwesome name="thumbs-down" size={14} color="#FFFFFF" />
                  <Text style={styles.voteButtonText}>Vote Against</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {isExpanded && !canVote && (
          <Text style={[styles.noVoteText, { color: dynamicTheme.colors.textTertiary }]}>
            {proposal.isExpired ? 'Voting period ended' : 'Voting not available'}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  // ---------------------------------------------------------------------------
  // Render: Create form
  // ---------------------------------------------------------------------------

  const renderCreateForm = () => {
    const needsAmountField =
      createType === 'WITHDRAW_ETH' || createType === 'WITHDRAW_TOKEN' || createType === 'TRANSFER_SHARES' || createType === 'DISTRIBUTE_DIVIDENDS';
    const needsRecipientField =
      createType === 'WITHDRAW_ETH' || createType === 'WITHDRAW_TOKEN' || createType === 'TRANSFER_SHARES';

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Type selector */}
          <Text style={[styles.formLabel, { color: dynamicTheme.colors.textSecondary }]}>Type</Text>
          <View style={styles.typeSelector}>
            {PROPOSAL_TYPE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.typeOption,
                  {
                    backgroundColor:
                      createType === opt.value
                        ? dynamicTheme.colors.accent
                        : dynamicTheme.colors.surface,
                    borderColor:
                      createType === opt.value
                        ? dynamicTheme.colors.accent
                        : dynamicTheme.colors.border,
                  },
                ]}
                onPress={() => setCreateType(opt.value)}
              >
                <Text
                  style={[
                    styles.typeOptionText,
                    {
                      color:
                        createType === opt.value
                          ? dynamicTheme.colors.buttonPrimaryText
                          : dynamicTheme.colors.textPrimary,
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Title */}
          <Text style={[styles.formLabel, { color: dynamicTheme.colors.textSecondary }]}>Title</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: dynamicTheme.colors.surface, color: dynamicTheme.colors.textPrimary, borderColor: dynamicTheme.colors.border },
            ]}
            placeholder="Proposal title"
            placeholderTextColor={dynamicTheme.colors.textTertiary}
            value={createTitle}
            onChangeText={setCreateTitle}
          />

          {/* Description */}
          <Text style={[styles.formLabel, { color: dynamicTheme.colors.textSecondary }]}>Description</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              { backgroundColor: dynamicTheme.colors.surface, color: dynamicTheme.colors.textPrimary, borderColor: dynamicTheme.colors.border },
            ]}
            placeholder="Describe your proposal..."
            placeholderTextColor={dynamicTheme.colors.textTertiary}
            value={createDescription}
            onChangeText={setCreateDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Conditional: Amount */}
          {needsAmountField && (
            <>
              <Text style={[styles.formLabel, { color: dynamicTheme.colors.textSecondary }]}>Amount</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: dynamicTheme.colors.surface, color: dynamicTheme.colors.textPrimary, borderColor: dynamicTheme.colors.border },
                ]}
                placeholder={createType === 'WITHDRAW_ETH' ? 'Amount in ETH' : 'Amount'}
                placeholderTextColor={dynamicTheme.colors.textTertiary}
                value={createAmount}
                onChangeText={setCreateAmount}
                keyboardType="decimal-pad"
              />
            </>
          )}

          {/* Conditional: Recipient */}
          {needsRecipientField && (
            <>
              <Text style={[styles.formLabel, { color: dynamicTheme.colors.textSecondary }]}>
                Recipient Address
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: dynamicTheme.colors.surface, color: dynamicTheme.colors.textPrimary, borderColor: dynamicTheme.colors.border },
                ]}
                placeholder="0x..."
                placeholderTextColor={dynamicTheme.colors.textTertiary}
                value={createRecipient}
                onChangeText={setCreateRecipient}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: dynamicTheme.colors.buttonPrimary,
                opacity: submitting || !createTitle.trim() ? 0.5 : 1,
              },
            ]}
            onPress={handleCreate}
            disabled={submitting || !createTitle.trim()}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={dynamicTheme.colors.buttonPrimaryText} />
            ) : (
              <Text style={[styles.submitButtonText, { color: dynamicTheme.colors.buttonPrimaryText }]}>
                Create Proposal
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  const headerRight = (
    <TouchableOpacity
      onPress={() => setViewMode(viewMode === 'list' ? 'create' : 'list')}
      style={styles.headerButton}
    >
      <FontAwesome
        name={viewMode === 'list' ? 'plus' : 'list'}
        size={18}
        color={dynamicTheme.colors.textPrimary}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScreenHeader
        title={viewMode === 'list' ? 'Proposals' : 'New Proposal'}
        rightElement={headerRight}
        onBack={viewMode === 'create' ? () => setViewMode('list') : undefined}
      />

      {viewMode === 'create' ? (
        renderCreateForm()
      ) : loadingStatus === 'loading' && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={dynamicTheme.colors.accent} />
          <Text style={[styles.loadingText, { color: dynamicTheme.colors.textSecondary }]}>
            Loading proposals...
          </Text>
        </View>
      ) : loadingStatus === 'failed' ? (
        <View style={styles.centered}>
          <FontAwesome name="exclamation-circle" size={32} color={dynamicTheme.colors.error} />
          <Text style={[styles.errorText, { color: dynamicTheme.colors.error }]}>
            {error || 'Failed to load proposals'}
          </Text>
          <TouchableOpacity onPress={loadData} style={[styles.retryButton, { borderColor: dynamicTheme.colors.border }]}>
            <Text style={[styles.retryText, { color: dynamicTheme.colors.textPrimary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : proposals.length === 0 ? (
        <View style={styles.centered}>
          <FontAwesome name="file-text-o" size={48} color={dynamicTheme.colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: dynamicTheme.colors.textPrimary }]}>
            No proposals yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: dynamicTheme.colors.textTertiary }]}>
            Create the first proposal using the + button
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={dynamicTheme.colors.accent} />
          }
        >
          {proposals.map(renderProposalCard)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: theme.spacing.xl,
  },
  loadingText: {
    ...theme.typography.body,
    marginTop: 8,
  },
  errorText: {
    ...theme.typography.body,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    marginTop: 8,
  },
  retryText: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  emptyTitle: {
    ...theme.typography.heading,
    marginTop: 12,
  },
  emptySubtitle: {
    ...theme.typography.caption,
    textAlign: 'center',
  },
  listContent: {
    padding: theme.spacing.lg,
    gap: 12,
    paddingBottom: 32,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Card
  card: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    padding: theme.spacing.lg,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardTitle: {
    ...theme.typography.heading,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    ...theme.typography.label,
  },

  // Voting bar
  votingBarContainer: {
    gap: 4,
  },
  votingBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  votingBarLabel: {
    ...theme.typography.label,
    fontWeight: '600',
  },
  votingBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  votingBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  votingBarVotes: {
    ...theme.typography.label,
  },

  // Vote actions
  voteActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  voteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
  },
  voteForButton: {
    backgroundColor: '#22C55E',
  },
  voteAgainstButton: {
    backgroundColor: '#EF4444',
  },
  voteButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  noVoteText: {
    ...theme.typography.caption,
    textAlign: 'center',
    marginTop: 4,
  },

  // Create form
  formContent: {
    padding: theme.spacing.lg,
    gap: 4,
    paddingBottom: 40,
  },
  formLabel: {
    ...theme.typography.label,
    marginTop: 12,
    marginBottom: 4,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
  },
  typeOptionText: {
    ...theme.typography.caption,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...theme.typography.body,
  },
  textArea: {
    minHeight: 100,
  },
  submitButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    ...theme.typography.body,
    fontWeight: '700',
  },
});
