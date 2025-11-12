/**
 * Recurring Schedule Picker
 * 
 * UI presets for creating recurring schedules
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  createDailyRRule,
  createWeeklyRRule,
  createMonthlyRRule,
  describeRRule,
} from '../utils/time-helpers';

type Frequency = 'daily' | 'weekly' | 'monthly' | 'custom';

interface RecurringSchedulePickerProps {
  value?: string; // RRULE string
  timezone: string;
  onChange: (rrule: string) => void;
}

export function RecurringSchedulePicker({
  value,
  timezone,
  onChange,
}: RecurringSchedulePickerProps) {
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4]); // Mon-Fri
  const [dayOfMonth, setDayOfMonth] = useState(1);

  // Generate RRULE based on current settings
  const generateRRule = (): string => {
    const startDate = new Date();

    switch (frequency) {
      case 'daily':
        return createDailyRRule(startDate, hour, minute);
      case 'weekly':
        return createWeeklyRRule(startDate, weekdays, hour, minute);
      case 'monthly':
        return createMonthlyRRule(startDate, dayOfMonth, hour, minute);
      default:
        return createDailyRRule(startDate, hour, minute);
    }
  };

  // Update RRULE when settings change
  const updateRRule = () => {
    const rrule = generateRRule();
    onChange(rrule);
  };

  // Presets
  const presets = [
    {
      id: 'daily-9am',
      label: 'Every day at 9 AM',
      frequency: 'daily' as Frequency,
      hour: 9,
      minute: 0,
    },
    {
      id: 'weekdays-9am',
      label: 'Weekdays at 9 AM',
      frequency: 'weekly' as Frequency,
      hour: 9,
      minute: 0,
      weekdays: [0, 1, 2, 3, 4],
    },
    {
      id: 'weekly-monday',
      label: 'Every Monday at 9 AM',
      frequency: 'weekly' as Frequency,
      hour: 9,
      minute: 0,
      weekdays: [0],
    },
    {
      id: 'monthly-1st',
      label: '1st of every month at 9 AM',
      frequency: 'monthly' as Frequency,
      hour: 9,
      minute: 0,
      dayOfMonth: 1,
    },
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    setFrequency(preset.frequency);
    setHour(preset.hour);
    setMinute(preset.minute);
    if (preset.weekdays) setWeekdays(preset.weekdays);
    if (preset.dayOfMonth) setDayOfMonth(preset.dayOfMonth);

    // Generate and emit RRULE
    setTimeout(() => updateRRule(), 0);
  };

  const toggleWeekday = (day: number) => {
    if (weekdays.includes(day)) {
      setWeekdays(weekdays.filter((d) => d !== day));
    } else {
      setWeekdays([...weekdays, day].sort());
    }
  };

  const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <View style={styles.container}>
      {/* Presets */}
      <Text style={styles.sectionTitle}>Quick Presets</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {presets.map((preset) => (
          <TouchableOpacity
            key={preset.id}
            style={styles.presetChip}
            onPress={() => applyPreset(preset)}
          >
            <Text style={styles.presetText}>{preset.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Frequency */}
      <Text style={styles.sectionTitle}>Frequency</Text>
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[
            styles.segment,
            frequency === 'daily' && styles.segmentActive,
          ]}
          onPress={() => {
            setFrequency('daily');
            updateRRule();
          }}
        >
          <Text
            style={[
              styles.segmentText,
              frequency === 'daily' && styles.segmentTextActive,
            ]}
          >
            Daily
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segment,
            frequency === 'weekly' && styles.segmentActive,
          ]}
          onPress={() => {
            setFrequency('weekly');
            updateRRule();
          }}
        >
          <Text
            style={[
              styles.segmentText,
              frequency === 'weekly' && styles.segmentTextActive,
            ]}
          >
            Weekly
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segment,
            frequency === 'monthly' && styles.segmentActive,
          ]}
          onPress={() => {
            setFrequency('monthly');
            updateRRule();
          }}
        >
          <Text
            style={[
              styles.segmentText,
              frequency === 'monthly' && styles.segmentTextActive,
            ]}
          >
            Monthly
          </Text>
        </TouchableOpacity>
      </View>

      {/* Weekly: Weekdays */}
      {frequency === 'weekly' && (
        <View style={styles.section}>
          <Text style={styles.label}>Days of Week</Text>
          <View style={styles.weekdaysRow}>
            {weekdayNames.map((name, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.weekdayChip,
                  weekdays.includes(index) && styles.weekdayChipActive,
                ]}
                onPress={() => {
                  toggleWeekday(index);
                  setTimeout(() => updateRRule(), 0);
                }}
              >
                <Text
                  style={[
                    styles.weekdayText,
                    weekdays.includes(index) && styles.weekdayTextActive,
                  ]}
                >
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Monthly: Day of Month */}
      {frequency === 'monthly' && (
        <View style={styles.section}>
          <Text style={styles.label}>Day of Month</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayChip,
                  dayOfMonth === day && styles.dayChipActive,
                ]}
                onPress={() => {
                  setDayOfMonth(day);
                  setTimeout(() => updateRRule(), 0);
                }}
              >
                <Text
                  style={[
                    styles.dayText,
                    dayOfMonth === day && styles.dayTextActive,
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Time */}
      <View style={styles.section}>
        <Text style={styles.label}>Time</Text>
        <View style={styles.timeRow}>
          {/* Hour */}
          <View style={styles.timeColumn}>
            <Text style={styles.timeLabel}>Hour</Text>
            <ScrollView style={styles.timeScroll}>
              {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[
                    styles.timeOption,
                    hour === h && styles.timeOptionActive,
                  ]}
                  onPress={() => {
                    setHour(h);
                    setTimeout(() => updateRRule(), 0);
                  }}
                >
                  <Text
                    style={[
                      styles.timeOptionText,
                      hour === h && styles.timeOptionTextActive,
                    ]}
                  >
                    {h.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Minute */}
          <View style={styles.timeColumn}>
            <Text style={styles.timeLabel}>Minute</Text>
            <ScrollView style={styles.timeScroll}>
              {[0, 15, 30, 45].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.timeOption,
                    minute === m && styles.timeOptionActive,
                  ]}
                  onPress={() => {
                    setMinute(m);
                    setTimeout(() => updateRRule(), 0);
                  }}
                >
                  <Text
                    style={[
                      styles.timeOptionText,
                      minute === m && styles.timeOptionTextActive,
                    ]}
                  >
                    {m.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>

      {/* Preview */}
      <View style={styles.preview}>
        <Text style={styles.previewLabel}>Schedule:</Text>
        <Text style={styles.previewText}>{describeRRule(generateRRule())}</Text>
        <Text style={styles.previewTimezone}>Timezone: {timezone}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 16,
  },
  presetChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  presetText: {
    fontSize: 13,
    color: '#333',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
    marginBottom: 16,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  segmentActive: {
    backgroundColor: '#2196F3',
  },
  segmentText: {
    fontSize: 14,
    color: '#666',
  },
  segmentTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  weekdaysRow: {
    flexDirection: 'row',
    gap: 8,
  },
  weekdayChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  weekdayChipActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  weekdayText: {
    fontSize: 12,
    color: '#666',
  },
  weekdayTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  dayChip: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  dayChipActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  dayText: {
    fontSize: 14,
    color: '#666',
  },
  dayTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 16,
  },
  timeColumn: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
    textAlign: 'center',
  },
  timeScroll: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  timeOption: {
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeOptionActive: {
    backgroundColor: '#e3f2fd',
  },
  timeOptionText: {
    fontSize: 16,
    color: '#666',
  },
  timeOptionTextActive: {
    color: '#2196F3',
    fontWeight: '600',
  },
  preview: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  previewLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  previewTimezone: {
    fontSize: 12,
    color: '#999',
  },
});
