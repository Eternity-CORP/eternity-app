import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts';

export default function WelcomeScreen() {
  const { theme: dynamicTheme, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.container, { backgroundColor: dynamicTheme.colors.background }]}>
        {/* Logo + Title */}
        <View style={styles.hero}>
          <Image
            source={isDark
              ? require('../../assets/images/logo_white.png')
              : require('../../assets/images/logo_black.png')
            }
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: dynamicTheme.colors.textPrimary }]}>
            Eternity
          </Text>
          <Text style={[styles.subtitle, { color: dynamicTheme.colors.textTertiary }]}>
            AI-native self-custody wallet
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryButton, {
              backgroundColor: isDark ? '#FFFFFF' : '#000000',
            }]}
            onPress={() => router.push({
              pathname: '/(onboarding)/create-wallet',
              params: { accountType: 'real' },
            })}
            activeOpacity={0.85}
          >
            <FontAwesome
              name="plus"
              size={16}
              color={isDark ? '#000000' : '#FFFFFF'}
              style={styles.buttonIcon}
            />
            <Text style={[styles.primaryButtonText, {
              color: isDark ? '#000000' : '#FFFFFF',
            }]}>
              Create Wallet
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            }]}
            onPress={() => router.push('/(onboarding)/import-wallet')}
            activeOpacity={0.85}
          >
            <FontAwesome
              name="download"
              size={16}
              color={dynamicTheme.colors.textPrimary}
              style={styles.buttonIcon}
            />
            <Text style={[styles.secondaryButtonText, {
              color: dynamicTheme.colors.textPrimary,
            }]}>
              Import Existing
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 10,
  },
});
