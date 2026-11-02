import ArcadeBarChart from "@/components/analytics/ArcadeBarChart";
import ArcadeTrendChart from "@/components/analytics/ArcadeTrendChart";
import StreakCalendar from "@/components/analytics/StreakCalendar";
import DailyArchiveModal from "@/components/daily/DailyArchiveModal";
import { formatElapsed } from "@/components/game/GameTimer";
import HistoryList from "@/components/history/HistoryList";
import GameReplayModal from "@/components/replay/GameReplayModal";
import Card from "@/components/ui/Card";
import PrimaryButton from "@/components/ui/PrimaryButton";
import ScreenBackground from "@/components/ui/ScreenBackground";
import StatChip from "@/components/ui/StatChip";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import {
  ACHIEVEMENTS,
  DIFFICULTIES,
  MODE_METADATA,
} from "@/constants/gameConfig";
import { FontFamily, Radius } from "@/constants/theme";
import { useGame } from "@/context/GameProvider";
import { AnalyticsService } from "@/services/analytics/AnalyticsService";
import type { GameHistoryRecord } from "@/types/game";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type TabId = "analytics" | "history" | "records" | "streaks";

type Props = {
  onBack: () => void;
  onPlayArchivedDaily?: (dateStr: string) => void;
};

export default function StatsScreen({ onBack, onPlayArchivedDaily }: Props) {
  const { stats, history, dailyHistory, personalBests, buzz } = useGame();
  const [activeTab, setActiveTab] = useState<TabId>("analytics");
  const [replayRecord, setReplayRecord] = useState<GameHistoryRecord | null>(null);
  const [showDailyArchive, setShowDailyArchive] = useState(false);

  // Compute Analytics Data
  const winRateTrend = useMemo(
    () =>
      AnalyticsService.calculateWinRateTrend(history).map((d) => ({
        label: d.label,
        value: d.winRate,
      })),
    [history],
  );

  const weeklyActivity = useMemo(
    () =>
      AnalyticsService.calculateWeeklyActivity(history).map((w) => ({
        label: w.label,
        value: w.count,
      })),
    [history],
  );

  const dayOfWeekActivity = useMemo(
    () =>
      AnalyticsService.calculateDayOfWeekActivity(history).map((d) => ({
        label: d.day,
        value: d.count,
        highlight: d.count > 0,
      })),
    [history],
  );

  const streakData = useMemo(
    () => AnalyticsService.calculateStreakCalendarData(history, dailyHistory),
    [history, dailyHistory],
  );

  const avgRounds =
    stats.gamesPlayed === 0
      ? "—"
      : (stats.totalRounds / stats.gamesPlayed).toFixed(1);
  const winRate =
    stats.gamesPlayed === 0
      ? "0%"
      : `${Math.round((stats.gamesWon / stats.gamesPlayed) * 100)}%`;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => {
                buzz("light");
                onBack();
              }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={({ pressed }) => [
                styles.backBtn,
                pressed && styles.backBtnPressed,
              ]}
            >
              <Ionicons name="arrow-back" size={20} color={Colors.text} />
            </Pressable>
            <View style={styles.titleWrap}>
              <Title size="lg">Analytics Hub</Title>
            </View>
            <Pressable
              onPress={() => {
                buzz("light");
                setShowDailyArchive(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Daily puzzle archive"
              style={({ pressed }) => [
                styles.archiveIconBtn,
                pressed && styles.backBtnPressed,
              ]}
            >
              <Ionicons name="calendar" size={18} color={Colors.accent} />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            Verified match history, real-time analytics & personal records
          </Text>

          {/* Segmented Tab Navigation Bar */}
          <View style={styles.tabBar}>
            <TabButton
              title="Analytics"
              icon="stats-chart"
              active={activeTab === "analytics"}
              onPress={() => {
                buzz("light");
                setActiveTab("analytics");
              }}
            />
            <TabButton
              title="History"
              icon="time"
              active={activeTab === "history"}
              onPress={() => {
                buzz("light");
                setActiveTab("history");
              }}
            />
            <TabButton
              title="Records"
              icon="trophy"
              active={activeTab === "records"}
              onPress={() => {
                buzz("light");
                setActiveTab("records");
              }}
            />
            <TabButton
              title="Calendar"
              icon="flame"
              active={activeTab === "streaks"}
              onPress={() => {
                buzz("light");
                setActiveTab("streaks");
              }}
            />
          </View>

          {/* TAB 1: ANALYTICS */}
          {activeTab === "analytics" && (
            <View style={styles.tabContent}>
              {/* Hero Banner: Total Score & Win Ratio */}
              <Card variant="elevated" style={styles.heroCard}>
                <View style={styles.heroColumn}>
                  <Text style={styles.heroLabel}>TOTAL LIFETIME SCORE</Text>
                  <Text style={styles.heroScore}>
                    {stats.totalScore.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStatsRow}>
                  <View style={styles.heroStatItem}>
                    <Text style={styles.heroStatValue}>{stats.gamesWon}</Text>
                    <Text style={styles.heroStatLabel}>WINS</Text>
                  </View>
                  <View style={styles.heroStatItem}>
                    <Text style={styles.heroStatValue}>{winRate}</Text>
                    <Text style={styles.heroStatLabel}>WIN RATE</Text>
                  </View>
                  <View style={styles.heroStatItem}>
                    <Text style={styles.heroStatValue}>{streakData.bestStreak}</Text>
                    <Text style={styles.heroStatLabel}>BEST STREAK</Text>
                  </View>
                </View>
              </Card>

              {/* Win Rate Over Time Trend */}
              <Text style={styles.sectionHeader}>WIN RATE OVER TIME (%)</Text>
              <Card variant="elevated" style={styles.chartCard}>
                <ArcadeTrendChart
                  data={winRateTrend}
                  height={130}
                  color={Colors.mint}
                  unit="%"
                  emptyMessage="Play 2 or more matches to plot your win rate curve"
                />
              </Card>

              {/* Games Played Per Week */}
              <Text style={styles.sectionHeader}>GAMES PLAYED PER WEEK</Text>
              <Card variant="elevated" style={styles.chartCard}>
                <ArcadeBarChart
                  data={weeklyActivity}
                  height={130}
                  emptyMessage="No weekly gameplay data logged yet"
                />
              </Card>

              {/* Daily Activity by Day of Week */}
              <Text style={styles.sectionHeader}>ACTIVITY BY DAY OF WEEK</Text>
              <Card variant="elevated" style={styles.chartCard}>
                <ArcadeBarChart
                  data={dayOfWeekActivity}
                  height={130}
                  emptyMessage="Play across the week to visualize active days"
                />
              </Card>

              {/* Lifetime Metrics Grid */}
              <Text style={styles.sectionHeader}>LIFETIME METRICS</Text>
              <View style={styles.grid}>
                <StatChip
                  icon="game-controller"
                  label="Games Played"
                  value={stats.gamesPlayed}
                  color={Colors.primary}
                />
                <StatChip
                  icon="trophy"
                  label="Games Won"
                  value={stats.gamesWon}
                  color={Colors.accent}
                />
                <StatChip
                  icon="stats-chart"
                  label="Win Rate"
                  value={winRate}
                  color={Colors.mint}
                />
                <StatChip
                  icon="flame"
                  label="Current Streak"
                  value={streakData.currentStreak}
                  color={Colors.coral}
                />
                <StatChip
                  icon="star"
                  label="Highest Score"
                  value={personalBests.highestScore.toLocaleString()}
                  color={Colors.accent}
                />
                <StatChip
                  icon="layers"
                  label="Avg Rounds"
                  value={avgRounds}
                  color={Colors.primary}
                />
                <StatChip
                  icon="flash"
                  label="Fastest Win"
                  value={
                    personalBests.fastestWinMs == null
                      ? "—"
                      : formatElapsed(personalBests.fastestWinMs)
                  }
                  color={Colors.mint}
                />
                <StatChip
                  icon="bulb"
                  label="Best Rounds"
                  value={personalBests.lowestGuesses ?? "—"}
                  color={Colors.accent}
                />
                <StatChip
                  icon="calendar"
                  label="Active Days"
                  value={streakData.totalActiveDays}
                  color={Colors.coral}
                />
                <StatChip
                  icon="ribbon"
                  label="Badges Unlocked"
                  value={`${stats.unlockedAchievements.length}/${ACHIEVEMENTS.length}`}
                  color={Colors.primary}
                />
              </View>
            </View>
          )}

          {/* TAB 2: MATCH HISTORY */}
          {activeTab === "history" && (
            <View style={styles.tabContent}>
              <HistoryList
                history={history}
                onSelectReplay={(record) => {
                  buzz("light");
                  setReplayRecord(record);
                }}
              />
            </View>
          )}

          {/* TAB 3: PERSONAL BEST RECORDS */}
          {activeTab === "records" && (
            <View style={styles.tabContent}>
              {/* Highlight Hall of Fame */}
              <View style={styles.recordsHallRow}>
                <View style={styles.hallCard}>
                  <Ionicons name="flash" size={20} color={Colors.mint} />
                  <Text style={styles.hallValue}>
                    {personalBests.fastestWinMs == null
                      ? "—"
                      : formatElapsed(personalBests.fastestWinMs)}
                  </Text>
                  <Text style={styles.hallLabel}>FASTEST WIN</Text>
                </View>
                <View style={styles.hallCard}>
                  <Ionicons name="star" size={20} color={Colors.accent} />
                  <Text style={styles.hallValue}>
                    {personalBests.highestScore > 0
                      ? personalBests.highestScore.toLocaleString()
                      : "—"}
                  </Text>
                  <Text style={styles.hallLabel}>HIGH SCORE</Text>
                </View>
                <View style={styles.hallCard}>
                  <Ionicons name="disc" size={20} color={Colors.coral} />
                  <Text style={styles.hallValue}>
                    {personalBests.lowestGuesses ?? "—"}
                  </Text>
                  <Text style={styles.hallLabel}>LEAST GUESSES</Text>
                </View>
              </View>

              {/* Special Game Mode Milestones */}
              <Text style={styles.sectionHeader}>SPECIAL MODE MILESTONES</Text>
              <View style={styles.specialMilestoneGrid}>
                <Card variant="elevated" style={styles.specialCard}>
                  <View style={styles.specialCardTop}>
                    <Ionicons name="shield" size={16} color={Colors.coral} />
                    <Text style={styles.specialCardTitle}>SURVIVAL BEST</Text>
                  </View>
                  <Text style={styles.specialCardVal}>
                    {personalBests.bestSurvivalRounds > 0
                      ? `Wave ${personalBests.bestSurvivalRounds}`
                      : "—"}
                  </Text>
                  <Text style={styles.specialCardSub}>
                    {personalBests.bestSurvivalScore > 0
                      ? `${personalBests.bestSurvivalScore.toLocaleString()} pts`
                      : "Survive consecutive rounds"}
                  </Text>
                </Card>

                <Card variant="elevated" style={styles.specialCard}>
                  <View style={styles.specialCardTop}>
                    <Ionicons name="timer" size={16} color={Colors.mint} />
                    <Text style={styles.specialCardTitle}>BLITZ BEST</Text>
                  </View>
                  <Text style={styles.specialCardVal}>
                    {personalBests.bestBlitzSolved > 0
                      ? `${personalBests.bestBlitzSolved} Solved`
                      : "—"}
                  </Text>
                  <Text style={styles.specialCardSub}>
                    {personalBests.bestBlitzScore > 0
                      ? `${personalBests.bestBlitzScore.toLocaleString()} pts`
                      : "60-second speed challenge"}
                  </Text>
                </Card>
              </View>

              {/* Records by Game Mode */}
              <Text style={styles.sectionHeader}>PERFORMANCE BY GAME MODE</Text>
              <View style={styles.modeScoresGrid}>
                {MODE_METADATA.map((m) => {
                  const mBest = personalBests.byMode[m.id];
                  return (
                    <Card key={m.id} variant="elevated" style={styles.modeBestCard}>
                      <View style={styles.modeBestHeader}>
                        <View
                          style={[
                            styles.modeBestIconWrap,
                            { backgroundColor: m.color + "20" },
                          ]}
                        >
                          <Ionicons
                            name={m.icon as keyof typeof Ionicons.glyphMap}
                            size={16}
                            color={m.color}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.modeBestTitle} numberOfLines={1}>
                            {m.title}
                          </Text>
                          <Text style={styles.modeBestSub}>
                            {mBest?.gamesPlayed ?? 0} played · {mBest?.gamesWon ?? 0} won
                          </Text>
                        </View>
                      </View>

                      <View style={styles.modeBestStatsRow}>
                        <View style={styles.modeBestStatCol}>
                          <Text style={styles.modeStatLbl}>HIGH SCORE</Text>
                          <Text style={styles.modeStatVal}>
                            {mBest?.highestScore ? mBest.highestScore.toLocaleString() : "—"}
                          </Text>
                        </View>
                        <View style={styles.modeBestStatCol}>
                          <Text style={styles.modeStatLbl}>FASTEST</Text>
                          <Text style={styles.modeStatVal}>
                            {mBest?.fastestWinMs ? formatElapsed(mBest.fastestWinMs) : "—"}
                          </Text>
                        </View>
                        <View style={styles.modeBestStatCol}>
                          <Text style={styles.modeStatLbl}>BEST GUESSES</Text>
                          <Text style={styles.modeStatVal}>
                            {mBest?.lowestGuesses ?? "—"}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  );
                })}
              </View>

              {/* Records by Difficulty */}
              <Text style={styles.sectionHeader}>PERFORMANCE BY DIFFICULTY</Text>
              <View style={styles.recordsList}>
                {DIFFICULTIES.map((d) => {
                  const dBest = personalBests.byDifficulty[d.id];
                  return (
                    <Card key={d.id} variant="default" style={styles.diffRecordRow}>
                      <View style={styles.diffRecordLeft}>
                        <View
                          style={[
                            styles.diffTag,
                            { backgroundColor: d.color + "20" },
                          ]}
                        >
                          <Text style={[styles.diffTagText, { color: d.color }]}>
                            {d.label}
                          </Text>
                        </View>
                        <Text style={styles.diffRangeText}>
                          Range: {d.min}–{d.max}
                        </Text>
                      </View>

                      <View style={styles.diffScoresRow}>
                        <View style={styles.diffScorePill}>
                          <Text style={styles.diffScoreType}>High Score</Text>
                          <Text style={styles.diffScoreNum}>
                            {dBest?.highestScore ? dBest.highestScore.toLocaleString() : "—"}
                          </Text>
                        </View>
                        <View style={styles.diffScorePill}>
                          <Text style={styles.diffScoreType}>Wins</Text>
                          <Text style={styles.diffScoreNum}>
                            {dBest?.gamesWon ?? 0}/{dBest?.gamesPlayed ?? 0}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  );
                })}
              </View>
            </View>
          )}

          {/* TAB 4: CALENDAR & STREAKS */}
          {activeTab === "streaks" && (
            <View style={styles.tabContent}>
              <StreakCalendar
                activeDates={streakData.activeDates}
                dailyCompletedDates={streakData.dailyCompletedDates}
                currentStreak={streakData.currentStreak}
                bestStreak={streakData.bestStreak}
                totalActiveDays={streakData.totalActiveDays}
              />

              <View style={styles.dailyArchiveBanner}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.archiveBannerTitle}>
                    Past Daily Challenge Archive
                  </Text>
                  <Text style={styles.archiveBannerSub}>
                    Browse, solve, or replay challenges from earlier dates.
                  </Text>
                </View>
                <PrimaryButton
                  variant="accent"
                  size="sm"
                  onPress={() => setShowDailyArchive(true)}
                  icon={<Ionicons name="archive" size={14} color={Colors.bg} />}
                >
                  Browse
                </PrimaryButton>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Game Replay Modal */}
        <GameReplayModal
          visible={replayRecord != null}
          record={replayRecord}
          onClose={() => setReplayRecord(null)}
        />

        {/* Daily Archive Modal */}
        <DailyArchiveModal
          visible={showDailyArchive}
          dailyHistory={dailyHistory}
          history={history}
          onClose={() => setShowDailyArchive(false)}
          onPlayArchivedDaily={(dateStr) => {
            setShowDailyArchive(false);
            if (onPlayArchivedDaily) {
              onPlayArchivedDaily(dateStr);
            }
          }}
          onReplayRecord={(rec) => {
            setShowDailyArchive(false);
            setReplayRecord(rec);
          }}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

function TabButton({
  title,
  icon,
  active,
  onPress,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tabBtn, active && styles.tabBtnActive]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Ionicons
        name={icon}
        size={14}
        color={active ? Colors.accent : Colors.textMuted}
      />
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  archiveIconBtn: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: "rgba(255, 184, 0, 0.12)",
    borderWidth: 1,
    borderColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnPressed: {
    opacity: 0.6,
  },
  titleWrap: {
    flex: 1,
    alignItems: "center",
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    marginBottom: 14,
    lineHeight: 18,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  tabBtnActive: {
    backgroundColor: "rgba(255, 184, 0, 0.15)",
  },
  tabBtnText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: Colors.textMuted,
  },
  tabBtnTextActive: {
    color: Colors.accent,
    fontWeight: "700",
  },
  tabContent: {
    gap: 14,
  },
  heroCard: {
    padding: 16,
  },
  heroColumn: {
    alignItems: "center",
  },
  heroLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  heroScore: {
    fontFamily: FontFamily.display,
    fontSize: 36,
    color: Colors.accent,
    lineHeight: 42,
    marginTop: 2,
  },
  heroDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginVertical: 12,
  },
  heroStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  heroStatItem: {
    alignItems: "center",
  },
  heroStatValue: {
    fontFamily: FontFamily.mono,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  heroStatLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  sectionHeader: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginTop: 6,
  },
  chartCard: {
    padding: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  recordsHallRow: {
    flexDirection: "row",
    gap: 8,
  },
  hallCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  hallValue: {
    fontFamily: FontFamily.mono,
    fontSize: 14,
    color: Colors.text,
    fontWeight: "700",
    marginTop: 4,
  },
  hallLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 2,
  },
  specialMilestoneGrid: {
    flexDirection: "row",
    gap: 10,
  },
  specialCard: {
    flex: 1,
    padding: 12,
  },
  specialCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  specialCardTitle: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  specialCardVal: {
    fontFamily: FontFamily.display,
    fontSize: 18,
    color: Colors.text,
  },
  specialCardSub: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  modeScoresGrid: {
    gap: 10,
  },
  modeBestCard: {
    padding: 12,
  },
  modeBestHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  modeBestIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  modeBestTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: Colors.text,
  },
  modeBestSub: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
  },
  modeBestStatsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: Radius.xs,
    padding: 8,
  },
  modeBestStatCol: {
    flex: 1,
    alignItems: "center",
  },
  modeStatLbl: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    color: Colors.textMuted,
  },
  modeStatVal: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 2,
  },
  recordsList: {
    gap: 8,
  },
  diffRecordRow: {
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  diffRecordLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  diffTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  diffTagText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    fontWeight: "700",
  },
  diffRangeText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.textMuted,
  },
  diffScoresRow: {
    flexDirection: "row",
    gap: 8,
  },
  diffScorePill: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
    alignItems: "flex-end",
  },
  diffScoreType: {
    fontFamily: FontFamily.mono,
    fontSize: 8,
    color: Colors.textMuted,
  },
  diffScoreNum: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 1,
  },
  dailyArchiveBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.2)",
    gap: 12,
    marginTop: 8,
  },
  archiveBannerTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: Colors.text,
  },
  archiveBannerSub: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
