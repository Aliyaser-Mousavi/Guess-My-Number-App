// ==============================================================================
// Screen: MultiplayerLobbyScreen.tsx
// Description: Real-time 1v1 matchmaking lobby with Skill-Based Matchmaking (SBMM),
//              tactical radar scanner animation, difficulty tuning, private room
//              codes (6-char alphanumeric), and head-to-head VS readiness synchronization.
// ==============================================================================

import PlayerAvatar from "@/components/profile/PlayerAvatar";
import PrimaryButton from "@/components/ui/PrimaryButton";
import ScreenBackground from "@/components/ui/ScreenBackground";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { type DifficultyId, getDifficulty } from "@/constants/gameConfig";
import { FontFamily, Radius } from "@/constants/theme";
import { useAppAlert } from "@/context/AlertProvider";
import { useAuth } from "@/context/AuthProvider";
import { useGame } from "@/context/GameProvider";
import {
  MultiplayerService,
  type OpponentInfo,
} from "@/services/multiplayer/MultiplayerService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export interface MultiplayerGameStartParams {
  matchId: string;
  opponent?: OpponentInfo;
  minRange: number;
  maxRange: number;
  livesRemaining: number;
  difficulty: DifficultyId;
  isHost?: boolean;
}

type Props = {
  onBack: () => void;
  onStartMatch: (params: MultiplayerGameStartParams) => void;
};

type TabMode = "queue" | "private";

const DIFFICULTY_PRESETS: {
  id: DifficultyId;
  label: string;
  badge: string;
  rangeText: string;
  livesText: string;
  color: string;
}[] = [
  {
    id: "easy",
    label: "Easy",
    badge: "1-50",
    rangeText: "Range 1 – 50",
    livesText: "8 Lives",
    color: "#3DDC97",
  },
  {
    id: "medium",
    label: "Medium",
    badge: "1-100",
    rangeText: "Range 1 – 100",
    livesText: "7 Lives",
    color: Colors.primary,
  },
  {
    id: "hard",
    label: "Hard",
    badge: "1-200",
    rangeText: "Range 1 – 200",
    livesText: "8 Lives",
    color: Colors.accent,
  },
];

