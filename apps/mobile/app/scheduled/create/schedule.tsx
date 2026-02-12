/**
 * Scheduled Payment Create - Step 4: Schedule Settings
 */

import { StyleSheet, View, Text, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { setSchedule, setStep } from '@/src/store/slices/scheduled-create-slice';
import { requestNotificationPermissions } from '@/src/services/notification-service';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import type { RecurringInterval } from '@/src/services/scheduled-payment-service';

export default function ScheduledScheduleScreen() {
  const { theme: dynamicTheme } = useTheme();
  const dispatch = useAppDispatch();
  const scheduledCreate = useAppSelector((state) => state.scheduledCreate);

  const [scheduledDate, setScheduledDate] = useState(() =>
    new Date(scheduledCreate.scheduledDate)
  );
  const [isRecurring, setIsRecurring] = useState(scheduledCreate.isRecurring);
  const [recurringInterval, setRecurringInterval] = useState<RecurringInterval>(
    scheduledCreate.recurringInterval
  );
  const [description, setDescription] = useState(scheduledCreate.description);
  // For Android, we still need modal pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  // For iOS, switch between date and time picker
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  const handleContinue = () => {
    if (scheduledDate.getTime() <= Date.now()) {
      return;
    }

    dispatch(setSchedule({
      scheduledDate: scheduledDate.toISOString(),
      isRecurring,
      recurringInterval,
      description,
    }));
    dispatch(setStep('confirm'));
    router.push('/scheduled/create/confirm');
  };

  const isValidSchedule = scheduledDate.getTime() > Date.now();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Schedule Payment" />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={[styles.stepIndicator, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
          Step 4 of 5
        </Text>
        <Text style={[styles.subtitle, theme.typography.heading, { color: dynamicTheme.colors.textPrimary }]}>
          When should it be sent?
        </Text>

        {/* Date & Time */}
        <View style={styles.section}>
          <Text style={[styles.label, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
            Schedule For
          </Text>

          {Platform.OS === 'ios' ? (
            /* iOS: Inline wheel picker with tabs */
            <View style={[styles.pickerContainer, { backgroundColor: dynamicTheme.colors.surface }]}>
              {/* Tabs */}
              <View style={[styles.pickerTabs, { backgroundColor: dynamicTheme.colors.background }]}>
                <TouchableOpacity
                  style={[
                    styles.pickerTab,
                    pickerMode === 'date' && { backgroundColor: dynamicTheme.colors.buttonPrimary },
                  ]}
                  onPress={() => setPickerMode('date')}
                >
                  <FontAwesome
                    name="calendar"
                    size={14}
                    color={pickerMode === 'date' ? dynamicTheme.colors.buttonPrimaryText : dynamicTheme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.pickerTabText,
                      theme.typography.caption,
                      { color: pickerMode === 'date' ? dynamicTheme.colors.buttonPrimaryText : dynamicTheme.colors.textSecondary },
                    ]}
                  >
                    {scheduledDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.pickerTab,
                    pickerMode === 'time' && { backgroundColor: dynamicTheme.colors.buttonPrimary },
                  ]}
                  onPress={() => setPickerMode('time')}
                >
                  <FontAwesome
                    name="clock-o"
                    size={14}
                    color={pickerMode === 'time' ? dynamicTheme.colors.buttonPrimaryText : dynamicTheme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.pickerTabText,
                      theme.typography.caption,
                      { color: pickerMode === 'time' ? dynamicTheme.colors.buttonPrimaryText : dynamicTheme.colors.textSecondary },
                    ]}
                  >
                    {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Picker */}
              <DateTimePicker
                value={scheduledDate}
                mode={pickerMode}
                display="spinner"
                minimumDate={pickerMode === 'date' ? new Date() : undefined}
                onChange={(_event, date) => {
                  if (date) {
                    if (pickerMode === 'date') {
                      const newDate = new Date(scheduledDate);
                      newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                      setScheduledDate(newDate);
                    } else {
                      const newDate = new Date(scheduledDate);
                      newDate.setHours(date.getHours(), date.getMinutes());
                      setScheduledDate(newDate);
                    }
                  }
                }}
                style={styles.picker}
                textColor={dynamicTheme.colors.textPrimary}
              />
            </View>
          ) : (
            /* Android: Button-triggered modal pickers */
            <>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  style={[styles.dateButton, { backgroundColor: dynamicTheme.colors.surface }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <FontAwesome name="calendar" size={16} color={dynamicTheme.colors.textSecondary} />
                  <Text style={[styles.dateText, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                    {scheduledDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.timeButton, { backgroundColor: dynamicTheme.colors.surface }]}
                  onPress={() => setShowTimePicker(true)}
                >
                  <FontAwesome name="clock-o" size={16} color={dynamicTheme.colors.textSecondary} />
                  <Text style={[styles.timeText, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                    {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={scheduledDate}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (event.type === 'set' && date) {
                      const newDate = new Date(scheduledDate);
                      newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                      setScheduledDate(newDate);
                    }
                  }}
                />
              )}

              {showTimePicker && (
                <DateTimePicker
                  value={scheduledDate}
                  mode="time"
                  display="default"
                  onChange={(event, date) => {
                    setShowTimePicker(false);
                    if (event.type === 'set' && date) {
                      const newDate = new Date(scheduledDate);
                      newDate.setHours(date.getHours(), date.getMinutes());
                      setScheduledDate(newDate);
                    }
                  }}
                />
              )}
            </>
          )}

          {!isValidSchedule && (
            <Text style={[styles.errorText, theme.typography.caption, { color: dynamicTheme.colors.error }]}>
              Schedule time must be in the future
            </Text>
          )}
        </View>

        {/* Recurring */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.recurringToggle}
            onPress={() => setIsRecurring(!isRecurring)}
          >
            <View style={[styles.checkbox, { borderColor: dynamicTheme.colors.textTertiary }, isRecurring && { backgroundColor: dynamicTheme.colors.buttonPrimary, borderColor: dynamicTheme.colors.buttonPrimary }]}>
              {isRecurring && (
                <FontAwesome name="check" size={12} color={dynamicTheme.colors.buttonPrimaryText} />
              )}
            </View>
            <Text style={[styles.recurringLabel, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
              Make this a recurring payment
            </Text>
          </TouchableOpacity>

          {isRecurring && (
            <View style={styles.recurringOptions}>
              {(['daily', 'weekly', 'monthly'] as RecurringInterval[]).map((interval) => (
                <TouchableOpacity
                  key={interval}
                  style={[
                    styles.recurringOption,
                    { backgroundColor: dynamicTheme.colors.surface },
                    recurringInterval === interval && { backgroundColor: dynamicTheme.colors.buttonPrimary },
                  ]}
                  onPress={() => setRecurringInterval(interval)}
                >
                  <Text
                    style={[
                      styles.recurringOptionText,
                      theme.typography.caption,
                      {
                        color:
                          recurringInterval === interval
                            ? dynamicTheme.colors.buttonPrimaryText
                            : dynamicTheme.colors.textSecondary,
                      },
                    ]}
                  >
                    {interval.charAt(0).toUpperCase() + interval.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.label, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
            Description (Optional)
          </Text>
          <TextInput
            style={[styles.input, styles.descriptionInput, theme.typography.body, { backgroundColor: dynamicTheme.colors.surface, color: dynamicTheme.colors.textPrimary }]}
            placeholder="Add a note"
            placeholderTextColor={dynamicTheme.colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={2}
          />
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={[styles.footer, { backgroundColor: dynamicTheme.colors.background, borderTopColor: dynamicTheme.colors.buttonSecondaryBorder }]}>
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: dynamicTheme.colors.buttonPrimary }, !isValidSchedule && { backgroundColor: dynamicTheme.colors.textTertiary }]}
          onPress={handleContinue}
          disabled={!isValidSchedule}
        >
          <Text style={[styles.continueButtonText, theme.typography.heading, { color: dynamicTheme.colors.buttonPrimaryText }]}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  stepIndicator: {
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  section: {
    gap: theme.spacing.sm,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
  },
  descriptionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    marginTop: theme.spacing.xs,
  },
  pickerContainer: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  pickerTabs: {
    flexDirection: 'row',
    padding: theme.spacing.xs,
    gap: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    margin: theme.spacing.sm,
  },
  pickerTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
  },
  pickerTabText: {
    fontWeight: '600',
  },
  picker: {
    height: 180,
    width: '100%',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  timeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  dateText: {
    color: theme.colors.textPrimary,
  },
  timeText: {
    color: theme.colors.textPrimary,
  },
  recurringToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 2,
    borderColor: theme.colors.textTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.buttonPrimary,
    borderColor: theme.colors.buttonPrimary,
  },
  recurringLabel: {
    color: theme.colors.textPrimary,
  },
  recurringOptions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  recurringOption: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  recurringOptionActive: {
    backgroundColor: theme.colors.buttonPrimary,
  },
  recurringOptionText: {
    fontWeight: '600',
  },
  footer: {
    padding: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.buttonSecondaryBorder,
  },
  continueButton: {
    backgroundColor: theme.colors.buttonPrimary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: theme.colors.textTertiary,
  },
  continueButtonText: {
    color: theme.colors.buttonPrimaryText,
  },
});
