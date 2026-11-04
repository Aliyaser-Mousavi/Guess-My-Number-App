import AchievementsScreen from "@/screens/AchievementsScreen";
import GameOverScreen from "@/screens/GameOverScreen";
import GameScreen from "@/screens/GameScreen";
import HomeScreen from "@/screens/HomeScreen";
import HowToPlayScreen from "@/screens/HowToPlayScreen";
import LeaderboardScreen from "@/screens/LeaderboardScreen";
import MultiplayerLobbyScreen, {
  type MultiplayerGameStartParams,
} from "@/screens/multiplayer/MultiplayerLobbyScreen";
import MultiplayerGameScreen from "@/screens/multiplayer/MultiplayerGameScreen";
import TournamentsScreen from "@/screens/tournaments/TournamentsScreen";
import SeasonsScreen from "@/screens/seasons/SeasonsScreen";
import { TournamentService, type TournamentInfo } from "@/services/tournament/TournamentService";
import type { SeasonalEventInfo } from "@/services/seasons/SeasonsService";
import PlayerGuessScreen from "@/screens/PlayerGuessScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import ProgressionScreen from "@/screens/ProgressionScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import StartGameScreen, {
  type SetupConfig,
} from "@/screens/StartGameScreen";
import StatsScreen from "@/screens/StatsScreen";
import BlitzGameScreen from "@/screens/gameModes/BlitzGameScreen";
import CustomGameScreen from "@/screens/gameModes/CustomGameScreen";
import LogicPuzzleGameScreen from "@/screens/gameModes/LogicPuzzleGameScreen";
import PassAndPlayGameScreen from "@/screens/gameModes/PassAndPlayGameScreen";
import SurvivalGameScreen from "@/screens/gameModes/SurvivalGameScreen";
import TimeAttackGameScreen from "@/screens/gameModes/TimeAttackGameScreen";
import LevelUpModal from "@/components/progression/LevelUpModal";
import AuthModal from "@/components/auth/AuthModal";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthProvider";
import { useGame } from "@/context/GameProvider";
import type { AppScreen, GameResult } from "@/types/game";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

SplashScreen.preventAutoHideAsync();

