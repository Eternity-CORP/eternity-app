import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainStackParamList } from '../navigation/MainNavigator';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/common/Card';
import {
  getPrivacySettings,
  updatePrivacySettings,
  getPrivacyFeatures,
  getPrivacyScore,
  getPrivacyTips,
  type PrivacySettings,
  type PrivacyFeature,
} from '../services/privacySettingsService';

type Props = NativeStackScreenProps<MainStackParamList, 'PrivacyCenter'>;

export default function PrivacyCenterScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [privacyScore, setPrivacyScore] = useState<number>(0);
  const [tips, setTips] = useState<string[]>([]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [currentSettings, score, privacyTips] = await Promise.all([
        getPrivacySettings(),
        getPrivacyScore(),
        getPrivacyTips(),
      ]);
      setSettings(currentSettings);
      setPrivacyScore(score.score);
      setTips(privacyTips);
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof PrivacySettings) => {
    if (!settings || typeof settings[key] !== 'boolean') return;

    try {
      setUpdating(key);
      const newValue = !settings[key];
      const updated = await updatePrivacySettings({ [key]: newValue });
      setSettings(updated);

      // Reload score and tips
      const [score, privacyTips] = await Promise.all([
        getPrivacyScore(),
        getPrivacyTips(),
      ]);
      setPrivacyScore(score.score);
      setTips(privacyTips);
    } catch (error) {
      console.error(`Failed to toggle ${key}:`, error);
    } finally {
      setUpdating(null);
    }
  };

  const features = getPrivacyFeatures();

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Privacy Center</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.muted }]}>
            Loading privacy settings...
          </Text>
        </View>
      </View>
    );
  }

  if (!settings) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {renderHeader()}
        <Card style={styles.errorCard}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Failed to load privacy settings
          </Text>
        </Card>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {renderHeader()}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
      {/* Privacy Score */}
      <Card>
        <View style={styles.scoreContainer}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Privacy Score</Text>
            <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
              Your current privacy level
            </Text>
          </View>
          <View style={styles.scoreCircle}>
            <Text style={[styles.scoreText, { color: getScoreColor(privacyScore, theme) }]}>
              {privacyScore}
            </Text>
            <Text style={[styles.scoreLabel, { color: theme.colors.muted }]}>/ 100</Text>
          </View>
        </View>
        <View style={[styles.progressBar, { backgroundColor: theme.colors.surface }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${privacyScore}%`,
                backgroundColor: getScoreColor(privacyScore, theme),
              },
            ]}
          />
        </View>
      </Card>

      {/* Privacy Tips */}
      {tips.length > 0 && (
        <Card style={styles.tipsCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Privacy Tips
          </Text>
          {tips.map((tip, index) => (
            <Text key={index} style={[styles.tip, { color: theme.colors.muted }]}>
              {tip}
            </Text>
          ))}
        </Card>
      )}

      {/* Privacy Features */}
      {features.map((feature) => (
        <PrivacyFeatureCard
          key={feature.id}
          feature={feature}
          enabled={settings[feature.id] as boolean}
          onToggle={() => handleToggle(feature.id)}
          updating={updating === feature.id}
          theme={theme}
        />
      ))}

      {/* Security Warnings */}
      <Card style={styles.warningsCard}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Security Reminders
        </Text>
        <Text style={[styles.warningText, { color: theme.colors.muted }]}>
          • Never share your seed phrase with anyone
          {'\n'}• Never store your seed phrase digitally
          {'\n'}• Do not take screenshots of sensitive information
          {'\n'}• Keep your device secure with a strong PIN/biometric
          {'\n'}• Regularly check for app updates
        </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

interface PrivacyFeatureCardProps {
  feature: PrivacyFeature;
  enabled: boolean;
  onToggle: () => void;
  updating: boolean;
  theme: any;
}

function PrivacyFeatureCard({
  feature,
  enabled,
  onToggle,
  updating,
  theme,
}: PrivacyFeatureCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card style={styles.featureCard}>
      <View style={styles.featureHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.featureTitleRow}>
            <Text style={[styles.featureTitle, { color: theme.colors.text }]}>
              {feature.title}
            </Text>
            {feature.isExperimental && (
              <View style={[styles.badge, { backgroundColor: theme.colors.primary + '20' }]}>
                <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
                  EXPERIMENTAL
                </Text>
              </View>
            )}
            {feature.recommendedValue && (
              <View style={[styles.badge, { backgroundColor: '#4CAF50' + '20' }]}>
                <Text style={[styles.badgeText, { color: '#4CAF50' }]}>
                  RECOMMENDED
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.featureDescription, { color: theme.colors.muted }]}>
            {feature.description}
          </Text>
        </View>
        {updating ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Switch
            value={enabled}
            onValueChange={onToggle}
            trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
            thumbColor={theme.colors.card}
          />
        )}
      </View>

      {/* Expand/Collapse Details */}
      <TouchableOpacity
        style={styles.expandButton}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={[styles.expandText, { color: theme.colors.primary }]}>
          {expanded ? 'Hide Details' : 'Show Details'}
        </Text>
        <Text style={[styles.expandIcon, { color: theme.colors.primary }]}>
          {expanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {/* Expanded Details */}
      {expanded && (
        <View style={[styles.detailsContainer, { borderTopColor: theme.colors.border }]}>
          <Text style={[styles.detailsText, { color: theme.colors.muted }]}>
            {feature.detailedDescription}
          </Text>
          {feature.requiresRestart && (
            <Text style={[styles.restartNote, { color: theme.colors.warning || '#FFA726' }]}>
              ⚠️ Requires app restart to take effect
            </Text>
          )}
        </View>
      )}
    </Card>
  );
}

function getScoreColor(score: number, theme: any): string {
  if (score >= 75) return '#4CAF50'; // Green
  if (score >= 50) return '#FFA726'; // Orange
  return '#EF5350'; // Red
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  errorCard: {
    marginHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  title: { fontSize: 16, fontWeight: '500', marginBottom: 4 },
  subtitle: { fontSize: 11, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionTitle: { fontSize: 12, fontWeight: '500', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  // Privacy Score
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreCircle: {
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 28,
    fontWeight: '500',
  },
  scoreLabel: {
    fontSize: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  // Tips
  tipsCard: {
    marginTop: 16,
  },
  tip: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 20,
  },
  // Feature Card
  featureCard: {
    marginTop: 16,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  featureDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    gap: 8,
  },
  expandText: {
    fontSize: 13,
    fontWeight: '500',
  },
  expandIcon: {
    fontSize: 10,
  },
  detailsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  detailsText: {
    fontSize: 13,
    lineHeight: 20,
  },
  restartNote: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Warnings
  warningsCard: {
    marginTop: 16,
    marginBottom: 32,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 20,
  },
});

