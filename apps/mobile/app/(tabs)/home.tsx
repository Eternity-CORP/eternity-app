import { StyleSheet, View, Text } from 'react-native';
import { theme } from '@/src/constants/theme';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={[styles.title, theme.typography.displayLarge]}>
        $0.00
      </Text>
      <Text style={[styles.subtitle, theme.typography.caption, { color: theme.colors.textSecondary }]}>
        Total Balance
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  title: {
    color: theme.colors.textPrimary,
  },
  subtitle: {
    marginTop: theme.spacing.sm,
  },
});
