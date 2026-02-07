import { View, TouchableOpacity, Text, ScrollView, StyleSheet, Animated, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { FAUCETS, type FaucetInfo } from '@/src/constants/faucets';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FaucetSheetProps {
  visible: boolean;
  slideAnim: Animated.Value;
  fadeAnim: Animated.Value;
  onClose: () => void;
  onFaucetPress: (faucet: FaucetInfo) => void;
}

export function FaucetSheet({ visible, slideAnim, fadeAnim, onClose, onFaucetPress }: FaucetSheetProps) {
  const { theme: dynamicTheme, isDark } = useTheme();

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.blurOverlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose}>
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint={isDark ? 'dark' : 'light'} />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        style={[
          styles.faucetSheet,
          { backgroundColor: dynamicTheme.colors.surface, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={[styles.sheetHandle, { backgroundColor: dynamicTheme.colors.borderLight }]} />

        <View style={[styles.faucetSheetHeader, { borderBottomColor: dynamicTheme.colors.border }]}>
          <Text style={[styles.faucetSheetTitle, { color: dynamicTheme.colors.textPrimary }]}>Get Test Tokens</Text>
          <TouchableOpacity
            style={[styles.closeSheetButton, { backgroundColor: dynamicTheme.colors.background }]}
            onPress={onClose}
          >
            <FontAwesome name="times" size={18} color={dynamicTheme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.faucetSheetSubtitle, { color: dynamicTheme.colors.textSecondary }]}>
          Visit these faucets to get free test tokens for development
        </Text>

        <ScrollView style={styles.faucetList} showsVerticalScrollIndicator={false}>
          {FAUCETS.map((faucet) => (
            <TouchableOpacity
              key={faucet.networkId}
              style={styles.faucetItem}
              onPress={() => onFaucetPress(faucet)}
            >
              <View style={styles.faucetItemIcon}>
                <FontAwesome name="tint" size={20} color={theme.colors.accent} />
              </View>
              <View style={styles.faucetItemInfo}>
                <Text style={styles.faucetItemName}>{faucet.name}</Text>
                <Text style={styles.faucetItemDesc}>{faucet.description}</Text>
              </View>
              <FontAwesome name="external-link" size={14} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: theme.spacing.lg,
  },
  faucetSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl + 20,
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  faucetSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  faucetSheetTitle: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    fontSize: 18,
    flex: 1,
    textAlign: 'center',
    marginLeft: 36,
  },
  closeSheetButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faucetSheetSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  faucetList: {
    paddingHorizontal: theme.spacing.lg,
  },
  faucetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  faucetItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faucetItemInfo: {
    flex: 1,
  },
  faucetItemName: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  faucetItemDesc: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
});
