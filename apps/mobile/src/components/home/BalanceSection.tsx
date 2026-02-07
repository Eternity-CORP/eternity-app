import { Text, StyleSheet } from 'react-native';
import { BalanceGridBackground } from '@/src/components/ui';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';

interface BalanceSectionProps {
  totalBalance: string;
  isLoading: boolean;
  lastUpdated: string | null;
}

export function BalanceSection({ totalBalance, isLoading, lastUpdated }: BalanceSectionProps) {
  const { theme: dynamicTheme } = useTheme();

  return (
    <BalanceGridBackground height={160}>
      <Text style={[styles.balance, { color: dynamicTheme.colors.textPrimary }]}>
        {isLoading && !lastUpdated ? '...' : totalBalance}
      </Text>
    </BalanceGridBackground>
  );
}

const styles = StyleSheet.create({
  balance: {
    fontSize: 52,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -1,
  },
});
