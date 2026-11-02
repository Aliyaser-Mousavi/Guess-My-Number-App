import { formatElapsed } from "@/components/game/GameTimer";
import Card from "@/components/ui/Card";
import Colors from "@/constants/colors";
import {
  MODE_METADATA,
  getDifficulty,
  type GameMode,
} from "@/constants/gameConfig";
import { FontFamily, Radius } from "@/constants/theme";
import { HistoryService } from "@/services/history/HistoryService";
import type { GameHistoryRecord } from "@/types/game";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  history: GameHistoryRecord[];
  onSelectReplay: (record: GameHistoryRecord) => void;
};

export default function HistoryList({ history, onSelectReplay }: Props) {
  const [modeFilter, setModeFilter] = useState<GameMode | "all">("all");
  const [resultFilter, setResultFilter] = useState<"all" | "won" | "lost">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Filter history
  const filtered = useMemo(() => {
    return HistoryService.filterHistory(history, {
      mode: modeFilter,
      result: resultFilter,
      dateRange: dateFilter,
    });
  }, [history, modeFilter, resultFilter, dateFilter]);

  // Paginate
  const paginated = useMemo(() => {
    return HistoryService.paginateHistory(filtered, page, pageSize);
  }, [filtered, page]);

  function resetFilters() {
    setModeFilter("all");
    setResultFilter("all");
    setDateFilter("all");
    setPage(1);
  }

  return (
    <View style={styles.container}>
      {/* Filters Section */}
      <View style={styles.filterSection}>
        {/* Outcome Filter Chips */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterGroupLabel}>OUTCOME</Text>
          <View style={styles.chipRow}>
            {(["all", "won", "lost"] as const).map((r) => (
              <Pressable
                key={r}
                onPress={() => {
                  setResultFilter(r);
                  setPage(1);
                }}
                style={[
                  styles.filterChip,
                  resultFilter === r && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    resultFilter === r && styles.filterChipTextActive,
                  ]}
                >
                  {r === "all" ? "All Results" : r === "won" ? "Victories" : "Losses"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Date Filter Chips */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterGroupLabel}>TIMEFRAME</Text>
          <View style={styles.chipRow}>
            {(["all", "today", "week", "month"] as const).map((d) => (
              <Pressable
                key={d}
                onPress={() => {
                  setDateFilter(d);
                  setPage(1);
                }}
                style={[
                  styles.filterChip,
                  dateFilter === d && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    dateFilter === d && styles.filterChipTextActive,
                  ]}
                >
                  {d === "all"
                    ? "Lifetime"
                    : d === "today"
                    ? "Today"
                    : d === "week"
                    ? "Past 7 Days"
                    : "Past Month"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Mode Filter Chips */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterGroupLabel}>GAME MODE</Text>
          <View style={styles.modeChipsWrap}>
            <Pressable
              onPress={() => {
                setModeFilter("all");
                setPage(1);
              }}
              style={[
                styles.modeChip,
                modeFilter === "all" && styles.modeChipActive,
              ]}
            >
              <Text
                style={[
                  styles.modeChipText,
                  modeFilter === "all" && styles.modeChipTextActive,
                ]}
              >
                All Modes
              </Text>
            </Pressable>
            {MODE_METADATA.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => {
                  setModeFilter(m.id);
                  setPage(1);
                }}
                style={[
                  styles.modeChip,
                  modeFilter === m.id && {
                    borderColor: m.color,
                    backgroundColor: m.color + "22",
                  },
                ]}
              >
                <Ionicons
                  name={m.icon as keyof typeof Ionicons.glyphMap}
                  size={12}
                  color={modeFilter === m.id ? m.color : Colors.textMuted}
                />
                <Text
                  style={[
                    styles.modeChipText,
                    modeFilter === m.id && { color: m.color, fontWeight: "700" },
                  ]}
                >
                  {m.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Results Count & Reset */}
      <View style={styles.resultsCountBar}>
        <Text style={styles.resultsCountText}>
          {filtered.length} {filtered.length === 1 ? "match" : "matches"} found
        </Text>
        {(modeFilter !== "all" ||
          resultFilter !== "all" ||
          dateFilter !== "all") && (
          <Pressable onPress={resetFilters}>
            <Text style={styles.resetBtnText}>Clear Filters</Text>
          </Pressable>
        )}
      </View>

      {/* List Content */}
      {paginated.items.length === 0 ? (
        <Card variant="default" style={styles.emptyCard}>
          <Ionicons name="file-tray-outline" size={32} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No Match Records Found</Text>
          <Text style={styles.emptySub}>
            {history.length === 0
              ? "Completed games will automatically appear here with full replay data."
              : "Try adjusting your filters above to see more records."}
          </Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {paginated.items.map((item) => {
            const diff = getDifficulty(item.difficulty);
            const modeMeta = MODE_METADATA.find((m) => m.id === item.mode);
            const dateStr = new Date(item.timestamp).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <Card key={item.id} variant="elevated" style={styles.card}>
                {/* Top Row: Mode, Difficulty, Result */}
                <View style={styles.cardHeader}>
                  <View style={styles.modeBadgeWrap}>
                    <View
                      style={[
                        styles.modeIconCircle,
                        { backgroundColor: (modeMeta?.color ?? Colors.primary) + "22" },
                      ]}
                    >
                      <Ionicons
                        name={(modeMeta?.icon ?? "game-controller") as any}
                        size={14}
                        color={modeMeta?.color ?? Colors.primary}
                      />
                    </View>
                    <View>
                      <Text style={styles.cardModeTitle}>
                        {modeMeta?.title ?? item.mode}
                      </Text>
                      <Text style={styles.cardDateText}>{dateStr}</Text>
                    </View>
                  </View>

                  <View style={styles.headerRight}>
                    <View
                      style={[
                        styles.diffPill,
                        { borderColor: diff.color + "44", backgroundColor: diff.color + "15" },
                      ]}
                    >
                      <Text style={[styles.diffPillText, { color: diff.color }]}>
                        {diff.label}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.resultBadge,
                        item.won ? styles.resultWon : styles.resultLost,
                      ]}
                    >
                      <Text
                        style={[
                          styles.resultBadgeText,
                          item.won ? styles.textWon : styles.textLost,
                        ]}
                      >
                        {item.won ? "WON" : "LOST"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Score & Key Metrics Row */}
                <View style={styles.metricsRow}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>SCORE</Text>
                    <Text style={styles.scoreNumber}>
                      {item.score.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>ATTEMPTS</Text>
                    <Text style={styles.metricValue}>{item.rounds}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>TIME</Text>
                    <Text style={styles.metricValue}>
                      {formatElapsed(item.elapsedMs)}
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>HINTS</Text>
                    <Text style={styles.metricValue}>{item.hintsUsed}</Text>
                  </View>
                </View>

                {/* Guess Sequence */}
                {item.guesses && item.guesses.length > 0 && (
                  <View style={styles.sequenceWrap}>
                    <Text style={styles.sequenceLabel}>GUESS SEQUENCE:</Text>
                    <View style={styles.sequenceChipsRow}>
                      {item.guesses.map((g, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.guessChip,
                            idx === item.guesses.length - 1 && item.won && styles.guessChipWon,
                          ]}
                        >
                          <Text
                            style={[
                              styles.guessChipText,
                              idx === item.guesses.length - 1 && item.won && styles.guessChipTextWon,
                            ]}
                          >
                            {g}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Card Footer: ID and Replay CTA */}
                <View style={styles.cardFooter}>
                  <Text style={styles.gameIdText} numberOfLines={1}>
                    ID: {item.id}
                  </Text>
                  <Pressable
                    onPress={() => onSelectReplay(item)}
                    style={({ pressed }) => [
                      styles.replayBtn,
                      pressed && styles.btnPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Replay this match"
                  >
                    <Ionicons name="play" size={13} color={Colors.accent} />
                    <Text style={styles.replayBtnText}>Replay</Text>
                  </Pressable>
                </View>
              </Card>
            );
          })}

          {/* Pagination Controls */}
          {paginated.totalPages > 1 && (
            <View style={styles.paginationBar}>
              <Pressable
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={[
                  styles.pageBtn,
                  page <= 1 && styles.pageBtnDisabled,
                ]}
              >
                <Ionicons name="chevron-back" size={16} color={Colors.text} />
                <Text style={styles.pageBtnText}>Prev</Text>
              </Pressable>

              <Text style={styles.pageIndicator}>
                Page {paginated.page} of {paginated.totalPages}
              </Text>

              <Pressable
                onPress={() => setPage((p) => Math.min(paginated.totalPages, p + 1))}
                disabled={!paginated.hasMore}
                style={[
                  styles.pageBtn,
                  !paginated.hasMore && styles.pageBtnDisabled,
                ]}
              >
                <Text style={styles.pageBtnText}>Next</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.text} />
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  filterSection: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    gap: 12,
  },
  filterGroup: {
    gap: 6,
  },
  filterGroupLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  filterChipActive: {
    backgroundColor: "rgba(255, 184, 0, 0.15)",
    borderColor: Colors.accent,
  },
  filterChipText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: Colors.textMuted,
  },
  filterChipTextActive: {
    color: Colors.accent,
    fontWeight: "700",
  },
  modeChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  modeChipActive: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(99, 102, 241, 0.15)",
  },
  modeChipText: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
  },
  modeChipTextActive: {
    color: Colors.text,
    fontFamily: FontFamily.sansBold,
  },
  resultsCountBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  resultsCountText: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    color: Colors.textMuted,
  },
  resetBtnText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: Colors.accent,
  },
  list: {
    gap: 12,
  },
  card: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modeBadgeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  cardModeTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: Colors.text,
  },
  cardDateText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.textMuted,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  diffPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    borderWidth: 1,
  },
  diffPillText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    fontWeight: "700",
  },
  resultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  resultWon: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
  },
  resultLost: {
    backgroundColor: "rgba(255, 82, 82, 0.15)",
  },
  resultBadgeText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    fontWeight: "700",
  },
  textWon: {
    color: Colors.mint,
  },
  textLost: {
    color: Colors.coral,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  metricItem: {
    alignItems: "center",
  },
  metricLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    color: Colors.textMuted,
  },
  scoreNumber: {
    fontFamily: FontFamily.mono,
    fontSize: 14,
    fontWeight: "700",
    color: Colors.accent,
    marginTop: 2,
  },
  metricValue: {
    fontFamily: FontFamily.mono,
    fontSize: 13,
    color: Colors.text,
    marginTop: 2,
  },
  sequenceWrap: {
    marginBottom: 10,
  },
  sequenceLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  sequenceChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  guessChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  guessChipWon: {
    backgroundColor: "rgba(255, 184, 0, 0.2)",
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  guessChipText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.textMuted,
  },
  guessChipTextWon: {
    color: Colors.accent,
    fontWeight: "700",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
    paddingTop: 8,
  },
  gameIdText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.textMuted,
    maxWidth: "60%",
  },
  replayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.xs,
    backgroundColor: "rgba(255, 184, 0, 0.12)",
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  replayBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
    color: Colors.accent,
  },
  btnPressed: {
    opacity: 0.6,
  },
  paginationBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingVertical: 8,
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
  },
  pageBtnDisabled: {
    opacity: 0.3,
  },
  pageBtnText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: Colors.text,
  },
  pageIndicator: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    color: Colors.textMuted,
  },
  emptyCard: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 15,
    color: Colors.text,
    marginTop: 4,
  },
  emptySub: {
    fontFamily: FontFamily.sans,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
});
