/**
 * Business Dashboard Screen
 * Full dashboard ported from web: header, stats, equity chart,
 * treasury, members, proposals, activity, settings.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Svg, { Circle, G } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import { FontAwesome } from '@expo/vector-icons';
import { ethers } from 'ethers';

import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useTheme } from '@/src/contexts';
import { useAppSelector } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import { getTestnetRpcUrl } from '@/src/constants/networks-testnet';
import { API_BASE_URL } from '@/src/config/api';

import {
  getBusiness,
  getBusinessActivity,
  getAllHolders,
  getTreasuryBalance,
  getProposalCount,
  getProposal,
  indexToProposalStatus,
  indexToProposalType,
  isQuorumReached,
  createApiClient,
  getVestingSchedule,
  getReleasable,
  getLocked,
  releaseVestedTokens,
  type VestingScheduleInfo,
  type BusinessWallet,
  type BusinessActivity,
  type EthersLikeProvider,
} from '@e-y/shared';

import { getWalletFromMnemonic, getMnemonic } from '@/src/services/wallet-service';
import { getTestnetProvider } from '@/src/services/network-service';
import { ethersContractFactory } from '@/src/utils/contract-factory';

// --------------------------------------------------
// Types
// --------------------------------------------------

interface HolderInfo {
  address: string;
  balance: number;
  percent: number;
  role?: string;
  username?: string;
}

interface ProposalDisplay {
  id: number;
  type: string;
  status: string;
  forVotes: number;
  againstVotes: number;
  totalSupply: number;
  deadline: number;
  creator: string;
}

interface VestingDisplayConfig {
  cliffMonths?: number;
  durationMonths?: number;
}

interface DividendDisplayConfig {
  frequency?: string;
  percentage?: number;
}

// --------------------------------------------------
// Constants
// --------------------------------------------------

const CHART_COLORS = [
  '#3388FF', '#00E5FF', '#22c55e', '#F59E0B',
  '#EF4444', '#A855F7', '#EC4899', '#14B8A6',
];

const apiClient = createApiClient({ baseUrl: API_BASE_URL });

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function formatVotingPeriod(seconds: number): string {
  if (seconds >= 86400) return `${Math.round(seconds / 86400)} days`;
  if (seconds >= 3600) return `${Math.round(seconds / 3600)} hours`;
  return `${seconds} seconds`;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// --------------------------------------------------
// Donut Chart Component (react-native-svg)
// --------------------------------------------------

function DonutChart({
  holders,
  totalSupply,
  colors: themeColors,
}: {
  holders: HolderInfo[];
  totalSupply: number;
  colors: { textPrimary: string; textSecondary: string; textTertiary: string };
}) {
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let cumulativePercent = 0;

  const segments = holders.map((h, i) => {
    const percent = totalSupply > 0 ? (h.balance / totalSupply) * 100 : 0;
    const dashLength = (percent / 100) * circumference;
    const dashOffset = circumference - (cumulativePercent / 100) * circumference;
    cumulativePercent += percent;
    return { color: CHART_COLORS[i % CHART_COLORS.length], dashLength, dashOffset, percent, holder: h };
  });

  return (
    <View style={donutStyles.container}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation={-90} origin={`${center}, ${center}`}>
          {/* Background ring */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(0,0,0,0.05)"
            strokeWidth={strokeWidth}
          />
          {/* Segments */}
          {segments.map((seg, i) => (
            <Circle
              key={i}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
              strokeDashoffset={seg.dashOffset}
              strokeLinecap="round"
              opacity={0.85}
            />
          ))}
        </G>
      </Svg>

      {/* Legend */}
      <View style={donutStyles.legend}>
        {holders.map((h, i) => (
          <View key={i} style={donutStyles.legendRow}>
            <View style={donutStyles.legendLeft}>
              <View
                style={[donutStyles.legendDot, { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }]}
              />
              <Text style={[donutStyles.legendLabel, { color: themeColors.textSecondary }]} numberOfLines={1}>
                {h.username ? `@${h.username}` : `${h.address.slice(0, 6)}...${h.address.slice(-4)}`}
              </Text>
            </View>
            <Text style={[donutStyles.legendPercent, { color: themeColors.textTertiary }]}>
              {h.percent.toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const donutStyles = StyleSheet.create({
  container: { alignItems: 'center' },
  legend: { marginTop: 16, width: '100%' },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  legendLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendLabel: { fontSize: 12, maxWidth: 140 },
  legendPercent: { fontSize: 12, fontFamily: 'monospace' },
});

// --------------------------------------------------
// Activity Icon Name Mapping
// --------------------------------------------------

const ACTIVITY_ICONS: Record<string, { icon: string; color: string }> = {
  created: { icon: 'star', color: '#3388FF' },
  proposal: { icon: 'file-text-o', color: '#F59E0B' },
  vote: { icon: 'check-circle-o', color: '#A855F7' },
  executed: { icon: 'check-circle', color: '#22c55e' },
  transfer: { icon: 'exchange', color: '#00E5FF' },
  deposit: { icon: 'arrow-down', color: '#22c55e' },
  dividend: { icon: 'dollar', color: '#F59E0B' },
};

// --------------------------------------------------
// Main Component
// --------------------------------------------------

export function BusinessDashboardScreen() {
  const { id: businessId } = useLocalSearchParams<{ id: string }>();
  const { theme: dynamicTheme } = useTheme();
  const c = dynamicTheme.colors;

  const wallet = useAppSelector((state) => state.wallet);
  const currentAccount = getCurrentAccount(wallet);
  const address = currentAccount?.address;

  // Redirect away if user switches to a non-business account
  useEffect(() => {
    if (currentAccount && currentAccount.type !== 'business') {
      router.replace('/(tabs)' as any);
    }
  }, [currentAccount]);

  // State
  const [business, setBusiness] = useState<BusinessWallet | null>(null);
  const [holders, setHolders] = useState<HolderInfo[]>([]);
  const [treasuryEth, setTreasuryEth] = useState('0.000000');
  const [proposals, setProposals] = useState<ProposalDisplay[]>([]);
  const [activities, setActivities] = useState<BusinessActivity[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('loading');
  const [error, setError] = useState('');
  const [showDepositInfo, setShowDepositInfo] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [vestingInfo, setVestingInfo] = useState<VestingScheduleInfo | null>(null);
  const [releasableAmount, setReleasableAmount] = useState(0);
  const [lockedAmount, setLockedAmount] = useState(0);
  const [releasing, setReleasing] = useState(false);

  // --------------------------------------------------
  // Data loader
  // --------------------------------------------------

  const loadData = useCallback(async () => {
    if (!businessId || !address) return;

    try {
      const biz = await getBusiness(apiClient, businessId);
      setBusiness(biz);

      const rpcUrl = getTestnetRpcUrl('sepolia');
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      const memberAddresses = (biz.members || []).map((m) => m.address);
      if (memberAddresses.length === 0 && biz.createdBy) {
        memberAddresses.push(biz.createdBy);
      }

      const usernameByAddress: Record<string, string> = {};
      for (const m of biz.members || []) {
        if (m.username) usernameByAddress[m.address.toLowerCase()] = m.username;
      }

      const [holdersData, treasuryData, proposalCountData, activityData] = await Promise.all([
        getAllHolders(ethersContractFactory, biz.contractAddress, provider, memberAddresses).catch(
          () => [] as HolderInfo[],
        ),
        getTreasuryBalance(provider as unknown as EthersLikeProvider, biz.treasuryAddress).catch(
          () => ({ eth: '0.000000' }),
        ),
        getProposalCount(ethersContractFactory, biz.treasuryAddress, provider).catch(() => 0),
        getBusinessActivity(apiClient, biz.id).catch(() => [] as BusinessActivity[]),
      ]);

      // Enrich holders with username/role from API members
      const enrichedHolders: HolderInfo[] =
        holdersData.length > 0
          ? holdersData.map((h) => ({
              ...h,
              username: usernameByAddress[h.address.toLowerCase()],
              role: (biz.members || []).find(
                (m) => m.address.toLowerCase() === h.address.toLowerCase(),
              )?.role,
            }))
          : (biz.members || []).map((m) => ({
              address: m.address,
              balance: m.initialShares,
              percent:
                biz.tokenSupply > 0
                  ? Math.round((m.initialShares / biz.tokenSupply) * 10000) / 100
                  : 0,
              username: m.username,
              role: m.role,
            }));

      setHolders(enrichedHolders);
      setTreasuryEth(treasuryData.eth);
      setActivities(activityData);

      // Load proposals
      if (proposalCountData > 0) {
        const count = Math.min(proposalCountData, 10);
        const proposalPromises = [];
        for (let i = proposalCountData - 1; i >= proposalCountData - count; i--) {
          proposalPromises.push(
            getProposal(ethersContractFactory, biz.treasuryAddress, provider, i).catch(() => null),
          );
        }
        const results = await Promise.all(proposalPromises);
        const displayProposals: ProposalDisplay[] = results
          .filter((p): p is NonNullable<typeof p> => p !== null)
          .map((p) => ({
            id: p.id,
            type: indexToProposalType(p.proposalType),
            status: indexToProposalStatus(p.status),
            forVotes: p.forVotes,
            againstVotes: p.againstVotes,
            totalSupply: p.snapshotSupply,
            deadline: p.deadline,
            creator: p.creator,
          }));
        setProposals(displayProposals);
      }

      // Load vesting data for current user
      try {
        const [vesting, releasable, locked] = await Promise.all([
          getVestingSchedule(ethersContractFactory, biz.contractAddress, provider, address),
          getReleasable(ethersContractFactory, biz.contractAddress, provider, address),
          getLocked(ethersContractFactory, biz.contractAddress, provider, address),
        ]);
        setVestingInfo(vesting);
        setReleasableAmount(releasable);
        setLockedAmount(locked);
      } catch {
        // Vesting not configured — ignore
      }

      setStatus('succeeded');
    } catch (err) {
      console.error('Failed to load business:', err);
      setError(err instanceof Error ? err.message : 'Failed to load business data');
      setStatus('failed');
    }
  }, [businessId, address]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Computed
  const activeProposals = useMemo(() => proposals.filter((p) => p.status === 'active'), [proposals]);

  // --------------------------------------------------
  // Copy treasury address
  // --------------------------------------------------

  const copyTreasuryAddress = useCallback(async () => {
    if (!business) return;
    await Clipboard.setStringAsync(business.treasuryAddress);
    Alert.alert('Copied', 'Treasury address copied to clipboard');
  }, [business]);

  // --------------------------------------------------
  // Release vested tokens
  // --------------------------------------------------

  const handleRelease = useCallback(async () => {
    if (!business || !currentAccount) return;
    const mnemonic = await getMnemonic();
    if (!mnemonic) return;
    Alert.alert('Release Tokens', `Release ${releasableAmount} vested tokens?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Release',
        onPress: async () => {
          setReleasing(true);
          try {
            const releaseMnemonic = await getMnemonic();
            if (!releaseMnemonic) throw new Error('Wallet locked');
            const hdWallet = getWalletFromMnemonic(releaseMnemonic, currentAccount.accountIndex);
            const provider = getTestnetProvider('sepolia');
            const signer = hdWallet.connect(provider);
            await releaseVestedTokens(ethersContractFactory, business.contractAddress, signer);
            Alert.alert('Success', 'Tokens released successfully.');
            await loadData();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to release tokens');
          } finally {
            setReleasing(false);
          }
        },
      },
    ]);
  }, [business, currentAccount, releasableAmount, loadData]);

  // --------------------------------------------------
  // Loading state
  // --------------------------------------------------

  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
        <ScreenHeader title="Business" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      </SafeAreaView>
    );
  }

  // --------------------------------------------------
  // Error state
  // --------------------------------------------------

  if (status === 'failed' || !business) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
        <ScreenHeader title="Business" />
        <View style={styles.centered}>
          <FontAwesome name="exclamation-circle" size={40} color={c.error} />
          <Text style={[styles.errorTitle, { color: c.textPrimary }]}>Failed to load business</Text>
          <Text style={[styles.errorSub, { color: c.textTertiary }]}>{error || 'Business not found'}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { borderColor: c.border }]}
            onPress={() => {
              setStatus('loading');
              setError('');
              loadData();
            }}
          >
            <Text style={{ color: c.textPrimary, fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --------------------------------------------------
  // Main render
  // --------------------------------------------------

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
      <ScreenHeader title={business.name} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
      >
        {/* ============ Header Card ============ */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <FontAwesome name="briefcase" size={22} color="#3388FF" />
            </View>
            <View style={styles.headerText}>
              <View style={styles.headerNameRow}>
                <Text style={[styles.businessName, { color: c.textPrimary }]}>{business.name}</Text>
                <View style={styles.symbolBadge}>
                  <Text style={styles.symbolText}>${business.tokenSymbol}</Text>
                </View>
              </View>
              {business.description ? (
                <Text style={[styles.description, { color: c.textTertiary }]}>{business.description}</Text>
              ) : null}
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: c.background }]}>
              <Text style={[styles.statLabel, { color: c.textTertiary }]}>Supply</Text>
              <Text style={[styles.statValue, { color: c.textPrimary }]}>
                {business.tokenSupply.toLocaleString()}
              </Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: c.background }]}>
              <Text style={[styles.statLabel, { color: c.textTertiary }]}>Members</Text>
              <Text style={[styles.statValue, { color: c.textPrimary }]}>{holders.length}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: c.background }]}>
              <Text style={[styles.statLabel, { color: c.textTertiary }]}>Proposals</Text>
              <Text style={[styles.statValue, { color: c.textPrimary }]}>{proposals.length}</Text>
            </View>
          </View>
        </View>

        {/* ============ Equity Distribution ============ */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.textTertiary }]}>EQUITY DISTRIBUTION</Text>
          {holders.length > 0 ? (
            <DonutChart holders={holders} totalSupply={business.tokenSupply} colors={c} />
          ) : (
            <View style={styles.emptySection}>
              <Text style={[styles.emptyText, { color: c.textTertiary }]}>No holder data available</Text>
            </View>
          )}
        </View>

        {/* ============ Treasury ============ */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.textTertiary }]}>TREASURY</Text>
          <View style={styles.treasuryCenter}>
            <Text style={[styles.treasuryBalance, { color: c.textPrimary }]}>
              {parseFloat(treasuryEth).toFixed(4)}
            </Text>
            <Text style={[styles.treasuryCurrency, { color: c.textTertiary }]}>ETH</Text>
          </View>

          <TouchableOpacity
            style={styles.depositButton}
            onPress={() => setShowDepositInfo(!showDepositInfo)}
          >
            <Text style={styles.depositButtonText}>{showDepositInfo ? 'Hide' : 'Deposit'}</Text>
          </TouchableOpacity>

          {showDepositInfo && (
            <View style={[styles.depositInfo, { backgroundColor: c.background, borderColor: c.border }]}>
              <Text style={[styles.depositHint, { color: c.textTertiary }]}>
                Send ETH to the treasury address:
              </Text>
              <TouchableOpacity style={[styles.addressRow, { backgroundColor: c.surface }]} onPress={copyTreasuryAddress}>
                <Text style={[styles.addressText, { color: c.textSecondary }]} numberOfLines={1}>
                  {business.treasuryAddress}
                </Text>
                <FontAwesome name="copy" size={12} color={c.textTertiary} />
              </TouchableOpacity>
              <Text style={[styles.depositFootnote, { color: c.textTertiary }]}>
                Or send from any wallet to this address
              </Text>
            </View>
          )}
        </View>

        {/* ============ Members ============ */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.textTertiary }]}>MEMBERS</Text>
          {holders.length > 0 ? (
            holders.map((h, i) => (
              <View key={i} style={styles.memberRow}>
                <View style={styles.memberLeft}>
                  <View
                    style={[styles.memberDot, { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }]}
                  />
                  <Text style={[styles.memberName, { color: c.textSecondary }]} numberOfLines={1}>
                    {h.username
                      ? `@${h.username}`
                      : `${h.address.slice(0, 6)}...${h.address.slice(-4)}`}
                  </Text>
                </View>
                <View style={styles.memberRight}>
                  <Text style={[styles.memberBalance, { color: c.textSecondary }]}>{h.balance}</Text>
                  <View style={styles.memberBarContainer}>
                    <View style={[styles.memberBarBg, { backgroundColor: c.border }]}>
                      <View
                        style={[
                          styles.memberBarFill,
                          {
                            width: `${Math.min(h.percent, 100)}%`,
                            backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.memberPercent, { color: c.textTertiary }]}>
                      {h.percent.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptySection}>
              <Text style={[styles.emptyText, { color: c.textTertiary }]}>No member data</Text>
            </View>
          )}
        </View>

        {/* ============ Active Proposals ============ */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: c.textTertiary }]}>ACTIVE PROPOSALS</Text>
            <TouchableOpacity onPress={() => router.push(`/business/${businessId}/proposals` as never)}>
              <Text style={styles.createLink}>Create Proposal</Text>
            </TouchableOpacity>
          </View>

          {activeProposals.length > 0 ? (
            activeProposals.map((p) => {
              const totalVotes = p.forVotes + p.againstVotes;
              const forPct = totalVotes > 0 ? (p.forVotes / totalVotes) * 100 : 0;
              const againstPct = totalVotes > 0 ? (p.againstVotes / totalVotes) * 100 : 0;
              const quorumMet = isQuorumReached(p.forVotes, p.totalSupply, business.quorumThreshold);
              const deadline = new Date(p.deadline * 1000);
              const timeLeft = deadline.getTime() - Date.now();
              const hoursLeft = Math.max(0, Math.floor(timeLeft / 3600000));

              return (
                <View
                  key={p.id}
                  style={[styles.proposalCard, { backgroundColor: c.background, borderColor: c.border }]}
                >
                  <View style={styles.proposalHeader}>
                    <View style={styles.proposalLeft}>
                      <View style={styles.proposalIdBadge}>
                        <Text style={styles.proposalIdText}>#{p.id}</Text>
                      </View>
                      <Text style={[styles.proposalType, { color: c.textTertiary }]}>
                        {p.type.replace(/_/g, ' ').toLowerCase()}
                      </Text>
                    </View>
                    <Text style={[styles.proposalTime, { color: c.textTertiary }]}>
                      {hoursLeft > 0 ? `${hoursLeft}h left` : 'Ended'}
                    </Text>
                  </View>

                  {/* Voting bars */}
                  <View style={styles.votingBars}>
                    <View style={styles.voteRow}>
                      <Text style={styles.voteForLabel}>For</Text>
                      <View style={[styles.voteBarBg, { backgroundColor: c.border }]}>
                        <View style={[styles.voteBarFill, { width: `${forPct}%`, backgroundColor: '#22c55e' }]} />
                      </View>
                      <Text style={[styles.voteCount, { color: c.textTertiary }]}>{p.forVotes}</Text>
                    </View>
                    <View style={styles.voteRow}>
                      <Text style={styles.voteAgainstLabel}>Against</Text>
                      <View style={[styles.voteBarBg, { backgroundColor: c.border }]}>
                        <View
                          style={[styles.voteBarFill, { width: `${againstPct}%`, backgroundColor: '#EF4444' }]}
                        />
                      </View>
                      <Text style={[styles.voteCount, { color: c.textTertiary }]}>{p.againstVotes}</Text>
                    </View>
                  </View>

                  {quorumMet && <Text style={styles.quorumText}>Quorum reached</Text>}
                </View>
              );
            })
          ) : (
            <View style={styles.emptySection}>
              <FontAwesome name="file-text-o" size={28} color={c.border} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyText, { color: c.textTertiary }]}>No active proposals</Text>
            </View>
          )}

          {proposals.length > activeProposals.length && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push(`/business/${businessId}/proposals` as never)}
            >
              <Text style={styles.viewAllText}>View All ({proposals.length})</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ============ Recent Activity ============ */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.textTertiary }]}>RECENT ACTIVITY</Text>

          {activities.length > 0 ? (
            activities.slice(0, 8).map((activity) => {
              const iconInfo = ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.created;
              return (
                <View key={activity.id} style={styles.activityRow}>
                  <View style={[styles.activityIcon, { backgroundColor: `${iconInfo.color}15` }]}>
                    <FontAwesome
                      name={iconInfo.icon as keyof typeof FontAwesome.glyphMap}
                      size={14}
                      color={iconInfo.color}
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={[styles.activityDesc, { color: c.textSecondary }]}>
                      {activity.description}
                    </Text>
                    <View style={styles.activityMeta}>
                      <Text style={[styles.activityTime, { color: c.textTertiary }]}>
                        {formatTimeAgo(activity.createdAt)}
                      </Text>
                      {activity.txHash ? (
                        <Text style={styles.activityTx}>
                          {activity.txHash.slice(0, 8)}...
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptySection}>
              <FontAwesome name="line-chart" size={28} color={c.border} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyText, { color: c.textTertiary }]}>No activity yet</Text>
            </View>
          )}
        </View>

        {/* ============ Settings ============ */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, marginBottom: vestingInfo ? 12 : 40 }]}>
          <Text style={[styles.sectionTitle, { color: c.textTertiary }]}>SETTINGS</Text>

          <SettingsRow
            label="Transfer Policy"
            value={business.transferPolicy === 'FREE' ? 'Free Transfer' : 'Approval Required'}
            colors={c}
            showBorder
          />
          <SettingsRow
            label="Quorum Threshold"
            value={`${(business.quorumThreshold / 100).toFixed(0)}%`}
            colors={c}
            showBorder
          />
          <SettingsRow
            label="Voting Period"
            value={formatVotingPeriod(business.votingPeriod)}
            colors={c}
            showBorder
          />
          <SettingsRow
            label="Vesting"
            value={
              business.vestingEnabled
                ? `${(business.vestingConfig as VestingDisplayConfig | undefined)?.cliffMonths ?? '?'}mo cliff, ${(business.vestingConfig as VestingDisplayConfig | undefined)?.durationMonths ?? '?'}mo duration`
                : 'Disabled'
            }
            colors={c}
            showBorder
          />
          <SettingsRow
            label="Dividends"
            value={
              business.dividendsEnabled
                ? `${(business.dividendsConfig as DividendDisplayConfig | undefined)?.percentage ?? '?'}% ${(business.dividendsConfig as DividendDisplayConfig | undefined)?.frequency ?? ''}`
                : 'Disabled'
            }
            colors={c}
            showBorder={false}
          />
        </View>

        {/* ============ Vesting Status ============ */}
        {vestingInfo && (
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, marginBottom: 40 }]}>
            <Text style={[styles.sectionTitle, { color: c.textTertiary }]}>VESTING STATUS</Text>

            <View style={styles.settingsRow}>
              <Text style={[styles.settingsLabel, { color: c.textTertiary }]}>Total Vesting</Text>
              <Text style={[styles.settingsValue, { color: c.textSecondary }]}>
                {vestingInfo.totalAmount} shares
              </Text>
            </View>
            <View style={styles.settingsRow}>
              <Text style={[styles.settingsLabel, { color: c.textTertiary }]}>Released</Text>
              <Text style={[styles.settingsValue, { color: '#22C55E' }]}>
                {vestingInfo.released} shares
              </Text>
            </View>
            <View style={styles.settingsRow}>
              <Text style={[styles.settingsLabel, { color: c.textTertiary }]}>Locked</Text>
              <Text style={[styles.settingsValue, { color: '#F59E0B' }]}>
                {lockedAmount} shares
              </Text>
            </View>
            <View style={styles.settingsRow}>
              <Text style={[styles.settingsLabel, { color: c.textTertiary }]}>Releasable Now</Text>
              <Text style={[styles.settingsValue, { color: '#3388FF' }]}>
                {releasableAmount} shares
              </Text>
            </View>

            {/* Timeline */}
            <View style={styles.vestingTimeline}>
              <View style={styles.vestingTimelineLabels}>
                <Text style={styles.vestingTimelineText}>
                  Cliff: {new Date(vestingInfo.cliffEnd * 1000).toLocaleDateString()}
                </Text>
                <Text style={styles.vestingTimelineText}>
                  End: {new Date(vestingInfo.vestingEnd * 1000).toLocaleDateString()}
                </Text>
              </View>
              {/* Progress bar */}
              <View style={styles.vestingBarBg}>
                <View
                  style={[
                    styles.vestingBarFill,
                    {
                      width: `${vestingInfo.totalAmount > 0 ? Math.min(((vestingInfo.totalAmount - lockedAmount) / vestingInfo.totalAmount) * 100, 100) : 0}%`,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Release button */}
            {releasableAmount > 0 && (
              <TouchableOpacity
                style={styles.releaseButton}
                onPress={handleRelease}
                disabled={releasing}
              >
                {releasing ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.releaseButtonText}>
                    Release {releasableAmount} shares
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// --------------------------------------------------
// Settings Row Sub-component
// --------------------------------------------------

function SettingsRow({
  label,
  value,
  colors: c,
  showBorder,
}: {
  label: string;
  value: string;
  colors: { textTertiary: string; textSecondary: string; border: string };
  showBorder: boolean;
}) {
  return (
    <View style={[styles.settingsRow, showBorder && { borderBottomWidth: 1, borderBottomColor: c.border }]}>
      <Text style={[styles.settingsLabel, { color: c.textTertiary }]}>{label}</Text>
      <Text style={[styles.settingsValue, { color: c.textSecondary }]}>{value}</Text>
    </View>
  );
}

// --------------------------------------------------
// Styles
// --------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 32 },

  // Error
  errorTitle: { fontSize: 18, fontWeight: '600', marginTop: 8 },
  errorSub: { fontSize: 14, textAlign: 'center' },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },

  // Card
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 12,
  },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(51,136,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: { flex: 1 },
  headerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  businessName: { fontSize: 20, fontWeight: '600' },
  symbolBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(51,136,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(51,136,255,0.2)',
  },
  symbolText: { fontSize: 10, fontFamily: 'monospace', color: '#3388FF' },
  description: { fontSize: 13, marginTop: 4 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  statLabel: { fontSize: 11 },
  statValue: { fontSize: 14, fontWeight: '600', marginTop: 2 },

  // Section
  sectionTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 16 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  // Treasury
  treasuryCenter: { alignItems: 'center', marginBottom: 16 },
  treasuryBalance: { fontSize: 28, fontWeight: '700' },
  treasuryCurrency: { fontSize: 12, marginTop: 2 },
  depositButton: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  depositButtonText: { color: '#22c55e', fontSize: 14, fontWeight: '600' },
  depositInfo: { marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  depositHint: { fontSize: 11, marginBottom: 8 },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  addressText: { flex: 1, fontSize: 11, fontFamily: 'monospace' },
  depositFootnote: { fontSize: 10, marginTop: 8 },

  // Members
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  memberLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  memberDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  memberName: { fontSize: 12, fontFamily: 'monospace' },
  memberRight: { alignItems: 'flex-end', marginLeft: 8 },
  memberBalance: { fontSize: 12, fontFamily: 'monospace' },
  memberBarContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  memberBarBg: { width: 64, height: 4, borderRadius: 2, overflow: 'hidden' },
  memberBarFill: { height: '100%', borderRadius: 2 },
  memberPercent: { fontSize: 10 },

  // Proposals
  createLink: { fontSize: 11, color: '#3388FF' },
  proposalCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8 },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  proposalLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  proposalIdBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.1)',
  },
  proposalIdText: { fontSize: 11, color: '#F59E0B' },
  proposalType: { fontSize: 11, textTransform: 'capitalize' },
  proposalTime: { fontSize: 10 },
  votingBars: { gap: 6, marginTop: 4 },
  voteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  voteForLabel: { fontSize: 10, color: '#22c55e', width: 42 },
  voteAgainstLabel: { fontSize: 10, color: '#EF4444', width: 42 },
  voteBarBg: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  voteBarFill: { height: '100%' },
  voteCount: { fontSize: 10, width: 28, textAlign: 'right' },
  quorumText: { fontSize: 10, color: '#22c55e', marginTop: 6 },
  viewAllButton: { marginTop: 8, paddingVertical: 8, alignItems: 'center' },
  viewAllText: { fontSize: 12, color: '#3388FF' },

  // Activity
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: { flex: 1 },
  activityDesc: { fontSize: 13 },
  activityMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  activityTime: { fontSize: 10 },
  activityTx: { fontSize: 10, color: '#3388FF', fontFamily: 'monospace' },

  // Settings
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingsLabel: { fontSize: 12 },
  settingsValue: { fontSize: 12 },

  // Vesting
  vestingTimeline: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  vestingTimelineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vestingTimelineText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
  },
  vestingBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  vestingBarFill: {
    height: '100%',
    backgroundColor: '#3388FF',
    borderRadius: 3,
  },
  releaseButton: {
    marginTop: 12,
    backgroundColor: '#3388FF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  releaseButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },

  // Empty
  emptySection: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { fontSize: 13 },
});
