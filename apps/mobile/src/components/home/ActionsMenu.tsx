import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';

interface ActionsMenuProps {
  visible: boolean;
  slideAnim: Animated.Value;
  onClose: () => void;
  onCopyAddress: () => void;
  isTestAccount?: boolean;
  onOpenFaucet?: () => void;
}

export function ActionsMenu({ visible, slideAnim, onClose, onCopyAddress, isTestAccount, onOpenFaucet }: ActionsMenuProps) {
  const { theme: dynamicTheme, isDark } = useTheme();

  if (!visible) return null;

  const menuItems = [
    { icon: 'arrow-up' as const, label: 'Send', route: '/send/token', rotate: '45deg' },
    { icon: 'arrow-down' as const, label: 'Receive', route: '/receive', rotate: '-45deg' },
    { icon: 'bolt' as const, label: 'BLIK', route: '/blik' },
    { icon: 'calendar' as const, label: 'Scheduled', route: '/scheduled/create' },
    { icon: 'users' as const, label: 'Split Bill', route: '/split/create' },
    { icon: 'exchange' as const, label: 'Swap', route: '/swap' },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        activeOpacity={1}
      >
        <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.actionsMenuContainer,
          { transform: [{ translateY: slideAnim }] },
        ]}
        pointerEvents="box-none"
      >
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.actionMenuItem}
            onPress={() => { onClose(); router.push(item.route as any); }}
          >
            <View style={[styles.actionMenuIcon, { backgroundColor: dynamicTheme.colors.background }]}>
              <FontAwesome
                name={item.icon}
                size={20}
                color={dynamicTheme.colors.textPrimary}
                style={item.rotate ? { transform: [{ rotate: item.rotate }] } : undefined}
              />
            </View>
            <Text style={[styles.actionMenuText, { color: dynamicTheme.colors.textPrimary }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.actionMenuItem}
          onPress={() => { onClose(); onCopyAddress(); }}
        >
          <View style={[styles.actionMenuIcon, { backgroundColor: dynamicTheme.colors.background }]}>
            <FontAwesome name="copy" size={20} color={dynamicTheme.colors.textPrimary} />
          </View>
          <Text style={[styles.actionMenuText, { color: dynamicTheme.colors.textPrimary }]}>Copy Address</Text>
        </TouchableOpacity>

        {isTestAccount && onOpenFaucet && (
          <TouchableOpacity
            style={styles.actionMenuItem}
            onPress={() => { onClose(); onOpenFaucet(); }}
          >
            <View style={[styles.actionMenuIcon, { backgroundColor: dynamicTheme.colors.background }]}>
              <FontAwesome name="gift" size={20} color={dynamicTheme.colors.textPrimary} />
            </View>
            <Text style={[styles.actionMenuText, { color: dynamicTheme.colors.textPrimary }]}>Get Test Tokens</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionsMenuContainer: {
    position: 'absolute',
    left: theme.spacing.xl,
    bottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  actionMenuIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.medium,
  },
  actionMenuText: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
});
