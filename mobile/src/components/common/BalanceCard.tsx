import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { isBalanceHidden } from '../../services/privacySettingsService';

type Props = {
  amount: number; // in USD or selected currency
  currency?: string; // e.g., 'USD'
  subtitle?: string; // optional, e.g., "Portfolio Balance"
};

export default function BalanceCard({ amount, currency = 'USD', subtitle = 'Portfolio Balance' }: Props) {
  const { theme } = useTheme();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const checkHidden = async () => {
      const isHidden = await isBalanceHidden();
      setHidden(isHidden);
    };
    checkHidden();

    // Re-check every second (in case user toggles in privacy settings)
    const interval = setInterval(checkHidden, 1000);
    return () => clearInterval(interval);
  }, []);

  const displayAmount = hidden ? '***' : `$${amount.toFixed(2)}`;

  return (
    <LinearGradient
      colors={[theme.colors.primary, theme.colors.secondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { borderRadius: theme.radius.lg }]}
    >
      <Text style={[styles.subtitle, { color: '#fff', fontFamily: theme.typography.fontFamilies.medium }]}>{subtitle}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <Text style={[styles.amount, { color: '#fff', fontFamily: theme.typography.fontFamilies.bold }]}>{displayAmount}</Text>
        {!hidden && <Text style={[styles.currency, { color: '#fff', marginLeft: 8 }]}>{currency}</Text>}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 24, // More spacious
    // Soft shadow for depth
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  amount: {
    fontSize: 36, // Slightly larger
    letterSpacing: -0.5, // Tighter letter spacing for large numbers
  },
  currency: {
    fontSize: 18,
    opacity: 0.9,
    marginBottom: 4,
  },
});
