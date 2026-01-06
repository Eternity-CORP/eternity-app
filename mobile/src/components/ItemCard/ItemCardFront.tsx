import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { styles, RISK_COLORS, RISK_HEADERS, RISK_ICONS } from './styles';
import { useTheme } from '../../context/ThemeContext';

export interface TransactionIntent {
  recipient: string;
  recipientAddress: string;
  amount: string;
  tokenSymbol: string;
  fiatAmount: string;
  fee: string;
  network: string;
}

interface ItemCardFrontProps {
  transaction: TransactionIntent;
  riskLevel: 'safe' | 'caution' | 'warning';
  onFlip: () => void;
  animatedStyle: any;
}

export const ItemCardFront: React.FC<ItemCardFrontProps> = ({
  transaction,
  riskLevel,
  onFlip,
  animatedStyle,
}) => {
  const { theme } = useTheme();
  const colors = RISK_COLORS[riskLevel];
  const headerText = RISK_HEADERS[riskLevel];
  const iconName = RISK_ICONS[riskLevel] as keyof typeof Ionicons.glyphMap;

  const truncateAddress = (address: string): string => {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Animated.View
      style={[
        styles.cardFace,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
        animatedStyle,
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name={iconName} size={20} color={colors.primary} />
        <Text style={[styles.headerText, { color: colors.primary }]}>
          {headerText}
        </Text>
      </View>

      {/* Recipient */}
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.colors.text }]}>To</Text>
        <Text style={[styles.value, { color: theme.colors.text }]}>
          {transaction.recipient}
        </Text>
        <Text style={[styles.addressPreview, { color: theme.colors.text }]}>
          ({truncateAddress(transaction.recipientAddress)})
        </Text>
      </View>

      {/* Amount */}
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Amount</Text>
        <View style={styles.amountRow}>
          <Text style={[styles.value, { color: theme.colors.text }]}>
            {transaction.amount} {transaction.tokenSymbol}
          </Text>
        </View>
        <Text style={[styles.subValue, { color: theme.colors.text }]}>
          (~{transaction.fiatAmount})
        </Text>
      </View>

      {/* Fee & Network */}
      <View style={styles.feeNetworkRow}>
        <View>
          <Text style={[styles.label, { color: theme.colors.text }]}>Fee</Text>
          <Text style={[styles.subValue, { color: theme.colors.text }]}>
            ~{transaction.fee}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Network</Text>
          <Text style={[styles.subValue, { color: theme.colors.text }]}>
            {transaction.network}
          </Text>
        </View>
      </View>

      {/* Flip Hint */}
      <View style={styles.flipHint}>
        <TouchableOpacity style={styles.flipHintButton} onPress={onFlip}>
          <Text style={[styles.flipHintText, { color: theme.colors.text }]}>
            Tap to see details
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};
