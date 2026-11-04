// ==============================================================================
// Screen: MultiplayerLobbyScreen.tsx
// Description: Real-time 1v1 matchmaking lobby with Skill-Based Matchmaking (SBMM),
//              Private Room codes (6-char alphanumeric), and readiness synchronization.
// ==============================================================================

import Card from "@/components/ui/Card";
import PrimaryButton from "@/components/ui/PrimaryButton";
import ScreenBackground from "@/components/ui/ScreenBackground";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import type { DifficultyId } from "@/constants/gameConfig";
import { useAuth } from "@/context/AuthProvider";
import { useGame } from "@/context/GameProvider";
import {
  MultiplayerService,
  type OpponentInfo,
} from "@/services/multiplayer/MultiplayerService";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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

export default function MultiplayerLobbyScreen({ onBack, onStartMatch }: Props) {
  const { user } = useAuth();
  const { buzz, playSound, isRTL } = useGame();

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
          onStartMatch({
            matchId: pollResult.matchId,
            opponent: pollResult.opponent,
            minRange: pollResult.minRange ?? 1,
            maxRange: pollResult.maxRange ?? 100,
            livesRemaining: pollResult.livesRemaining ?? 7,
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
      Alert.alert("Account Required", "Please sign in or create an account to play online ranked 1v1.");
      return;
    }
    buzz("light");
    playSound("button_click");
    setSearchTime(0);
    setIsSearching(true);

    const joinResult = await MultiplayerService.joinQueue(difficulty);
    if (!joinResult.success) {
      setIsSearching(false);
      Alert.alert("Matchmaking Error", joinResult.error || "Failed to enter queue.");
      return;
    }

    if (joinResult.status === "matched" && joinResult.matchId) {
      setIsSearching(false);
      buzz("success");
      playSound("victory");
      onStartMatch({
        matchId: joinResult.matchId,
        opponent: joinResult.opponent,
        minRange: joinResult.minRange ?? 1,
        maxRange: joinResult.maxRange ?? 100,
        livesRemaining: joinResult.livesRemaining ?? 7,
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
      Alert.alert("Account Required", "Please sign in to create a private room.");
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
      Alert.alert("Error", res.error || "Could not create private room.");
    }
  };

  const handleJoinPrivateRoom = async () => {
    if (!user) {
      Alert.alert("Account Required", "Please sign in to join a private room.");
      return;
    }
    const cleanCode = inputRoomCode.trim().toUpperCase();
    if (cleanCode.length !== 6) {
      Alert.alert("Invalid Code", "Please enter a valid 6-character room code.");
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
      Alert.alert("Join Failed", res.error || "Room not found or already full.");
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
        <View style={[styles.header, isRTL && styles.rowReverse]}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            onPress={inPrivateLobby ? handleLeavePrivateLobby : onBack}
          >
            <Ionicons
              name={isRTL ? "chevron-forward" : "chevron-back"}
              size={24}
              color={Colors.text}
            />
          </Pressable>
          <Title style={styles.title}>1v1 ONLINE BATTLE</Title>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Tab Selector */}
          {!inPrivateLobby && !isSearching && (
            <View style={styles.tabContainer}>
              <Pressable
                style={[styles.tabButton, tab === "queue" && styles.tabButtonActive]}
                onPress={() => {
                  buzz("light");
                  setTab("queue");
                }}
              >
                <Ionicons
                  name="flash"
                  size={18}
                  color={tab === "queue" ? Colors.primary : Colors.textDim}
                />
                <Text style={[styles.tabText, tab === "queue" && styles.tabTextActive]}>
                  Ranked Match
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tabButton, tab === "private" && styles.tabButtonActive]}
                onPress={() => {
                  buzz("light");
                  setTab("private");
                }}
              >
                <Ionicons
                  name="people"
                  size={18}
                  color={tab === "private" ? Colors.primary : Colors.textDim}
                />
                <Text style={[styles.tabText, tab === "private" && styles.tabTextActive]}>
                  Private Room
                </Text>
              </Pressable>
            </View>
          )}

          {/* Difficulty selector */}
          {!inPrivateLobby && !isSearching && (
            <Card style={styles.difficultyCard}>
              <Text style={styles.sectionTitle}>SELECT DIFFICULTY</Text>
              <View style={styles.difficultyRow}>
                {(["easy", "medium", "hard"] as DifficultyId[]).map((d) => (
                  <Pressable
                    key={d}
                    style={[
                      styles.diffBtn,
                      difficulty === d && styles.diffBtnActive,
                    ]}
                    onPress={() => {
                      buzz("light");
                      setDifficulty(d);
                    }}
                  >
                    <Text
                      style={[
                        styles.diffBtnText,
                        difficulty === d && styles.diffBtnTextActive,
                      ]}
                    >
                      {d.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>
          )}

          {/* TAB 1: Ranked Matchmaking Queue */}
          {tab === "queue" && !inPrivateLobby && (
            <Card style={styles.mainCard}>
              {!isSearching ? (
                <View style={styles.queueContainer}>
                  <View style={styles.radarIconWrap}>
                    <Ionicons name="wifi" size={48} color={Colors.primary} />
                  </View>
                  <Text style={styles.queueTitle}>SKILL-BASED MATCHMAKING</Text>
                  <Text style={styles.queueDesc}>
                    Compete head-to-head in real time against another player. The first to deduce the secret number earns Competitive Rating (CR).
                  </Text>
                  <PrimaryButton
                    onPress={handleStartSearching}
                    variant="primary"
                    style={styles.actionBtn}
                  >
                    FIND MATCH
                  </PrimaryButton>
                </View>
              ) : (
                <View style={styles.searchingContainer}>
                  <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
                  <Text style={styles.searchingTitle}>SEARCHING FOR OPPONENT...</Text>
                  <Text style={styles.searchingTimer}>
                    {Math.floor(searchTime / 60)}:{(searchTime % 60).toString().padStart(2, "0")}
                  </Text>
                  <Text style={styles.searchingSubtitle}>
                    Matching with players near your Competitive Rating
                  </Text>
                  <PrimaryButton
                    onPress={handleCancelSearching}
                    variant="secondary"
                    style={styles.cancelBtn}
                  >
                    CANCEL SEARCH
                  </PrimaryButton>
                </View>
              )}
            </Card>
          )}

          {/* TAB 2: Private Room Setup */}
          {tab === "private" && !inPrivateLobby && (
            <View style={styles.privateSetupContainer}>
              <Card style={styles.roomActionCard}>
                <Ionicons name="add-circle-outline" size={32} color={Colors.accent} />
                <Text style={styles.roomActionTitle}>CREATE PRIVATE ROOM</Text>
                <Text style={styles.roomActionDesc}>
                  Generate a custom 6-character room code to invite a friend directly.
                </Text>
                <PrimaryButton
                  onPress={handleCreatePrivateRoom}
                  variant="primary"
                  disabled={isCreating}
                  style={styles.actionBtn}
                >
                  {isCreating ? "CREATING..." : "CREATE ROOM"}
                </PrimaryButton>
              </Card>

              <Card style={styles.roomActionCard}>
                <Ionicons name="enter-outline" size={32} color={Colors.mint} />
                <Text style={styles.roomActionTitle}>JOIN WITH ROOM CODE</Text>
                <Text style={styles.roomActionDesc}>
                  Enter the 6-character alphanumeric room code shared by your friend.
                </Text>
                <TextInput
                  style={styles.codeInput}
                  placeholder="CODE (e.g. A9B2X7)"
                  placeholderTextColor={Colors.textDim}
                  value={inputRoomCode}
                  onChangeText={(val) => setInputRoomCode(val.toUpperCase())}
                  maxLength={6}
                  autoCapitalize="characters"
                />
                <PrimaryButton
                  onPress={handleJoinPrivateRoom}
                  variant="primary"
                  disabled={isJoining || inputRoomCode.trim().length !== 6}
                  style={styles.actionBtn}
                >
                  {isJoining ? "JOINING..." : "JOIN ROOM"}
                </PrimaryButton>
              </Card>
            </View>
          )}

          {/* IN PRIVATE LOBBY: Room code & Ready status */}
          {inPrivateLobby && (
            <Card style={styles.lobbyCard}>
              <View style={styles.roomCodeBadge}>
                <Text style={styles.roomCodeLabel}>ROOM CODE</Text>
                <Text style={styles.roomCodeValue}>{createdRoomCode}</Text>
              </View>

              <View style={styles.playersPreviewContainer}>
                {/* Local Player */}
                <View style={styles.playerPreviewBox}>
                  <Ionicons name="person-circle" size={48} color={Colors.primary} />
                  <Text style={styles.playerName}>YOU</Text>
                  <View style={[styles.readyPill, isReady && styles.readyPillActive]}>
                    <Text style={[styles.readyText, isReady && styles.readyTextActive]}>
                      {isReady ? "READY" : "NOT READY"}
                    </Text>
                  </View>
                </View>

                <View style={styles.vsBadge}>
                  <Text style={styles.vsText}>VS</Text>
                </View>

                {/* Opponent Player */}
                <View style={styles.playerPreviewBox}>
                  <Ionicons
                    name="person-circle-outline"
                    size={48}
                    color={opponentInfo ? Colors.accent : Colors.textDim}
                  />
                  <Text style={styles.playerName}>
                    {opponentInfo ? opponentInfo.displayName : "WAITING..."}
                  </Text>
                  <View style={[styles.readyPill, opponentReady && styles.readyPillActive]}>
                    <Text style={[styles.readyText, opponentReady && styles.readyTextActive]}>
                      {opponentReady ? "READY" : "WAITING"}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.lobbyActions}>
                <PrimaryButton
                  onPress={handleToggleReady}
                  variant={isReady ? "secondary" : "primary"}
                  style={styles.readyBtn}
                >
                  {isReady ? "UNREADY" : "READY UP"}
                </PrimaryButton>
                <PrimaryButton
                  onPress={handleLeavePrivateLobby}
                  variant="secondary"
                  style={styles.leaveBtn}
                >
                  LEAVE ROOM
                </PrimaryButton>
              </View>
            </Card>
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
  },
  headerSpacer: {
    width: 40,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  title: {
    fontSize: 20,
    fontFamily: FontFamily.display,
    color: Colors.text,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: Radius.full,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: Radius.full,
  },
  tabButtonActive: {
    backgroundColor: "rgba(0, 210, 180, 0.15)",
  },
  tabText: {
    fontSize: 14,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textDim,
  },
  tabTextActive: {
    color: Colors.primary,
    fontFamily: FontFamily.bodyBold,
  },
  difficultyCard: {
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textDim,
    letterSpacing: 1,
    marginBottom: 12,
  },
  difficultyRow: {
    flexDirection: "row",
    gap: 8,
  },
  diffBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  diffBtnActive: {
    backgroundColor: "rgba(0, 210, 180, 0.12)",
    borderColor: Colors.primary,
  },
  diffBtnText: {
    fontSize: 12,
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
  },
  diffBtnTextActive: {
    color: Colors.primary,
  },
  mainCard: {
    padding: 24,
    alignItems: "center",
  },
  queueContainer: {
    alignItems: "center",
    width: "100%",
  },
  radarIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(0, 210, 180, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  queueTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bodyBold,
    color: Colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  queueDesc: {
    fontSize: 14,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  searchingContainer: {
    alignItems: "center",
    width: "100%",
    paddingVertical: 20,
  },
  spinner: {
    marginBottom: 20,
  },
  searchingTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bodyBold,
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  searchingTimer: {
    fontSize: 36,
    fontFamily: FontFamily.display,
    color: Colors.text,
    marginBottom: 8,
  },
  searchingSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    textAlign: "center",
    marginBottom: 24,
  },
  actionBtn: {
    width: "100%",
  },
  cancelBtn: {
    width: "100%",
  },
  privateSetupContainer: {
    gap: 16,
  },
  roomActionCard: {
    padding: 20,
    alignItems: "center",
  },
  roomActionTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bodyBold,
    color: Colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  roomActionDesc: {
    fontSize: 13,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  codeInput: {
    width: "100%",
    height: 48,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    color: Colors.text,
    fontFamily: FontFamily.display,
    fontSize: 18,
    letterSpacing: 3,
    textAlign: "center",
    marginBottom: 16,
  },
  lobbyCard: {
    padding: 20,
    alignItems: "center",
  },
  roomCodeBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255, 184, 0, 0.1)",
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  roomCodeLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    color: Colors.accent,
    letterSpacing: 1,
    marginBottom: 4,
  },
  roomCodeValue: {
    fontSize: 28,
    fontFamily: FontFamily.display,
    color: Colors.text,
    letterSpacing: 4,
  },
  playersPreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 32,
  },
  playerPreviewBox: {
    alignItems: "center",
    width: 100,
  },
  playerName: {
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    color: Colors.text,
    marginTop: 6,
    marginBottom: 8,
  },
  vsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  vsText: {
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
  },
  readyPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  readyPillActive: {
    backgroundColor: "rgba(0, 210, 180, 0.2)",
  },
  readyText: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
  },
  readyTextActive: {
    color: Colors.mint,
  },
  lobbyActions: {
    width: "100%",
    gap: 12,
  },
  readyBtn: {
    width: "100%",
  },
  leaveBtn: {
    width: "100%",
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
});
