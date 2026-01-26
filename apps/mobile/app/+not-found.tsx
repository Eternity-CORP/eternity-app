import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';

export default function NotFoundScreen() {
  const { theme: dynamicTheme } = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={[styles.container, { backgroundColor: dynamicTheme.colors.background }]}>
        <Text style={[styles.title, { color: dynamicTheme.colors.textPrimary }]}>This screen doesn't exist.</Text>
        <Link href="/(tabs)/home" style={styles.link}>
          <Text style={[styles.linkText, { color: dynamicTheme.colors.buttonPrimary }]}>Go to home screen</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
  },
  link: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  linkText: {
    ...theme.typography.body,
    color: theme.colors.buttonPrimary,
  },
});
