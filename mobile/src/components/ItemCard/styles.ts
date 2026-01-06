import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;
const CARD_HEIGHT = 320;

export const RISK_COLORS = {
  safe: {
    primary: '#22C55E',
    background: 'rgba(34, 197, 94, 0.1)',
    border: 'rgba(34, 197, 94, 0.3)',
  },
  caution: {
    primary: '#EAB308',
    background: 'rgba(234, 179, 8, 0.1)',
    border: 'rgba(234, 179, 8, 0.3)',
  },
  warning: {
    primary: '#EF4444',
    background: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.3)',
  },
};

export const RISK_HEADERS = {
  safe: 'SAFE TRANSACTION',
  caution: 'REVIEW CAREFULLY',
  warning: 'HIGH RISK',
};

export const RISK_ICONS = {
  safe: 'shield-checkmark',
  caution: 'alert-circle',
  warning: 'warning',
};

export const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignSelf: 'center',
  },
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  row: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 2,
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
  },
  subValue: {
    fontSize: 14,
    opacity: 0.7,
  },
  addressPreview: {
    fontSize: 12,
    opacity: 0.5,
    fontFamily: 'monospace',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  feeNetworkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  flipHint: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  flipHintButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  flipHintText: {
    fontSize: 12,
    opacity: 0.6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  statsLabel: {
    fontSize: 14,
    opacity: 0.6,
  },
  statsValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    color: '#22C55E',
    fontWeight: '500',
  },
});
