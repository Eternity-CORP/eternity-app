/**
 * TokenList Component
 * List of available tokens for selection
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TokenIcon } from '@/src/components/TokenIcon';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

export interface TokenItem {
  symbol: string;
  name: string;
  balance: string;
  usdValue?: number;
  iconUrl?: string;
}

interface Props {
  tokens: TokenItem[];
  selectedSymbol?: string;
  onSelect: (symbol: string) => void;
}

export function TokenList({ tokens, selectedSymbol, onSelect }: Props) {
  return (
    <View style={styles.container}>
      {tokens.map((token) => (
        <TouchableOpacity
          key={token.symbol}
          style={[
            styles.tokenItem,
            selectedSymbol === token.symbol && styles.tokenItemSelected,
          ]}
          onPress={() => onSelect(token.symbol)}
        >
          <TokenIcon symbol={token.symbol} iconUrl={token.iconUrl} size={44} />
          <View style={styles.tokenInfo}>
            <Text style={[styles.tokenName, theme.typography.body]}>
              {token.name || token.symbol}
            </Text>
            <Text style={[styles.tokenBalance, theme.typography.caption, { color: theme.colors.textSecondary }]}>
              {parseFloat(token.balance).toFixed(4)} {token.symbol}
            </Text>
          </View>
          {selectedSymbol === token.symbol && (
            <FontAwesome name="check" size={18} color={theme.colors.accent} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  tokenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  tokenItemSelected: {
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenName: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  tokenBalance: {},
});