export default function Index() {
  const {
    ready,
    recordGame,
    isDailyDoneToday,
    startSession,
    abandonSession,
    levelUpEvent,
    clearLevelUpEvent,
    progression,
  } = useGame();
  const { isRecoveryMode, clearRecoveryMode } = useAuth();
  const [screen, setScreen] = useState<AppScreen>("home");
  const [setup, setSetup] = useState<SetupConfig | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [dailyForced, setDailyForced] = useState(false);
  const [multiplayerParams, setMultiplayerParams] = useState<MultiplayerGameStartParams | null>(null);

  const [fontsLoaded] = useFonts({
    "SpaceGrotesk-Regular": SpaceGrotesk_400Regular,
    "SpaceGrotesk-Medium": SpaceGrotesk_500Medium,
    "SpaceGrotesk-SemiBold": SpaceGrotesk_600SemiBold,
    "SpaceGrotesk-Bold": SpaceGrotesk_700Bold,
    "Inter-Regular": Inter_400Regular,
    "Inter-Medium": Inter_500Medium,
    "Inter-SemiBold": Inter_600SemiBold,
    "Inter-Bold": Inter_700Bold,
    // Backward-compatibility aliases
    "play-fair": Inter_400Regular,
    "play-fair-bold": SpaceGrotesk_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && ready) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, ready]);

  if (!fontsLoaded || !ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  function goHome() {
    abandonSession();
    setScreen("home");
    setSetup(null);
    setResult(null);
    setDailyForced(false);
    setMultiplayerParams(null);
  }

  function handleStart(config: SetupConfig) {
    startSession({
      mode: config.mode,
      difficultyId: config.difficultyId,
      isDaily: config.isDaily,
      targetNumber: config.userNumber,
    });
    setSetup(config);
    setScreen("playing");
  }

  function handleGameOver(payload: {
    sessionId?: string;
    won: boolean;
    rounds: number;
    elapsedMs: number;
    hintsUsed: number;
    guesses: number[];
    secretNumber?: number;
    score?: number;
    isRanked?: boolean;
    isServerVerified?: boolean;
    ratingDelta?: number;
    newRating?: number;
    newTier?: string;
  }) {
    if (!setup) return;
    const recorded = recordGame({
      sessionId: payload.sessionId,
      won: payload.won,
      rounds: payload.rounds,
      userNumber: setup.userNumber ?? payload.secretNumber ?? 0,
      secretNumber: payload.secretNumber,
      elapsedMs: payload.elapsedMs,
      mode: setup.mode,
      difficulty: setup.difficultyId,
      hintsUsed: payload.hintsUsed,
      isDaily: setup.isDaily,
      guesses: payload.guesses,
      score: payload.score,
      customConfig: setup.customConfig,
      player1Name: setup.player1Name,
      player2Name: setup.player2Name,
      isRanked: payload.isRanked ?? setup.isRanked,
      isServerVerified: payload.isServerVerified,
      ratingDelta: payload.ratingDelta,
      newRating: payload.newRating,
      newTier: payload.newTier,
    });
    setResult(recorded);
    setScreen("gameOver");

    // Secure server-verified tournament attempt recording
    if (setup.tournamentId && payload.sessionId && payload.won) {
      TournamentService.recordAttempt({
        tournamentId: setup.tournamentId,
        sessionId: payload.sessionId,
      }).catch((err) => {
        console.warn("[app] Failed to record tournament attempt:", err.message);
      });
    }
  }

  let content: React.ReactNode = null;

  if (screen === "home") {
    content = (
      <HomeScreen
        dailyDone={isDailyDoneToday}
        onPlay={() => {
          setDailyForced(false);
          setScreen("setup");
        }}
        onDaily={() => {
          setDailyForced(true);
          setScreen("setup");
        }}
        onStats={() => setScreen("stats")}
        onAchievements={() => setScreen("achievements")}
        onSettings={() => setScreen("settings")}
        onHowTo={() => setScreen("howToPlay")}
        onProgression={() => setScreen("progression")}
        onProfile={() => setScreen("profile")}
        onLeaderboard={() => setScreen("leaderboard")}
        onMultiplayer={() => setScreen("multiplayerLobby")}
        onTournaments={() => setScreen("tournaments")}
        onSeasons={() => setScreen("seasons")}
      />
    );
  } else if (screen === "setup") {
    content = (
      <StartGameScreen
        forcedDaily={dailyForced}
        onBack={goHome}
        onStart={handleStart}
      />
    );
  } else if (screen === "playing" && setup) {
    if (setup.mode === "timeAttack") {
      content = (
        <TimeAttackGameScreen
          difficultyId={setup.difficultyId}
          durationSeconds={setup.timeLimitSeconds}
          onGameOver={handleGameOver}
          onAbandon={goHome}
        />
      );
    } else if (setup.mode === "survival") {
      content = (
        <SurvivalGameScreen
          onGameOver={handleGameOver}
          onAbandon={goHome}
        />
      );
    } else if (setup.mode === "blitz") {
      content = (
        <BlitzGameScreen
          onGameOver={handleGameOver}
          onAbandon={goHome}
        />
      );
    } else if (setup.mode === "custom" && setup.customConfig) {
      content = (
        <CustomGameScreen
          config={setup.customConfig}
          userNumber={setup.userNumber}
          onGameOver={handleGameOver}
          onAbandon={goHome}
        />
      );
    } else if (setup.mode === "passAndPlay") {
      content = (
        <PassAndPlayGameScreen
          player1Name={setup.player1Name}
          player2Name={setup.player2Name}
          onGameOver={handleGameOver}
          onBack={goHome}
        />
      );
    } else if (setup.mode === "logicPuzzle") {
      content = (
        <LogicPuzzleGameScreen
          difficultyId={setup.difficultyId}
          onGameOver={handleGameOver}
          onAbandon={goHome}
        />
      );
    } else if (setup.mode === "player") {
      content = (
        <PlayerGuessScreen
          difficultyId={setup.difficultyId}
          isDaily={setup.isDaily}
          dailyDateStr={setup.dailyDateStr}
          isRanked={setup.isRanked}
          serverSessionId={setup.serverSessionId}
          onGameOver={handleGameOver}
          onAbandon={goHome}
        />
      );
    } else if (setup.userNumber != null) {
      content = (
        <GameScreen
          userNumber={setup.userNumber}
          difficultyId={setup.difficultyId}
          isDaily={setup.isDaily}
          onGameOver={handleGameOver}
        />
      );
    }
  } else if (screen === "gameOver" && result) {
    content = (
      <GameOverScreen
        result={result}
        onHome={goHome}
        onReplay={() => {
          setResult(null);
          setScreen("setup");
        }}
      />
    );
  } else if (screen === "stats") {
    content = (
      <StatsScreen
        onBack={() => setScreen("home")}
        onPlayArchivedDaily={(dateStr) => {
          handleStart({
            mode: "player",
            difficultyId: "medium",
            isDaily: true,
            dailyDateStr: dateStr,
          });
        }}
      />
    );
  } else if (screen === "progression") {
    content = (
      <ProgressionScreen
        onBack={() => setScreen("home")}
        onOpenAchievements={() => setScreen("achievements")}
      />
    );
  } else if (screen === "profile") {
    content = (
      <ProfileScreen
        onBack={() => setScreen("home")}
        onOpenProgression={() => setScreen("progression")}
        onOpenBadges={() => setScreen("achievements")}
      />
    );
  } else if (screen === "achievements") {
    content = <AchievementsScreen onBack={() => setScreen("home")} />;
  } else if (screen === "settings") {
    content = <SettingsScreen onBack={() => setScreen("home")} />;
  } else if (screen === "howToPlay") {
    content = <HowToPlayScreen onBack={() => setScreen("home")} />;
  } else if (screen === "leaderboard") {
    content = <LeaderboardScreen onBack={() => setScreen("home")} />;
  } else if (screen === "multiplayerLobby") {
    content = (
      <MultiplayerLobbyScreen
        onBack={goHome}
        onStartMatch={(params) => {
          setMultiplayerParams(params);
          setScreen("multiplayerGame");
        }}
      />
    );
  } else if (screen === "multiplayerGame" && multiplayerParams) {
    content = (
      <MultiplayerGameScreen
        matchId={multiplayerParams.matchId}
        opponent={multiplayerParams.opponent}
        minRange={multiplayerParams.minRange}
        maxRange={multiplayerParams.maxRange}
        livesRemaining={multiplayerParams.livesRemaining}
        difficulty={multiplayerParams.difficulty}
        onExit={goHome}
      />
    );
  } else if (screen === "tournaments") {
    content = (
      <TournamentsScreen
        onBack={() => setScreen("home")}
        onStartAttempt={(tourn) => {
          handleStart({
            mode: "player",
            difficultyId: tourn.difficulty as any,
            isDaily: false,
            isRanked: true,
            tournamentId: tourn.tournamentId,
          });
        }}
      />
    );
  } else if (screen === "seasons") {
    content = (
      <SeasonsScreen
        onBack={() => setScreen("home")}
        onPlayEvent={(evt) => {
          handleStart({
            mode: "player",
            difficultyId: "medium",
            isDaily: false,
            timeLimitSeconds: evt.rules.timeLimit,
          });
        }}
      />
    );
  }

  return (
    <View style={styles.root} onLayout={onLayoutRootView}>
      <StatusBar style="light" />
      {content}
      <LevelUpModal
        visible={levelUpEvent != null}
        level={levelUpEvent?.newLevel ?? progression.level}
        levelsGained={levelUpEvent?.levelsGained ?? 1}
        onClose={clearLevelUpEvent}
      />
      <AuthModal
        visible={isRecoveryMode}
        initialMode="update_password"
        onClose={clearRecoveryMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  boot: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
});
