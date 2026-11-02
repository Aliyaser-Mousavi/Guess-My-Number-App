import Card from "@/components/ui/Card";
import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  activeDates: Set<string>;
  dailyCompletedDates: Set<string>;
  currentStreak: number;
  bestStreak: number;
  totalActiveDays: number;
};

export default function StreakCalendar({
  activeDates,
  dailyCompletedDates,
  currentStreak,
  bestStreak,
  totalActiveDays,
}: Props) {
  const [viewDate, setViewDate] = useState(() => new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  const monthName = viewDate.toLocaleString("default", { month: "long" });

  const daysInMonth = useMemo(() => {
    return new Date(year, month + 1, 0).getDate();
  }, [year, month]);

  // First day of month offset (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = useMemo(() => {
    const day = new Date(year, month, 1).getDay();
    // Shift so Monday is 0, Sunday is 6
    return day === 0 ? 6 : day - 1;
  }, [year, month]);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  const daysOfWeek = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <View style={styles.container}>
      {/* Top Streaks Highlight Grid */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Ionicons name="flame" size={20} color={Colors.coral} />
          <Text style={styles.statVal}>{currentStreak}</Text>
          <Text style={styles.statLbl}>CURRENT</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="trophy" size={20} color={Colors.accent} />
          <Text style={styles.statVal}>{bestStreak}</Text>
          <Text style={styles.statLbl}>BEST STREAK</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="calendar" size={20} color={Colors.primary} />
          <Text style={styles.statVal}>{totalActiveDays}</Text>
          <Text style={styles.statLbl}>ACTIVE DAYS</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="star" size={20} color={Colors.mint} />
          <Text style={styles.statVal}>{dailyCompletedDates.size}</Text>
          <Text style={styles.statLbl}>DAILIES WON</Text>
        </View>
      </View>

      {/* Calendar Card */}
      <Card variant="elevated" style={styles.calendarCard}>
        {/* Month Selector Bar */}
        <View style={styles.navBar}>
          <Pressable
            onPress={prevMonth}
            style={({ pressed }) => [styles.navBtn, pressed && styles.btnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
          >
            <Ionicons name="chevron-back" size={18} color={Colors.text} />
          </Pressable>

          <Text style={styles.monthTitle}>
            {monthName} {year}
          </Text>

          <Pressable
            onPress={nextMonth}
            style={({ pressed }) => [styles.navBtn, pressed && styles.btnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Next month"
          >
            <Ionicons name="chevron-forward" size={18} color={Colors.text} />
          </Pressable>
        </View>

        {/* Days of Week Header */}
        <View style={styles.weekHeader}>
          {daysOfWeek.map((d, i) => (
            <Text key={i} style={styles.weekHeaderText}>
              {d}
            </Text>
          ))}
        </View>

        {/* Days Grid */}
        <View style={styles.grid}>
          {/* Empty spacer cells before first day */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.dayCell} />
          ))}

          {/* Actual Month Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const isPlayed = activeDates.has(dateKey);
            const isDailyDone = dailyCompletedDates.has(dateKey);
            const isToday = dateKey === todayStr;

            return (
              <View
                key={dateKey}
                style={[
                  styles.dayCell,
                  isPlayed && styles.dayCellPlayed,
                  isToday && styles.dayCellToday,
                ]}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    isPlayed && styles.dayNumberPlayed,
                    isToday && styles.dayNumberToday,
                  ]}
                >
                  {dayNum}
                </Text>

                {/* Badges on cell */}
                <View style={styles.badgeWrap}>
                  {isDailyDone ? (
                    <Ionicons name="star" size={10} color={Colors.accent} />
                  ) : isPlayed ? (
                    <View style={styles.playedDot} />
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={styles.playedDot} />
            <Text style={styles.legendText}>Game Played</Text>
          </View>
          <View style={styles.legendItem}>
            <Ionicons name="star" size={11} color={Colors.accent} />
            <Text style={styles.legendText}>Daily Puzzle Completed</Text>
          </View>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  statVal: {
    fontFamily: FontFamily.mono,
    fontSize: 18,
    color: Colors.text,
    fontWeight: "700",
    marginTop: 4,
  },
  statLbl: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  calendarCard: {
    padding: 16,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressed: {
    opacity: 0.6,
  },
  monthTitle: {
    fontFamily: FontFamily.display,
    fontSize: 16,
    color: Colors.text,
  },
  weekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
    paddingBottom: 6,
  },
  weekHeaderText: {
    flex: 1,
    textAlign: "center",
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.textMuted,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.xs,
    position: "relative",
    marginVertical: 1,
  },
  dayCellPlayed: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  dayNumber: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    color: Colors.textMuted,
  },
  dayNumberPlayed: {
    color: Colors.text,
    fontFamily: FontFamily.sansBold,
  },
  dayNumberToday: {
    color: Colors.accent,
    fontWeight: "700",
  },
  badgeWrap: {
    position: "absolute",
    bottom: 2,
    height: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  playedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
    paddingTop: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendText: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
  },
});
