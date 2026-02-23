import React from 'react';
import { View, StyleSheet, type ViewStyle, type TextStyle, Pressable } from 'react-native';
import { Text, Chip, useTheme } from 'react-native-paper';

const DOT_SIZE = 18;
const DOT_TOP_OFFSET = 14;
const DOT_CENTER = DOT_TOP_OFFSET + DOT_SIZE / 2;
const RAIL_WIDTH = 24;
const DOT_LINE_GAP = 4;

interface VerticalTimelineItemProps {
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  markerColor?: string;
  isFirst?: boolean;
  isLast?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
  onPressTimeColumn?: () => void;
  timeColumnDisabled?: boolean;
  underlineTimeText?: boolean;
}

export const VerticalTimelineItem: React.FC<VerticalTimelineItemProps> = ({
  startTime,
  endTime,
  durationMinutes,
  markerColor,
  isFirst = false,
  isLast = false,
  children,
  style,
  onPressTimeColumn,
  timeColumnDisabled = false,
  underlineTimeText = false,
}) => {
  const theme = useTheme();
  const railColor = theme.colors.outlineVariant;
  const dotColor = markerColor || theme.colors.primary;

  return (
    <View style={[styles.row, style]}>
      <View style={styles.timeColumn}>
        <Pressable
          onPress={onPressTimeColumn}
          disabled={timeColumnDisabled || !onPressTimeColumn}
          style={({ pressed }) => [
            styles.timePressable,
            pressed && styles.timePressablePressed,
          ]}
        >
          <Text
            variant="labelLarge"
            style={[
              styles.startTime,
              underlineTimeText ? styles.underlinedTimeText : undefined,
            ]}
          >
            {startTime}
          </Text>
          <Text
            variant="bodySmall"
            style={[
              styles.endTime,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {endTime}
          </Text>
          {typeof durationMinutes === 'number' && (
            <Chip compact style={styles.durationChip} textStyle={styles.durationChipText}>
              {durationMinutes} min
            </Chip>
          )}
        </Pressable>
      </View>

      <View style={styles.railColumn}>
        {!isFirst && <View style={[styles.line, styles.topLine, { backgroundColor: railColor }]} />}
        <View style={[styles.dotOuter, { borderColor: dotColor, backgroundColor: `${dotColor}20` }]}>
          <View style={[styles.dotInner, { backgroundColor: dotColor }]} />
        </View>
        {!isLast && <View style={[styles.line, styles.bottomLine, { backgroundColor: railColor }]} />}
      </View>

      <View style={styles.contentColumn}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
  },
  timeColumn: {
    width: 78,
    paddingTop: 10,
    paddingRight: 6,
  },
  timePressable: {
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  timePressablePressed: {
    opacity: 0.75,
  },
  startTime: {
    fontWeight: '700',
    textAlign: 'right',
    lineHeight: 20,
  },
  endTime: {
    textAlign: 'right',
    marginTop: 2,
  },
  underlinedTimeText: {
    textDecorationLine: 'underline',
    textDecorationStyle: 'solid',
  } as TextStyle,
  durationChip: {
    marginTop: 6,
    alignSelf: 'flex-end',
    height: 24,
  },
  durationChipText: {
    fontSize: 10,
    lineHeight: 14,
  },
  railColumn: {
    width: RAIL_WIDTH,
    alignItems: 'center',
    position: 'relative',
  },
  line: {
    width: 2,
    position: 'absolute',
    left: RAIL_WIDTH / 2 - 1,
  },
  topLine: {
    top: 0,
    height: DOT_TOP_OFFSET - DOT_LINE_GAP,
  },
  bottomLine: {
    top: DOT_TOP_OFFSET + DOT_SIZE + DOT_LINE_GAP,
    bottom: 0,
  },
  dotOuter: {
    marginTop: DOT_TOP_OFFSET,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  contentColumn: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 8,
  },
});
