import Card from "@/components/ui/Card";
import Colors from "@/constants/colors";
import { getDailySeed } from "@/constants/gameConfig";
import { FontFamily, Radius } from "@/constants/theme";
import type { DailyChallengeRecord, GameHistoryRecord } from "@/types/game";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ArchiveDayItem = {
  dateStr: string;
  displayDate: string;
  isToday: boolean;
  record?: DailyChallengeRecord;
  historyRecord?: GameHistoryRecord;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  dailyHistory: Record<string, DailyChallengeRecord>;
  history: GameHistoryRecord[];
  onPlayArchivedDaily: (dateStr: string) => void;
  onReplayRecord: (record: GameHistoryRecord) => void;
};

export default function DailyArchiveModal({
  visible,
  onClose,
  dailyHistory,
  history,
  onPlayArchivedDaily,
  onReplayRecord,
}: Props) {
  const [baseTimestamp] = useState(() => Date.now());

  // Generate list of the past 30 days
  const pastDays = useMemo(() => {
    const list: ArchiveDayItem[] = [];
    const todaySeed = getDailySeed();

    for (let i = 0; i < 30; i++) {
      const d = new Date(baseTimestamp - i * 24 * 60 * 60 * 1000);
      const seedKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      const displayDate = d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      const startOfDay = new Date(d).setHours(0, 0, 0, 0);
      const endOfDay = new Date(d).setHours(23, 59, 59, 999);

      const rec = dailyHistory[seedKey];
      // Match history record if available
      const hist = history.find(
        (h) => h.isDaily && h.timestamp >= startOfDay && h.timestamp <= endOfDay,
      );

      list.push({
        dateStr: seedKey,
        displayDate,
        isToday: seedKey === todaySeed,
        record: rec,
        historyRecord: hist,
      });
    }

    return list;
  }, [baseTimestamp, dailyHistory, history]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <SafeAreaView style={styles.safe}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Close daily archive"
            >
              <Ionicons name="close" size={22} color={Colors.text} />
            </Pressable>

            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>DAILY PUZZLE ARCHIVE</Text>
              <Text style={styles.headerSub}>
                Replay past puzzles with original seeded targets
              </Text>
            </View>

            <View style={{ width: 38 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.leadText}>
              Every daily challenge puzzle is deterministically generated from its date.
              Past challenges remain fixed and can be solved or replayed at any time.
            </Text>

            <View style={styles.list}>
              {pastDays.map((item) => {
                const isCompleted = item.record?.completed === true;

                return (
                  <Card
                    key={item.dateStr}
                    variant={isCompleted ? "elevated" : "default"}
                    style={[
                      styles.itemCard,
                      item.isToday && styles.todayCard,
                    ]}
                  >
                    <View style={styles.itemLeft}>
                      <View
                        style={[
                          styles.dateIconWrap,
                          isCompleted
                            ? styles.iconCompleted
                            : styles.iconUnsolved,
                        ]}
                      >
                        <Ionicons
                          name={isCompleted ? "checkmark-circle" : "calendar-outline"}
                          size={18}
                          color={isCompleted ? Colors.mint : Colors.textMuted}
                        />
                      </View>

                      <View>
                        <View style={styles.dateRow}>
                          <Text style={styles.dateTitle}>{item.displayDate}</Text>
                          {item.isToday && (
                            <View style={styles.todayPill}>
                              <Text style={styles.todayPillText}>TODAY</Text>
                            </View>
                          )}
                        </View>

                        <Text style={styles.statusText}>
                          {isCompleted
                            ? `Solved in ${item.record?.rounds ?? "?"} rounds · ${item.record?.score ?? 0} pts`
                            : "Unsolved puzzle available"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.itemRight}>
                      {isCompleted && item.historyRecord ? (
                        <Pressable
                          onPress={() => {
                            onClose();
                            onReplayRecord(item.historyRecord!);
                          }}
                          style={({ pressed }) => [
                            styles.actionBtn,
                            styles.replayBtn,
                            pressed && styles.pressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel="Replay daily"
                        >
                          <Ionicons name="play" size={12} color={Colors.accent} />
                          <Text style={styles.replayBtnText}>Replay</Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={() => {
                            onClose();
                            onPlayArchivedDaily(item.dateStr);
                          }}
                          style={({ pressed }) => [
                            styles.actionBtn,
                            styles.playBtn,
                            pressed && styles.pressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel="Play archived daily"
                        >
                          <Ionicons name="flash" size={12} color={Colors.bg} />
                          <Text style={styles.playBtnText}>Play</Text>
                        </Pressable>
                      )}
                    </View>
                  </Card>
                );
              })}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: FontFamily.display,
    fontSize: 16,
    color: Colors.text,
  },
  headerSub: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  leadText: {
    fontFamily: FontFamily.sans,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  list: {
    gap: 10,
  },
  itemCard: {
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  todayCard: {
    borderColor: Colors.accent,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  dateIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCompleted: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
  },
  iconUnsolved: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: Colors.text,
  },
  todayPill: {
    backgroundColor: "rgba(255, 184, 0, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.xs,
  },
  todayPillText: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    color: Colors.accent,
    fontWeight: "700",
  },
  statusText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  itemRight: {
    marginLeft: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  playBtn: {
    backgroundColor: Colors.accent,
  },
  playBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    color: Colors.bg,
  },
  replayBtn: {
    backgroundColor: "rgba(255, 184, 0, 0.12)",
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  replayBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    color: Colors.accent,
  },
  pressed: {
    opacity: 0.6,
  },
});
