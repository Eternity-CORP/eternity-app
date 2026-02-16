/**
 * Shared shard progress ref.
 * SlidePresentation updates this value,
 * GlobalShardScene reads it in useFrame.
 */
export const shardProgress = { current: 0 }
