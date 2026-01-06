import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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

  // Bittensor style - solid color, no gradient
  return (
    <View
      style={[
        styles.card, 
        { 
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.primary,
        }
      ]}
    >
      <Text style={[styles.subtitle, { color: theme.colors.background, fontFamily: theme.typography.fontFamilies.medium }]}>
        {subtitle.toUpperCase()}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <Text style={[styles.amount, { color: theme.colors.background, fontFamily: theme.typography.fontFamilies.bold }]}>
          {displayAmount}
        </Text>
        {!hidden && (
          <Text style={[styles.currency, { color: theme.colors.background, marginLeft: 8 }]}>
            {currency}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 24,
    // Bittensor style - no shadows
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  subtitle: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 8,
    letterSpacing: 1,
  },
  amount: {
    fontSize: 40,
    fontWeight: '600',
    letterSpacing: -1,
  },
  currency: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 6,
  },
});
