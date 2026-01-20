/**
 * Scheduled Payment Create - Step 4: Schedule Settings
 */

import { StyleSheet, View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { setSchedule, setStep } from '@/src/store/slices/scheduled-create-slice';
import { requestNotificationPermissions } from '@/src/services/scheduled-payment-service';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import type { RecurringInterval } from '@/src/services/scheduled-payment-service';

export default function ScheduledScheduleScreen() {
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Schedule Payment" />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={[styles.stepIndicator, theme.typography.caption, { color: theme.colors.textSecondary }]}>
          Step 4 of 5
        </Text>
        <Text style={[styles.subtitle, theme.typography.heading]}>
          When should it be sent?
        </Text>

        {/* Date & Time */}
        <View style={styles.section}>
          <Text style={[styles.label, theme.typography.caption, { color: theme.colors.textSecondary }]}>
            Schedule For
          </Text>
          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <FontAwesome name="calendar" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.dateText, theme.typography.body]}>
                {scheduledDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <FontAwesome name="clock-o" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.timeText, theme.typography.body]}>
                {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
          </View>
          {!isValidSchedule && (
            <Text style={[styles.errorText, theme.typography.caption, { color: theme.colors.error }]}>
              Schedule time must be in the future
            </Text>
          )}
        </View>

        {/* Date Picker */}
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

        {/* Time Picker */}
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

        {/* Recurring */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.recurringToggle}
            onPress={() => setIsRecurring(!isRecurring)}
          >
            <View style={[styles.checkbox, isRecurring && styles.checkboxChecked]}>
              {isRecurring && (
                <FontAwesome name="check" size={12} color={theme.colors.buttonPrimaryText} />
              )}
            </View>
            <Text style={[styles.recurringLabel, theme.typography.body]}>
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
                    recurringInterval === interval && styles.recurringOptionActive,
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
                            ? theme.colors.buttonPrimaryText
                            : theme.colors.textSecondary,
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
          <Text style={[styles.label, theme.typography.caption, { color: theme.colors.textSecondary }]}>
            Description (Optional)
          </Text>
          <TextInput
            style={[styles.input, styles.descriptionInput, theme.typography.body]}
            placeholder="Add a note"
            placeholderTextColor={theme.colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={2}
          />
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !isValidSchedule && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!isValidSchedule}
        >
          <Text style={[styles.continueButtonText, theme.typography.heading]}>Continue</Text>
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
