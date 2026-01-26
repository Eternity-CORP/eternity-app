/**
 * Privacy Settings Screen
 */

import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import { setSplitRequestsFrom, saveSettingsThunk, type SplitRequestsFrom } from '@/src/store/slices/settings-slice';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';

const OPTIONS: { value: SplitRequestsFrom; label: string; description: string }[] = [
  { value: 'anyone', label: 'Anyone', description: 'Anyone can send you split bill requests' },
  { value: 'contacts', label: 'Contacts only', description: 'Only people you\'ve transacted with before' },
  { value: 'none', label: 'No one', description: 'Block all incoming split bill requests' },
];

export default function PrivacySettingsScreen() {
  const dispatch = useAppDispatch();
  const { theme: dynamicTheme } = useTheme();
  const settings = useAppSelector((state) => state.settings);
  const wallet = useAppSelector((state) => state.wallet);
  const currentAccount = getCurrentAccount(wallet);

  const handleSelect = (value: SplitRequestsFrom) => {
    dispatch(setSplitRequestsFrom(value));
    dispatch(saveSettingsThunk({
      settings: { splitRequestsFrom: value },
      walletAddress: currentAccount?.address,
    }));
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Privacy" />

      <View style={styles.container}>
        <Text style={[styles.sectionTitle, theme.typography.heading, { color: dynamicTheme.colors.textPrimary }]}>
          Split Bill Requests
        </Text>
        <Text style={[styles.sectionDesc, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
          Who can send you split bill requests
        </Text>

        <View style={styles.optionsList}>
          {OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.optionItem, { backgroundColor: dynamicTheme.colors.surface }]}
              onPress={() => handleSelect(option.value)}
            >
              <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                  {option.label}
                </Text>
                <Text style={[styles.optionDesc, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                  {option.description}
                </Text>
              </View>
              <View style={[styles.radio, { borderColor: dynamicTheme.colors.textTertiary }, settings.splitRequestsFrom === option.value && { borderColor: dynamicTheme.colors.accent }]}>
                {settings.splitRequestsFrom === option.value && (
                  <View style={[styles.radioInner, { backgroundColor: dynamicTheme.colors.accent }]} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, padding: theme.spacing.xl },
  sectionTitle: { color: theme.colors.textPrimary, marginBottom: theme.spacing.xs },
  sectionDesc: { marginBottom: theme.spacing.lg },
  optionsList: { gap: theme.spacing.sm },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  optionContent: { flex: 1 },
  optionLabel: { color: theme.colors.textPrimary, marginBottom: 2 },
  optionDesc: {},
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: theme.colors.accent },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.accent,
  },
});
