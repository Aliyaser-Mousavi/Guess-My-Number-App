import AchievementsScreen from "@/screens/AchievementsScreen";
import GameOverScreen from "@/screens/GameOverScreen";
import GameScreen from "@/screens/GameScreen";
import HomeScreen from "@/screens/HomeScreen";
import HowToPlayScreen from "@/screens/HowToPlayScreen";
import PlayerGuessScreen from "@/screens/PlayerGuessScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import StartGameScreen, {
  type SetupConfig,
} from "@/screens/StartGameScreen";
import StatsScreen from "@/screens/StatsScreen";
import Colors from "@/constants/colors";
import { useGame } from "@/context/GameProvider";
import type { AppScreen, GameResult } from "@/types/game";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

SplashScreen.preventAutoHideAsync();

export default function Index() {
  const { ready, recordGame, isDailyDoneToday } = useGame();
  const [screen, setScreen] = useState<AppScreen>("home");
  const [setup, setSetup] = useState<SetupConfig | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [dailyForced, setDailyForced] = useState(false);

  const [fontsLoaded] = useFonts({
    "play-fair": require("@/assets/fonts/PlayfairDisplay-Regular.ttf"),
    "play-fair-bold": require("@/assets/fonts/PlayfairDisplay-Bold.ttf"),
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
    setScreen("home");
    setSetup(null);
    setResult(null);
    setDailyForced(false);
  }

  function handleStart(config: SetupConfig) {
    setSetup(config);
    setScreen("playing");
  }

  function handleGameOver(payload: {
    won: boolean;
    rounds: number;
    elapsedMs: number;
    hintsUsed: number;
    guesses: number[];
    secretNumber?: number;
  }) {
    if (!setup) return;
    const recorded = recordGame({
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
    });
    setResult(recorded);
    setScreen("gameOver");
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
    if (setup.mode === "player") {
      content = (
        <PlayerGuessScreen
          difficultyId={setup.difficultyId}
          isDaily={setup.isDaily}
          onGameOver={handleGameOver}
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
    content = <StatsScreen onBack={() => setScreen("home")} />;
  } else if (screen === "achievements") {
    content = <AchievementsScreen onBack={() => setScreen("home")} />;
  } else if (screen === "settings") {
    content = <SettingsScreen onBack={() => setScreen("home")} />;
  } else if (screen === "howToPlay") {
    content = <HowToPlayScreen onBack={() => setScreen("home")} />;
  }

  return (
    <View style={styles.root} onLayout={onLayoutRootView}>
      <StatusBar style="light" />
      {content}
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
