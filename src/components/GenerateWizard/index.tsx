// Generate wizard component - 3-step itinerary creation

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  Button,
  SegmentedButtons,
  Chip,
  TextInput,
  HelperText,
  ProgressBar,
  useTheme,
} from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useProvinces } from '../../hooks/useProvinces';
import type { ICountry, IProvinceList } from '../../types/dtos/province';
import type { IItineraryCreateRequest, BudgetRange, Pace, GroupType } from '../../types/dtos/itinerary';
import { BUDGET_OPTIONS, PACE_OPTIONS, GROUP_TYPE_OPTIONS, INTEREST_OPTIONS, MAX_SPECIAL_NOTES_LENGTH } from '../../constants';

interface GenerateWizardProps {
  countries: ICountry[];
  initialCountrySlug?: string;
  initialProvinceSlug?: string;
  onGenerate: (data: IItineraryCreateRequest) => void;
  loading?: boolean;
  resetTrigger?: number;
}

export const GenerateWizard: React.FC<GenerateWizardProps> = ({
  countries,
  initialCountrySlug,
  initialProvinceSlug,
  onGenerate,
  loading = false,
  resetTrigger = 0,
}) => {
  const theme = useTheme();
  const selectedChipStyle = { backgroundColor: theme.colors.secondaryContainer };
  const selectedChipTextStyle = {
    color: theme.colors.onSecondaryContainer,
    fontWeight: 'bold' as const,
  };
  const [step, setStep] = useState(1);

  // Step 1 - Where & When
  const [countrySlug, setCountrySlug] = useState(initialCountrySlug || '');
  const [provinceSlug, setProvinceSlug] = useState(initialProvinceSlug || '');
  const { provinces, loading: provincesLoading } = useProvinces(countrySlug);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ startDate: Date | undefined; endDate: Date | undefined }>({
    startDate: undefined,
    endDate: undefined,
  });

  useEffect(() => {
    if (initialCountrySlug) {
      setCountrySlug(initialCountrySlug);
    }
  }, [initialCountrySlug]);

  // Update provinceSlug when initialProvinceSlug changes (navigation from province detail)
  useEffect(() => {
    if (initialProvinceSlug) {
      setProvinceSlug(initialProvinceSlug);
    }
  }, [initialProvinceSlug]);

  // Set default dates when coming from province detail (initialProvinceSlug provided)
  useEffect(() => {
    if (initialProvinceSlug) {
      const today = new Date();
      const threeDaysLater = new Date(today);
      threeDaysLater.setDate(today.getDate() + 3);

      setDateRange({
        startDate: today,
        endDate: threeDaysLater,
      });
    }
  }, [initialProvinceSlug]);

  // Reset wizard when initialProvinceSlug changes (navigation from province detail)
  useEffect(() => {
    if (initialProvinceSlug || initialCountrySlug) {
      setStep(1);
      setGroupType(undefined);
      setGroupSize(1);
      setBudget(undefined);
      setPace(undefined);
      setInterests([]);
      setSpecialNotes('');
    }
  }, [initialProvinceSlug, initialCountrySlug]);

  useEffect(() => {
    if (!countrySlug) {
      setProvinceSlug('');
      return;
    }

    if (provincesLoading) {
      return;
    }

    if (provinceSlug && !(provinces || []).some((p) => p.slug === provinceSlug)) {
      setProvinceSlug('');
    }
  }, [countrySlug, provinces, provinceSlug, provincesLoading]);

  // Step 2 - Trip Details
  const [groupType, setGroupType] = useState<GroupType | undefined>();
  const [groupSize, setGroupSize] = useState<number>(1);

  // Update group size when group type changes
  useEffect(() => {
    if (groupType === 'solo') {
      setGroupSize(1);
    } else if (groupType === 'couple') {
      setGroupSize(2);
    }
  }, [groupType]);
  const [budget, setBudget] = useState<BudgetRange | undefined>();
  const [pace, setPace] = useState<Pace | undefined>();
  const [interests, setInterests] = useState<string[]>([]);
  const [specialNotes, setSpecialNotes] = useState('');

  useEffect(() => {
    if (resetTrigger <= 0) return;

    setStep(1);
    setCountrySlug('');
    setProvinceSlug('');
    setDatePickerOpen(false);
    setDateRange({ startDate: undefined, endDate: undefined });
    setGroupType(undefined);
    setGroupSize(1);
    setBudget(undefined);
    setPace(undefined);
    setInterests([]);
    setSpecialNotes('');
  }, [resetTrigger]);

  const canProceedStep1 = countrySlug && provinceSlug && dateRange.startDate && dateRange.endDate;
  const selectedCountry = (countries || []).find((c) => c.slug === countrySlug);
  const selectedProvince = (provinces || []).find((p) => p.slug === provinceSlug);

  const handleDateConfirm = ({ startDate, endDate }: any) => {
    setDateRange({ startDate, endDate });
    setDatePickerOpen(false);
  };

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleGenerate = () => {
    if (!dateRange.startDate || !dateRange.endDate) return;

    const data: IItineraryCreateRequest = {
      country: countrySlug,
      province: provinceSlug,
      start_date: dateRange.startDate.toISOString().split('T')[0],
      end_date: dateRange.endDate.toISOString().split('T')[0],
      group_size: groupSize,
      budget_range: budget,
      pace: pace,
      interests: interests.length > 0 ? interests : undefined,
      group_type: groupType,
      special_notes: specialNotes || undefined,
    };

    onGenerate(data);
  };

  return (
    <View style={styles.container}>
      {/* Progress Indicator */}
      <View style={styles.progress}>
        <View style={styles.stepIndicators}>
          {[1, 2].map((s) => (
            <View
              key={s}
              style={[
                styles.stepDot,
                {
                  backgroundColor:
                    step >= s ? theme.colors.primary : theme.colors.surfaceVariant,
                },
              ]}
            />
          ))}
        </View>
        <Text variant="labelLarge" style={styles.stepLabel}>
          Step {step} of 2
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <View style={styles.step}>
            <Text variant="headlineSmall" style={styles.stepTitle}>
              Where & When?
            </Text>

            {/* Province Selection */}
            <Text variant="titleMedium" style={styles.label}>
              Country
            </Text>
            <View style={styles.provinceGrid}>
              {(countries || []).map((country) => (
                <Chip
                  key={country.slug}
                  selected={countrySlug === country.slug}
                  onPress={() => setCountrySlug(country.slug)}
                  style={[
                    styles.provinceChip,
                    countrySlug === country.slug && selectedChipStyle,
                  ]}
                  textStyle={countrySlug === country.slug ? selectedChipTextStyle : undefined}
                  showSelectedCheck
                  mode={countrySlug === country.slug ? 'flat' : 'outlined'}
                >
                  {country.name}
                </Chip>
              ))}
            </View>
            {!!selectedCountry?.description && (
              <Text variant="bodySmall" style={styles.selectionDescription}>
                {selectedCountry.description}
              </Text>
            )}

            <Text variant="titleMedium" style={[styles.label, { marginTop: 24 }] }>
              Destination
            </Text>
            <View style={styles.provinceGrid}>
              {!countrySlug && !provincesLoading && (
                <Text variant="bodySmall" style={styles.provinceInfo}>
                  Select a country first to view destination options.
                </Text>
              )}
              {provincesLoading && (
                <Text variant="bodySmall" style={styles.provinceInfo}>
                  Loading destinations...
                </Text>
              )}
              {!!countrySlug && !provincesLoading && (provinces || []).length === 0 && (
                <Text variant="bodySmall" style={styles.provinceInfo}>
                  No destinations available for this country right now.
                </Text>
              )}
              {(provinces || []).map((province) => (
                <Chip
                  key={province.slug}
                  selected={provinceSlug === province.slug}
                  onPress={() => setProvinceSlug(province.slug)}
                  style={[
                    styles.provinceChip,
                    provinceSlug === province.slug && selectedChipStyle,
                  ]}
                  textStyle={provinceSlug === province.slug ? selectedChipTextStyle : undefined}
                  showSelectedCheck
                  mode={provinceSlug === province.slug ? 'flat' : 'outlined'}
                >
                  {province.name}
                </Chip>
              ))}
            </View>

            {selectedProvince && (
              <View style={styles.selectedProvinceInfo}>
                <Text variant="bodyMedium" style={styles.provinceInfo}>
                  📍 {selectedProvince.region_display}
                </Text>
                {!!selectedProvince.description && (
                  <Text variant="bodySmall" style={styles.selectionDescription}>
                    {selectedProvince.description}
                  </Text>
                )}
              </View>
            )}

            {/* Date Selection */}
            <Text variant="titleMedium" style={[styles.label, { marginTop: 24 }]}>
              Travel Dates
            </Text>
            <Button
              mode="outlined"
              icon="calendar"
              onPress={() => setDatePickerOpen(true)}
              style={styles.dateButton}
              contentStyle={styles.dateButtonContent}
            >
              {dateRange.startDate && dateRange.endDate
                ? `${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`
                : 'Select dates'}
            </Button>
            <HelperText type="info" visible>
              Choose your check-in and check-out dates (max 14 days)
            </HelperText>

            <DatePickerModal
              locale="en"
              mode="range"
              visible={datePickerOpen}
              onDismiss={() => setDatePickerOpen(false)}
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onConfirm={handleDateConfirm}
              validRange={{
                startDate: new Date(),
              }}
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.step}>
            <Text variant="headlineSmall" style={styles.stepTitle}>
              Tell us about your trip to {selectedProvince?.name}
            </Text>
            <Text variant="bodyMedium" style={styles.stepSubtitle}>
              These details help us create a personalized itinerary (all optional)
            </Text>

            {/* Group Type */}
            <Text variant="titleMedium" style={styles.label}>
              Traveling as
            </Text>
            <View style={styles.optionGrid}>
              {GROUP_TYPE_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  selected={groupType === option.value}
                  onPress={() => setGroupType(option.value)}
                  icon={option.icon as any}
                  style={[
                    styles.optionChip,
                    groupType === option.value && selectedChipStyle,
                  ]}
                  textStyle={groupType === option.value ? selectedChipTextStyle : undefined}
                  showSelectedCheck
                  mode={groupType === option.value ? 'flat' : 'outlined'}
                >
                  {option.label}
                </Chip>
              ))}
            </View>

            {/* Group Size */}
            <Text variant="titleMedium" style={[styles.label, { marginTop: 24 }]}>
              Group size: {groupSize} {groupSize === 1 ? 'person' : 'people'}
            </Text>
            <View style={styles.stepper}>
              <Button
                mode="outlined"
                onPress={() => setGroupSize(Math.max(1, groupSize - 1))}
                disabled={groupSize <= 1 || groupType === 'solo' || groupType === 'couple'}
              >
                -
              </Button>
              <Text variant="headlineSmall" style={styles.stepperValue}>
                {groupSize}
              </Text>
              <Button
                mode="outlined"
                onPress={() => setGroupSize(Math.min(50, groupSize + 1))}
                disabled={groupSize >= 50 || groupType === 'solo' || groupType === 'couple'}
              >
                +
              </Button>
            </View>

            {/* Budget */}
            <Text variant="titleMedium" style={[styles.label, { marginTop: 24 }]}>
              Budget
            </Text>
            <View style={styles.optionGrid}>
              {BUDGET_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  selected={budget === option.value}
                  onPress={() => setBudget(option.value)}
                  icon={option.icon as any}
                  style={[
                    styles.optionChip,
                    budget === option.value && selectedChipStyle,
                  ]}
                  textStyle={budget === option.value ? selectedChipTextStyle : undefined}
                  showSelectedCheck
                  mode={budget === option.value ? 'flat' : 'outlined'}
                >
                  {option.label}
                </Chip>
              ))}
            </View>

            {/* Pace */}
            <Text variant="titleMedium" style={[styles.label, { marginTop: 24 }]}>
              Pace
            </Text>
            <View style={styles.optionGrid}>
              {PACE_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  selected={pace === option.value}
                  onPress={() => setPace(option.value)}
                  icon={option.icon as any}
                  style={[
                    styles.optionChip,
                    pace === option.value && selectedChipStyle,
                  ]}
                  textStyle={pace === option.value ? selectedChipTextStyle : undefined}
                  showSelectedCheck
                  mode={pace === option.value ? 'flat' : 'outlined'}
                >
                  {option.label}
                </Chip>
              ))}
            </View>

            {/* Interests */}
            <Text variant="titleMedium" style={[styles.label, { marginTop: 24 }]}>
              Interests
            </Text>
            <View style={styles.interestGrid}>
              {INTEREST_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  selected={interests.includes(option.value)}
                  onPress={() => toggleInterest(option.value)}
                  icon={option.icon as any}
                  style={[
                    styles.interestChip,
                    interests.includes(option.value) && selectedChipStyle,
                  ]}
                  textStyle={interests.includes(option.value) ? selectedChipTextStyle : undefined}
                  showSelectedCheck
                  mode={interests.includes(option.value) ? 'flat' : 'outlined'}
                >
                  {option.label}
                </Chip>
              ))}
            </View>

            {/* Special Notes */}
            <Text variant="titleMedium" style={[styles.label, { marginTop: 24 }]}>
              Special requests or notes
            </Text>
            <TextInput
              mode="outlined"
              multiline
              numberOfLines={4}
              value={specialNotes}
              onChangeText={setSpecialNotes}
              placeholder="e.g., Vegetarian, wheelchair accessible, traveling with elderly..."
              maxLength={MAX_SPECIAL_NOTES_LENGTH}
              style={styles.notesInput}
            />
            <HelperText type="info" visible>
              {specialNotes.length}/{MAX_SPECIAL_NOTES_LENGTH} characters
            </HelperText>
          </View>
        )}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={[styles.actions, { borderTopColor: theme.colors.outlineVariant }]}> 
        {step > 1 && (
          <Button mode="outlined" onPress={() => setStep(step - 1)} style={styles.backButton}>
            Back
          </Button>
        )}
        {step < 2 ? (
          <Button
            mode="contained"
            onPress={() => setStep(2)}
            disabled={!canProceedStep1}
            style={styles.nextButton}
          >
            Next
          </Button>
        ) : (
          <Button
            mode="contained"
            onPress={handleGenerate}
            loading={loading}
            disabled={loading}
            style={styles.nextButton}
            icon="magic-staff"
          >
            Generate My Itinerary
          </Button>
        )}
      </View>

      {loading && (
        <View
          style={[
            styles.loadingOverlay,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.outlineVariant,
            },
          ]}
        >
          <ProgressBar indeterminate color={theme.colors.primary} />
          <Text variant="bodyLarge" style={styles.loadingText}>
            Our AI travel expert is crafting your perfect itinerary...
          </Text>
          <Text variant="bodyMedium" style={styles.loadingSubtext}>
            This may take up to 90 seconds
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progress: {
    padding: 16,
    paddingBottom: 8,
  },
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  stepLabel: {
    textAlign: 'center',
    opacity: 0.7,
  },
  content: {
    flex: 1,
  },
  step: {
    padding: 16,
  },
  stepTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stepSubtitle: {
    opacity: 0.7,
    marginBottom: 24,
  },
  label: {
    fontWeight: '600',
    marginBottom: 12,
  },
  provinceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  provinceChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  provinceInfo: {
    opacity: 0.7,
    marginTop: 8,
  },
  selectedProvinceInfo: {
    marginTop: 2,
  },
  selectionDescription: {
    opacity: 0.75,
    marginTop: 2,
    marginBottom: 2,
  },
  dateButton: {
    marginBottom: 4,
  },
  dateButtonContent: {
    paddingVertical: 8,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  selectedChip: {
    backgroundColor: '#B2DFDB',
  },
  selectedChipText: {
    color: '#00695C',
    fontWeight: 'bold',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  stepperValue: {
    fontWeight: 'bold',
    minWidth: 60,
    textAlign: 'center',
  },
  interestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  notesInput: {
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  backButton: {
    flex: 1,
    height: 56,
    justifyContent: 'center',
  },
  nextButton: {
    flex: 2,
    height: 56,
    justifyContent: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  loadingSubtext: {
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.7,
  },
});
