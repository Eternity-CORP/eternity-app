import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import {
  getUserBusinesses,
  getShareBalance,
  createApiClient,
  type BusinessWallet,
} from '@e-y/shared';
import { useAppSelector } from '@/src/store/hooks';
import { getCurrentAccount, selectCurrentAccountType } from '@/src/store/slices/wallet-slice';
import { getTestnetProvider } from '@/src/services/network-service';
import { API_BASE_URL } from '@/src/config/api';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { ethersContractFactory } from '@/src/utils/contract-factory';

interface ShareInfo {
  businessId: string;
  businessName: string;
  tokenSymbol: string;
  shares: number;
  totalSupply: number;
  percent: number;
}

const apiClient = createApiClient({ baseUrl: API_BASE_URL });

export function SharesList() {
  const { theme: dynamicTheme } = useTheme();
  const wallet = useAppSelector((state) => state.wallet);
  const currentAccount = getCurrentAccount(wallet);
  const accountType = useAppSelector(selectCurrentAccountType);
  const [shares, setShares] = useState<ShareInfo[]>([]);

  useEffect(() => {
    if (!currentAccount?.address || accountType === 'business') {
      setShares([]);
      return;
    }

    let cancelled = false;
    const address = currentAccount.address;

    const fetchShares = async () => {
      try {
        const businesses = await getUserBusinesses(apiClient, address);
        if (cancelled || businesses.length === 0) {
          if (!cancelled) setShares([]);
          return;
        }

        const provider = getTestnetProvider('sepolia');
        const results: ShareInfo[] = [];

        await Promise.all(
          businesses.map(async (biz: BusinessWallet) => {
            try {
              const balance = await getShareBalance(
                ethersContractFactory,
                biz.contractAddress,
                provider,
                address,
              );
              if (balance > 0) {
                results.push({
                  businessId: biz.id,
                  businessName: biz.name,
                  tokenSymbol: biz.tokenSymbol,
                  shares: balance,
                  totalSupply: biz.tokenSupply,
                  percent: Math.round((balance / biz.tokenSupply) * 10000) / 100,
                });
              }
            } catch {
              // Skip this business if on-chain call fails
            }
          }),
        );

        if (!cancelled) setShares(results);
      } catch {
        if (!cancelled) setShares([]);
      }
    };

    fetchShares();
    return () => { cancelled = true; };
  }, [currentAccount?.address, accountType]);

  if (shares.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: dynamicTheme.colors.textSecondary }]}>
        Business Shares
      </Text>

      {shares.map((s) => (
        <TouchableOpacity
          key={s.businessId}
          style={[styles.shareItem, { backgroundColor: dynamicTheme.colors.surface }]}
          onPress={() => router.push(`/business/${s.businessId}` as any)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#3388FF20' }]}>
            <Text style={styles.iconText}>{s.tokenSymbol.charAt(0)}</Text>
          </View>
          <View style={styles.shareInfo}>
            <Text style={[styles.shareName, { color: dynamicTheme.colors.textPrimary }]}>
              {s.tokenSymbol}
            </Text>
            <Text style={[styles.businessName, { color: dynamicTheme.colors.textSecondary }]}>
              {s.businessName}
            </Text>
          </View>
          <View style={styles.shareBalance}>
            <Text style={[styles.shareValue, { color: dynamicTheme.colors.textPrimary }]}>
              {s.shares.toLocaleString()}
            </Text>
            <Text style={styles.sharePercent}>{s.percent}% ownership</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  shareItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3388FF40',
  },
  iconText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3388FF',
  },
  shareInfo: {
    flex: 1,
  },
  shareName: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  businessName: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  shareBalance: {
    alignItems: 'flex-end',
  },
  shareValue: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  sharePercent: {
    ...theme.typography.caption,
    color: '#3388FF',
  },
});