export default function MultiplayerLobbyScreen({ onBack, onStartMatch }: Props) {
  const { user } = useAuth();
  const { buzz, playSound, profile, competitiveRank } = useGame();
  const { showAlert } = useAppAlert();

  const [tab, setTab] = useState<TabMode>("queue");
  const [difficulty, setDifficulty] = useState<DifficultyId>("medium");
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);

  // Private room states
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [createdMatchId, setCreatedMatchId] = useState<string | null>(null);
  const [inputRoomCode, setInputRoomCode] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [opponentInfo, setOpponentInfo] = useState<OpponentInfo | null>(null);
  const [inPrivateLobby, setInPrivateLobby] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const searchTimerRef = useRef<any>(null);
  const pollTimerRef = useRef<any>(null);
  const privateLobbyTimerRef = useRef<any>(null);

  // Animated Radar Scanning & Halo Pulse
  const radarRotation = useSharedValue(0);
  const radarPulse = useSharedValue(0.4);

  useEffect(() => {
    if (isSearching) {
      radarRotation.value = withRepeat(
        withTiming(360, { duration: 3200, easing: Easing.linear }),
        -1,
        false,
      );
      radarPulse.value = withRepeat(
        withSequence(
          withTiming(0.9, { duration: 1200 }),
          withTiming(0.3, { duration: 1200 }),
        ),
        -1,
        true,
      );
    } else {
      radarRotation.value = 0;
      radarPulse.value = 0.4;
    }
  }, [isSearching, radarRotation, radarPulse]);

  const animatedScannerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${radarRotation.value}deg` }],
  }));

  const animatedHaloStyle = useAnimatedStyle(() => {
    const scale = interpolate(radarPulse.value, [0.3, 0.9], [0.95, 1.1]);
    return {
      opacity: radarPulse.value,
      transform: [{ scale }],
    };
  });

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearInterval(searchTimerRef.current);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (privateLobbyTimerRef.current) clearInterval(privateLobbyTimerRef.current);
      if (isSearching) {
        MultiplayerService.cancelQueue();
      }
    };
  }, [isSearching]);

  // Handle Matchmaking Search Timer
  useEffect(() => {
    if (!isSearching) {
      if (searchTimerRef.current) {
        clearInterval(searchTimerRef.current);
        searchTimerRef.current = null;
      }
      return;
    }

    const interval = setInterval(() => {
      setSearchTime((prev) => prev + 1);
    }, 1000);
    searchTimerRef.current = interval;

    return () => {
      clearInterval(interval);
      if (searchTimerRef.current === interval) {
        searchTimerRef.current = null;
      }
    };
  }, [isSearching]);

  // Handle Matchmaking Polling
  useEffect(() => {
    if (isSearching) {
      pollTimerRef.current = setInterval(async () => {
        const pollResult = await MultiplayerService.pollQueue();
        if (pollResult.status === "matched" && pollResult.matchId) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setIsSearching(false);
          buzz("success");
          playSound("victory");
          const diffConfig = getDifficulty(difficulty);
          onStartMatch({
            matchId: pollResult.matchId,
            opponent: pollResult.opponent,
            minRange: pollResult.minRange ?? diffConfig.min,
            maxRange: pollResult.maxRange ?? diffConfig.max,
            livesRemaining: pollResult.livesRemaining ?? diffConfig.playerLives,
            difficulty,
          });
        }
      }, 2000);
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isSearching, difficulty, buzz, playSound, onStartMatch]);

  // Poll Private Lobby Status when inside a private room
  useEffect(() => {
    if (inPrivateLobby && createdMatchId) {
      privateLobbyTimerRef.current = setInterval(async () => {
        const state = await MultiplayerService.pollMatchState(createdMatchId);
        if (state) {
          if (state.opponent) {
            setOpponentInfo(state.opponent);
          }
          if (state.playerBReady !== undefined) {
            setOpponentReady(state.playerBReady);
          }
          if (state.status === "in_progress" || (state.playerAReady && state.playerBReady)) {
            if (privateLobbyTimerRef.current) clearInterval(privateLobbyTimerRef.current);
            buzz("success");
            playSound("victory");
            onStartMatch({
              matchId: createdMatchId,
              opponent: state.opponent,
              minRange: state.minRange,
              maxRange: state.maxRange,
              livesRemaining: state.livesRemaining,
              difficulty,
              isHost: Boolean(createdRoomCode),
            });
          }
        }
      }, 1500);
    } else {
      if (privateLobbyTimerRef.current) {
        clearInterval(privateLobbyTimerRef.current);
        privateLobbyTimerRef.current = null;
      }
    }
    return () => {
      if (privateLobbyTimerRef.current) clearInterval(privateLobbyTimerRef.current);
    };
  }, [inPrivateLobby, createdMatchId, createdRoomCode, difficulty, buzz, playSound, onStartMatch]);

  const handleStartSearching = async () => {
    if (!user) {
      showAlert(
        "Account Required",
        "Please sign in or create an account to play online ranked 1v1.",
      );
      return;
    }
    buzz("light");
    playSound("button_click");
    setSearchTime(0);
    setIsSearching(true);

    const joinResult = await MultiplayerService.joinQueue(difficulty);
    if (!joinResult.success) {
      setIsSearching(false);
      showAlert(
        "Matchmaking Error",
        joinResult.error || "Failed to enter matchmaking queue.",
      );
      return;
    }

    if (joinResult.status === "matched" && joinResult.matchId) {
      setIsSearching(false);
      buzz("success");
      playSound("victory");
      const diffConfig = getDifficulty(difficulty);
      onStartMatch({
        matchId: joinResult.matchId,
        opponent: joinResult.opponent,
        minRange: joinResult.minRange ?? diffConfig.min,
        maxRange: joinResult.maxRange ?? diffConfig.max,
        livesRemaining: joinResult.livesRemaining ?? diffConfig.playerLives,
        difficulty,
      });
    }
  };

  const handleCancelSearching = async () => {
    buzz("light");
    playSound("button_click");
    setIsSearching(false);
    await MultiplayerService.cancelQueue();
  };

  const handleCreatePrivateRoom = async () => {
    if (!user) {
      showAlert(
        "Account Required",
        "Please sign in or create an account to host a private battle room.",
      );
      return;
    }
    buzz("light");
    playSound("button_click");
    setIsCreating(true);

    const res = await MultiplayerService.createPrivateRoom(difficulty);
    setIsCreating(false);

    if (res.success && res.roomCode && res.matchId) {
      setCreatedRoomCode(res.roomCode);
      setCreatedMatchId(res.matchId);
      setInPrivateLobby(true);
      buzz("success");
    } else {
      showAlert("Room Creation Failed", res.error || "Could not generate private room.");
    }
  };

  const handleJoinPrivateRoom = async () => {
    if (!user) {
      showAlert(
        "Account Required",
        "Please sign in or create an account to enter private battle rooms.",
      );
      return;
    }
    const cleanCode = inputRoomCode.trim().toUpperCase();
    if (cleanCode.length !== 6) {
      showAlert("Invalid Room Code", "Please enter a valid 6-character room code.");
      return;
    }
    buzz("light");
    playSound("button_click");
    setIsJoining(true);

    const res = await MultiplayerService.joinPrivateRoom(cleanCode);
    setIsJoining(false);

    if (res.success && res.matchId) {
      setCreatedMatchId(res.matchId);
      setCreatedRoomCode(cleanCode);
      setInPrivateLobby(true);
      buzz("success");
    } else {
      showAlert("Room Entry Failed", res.error || "Room was not found or has already filled.");
    }
  };

  const handleToggleReady = async () => {
    if (!createdMatchId) return;
    buzz("light");
    playSound("button_click");
    const nextReady = !isReady;
    setIsReady(nextReady);
    await MultiplayerService.toggleReady(createdMatchId, nextReady);
  };

  const handleLeavePrivateLobby = () => {
    buzz("light");
    playSound("button_click");
    if (createdMatchId) {
      MultiplayerService.leavePrivateRoom(createdMatchId);
    }
    setInPrivateLobby(false);
    setCreatedRoomCode(null);
    setCreatedMatchId(null);
    setIsReady(false);
    setOpponentReady(false);
    setOpponentInfo(null);
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* Navigation Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            onPress={inPrivateLobby ? handleLeavePrivateLobby : onBack}
            accessibilityRole="button"
            accessibilityLabel={inPrivateLobby ? "Leave private room" : "Back to menu"}
          >
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Title size="md">1v1 ONLINE ARENA</Title>
            <Text style={styles.headerSubtitle}>
              {inPrivateLobby
                ? `ROOM CODE: ${createdRoomCode}`
                : "REAL-TIME MULTIPLAYER DUEL"}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Mode Pill Tabs (Ranked vs Private) */}
          {!inPrivateLobby && !isSearching && (
            <View style={styles.tabContainer}>
              <Pressable
                style={[styles.tabButton, tab === "queue" && styles.tabButtonActive]}
                onPress={() => {
                  buzz("light");
                  playSound("button_click");
                  setTab("queue");
                }}
              >
                <Ionicons
                  name="flash"
                  size={16}
                  color={tab === "queue" ? Colors.primary : Colors.textDim}
                />
                <Text style={[styles.tabText, tab === "queue" && styles.tabTextActive]}>
                  Ranked Matchmaking
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tabButton, tab === "private" && styles.tabButtonActive]}
                onPress={() => {
                  buzz("light");
                  playSound("button_click");
                  setTab("private");
                }}
              >
                <Ionicons
                  name="shield"
                  size={16}
                  color={tab === "private" ? Colors.accent : Colors.textDim}
                />
                <Text style={[styles.tabText, tab === "private" && styles.tabTextActive]}>
                  Private Room
                </Text>
              </Pressable>
            </View>
          )}

          {/* Difficulty Tuning Cards */}
          {!inPrivateLobby && !isSearching && (
            <View style={styles.difficultySection}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="options-outline" size={15} color={Colors.primary} />
                <Text style={styles.sectionHeaderTitle}>MATCH DIFFICULTY PROTOCOL</Text>
              </View>

              <View style={styles.difficultyGrid}>
                {DIFFICULTY_PRESETS.map((d) => {
                  const isSelected = difficulty === d.id;
                  return (
                    <Pressable
                      key={d.id}
                      style={({ pressed }) => [
                        styles.diffCard,
                        isSelected && { borderColor: d.color, backgroundColor: `${d.color}15` },
                        pressed && styles.pressed,
                      ]}
                      onPress={() => {
                        buzz("light");
                        playSound("button_click");
                        setDifficulty(d.id);
                      }}
                    >
                      <View style={styles.diffCardTop}>
                        <Text style={[styles.diffCardName, isSelected && { color: d.color }]}>
                          {d.label}
                        </Text>
                        <View style={[styles.diffBadge, { backgroundColor: `${d.color}25` }]}>
                          <Text style={[styles.diffBadgeText, { color: d.color }]}>
                            {d.badge}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.diffSubText}>{d.rangeText}</Text>
                      <Text style={styles.diffMetaText}>{d.livesText}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* TAB 1: Ranked Matchmaking Queue */}
          {tab === "queue" && !inPrivateLobby && (
            <View style={styles.arenaCardWrapper}>
              {!isSearching ? (
                <View style={styles.queueLobbyBox}>
                  {/* Tactical Arena Shield Icon */}
                  <View style={styles.arenaIconFrame}>
                    <LinearGradient
                      colors={["rgba(0, 210, 180, 0.25)", "rgba(0, 210, 180, 0.05)"]}
                      style={styles.arenaIconGradient}
                    >
                      <Ionicons name="planet-outline" size={48} color={Colors.primary} />
                    </LinearGradient>
                  </View>

                  <Text style={styles.arenaHeading}>SKILL-BASED COMPETITIVE DUEL</Text>
                  <Text style={styles.arenaDescription}>
                    Challenge players matched strictly to your Competitive Rating (CR).
                    Both players deduce the same target number in real-time. The fastest
                    mind takes the rating spoils.
                  </Text>

                  {/* Standing Pill Preview */}
                  <View style={styles.currentRatingPill}>
                    <Ionicons
                      name={competitiveRank.tierIcon as any}
                      size={15}
                      color={competitiveRank.tierColor}
                    />
                    <Text style={styles.currentRatingText}>
                      Current Standing:{" "}
                      <Text style={{ color: competitiveRank.tierColor, fontFamily: FontFamily.monoBold }}>
                        {competitiveRank.label} ({competitiveRank.rating} CR)
                      </Text>
                    </Text>
                  </View>

                  <PrimaryButton
                    onPress={handleStartSearching}
                    variant="primary"
                    size="lg"
                    style={styles.fullWidthAction}
                    icon={<Ionicons name="search" size={18} color={Colors.bg} />}
                  >
                    FIND 1v1 MATCH
                  </PrimaryButton>
                </View>
              ) : (
                /* Animated Matchmaking Radar View */
                <View style={styles.searchingRadarBox}>
                  {/* Radar Core Animation */}
                  <View style={styles.radarVisualContainer}>
                    <Animated.View style={[styles.radarAmbientGlow, animatedHaloStyle]} />
                    <View style={styles.radarOuterRing} />
                    <View style={styles.radarMidRing} />
                    <Animated.View style={[styles.radarRotator, animatedScannerStyle]}>
                      <View style={styles.radarLine} />
                      <View style={styles.radarDot} />
                    </Animated.View>
                    <View style={styles.radarCenterBlip}>
                      <Ionicons name="radio" size={24} color={Colors.primary} />
                    </View>
                  </View>

                  <Text style={styles.searchingStatusTitle}>SCANNING ORBITAL FREQUENCIES...</Text>
                  <Text style={styles.searchingClock}>
                    {Math.floor(searchTime / 60)}:{(searchTime % 60).toString().padStart(2, "0")}
                  </Text>
                  <Text style={styles.searchingFootnote}>
                    Matching with rival hunters near rating: {competitiveRank.rating} CR
                  </Text>

                  <PrimaryButton
                    onPress={handleCancelSearching}
                    variant="secondary"
                    size="md"
                    style={styles.fullWidthAction}
                    icon={<Ionicons name="close-circle-outline" size={18} color={Colors.text} />}
                  >
                    CANCEL SEARCH
                  </PrimaryButton>
                </View>
              )}
            </View>
          )}

          {/* TAB 2: Private Room Setup */}
          {tab === "private" && !inPrivateLobby && (
            <View style={styles.privateSetupWrapper}>
              {/* Card A: Host a Room */}
              <View style={styles.privateActionCard}>
                <View style={styles.privateCardHeader}>
                  <View style={[styles.privateIconWrap, { backgroundColor: "rgba(255, 184, 0, 0.14)" }]}>
                    <Ionicons name="key-outline" size={22} color={Colors.accent} />
                  </View>
                  <View style={styles.privateCardHeaderMeta}>
                    <Text style={styles.privateActionHeading}>HOST PRIVATE ROOM</Text>
                    <Text style={styles.privateActionSub}>
                      Generate a unique 6-digit access code for a friend.
                    </Text>
                  </View>
                </View>

                <PrimaryButton
                  onPress={handleCreatePrivateRoom}
                  variant="accent"
                  size="md"
                  disabled={isCreating}
                  style={styles.fullWidthAction}
                  icon={<Ionicons name="add" size={18} color={Colors.bg} />}
                >
                  {isCreating ? "GENERATING ROOM..." : "CREATE ROOM"}
                </PrimaryButton>
              </View>

              {/* Card B: Join a Room */}
              <View style={styles.privateActionCard}>
                <View style={styles.privateCardHeader}>
                  <View style={[styles.privateIconWrap, { backgroundColor: "rgba(0, 210, 180, 0.14)" }]}>
                    <Ionicons name="enter-outline" size={22} color={Colors.primary} />
                  </View>
                  <View style={styles.privateCardHeaderMeta}>
                    <Text style={styles.privateActionHeading}>JOIN PRIVATE ROOM</Text>
                    <Text style={styles.privateActionSub}>
                      Enter the 6-character room code shared with you.
                    </Text>
                  </View>
                </View>

                <TextInput
                  style={styles.codeInputField}
                  placeholder="CODE (e.g. A9B2X7)"
                  placeholderTextColor={Colors.textDim}
                  value={inputRoomCode}
                  onChangeText={(val) => setInputRoomCode(val.toUpperCase())}
                  maxLength={6}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />

                <PrimaryButton
                  onPress={handleJoinPrivateRoom}
                  variant="primary"
                  size="md"
                  disabled={isJoining || inputRoomCode.trim().length !== 6}
                  style={styles.fullWidthAction}
                  icon={<Ionicons name="arrow-forward" size={18} color={Colors.bg} />}
                >
                  {isJoining ? "CONNECTING..." : "ENTER ROOM"}
                </PrimaryButton>
              </View>
            </View>
          )}

          {/* IN PRIVATE LOBBY: Head-to-Head Headquarter View */}
          {inPrivateLobby && (
            <View style={styles.headToHeadCard}>
              {/* Room Code Banner */}
              <View style={styles.codeDisplayBanner}>
                <Text style={styles.codeDisplayTitle}>SHARE THIS ROOM CODE</Text>
                <Text style={styles.codeDisplayString}>{createdRoomCode}</Text>
                <Text style={styles.codeDisplayTip}>Waiting for opponent to connect and ready up</Text>
              </View>

              {/* Head-to-Head VS Arena Presentation */}
              <View style={styles.vsDuelArena}>
                {/* Player 1: Local */}
                <View style={styles.duelCombatantCol}>
                  <View style={[styles.duelAvatarRing, isReady && styles.duelAvatarRingReady]}>
                    <PlayerAvatar avatarId={profile.avatarId} size={64} />
                    {isReady && (
                      <View style={styles.readyCheckBadge}>
                        <Ionicons name="checkmark-circle" size={20} color={Colors.mint} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.duelPlayerName} numberOfLines={1}>
                    {profile.displayName} (YOU)
                  </Text>
                  <View
                    style={[
                      styles.readyStatusBadge,
                      isReady ? styles.readyStatusBadgeActive : styles.readyStatusBadgePending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.readyStatusText,
                        isReady && { color: Colors.mint },
                      ]}
                    >
                      {isReady ? "READY" : "NOT READY"}
                    </Text>
                  </View>
                </View>

                {/* Tactical VS Divider */}
                <View style={styles.vsCenterColumn}>
                  <LinearGradient
                    colors={["rgba(255, 82, 82, 0.4)", "rgba(255, 82, 82, 0.1)"]}
                    style={styles.vsBadgeCircle}
                  >
                    <Text style={styles.vsBadgeLabel}>VS</Text>
                  </LinearGradient>
                  <Ionicons name="flash" size={18} color={Colors.coral} />
                </View>

                {/* Player 2: Opponent */}
                <View style={styles.duelCombatantCol}>
                  <View
                    style={[
                      styles.duelAvatarRing,
                      opponentReady && styles.duelAvatarRingReady,
                      !opponentInfo && styles.duelAvatarRingEmpty,
                    ]}
                  >
                    {opponentInfo ? (
                      <PlayerAvatar avatarId={opponentInfo.avatarId} size={64} />
                    ) : (
                      <Ionicons name="help" size={32} color={Colors.textDim} />
                    )}
                    {opponentReady && (
                      <View style={styles.readyCheckBadge}>
                        <Ionicons name="checkmark-circle" size={20} color={Colors.mint} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.duelPlayerName} numberOfLines={1}>
                    {opponentInfo ? opponentInfo.displayName : "WAITING..."}
                  </Text>
                  <View
                    style={[
                      styles.readyStatusBadge,
                      opponentReady ? styles.readyStatusBadgeActive : styles.readyStatusBadgePending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.readyStatusText,
                        opponentReady && { color: Colors.mint },
                      ]}
                    >
                      {opponentReady ? "READY" : opponentInfo ? "STANDBY" : "SLOT OPEN"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Lobby Actions */}
              <View style={styles.duelActionButtons}>
                <PrimaryButton
                  onPress={handleToggleReady}
                  variant={isReady ? "secondary" : "accent"}
                  size="lg"
                  style={styles.fullWidthAction}
                  icon={
                    <Ionicons
                      name={isReady ? "close-circle" : "checkmark-circle"}
                      size={20}
                      color={isReady ? Colors.text : Colors.bg}
                    />
                  }
                >
                  {isReady ? "CANCEL READY" : "CONFIRM READY"}
                </PrimaryButton>

                <PrimaryButton
                  onPress={handleLeavePrivateLobby}
                  variant="secondary"
                  size="md"
                  style={styles.fullWidthAction}
                >
                  LEAVE ROOM
                </PrimaryButton>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitleWrap: {
    alignItems: "center",
  },
  headerSubtitle: {
    fontFamily: FontFamily.monoBold,
    fontSize: 9,
    color: Colors.accent,
    letterSpacing: 1.2,
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pressed: {
    opacity: 0.75,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },

  /* Tab Navigation */
  tabContainer: {
    flexDirection: "row",
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.full,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    borderRadius: Radius.full,
  },
  tabButtonActive: {
    backgroundColor: Colors.surfaceSoft,
  },
  tabText: {
    fontSize: 13,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textDim,
  },
  tabTextActive: {
    color: Colors.text,
    fontFamily: FontFamily.bodyBold,
  },

  /* Difficulty Selection */
  difficultySection: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 2,
  },
  sectionHeaderTitle: {
    fontFamily: FontFamily.monoBold,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1.2,
  },
  difficultyGrid: {
    flexDirection: "row",
    gap: 8,
  },
  diffCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 4,
  },
  diffCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  diffCardName: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
    color: Colors.text,
  },
  diffBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  diffBadgeText: {
    fontFamily: FontFamily.monoBold,
    fontSize: 9,
  },
  diffSubText: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
  diffMetaText: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 10,
    color: Colors.textDim,
  },

  /* Queue Lobby View */
  arenaCardWrapper: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 22,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  queueLobbyBox: {
    alignItems: "center",
    width: "100%",
  },
  arenaIconFrame: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  arenaIconGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  arenaHeading: {
    fontFamily: FontFamily.display,
    fontSize: 17,
    color: Colors.text,
    letterSpacing: 0.5,
    textAlign: "center",
    marginBottom: 8,
  },
  arenaDescription: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  currentRatingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.bgElevated,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  currentRatingText: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: Colors.textDim,
  },
  fullWidthAction: {
    width: "100%",
  },

  /* Searching Radar Box */
  searchingRadarBox: {
    alignItems: "center",
    width: "100%",
    paddingVertical: 12,
  },
  radarVisualContainer: {
    width: 170,
    height: 170,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 20,
  },
  radarAmbientGlow: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(0, 210, 180, 0.12)",
  },
  radarOuterRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: "rgba(0, 210, 180, 0.3)",
    borderStyle: "dashed",
  },
  radarMidRing: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    borderColor: "rgba(0, 210, 180, 0.2)",
  },
  radarRotator: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  radarLine: {
    width: 1.5,
    height: 80,
    backgroundColor: Colors.primary,
  },
  radarDot: {
    position: "absolute",
    top: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  radarCenterBlip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  searchingStatusTitle: {
    fontFamily: FontFamily.monoBold,
    fontSize: 13,
    color: Colors.primary,
    letterSpacing: 1.2,
    marginBottom: 6,
    textAlign: "center",
  },
  searchingClock: {
    fontFamily: FontFamily.display,
    fontSize: 36,
    color: Colors.text,
    letterSpacing: 1,
    marginBottom: 6,
  },
  searchingFootnote: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: Colors.textDim,
    textAlign: "center",
    marginBottom: 22,
  },

  /* Private Room Setup */
  privateSetupWrapper: {
    gap: 14,
  },
  privateActionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  privateCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  privateIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  privateCardHeaderMeta: {
    flex: 1,
  },
  privateActionHeading: {
    fontFamily: FontFamily.sansBold,
    fontSize: 15,
    color: Colors.text,
  },
  privateActionSub: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: Colors.textDim,
    marginTop: 2,
  },
  codeInputField: {
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.md,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    fontFamily: FontFamily.display,
    fontSize: 20,
    color: Colors.text,
    letterSpacing: 4,
    textAlign: "center",
  },

  /* Head-to-Head Arena */
  headToHeadCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 20,
    borderWidth: 1.5,
    borderColor: Colors.borderAccent,
    gap: 20,
  },
  codeDisplayBanner: {
    alignItems: "center",
    backgroundColor: "rgba(255, 184, 0, 0.08)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.3)",
    gap: 4,
  },
  codeDisplayTitle: {
    fontFamily: FontFamily.monoBold,
    fontSize: 10,
    color: Colors.accent,
    letterSpacing: 1.4,
  },
  codeDisplayString: {
    fontFamily: FontFamily.display,
    fontSize: 32,
    color: Colors.text,
    letterSpacing: 6,
  },
  codeDisplayTip: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.textDim,
  },
  vsDuelArena: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  duelCombatantCol: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  duelAvatarRing: {
    position: "relative",
    padding: 3,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  duelAvatarRingReady: {
    borderColor: Colors.mint,
  },
  duelAvatarRingEmpty: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderStyle: "dashed",
    borderColor: Colors.textDim,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgElevated,
  },
  readyCheckBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: Colors.bg,
    borderRadius: Radius.full,
  },
  duelPlayerName: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: Colors.text,
    textAlign: "center",
  },
  readyStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  readyStatusBadgeActive: {
    backgroundColor: "rgba(46, 213, 115, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(46, 213, 115, 0.4)",
  },
  readyStatusBadgePending: {
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  readyStatusText: {
    fontFamily: FontFamily.monoBold,
    fontSize: 10,
    color: Colors.textDim,
    letterSpacing: 0.8,
  },
  vsCenterColumn: {
    alignItems: "center",
    gap: 6,
  },
  vsBadgeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.coral,
  },
  vsBadgeLabel: {
    fontFamily: FontFamily.display,
    fontSize: 14,
    color: Colors.coral,
    letterSpacing: 1,
  },
  duelActionButtons: {
    gap: 10,
  },
});
