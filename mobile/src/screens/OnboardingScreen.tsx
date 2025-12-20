import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import SafeScreen from '../components/common/SafeScreen';
import Button from '../components/common/Button';
import { useTheme } from '../context/ThemeContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const { width } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }: Props) {
  const { theme } = useTheme();

  const handleCreateWallet = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    navigation.navigate('CreateWallet');
  };

  const handleImportWallet = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    navigation.navigate('ImportWallet');
  };

  return (
    <SafeScreen gradient gradientColors={['#0D0D0D', '#1A1A2E']}>
      <View style={styles.container}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoContainer}
          >
            <Ionicons name="diamond" size={48} color="#FFFFFF" />
          </LinearGradient>
          
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Eternity Wallet
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Your gateway to decentralized finance
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <FeatureItem
            icon="shield-checkmark"
            title="Secure & Private"
            description="Your keys, your crypto"
            theme={theme}
          />
          <FeatureItem
            icon="flash"
            title="Fast Transactions"
            description="Send & receive instantly"
            theme={theme}
          />
          <FeatureItem
            icon="globe"
            title="Multi-Chain"
            description="Support for multiple networks"
            theme={theme}
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title="Create New Wallet"
            variant="primary"
            onPress={handleCreateWallet}
            style={styles.primaryButton}
          />
          
          <TouchableOpacity
            style={[styles.outlineButton, { borderColor: theme.colors.border }]}
            onPress={handleImportWallet}
            activeOpacity={0.7}
          >
            <Text style={[styles.outlineButtonText, { color: theme.colors.text }]}>
              I Already Have a Wallet
            </Text>
          </TouchableOpacity>
        </View>

        {/* Terms */}
        <Text style={[styles.terms, { color: theme.colors.muted }]}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </SafeScreen>
  );
}

type FeatureItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  theme: any;
};

function FeatureItem({ icon, title, description, theme }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: `${theme.colors.primary}20` }]}>
        <Ionicons name={icon} size={24} color={theme.colors.primary} />
      </View>
      <View style={styles.featureText}>
        <Text style={[styles.featureTitle, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresContainer: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    width: '100%',
  },
  outlineButton: {
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  outlineButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  terms: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
});
