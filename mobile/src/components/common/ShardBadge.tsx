import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import ShardIcon from './ShardIcon';
import { useShards } from '../../features/shards/store/shardsSlice';
import { useWallet } from '../../context/WalletContext';
import { loginWithWallet } from '../../services/authService';
import { useShardAnimation } from '../../features/shards/ShardAnimationProvider';

type Props = {
  onPress?: () => void;
  showLabel?: boolean;
};

export default function ShardBadge({ onPress, showLabel = false }: Props) {
  const { theme } = useTheme();
  const { activeAccount } = useWallet();
  const totalShards = useShards((state) => state.totalShards);
  const loading = useShards((state) => state.loading);
  const lastEarnedAt = useShards((state) => state.lastEarnedAt);
  const loadShardState = useShards((state) => state.loadShardState);
  const { setTargetRef } = useShardAnimation();

  const scale = useSharedValue(1);
  const containerRef = useRef<View>(null);

  useEffect(() => {
    // Register this badge as the target for shard animations
    if (containerRef.current) {
      setTargetRef(containerRef.current);
    }
  }, [setTargetRef]);

  useEffect(() => {
    const syncShardState = async () => {
      const address = activeAccount?.address;
      if (!address) {
        // Don't make any API calls if we don't have an address
        return;
      }

      try {
        const token = await loginWithWallet(address);
        if (token) {
          await loadShardState({ authToken: token });
        }
        // If login fails, don't make unauthorized requests
      } catch (error) {
        console.warn('[ShardBadge] Failed to sync shard state:', error);
      }
    };

    syncShardState();
  }, [activeAccount?.address, loadShardState]);

  useEffect(() => {
    if (!lastEarnedAt) return;
    scale.value = withSequence(withSpring(1.08), withSpring(1));
  }, [lastEarnedAt, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.touch}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <Animated.View
        ref={containerRef}
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.accent,
          },
          animatedStyle,
        ]}
      >
        <ShardIcon size="small" />
        <View style={styles.textWrapper}>
          <Text
            style={[
              styles.value,
              {
                color: theme.colors.text,
                fontFamily: theme.typography.fontFamilies.bold,
              },
            ]}
          >
            {loading ? '—' : totalShards}
          </Text>
          {showLabel && (
            <Text
              style={[
                styles.label,
                {
                  color: theme.colors.muted,
                  fontFamily: theme.typography.fontFamilies.regular,
                },
              ]}
            >
              Shards
            </Text>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touch: {
    borderRadius: 999,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  textWrapper: {
    marginLeft: 6,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
  },
  label: {
    fontSize: 10,
    marginTop: -2,
  },
});
