/**
 * Split Bill Create - Step 3: Split Mode Selection
 */

import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { setSplitMode, setStep } from '@/src/store/slices/split-create-slice';
import type { SplitMode } from '@/src/store/slices/split-create-slice';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { formatAmount } from '@/src/utils/format';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

interface ModeOption {
  id: SplitMode;
  title: string;
  description: string;
  icon: string;
}

const MODES: ModeOption[] = [
  {
    id: 'equal',
    title: 'Equal Split',
    description: 'Split the total equally among all participants',
    icon: 'equals',
  },
  {
    id: 'custom',
    title: 'Custom Amounts',
    description: 'Set specific amounts for each participant',
    icon: 'sliders',
  },
  {
    id: 'percentage',
    title: 'By Percentage',
    description: 'Assign percentages to each participant',
    icon: 'pie-chart',
  },
];

export default function SplitModeScreen() {
  const dispatch = useAppDispatch();
  const { theme: dynamicTheme } = useTheme();
  const splitCreate = useAppSelector((state) => state.splitCreate);

  const handleModeSelect = (mode: SplitMode) => {
    dispatch(setSplitMode(mode));
    dispatch(setStep('participants'));
    router.push('/split/create/participants');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Split Bill" />

      <View style={styles.container}>
        <Text style={[styles.stepIndicator, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
          Step 3 of 6
        </Text>
        <Text style={[styles.subtitle, theme.typography.heading, { color: dynamicTheme.colors.textPrimary }]}>
          How do you want to split?
        </Text>

        <View style={[styles.amountSummary, { backgroundColor: dynamicTheme.colors.surface }]}>
          <Text style={[styles.amountLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
            Total Amount
          </Text>
          <Text style={[styles.amountValue, theme.typography.title, { color: dynamicTheme.colors.textPrimary }]}>
            {formatAmount(splitCreate.totalAmount)} {splitCreate.selectedToken}
          </Text>
        </View>

        <View style={styles.modeList}>
          {MODES.map((mode) => (
            <TouchableOpacity
              key={mode.id}
              style={[styles.modeItem, { backgroundColor: dynamicTheme.colors.surface }]}
              onPress={() => handleModeSelect(mode.id)}
            >
              <View style={[styles.modeIcon, { backgroundColor: dynamicTheme.colors.surfaceHover }]}>
                <FontAwesome
                  name={mode.icon as any}
                  size={24}
                  color={dynamicTheme.colors.textPrimary}
                />
              </View>
              <View style={styles.modeContent}>
                <Text style={[styles.modeTitle, theme.typography.heading, { color: dynamicTheme.colors.textPrimary }]}>
                  {mode.title}
                </Text>
                <Text style={[styles.modeDescription, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                  {mode.description}
                </Text>
              </View>
              <FontAwesome name="chevron-right" size={16} color={dynamicTheme.colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    padding: theme.spacing.xl,
  },
  stepIndicator: {
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xl,
  },
  amountSummary: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  amountLabel: {
    marginBottom: theme.spacing.xs,
  },
  amountValue: {
    color: theme.colors.textPrimary,
  },
  modeList: {
    gap: theme.spacing.md,
  },
  modeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.md,
  },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeContent: {
    flex: 1,
  },
  modeTitle: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs / 2,
  },
  modeDescription: {
    // Styled inline
  },
});
