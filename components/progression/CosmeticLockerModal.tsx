import Card from "@/components/ui/Card";
import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import { useGame } from "@/context/GameProvider";
import { CosmeticsService } from "@/services/cosmetics/CosmeticsService";
import type { CosmeticItem, CosmeticType } from "@/types/game";
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

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function CosmeticLockerModal({ visible, onClose }: Props) {
  const {
    progression,
    stats,
    competitiveRank,
    cosmetics,
    profile,
    equipCosmetic,
    buzz,
    playSound,
  } = useGame();

  const [activeTab, setActiveTab] = useState<CosmeticType>("avatar");

  // Get decorated catalog with active lock & equip statuses
  const decoratedCatalog = useMemo(() => {
    return CosmeticsService.getDecoratedCatalog(
      progression.level,
      stats.unlockedAchievements,
      competitiveRank.tier,
      cosmetics,
      profile,
    );
  }, [
    progression.level,
    stats.unlockedAchievements,
    competitiveRank.tier,
    cosmetics,
    profile,
  ]);

  const items = useMemo(() => {
    return decoratedCatalog.filter((item) => item.type === activeTab);
  }, [decoratedCatalog, activeTab]);

  function handleEquip(item: CosmeticItem) {
    buzz("medium");
    playSound("button_click");
    equipCosmetic(item);
  }

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
              accessibilityLabel="Close locker"
            >
              <Ionicons name="close" size={22} color={Colors.text} />
            </Pressable>

            <View style={styles.titleWrap}>
              <Text style={styles.headerTitle}>ARCADE LOCKER</Text>
              <Text style={styles.headerSub}>Equip unlocked cosmetics & titles</Text>
            </View>

            <View style={{ width: 38 }} />
          </View>

          {/* Category Tabs */}
          <View style={styles.tabRow}>
            <CategoryTab
              title="Avatars"
              icon="person-circle"
              active={activeTab === "avatar"}
              onPress={() => {
                buzz("light");
                setActiveTab("avatar");
              }}
            />
            <CategoryTab
              title="Themes"
              icon="color-palette"
              active={activeTab === "theme"}
              onPress={() => {
                buzz("light");
                setActiveTab("theme");
              }}
            />
            <CategoryTab
              title="Styles"
              icon="text"
              active={activeTab === "numberStyle"}
              onPress={() => {
                buzz("light");
                setActiveTab("numberStyle");
              }}
            />
            <CategoryTab
              title="Titles"
              icon="ribbon"
              active={activeTab === "title"}
              onPress={() => {
                buzz("light");
                setActiveTab("title");
              }}
            />
          </View>

          {/* Item List */}
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.grid}>
              {items.map((item) => {
                const isUnlocked = item.isUnlocked === true;
                const isEquipped = item.isEquipped === true;

                return (
                  <Card
                    key={item.id}
                    variant={isEquipped ? "elevated" : "default"}
                    style={[
                      styles.card,
                      isEquipped && styles.cardEquipped,
                      !isUnlocked && styles.cardLocked,
                    ]}
                  >
                    <View style={styles.itemHeader}>
                      <View
                        style={[
                          styles.itemIconWrap,
                          {
                            backgroundColor:
                              (item.previewColor ?? Colors.accent) + "22",
                          },
                        ]}
                      >
                        <Ionicons
                          name={(isUnlocked ? item.icon : "lock-closed") as any}
                          size={20}
                          color={
                            isUnlocked
                              ? item.previewColor ?? Colors.accent
                              : Colors.textMuted
                          }
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.itemName,
                            !isUnlocked && styles.nameLocked,
                          ]}
                        >
                          {item.name}
                        </Text>
                        <Text style={styles.itemDesc}>{item.description}</Text>
                      </View>
                    </View>

                    {/* Requirements or Equip Action */}
                    <View style={styles.actionRow}>
                      {!isUnlocked ? (
                        <View style={styles.reqBadge}>
                          <Ionicons
                            name="lock-closed"
                            size={10}
                            color={Colors.textMuted}
                          />
                          <Text style={styles.reqText}>
                            {item.requiredLevel != null
                              ? `Unlocks at Level ${item.requiredLevel}`
                              : item.requiredRankTier != null
                              ? `Requires ${item.requiredRankTier.toUpperCase()} Rank`
                              : item.requiredAchievementId != null
                              ? "Unlocked via Achievement"
                              : "Locked"}
                          </Text>
                        </View>
                      ) : isEquipped ? (
                        <View style={styles.equippedBadge}>
                          <Ionicons
                            name="checkmark-circle"
                            size={12}
                            color={Colors.mint}
                          />
                          <Text style={styles.equippedText}>ACTIVE</Text>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => handleEquip(item)}
                          style={({ pressed }) => [
                            styles.equipBtn,
                            pressed && styles.pressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Equip ${item.name}`}
                        >
                          <Text style={styles.equipBtnText}>Equip</Text>
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

function CategoryTab({
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
  titleWrap: {
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
  tabRow: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: Radius.md,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
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
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  grid: {
    gap: 10,
  },
  card: {
    padding: 14,
    gap: 10,
  },
  cardEquipped: {
    borderColor: Colors.mint,
    backgroundColor: "rgba(34, 197, 94, 0.05)",
  },
  cardLocked: {
    opacity: 0.6,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  itemName: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
    color: Colors.text,
  },
  nameLocked: {
    color: Colors.textMuted,
  },
  itemDesc: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.04)",
    paddingTop: 8,
  },
  reqBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  reqText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.textMuted,
  },
  equippedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.xs,
  },
  equippedText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    fontWeight: "700",
    color: Colors.mint,
  },
  equipBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.xs,
  },
  equipBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    color: Colors.bg,
  },
  pressed: {
    opacity: 0.7,
  },
});
