import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { styles, RISK_COLORS } from './styles';
import { useTheme } from '../../context/ThemeContext';

export interface TransactionStats {
  power: string;
  gasUnits: string;
  slippage?: string;
  isContractVerified: boolean;
  addressAge: string;
  previousTxCount: number;
}

interface ItemCardBackProps {
  stats: TransactionStats;
  riskLevel: 'safe' | 'caution' | 'warning';
  onFlip: () => void;
  animatedStyle: any;
}

export const ItemCardBack: React.FC<ItemCardBackProps> = ({
  stats,
  riskLevel,
  onFlip,
  animatedStyle,
}) => {
  const { theme } = useTheme();
  const colors = RISK_COLORS[riskLevel];

  const statsData = [
    { label: 'Power', value: stats.power },
    { label: 'Cost', value: `${stats.gasUnits} gas` },
    ...(stats.slippage ? [{ label: 'Slippage', value: stats.slippage }] : []),
    { 
      label: 'Contract', 
      value: stats.isContractVerified ? 'Verified' : 'Unverified',
      isVerified: stats.isContractVerified,
    },
    { label: 'Address', value: stats.addressAge },
    { label: 'Your TXs', value: `${stats.previousTxCount} previous` },
  ];

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
        <Ionicons name="stats-chart" size={20} color={colors.primary} />
        <Text style={[styles.headerText, { color: colors.primary }]}>
          TRANSACTION STATS
        </Text>
      </View>

      {/* Stats List */}
      {statsData.map((stat, index) => (
        <View key={index} style={styles.statsRow}>
          <Text style={[styles.statsLabel, { color: theme.colors.text }]}>
            {stat.label}
          </Text>
          {'isVerified' in stat ? (
            <View style={styles.verifiedBadge}>
              <Ionicons
                name={stat.isVerified ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={stat.isVerified ? '#22C55E' : '#EF4444'}
              />
              <Text
                style={[
                  styles.statsValue,
                  { color: stat.isVerified ? '#22C55E' : '#EF4444' },
                ]}
              >
                {stat.value}
              </Text>
            </View>
          ) : (
            <Text style={[styles.statsValue, { color: theme.colors.text }]}>
              {stat.value}
            </Text>
          )}
        </View>
      ))}

      {/* Flip Hint */}
      <View style={styles.flipHint}>
        <TouchableOpacity style={styles.flipHintButton} onPress={onFlip}>
          <Text style={[styles.flipHintText, { color: theme.colors.text }]}>
            Tap to go back
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};
