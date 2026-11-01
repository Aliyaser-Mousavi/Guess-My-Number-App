import Card from "@/components/ui/Card";
import PrimaryButton from "@/components/ui/PrimaryButton";
import SameText from "@/components/ui/SameText";
import ScreenBackground from "@/components/ui/ScreenBackground";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import {
  DIFFICULTIES,
  type DifficultyId,
  type GameMode,
} from "@/constants/gameConfig";
import { useAppAlert } from "@/context/AlertProvider";
import { useGame } from "@/context/GameProvider";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export type SetupConfig = {
  mode: GameMode;
  difficultyId: DifficultyId;
  userNumber?: number;
  isDaily: boolean;
};

type Props = {
  onBack: () => void;
  onStart: (config: SetupConfig) => void;
  forcedDaily?: boolean;
};

export default function StartGameScreen({
  onBack,
  onStart,
  forcedDaily = false,
}: Props) {
  const { buzz } = useGame();
  const { showAlert } = useAppAlert();
  const [mode, setMode] = useState<GameMode>("opponent");
  const [difficultyId, setDifficultyId] = useState<DifficultyId>(
    forcedDaily ? "medium" : "medium",
  );
  const [enteredNumber, setEnteredNumber] = useState("");

  const difficulty =
    DIFFICULTIES.find((d) => d.id === difficultyId) ?? DIFFICULTIES[1];

  function startOpponent() {
    const chosen = parseInt(enteredNumber, 10);
    if (
      isNaN(chosen) ||
      chosen < difficulty.min ||
      chosen > difficulty.max
    ) {
      buzz("error");
      showAlert(
        "Invalid Number",
        `Pick a whole number between ${difficulty.min} and ${difficulty.max}.`,
      );
      return;
    }
    buzz("success");
    onStart({
      mode: "opponent",
      difficultyId,
      userNumber: chosen,
      isDaily: forcedDaily,
    });
  }

  function startPlayer() {
    buzz("success");
    onStart({
      mode: "player",
      difficultyId,
      isDaily: forcedDaily,
    });
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Pressable onPress={onBack} style={styles.back}>
              <Ionicons name="arrow-back" size={22} color={Colors.text} />
            </Pressable>

            <Title size="lg">
              {forcedDaily ? "Daily Challenge" : "New Game"}
            </Title>
            <SameText muted style={{ marginTop: 8, marginBottom: 20 }}>
              {forcedDaily
                ? "One shared puzzle for everyone today. Medium range."
                : "Choose how you want to play."}
            </SameText>

            {forcedDaily ? (
              <Card style={{ marginTop: 8 }}>
                <SameText>
                  Today's puzzle uses Medium range (1–100). Find the shared
                  secret number before your lives run out.
                </SameText>
                <PrimaryButton
                  variant="accent"
                  onPress={() => {
                    buzz("success");
                    onStart({
                      mode: "player",
                      difficultyId: "medium",
                      isDaily: true,
                    });
                  }}
                  style={{ marginTop: 14 }}
                >
                  Start Daily
                </PrimaryButton>
              </Card>
            ) : (
              <>
                <Text style={styles.section}>Mode</Text>
                <View style={styles.modeRow}>
                  <ModeCard
                    active={mode === "opponent"}
                    title="Oracle Guesses"
                    subtitle="You pick a number. The oracle hunts it."
                    icon="phone-portrait"
                    onPress={() => {
                      buzz();
                      setMode("opponent");
                    }}
                  />
                  <ModeCard
                    active={mode === "player"}
                    title="You Guess"
                    subtitle="Oracle hides a number. You hunt it."
                    icon="person"
                    onPress={() => {
                      buzz();
                      setMode("player");
                    }}
                  />
                </View>

                <Text style={styles.section}>Difficulty</Text>
                <View style={styles.diffGrid}>
                  {DIFFICULTIES.map((d) => (
                    <Pressable
                      key={d.id}
                      onPress={() => {
                        buzz();
                        setDifficultyId(d.id);
                        setEnteredNumber("");
                      }}
                      style={[
                        styles.diffCard,
                        difficultyId === d.id && {
                          borderColor: d.color,
                          backgroundColor: d.color + "22",
                        },
                      ]}
                    >
                      <Text style={[styles.diffTitle, { color: d.color }]}>
                        {d.label}
                      </Text>
                      <Text style={styles.diffDesc}>{d.description}</Text>
                    </Pressable>
                  ))}
                </View>

                {mode === "opponent" ? (
                  <Card style={{ marginTop: 16 }}>
                    <SameText>
                      Enter a number ({difficulty.min}–{difficulty.max})
                    </SameText>
                    <TextInput
                      style={styles.numberInput}
                      maxLength={String(difficulty.max).length}
                      keyboardType="number-pad"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={enteredNumber}
                      onChangeText={setEnteredNumber}
                      selectionColor={Colors.accent}
                      placeholder="?"
                      placeholderTextColor={Colors.textDim}
                    />
                    <View style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <PrimaryButton
                          variant="ghost"
                          onPress={() => setEnteredNumber("")}
                        >
                          Reset
                        </PrimaryButton>
                      </View>
                      <View style={{ flex: 1 }}>
                        <PrimaryButton variant="accent" onPress={startOpponent}>
                          Confirm
                        </PrimaryButton>
                      </View>
                    </View>
                  </Card>
                ) : (
                  <Card style={{ marginTop: 16 }}>
                    <SameText>
                      You get {difficulty.playerLives} lives and{" "}
                      {difficulty.hints} hint
                      {difficulty.hints === 1 ? "" : "s"}.
                    </SameText>
                    <PrimaryButton
                      variant="accent"
                      onPress={startPlayer}
                      style={{ marginTop: 12 }}
                    >
                      Start Hunting
                    </PrimaryButton>
                  </Card>
                )}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function ModeCard({
  active,
  title,
  subtitle,
  icon,
  onPress,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.modeCard, active && styles.modeCardActive]}
    >
      <Ionicons
        name={icon}
        size={22}
        color={active ? Colors.accent : Colors.textMuted}
      />
      <Text style={styles.modeTitle}>{title}</Text>
      <Text style={styles.modeSub}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  section: {
    fontFamily: "play-fair-bold",
    color: Colors.text,
    fontSize: 16,
    marginBottom: 10,
    marginTop: 8,
  },
  modeRow: { gap: 10, marginBottom: 8 },
  modeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  modeCardActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentGlow,
  },
  modeTitle: {
    fontFamily: "play-fair-bold",
    color: Colors.text,
    fontSize: 17,
  },
  modeSub: {
    fontFamily: "play-fair",
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  diffGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  diffCard: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  diffTitle: {
    fontFamily: "play-fair-bold",
    fontSize: 16,
  },
  diffDesc: {
    fontFamily: "play-fair",
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  numberInput: {
    alignSelf: "center",
    height: 64,
    minWidth: 100,
    fontSize: 36,
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
    color: Colors.accent,
    marginVertical: 16,
    fontFamily: "play-fair-bold",
    textAlign: "center",
  },
  row: { flexDirection: "row", gap: 8 },
});
