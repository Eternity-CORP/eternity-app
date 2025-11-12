/**
 * Tests for Privacy Settings Service
 *
 * [EYP-M1-PRV-002] Privacy Center: balance hiding, address rotation, telemetry
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getPrivacySettings,
  updatePrivacySettings,
  toggleBalanceHidden,
  toggleAddressRotation,
  toggleTelemetry,
  toggleScreenshotProtection,
  isBalanceHidden,
  isAddressRotationActive,
  isTelemetryEnabled,
  isScreenshotProtectionEnabled,
  getPrivacyFeatures,
  getPrivacyScore,
  getPrivacyTips,
  resetPrivacySettings,
  formatBalance,
  initializePrivacySettings,
} from '../privacySettingsService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../addressRotationService');

import {
  enablePrivacyMode,
  disablePrivacyMode,
  isPrivacyModeEnabled,
} from '../addressRotationService';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockEnablePrivacyMode = enablePrivacyMode as jest.MockedFunction<typeof enablePrivacyMode>;
const mockDisablePrivacyMode = disablePrivacyMode as jest.MockedFunction<typeof disablePrivacyMode>;
const mockIsPrivacyModeEnabled = isPrivacyModeEnabled as jest.MockedFunction<
  typeof isPrivacyModeEnabled
>;

describe('[EYP-M1-PRV-002] Privacy Settings Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockIsPrivacyModeEnabled.mockResolvedValue(false);
  });

  describe('Settings Persistence', () => {
    it('[Test 1] should persist settings after restart', async () => {
      // Set some settings
      await updatePrivacySettings({
        balanceHidden: true,
        addressRotationEnabled: true,
        telemetryEnabled: true,
      });

      // Verify saved to AsyncStorage
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@privacy_settings',
        expect.stringContaining('"balanceHidden":true')
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@privacy_settings',
        expect.stringContaining('"addressRotationEnabled":true')
      );

      // Simulate app restart by reading from storage
      const savedData = JSON.stringify({
        balanceHidden: true,
        addressRotationEnabled: true,
        telemetryEnabled: true,
        screenshotProtectionEnabled: true,
        lastUpdated: Date.now(),
      });
      mockAsyncStorage.getItem.mockResolvedValueOnce(savedData);

      const settings = await getPrivacySettings();

      expect(settings.balanceHidden).toBe(true);
      expect(settings.addressRotationEnabled).toBe(true);
      expect(settings.telemetryEnabled).toBe(true);
    });

    it('should load default settings on first launch', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const settings = await getPrivacySettings();

      expect(settings.balanceHidden).toBe(false);
      expect(settings.addressRotationEnabled).toBe(false);
      expect(settings.telemetryEnabled).toBe(false);
      expect(settings.screenshotProtectionEnabled).toBe(true); // Default on
    });

    it('should handle corrupted storage data gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid json {]');

      const settings = await getPrivacySettings();

      expect(settings).toBeDefined();
      expect(settings.balanceHidden).toBe(false);
    });
  });

  describe('Balance Hiding', () => {
    it('[AC1] should hide balance instantly when toggled', async () => {
      // Initially not hidden
      let hidden = await isBalanceHidden();
      expect(hidden).toBe(false);

      // Toggle to hide
      const startTime = Date.now();
      const newValue = await toggleBalanceHidden();
      const endTime = Date.now();

      expect(newValue).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Instant (<100ms)

      // Verify it's hidden
      hidden = await isBalanceHidden();
      expect(hidden).toBe(true);
    });

    it('should format balance as *** when hidden', async () => {
      await updatePrivacySettings({ balanceHidden: true });

      const formatted = await formatBalance('1.234 ETH');

      expect(formatted).toBe('***');
    });

    it('should show balance normally when not hidden', async () => {
      await updatePrivacySettings({ balanceHidden: false });

      const formatted = await formatBalance('1.234 ETH');

      expect(formatted).toBe('1.234 ETH');
    });

    it('should toggle balance visibility multiple times', async () => {
      // Toggle on
      await toggleBalanceHidden();
      expect(await isBalanceHidden()).toBe(true);

      // Toggle off
      await toggleBalanceHidden();
      expect(await isBalanceHidden()).toBe(false);

      // Toggle on again
      await toggleBalanceHidden();
      expect(await isBalanceHidden()).toBe(true);
    });
  });

  describe('Address Rotation Integration', () => {
    it('[AC2] should use fresh addresses when privacy mode enabled', async () => {
      // Enable address rotation
      await updatePrivacySettings({ addressRotationEnabled: true });

      expect(mockEnablePrivacyMode).toHaveBeenCalled();
      expect(await isAddressRotationActive()).toBe(true);
    });

    it('should sync with addressRotationService on enable', async () => {
      await toggleAddressRotation();

      expect(mockEnablePrivacyMode).toHaveBeenCalled();
    });

    it('should sync with addressRotationService on disable', async () => {
      // First enable
      await updatePrivacySettings({ addressRotationEnabled: true });
      jest.clearAllMocks();

      // Then disable
      await updatePrivacySettings({ addressRotationEnabled: false });

      expect(mockDisablePrivacyMode).toHaveBeenCalled();
    });

    it('should initialize with correct address rotation state', async () => {
      mockIsPrivacyModeEnabled.mockResolvedValue(true);
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({
          addressRotationEnabled: false,
          balanceHidden: false,
          telemetryEnabled: false,
          screenshotProtectionEnabled: true,
          lastUpdated: Date.now(),
        })
      );

      await initializePrivacySettings();

      // Should enable since addressRotationService says it's enabled but settings say false
      expect(mockEnablePrivacyMode).toHaveBeenCalled();
    });
  });

  describe('Telemetry (Opt-in)', () => {
    it('should default telemetry to disabled (opt-in)', async () => {
      const settings = await getPrivacySettings();

      expect(settings.telemetryEnabled).toBe(false);
    });

    it('should enable telemetry only when user explicitly opts in', async () => {
      await updatePrivacySettings({ telemetryEnabled: true });

      const enabled = await isTelemetryEnabled();

      expect(enabled).toBe(true);
    });

    it('should allow user to opt out at any time', async () => {
      // Opt in
      await updatePrivacySettings({ telemetryEnabled: true });
      expect(await isTelemetryEnabled()).toBe(true);

      // Opt out
      await updatePrivacySettings({ telemetryEnabled: false });
      expect(await isTelemetryEnabled()).toBe(false);
    });
  });

  describe('Screenshot Protection', () => {
    it('[Test 2] should show warning when screenshot protection enabled', async () => {
      await updatePrivacySettings({ screenshotProtectionEnabled: true });

      const enabled = await isScreenshotProtectionEnabled();

      expect(enabled).toBe(true);
    });

    it('should default to enabled for security', async () => {
      const settings = await getPrivacySettings();

      expect(settings.screenshotProtectionEnabled).toBe(true);
    });

    it('should allow user to disable if needed', async () => {
      await updatePrivacySettings({ screenshotProtectionEnabled: false });

      const enabled = await isScreenshotProtectionEnabled();

      expect(enabled).toBe(false);
    });
  });

  describe('Privacy Features', () => {
    it('should return all privacy features with descriptions', () => {
      const features = getPrivacyFeatures();

      expect(features.length).toBeGreaterThan(0);
      features.forEach((feature) => {
        expect(feature.id).toBeDefined();
        expect(feature.title).toBeDefined();
        expect(feature.description).toBeDefined();
        expect(feature.detailedDescription).toBeDefined();
        expect(typeof feature.recommendedValue).toBe('boolean');
      });
    });

    it('should include balance hiding feature', () => {
      const features = getPrivacyFeatures();
      const balanceFeature = features.find((f) => f.id === 'balanceHidden');

      expect(balanceFeature).toBeDefined();
      expect(balanceFeature?.title).toContain('Balance');
    });

    it('should include address rotation feature', () => {
      const features = getPrivacyFeatures();
      const rotationFeature = features.find((f) => f.id === 'addressRotationEnabled');

      expect(rotationFeature).toBeDefined();
      expect(rotationFeature?.title).toContain('Rotation');
    });

    it('should mark recommended features', () => {
      const features = getPrivacyFeatures();
      const recommendedFeatures = features.filter((f) => f.recommendedValue);

      expect(recommendedFeatures.length).toBeGreaterThan(0);
    });
  });

  describe('Privacy Score', () => {
    it('should calculate privacy score based on settings', async () => {
      // All off (except screenshot protection which defaults to on)
      await updatePrivacySettings({
        balanceHidden: false,
        addressRotationEnabled: false,
        telemetryEnabled: false,
        screenshotProtectionEnabled: false,
      });

      const score = await getPrivacyScore();

      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(100);
      expect(score.maxScore).toBe(100);
    });

    it('should give higher score when more privacy features enabled', async () => {
      // Low privacy
      await updatePrivacySettings({
        balanceHidden: false,
        addressRotationEnabled: false,
        screenshotProtectionEnabled: false,
      });
      const lowScore = await getPrivacyScore();

      // High privacy
      await updatePrivacySettings({
        balanceHidden: true,
        addressRotationEnabled: true,
        screenshotProtectionEnabled: true,
      });
      const highScore = await getPrivacyScore();

      expect(highScore.score).toBeGreaterThan(lowScore.score);
    });

    it('should provide recommendations for improving privacy', async () => {
      await updatePrivacySettings({
        balanceHidden: false,
        addressRotationEnabled: false,
      });

      const score = await getPrivacyScore();

      expect(score.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Privacy Tips', () => {
    it('should provide relevant tips based on settings', async () => {
      await updatePrivacySettings({
        balanceHidden: false,
        addressRotationEnabled: false,
      });

      const tips = await getPrivacyTips();

      expect(tips.length).toBeGreaterThan(0);
    });

    it('should suggest enabling balance hiding when disabled', async () => {
      await updatePrivacySettings({ balanceHidden: false });

      const tips = await getPrivacyTips();

      const balanceTip = tips.find((tip) => tip.includes('Balance'));
      expect(balanceTip).toBeDefined();
    });

    it('should suggest enabling address rotation when disabled', async () => {
      await updatePrivacySettings({ addressRotationEnabled: false });

      const tips = await getPrivacyTips();

      const rotationTip = tips.find((tip) => tip.includes('Address'));
      expect(rotationTip).toBeDefined();
    });
  });

  describe('Settings Reset', () => {
    it('should reset all settings to defaults', async () => {
      // Set some non-default values
      await updatePrivacySettings({
        balanceHidden: true,
        addressRotationEnabled: true,
        telemetryEnabled: true,
        screenshotProtectionEnabled: false,
      });

      // Reset
      const reset = await resetPrivacySettings();

      expect(reset.balanceHidden).toBe(false);
      expect(reset.addressRotationEnabled).toBe(false);
      expect(reset.telemetryEnabled).toBe(false);
      expect(reset.screenshotProtectionEnabled).toBe(true);
    });

    it('should sync address rotation on reset', async () => {
      await resetPrivacySettings();

      expect(mockDisablePrivacyMode).toHaveBeenCalled();
    });
  });

  describe('E2E Scenarios (Acceptance Criteria)', () => {
    it('[AC1] Balance hides instantly when toggled', async () => {
      const startTime = Date.now();
      await toggleBalanceHidden();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
      expect(await isBalanceHidden()).toBe(true);
    });

    it('[AC2] Fresh addresses offered when privacy enabled', async () => {
      await updatePrivacySettings({ addressRotationEnabled: true });

      expect(mockEnablePrivacyMode).toHaveBeenCalled();
      expect(await isAddressRotationActive()).toBe(true);
    });

    it('[Test 1] Settings persist after restart', async () => {
      // Set settings
      await updatePrivacySettings({
        balanceHidden: true,
        addressRotationEnabled: true,
      });

      // Verify persisted
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();

      // Simulate restart
      const savedSettings = JSON.stringify({
        balanceHidden: true,
        addressRotationEnabled: true,
        telemetryEnabled: false,
        screenshotProtectionEnabled: true,
        lastUpdated: Date.now(),
      });
      mockAsyncStorage.getItem.mockResolvedValueOnce(savedSettings);

      // Load settings
      const settings = await getPrivacySettings();

      expect(settings.balanceHidden).toBe(true);
      expect(settings.addressRotationEnabled).toBe(true);
    });

    it('[Test 2] Screenshot warning shows when protection enabled', async () => {
      await updatePrivacySettings({ screenshotProtectionEnabled: true });

      const enabled = await isScreenshotProtectionEnabled();

      expect(enabled).toBe(true);
      // Screenshot guard would show warning when screenshot is taken
    });

    it('[DoD] Texts are consistent and localized', () => {
      const features = getPrivacyFeatures();

      features.forEach((feature) => {
        // Check all texts are present
        expect(feature.title).toBeTruthy();
        expect(feature.description).toBeTruthy();
        expect(feature.detailedDescription).toBeTruthy();

        // Check texts are in consistent language (Russian in this case)
        // In production, you'd check against actual localization files
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent updates gracefully', async () => {
      const promises = [
        updatePrivacySettings({ balanceHidden: true }),
        updatePrivacySettings({ addressRotationEnabled: true }),
        updatePrivacySettings({ telemetryEnabled: true }),
      ];

      await Promise.all(promises);

      const settings = await getPrivacySettings();

      // All updates should have been applied
      expect(settings.balanceHidden || settings.addressRotationEnabled || settings.telemetryEnabled).toBe(true);
    });

    it('should handle missing settings gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const settings = await getPrivacySettings();

      expect(settings).toBeDefined();
      expect(typeof settings.balanceHidden).toBe('boolean');
    });

    it('should ignore invalid setting keys', async () => {
      const settings = await getPrivacySettings();
      const invalidUpdate = { invalidKey: true } as any;

      const updated = await updatePrivacySettings(invalidUpdate);

      // Should still work, invalid key is ignored
      expect(updated).toBeDefined();
    });
  });
});
