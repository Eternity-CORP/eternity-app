import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { useGhostMode } from '../../context/GhostModeContext';

interface HiddenValueProps {
  value: string | number;
  placeholder?: string;
  style?: TextStyle;
}

/**
 * Component that displays value or hidden placeholder based on Ghost Mode
 */
export const HiddenValue: React.FC<HiddenValueProps> = ({
  value,
  placeholder = '••••••',
  style,
}) => {
  const { isGhostMode } = useGhostMode();

  return (
    <Text style={[styles.value, style]}>
      {isGhostMode ? placeholder : value}
    </Text>
  );
};

/**
 * Hook to get masked value based on Ghost Mode
 */
export const useHiddenValue = (value: string | number, placeholder = '••••••'): string => {
  const { isGhostMode } = useGhostMode();
  return isGhostMode ? placeholder : String(value);
};

/**
 * Format a number as hidden if Ghost Mode is enabled
 */
export const formatHiddenAmount = (
  amount: string | number,
  isGhostMode: boolean,
  placeholder = '•••'
): string => {
  return isGhostMode ? placeholder : String(amount);
};

/**
 * Format currency as hidden if Ghost Mode is enabled
 */
export const formatHiddenCurrency = (
  amount: string | number,
  isGhostMode: boolean,
  currencySymbol = '$',
  placeholder = '••••••'
): string => {
  return isGhostMode ? `${currencySymbol}${placeholder}` : `${currencySymbol}${amount}`;
};

const styles = StyleSheet.create({
  value: {
    fontSize: 16,
  },
});

export default HiddenValue;
