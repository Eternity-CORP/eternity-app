/**
 * Business Share Transfer Route
 */

import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useTheme } from '@/src/contexts';

export default function BusinessTransferScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme: dynamicTheme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Transfer Shares" />
      <View style={styles.content}>
        <Text style={[styles.text, { color: dynamicTheme.colors.textSecondary }]}>
          Coming soon
        </Text>
        <Text style={[styles.subtext, { color: dynamicTheme.colors.textTertiary }]}>
          Business: {id}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: 16,
  },
  subtext: {
    fontSize: 12,
  },
});
