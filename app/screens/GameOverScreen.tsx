import PrimaryButton from "@/components/ui/PrimaryButton";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import SuccessImage from "../../assets/images/success.svg";

export default function GameOverScreen({
  roundsNumber,
  userNumber,
  onStartGame,
}: {
  roundsNumber: number;
  userNumber: number;
  onStartGame: () => void;
}) {
  return (
    <View style={styles.rootContainer}>
      <Title>GAME OVER!</Title>
      <View style={styles.imageContainer}>
        <SuccessImage width={300} height={300} />
      </View>
      <View>
        <Text style={styles.summaryText}>
          Your phone needed <Text style={styles.Highlight}>{roundsNumber}</Text>{" "}
          rounds to guess the number{" "}
          <Text style={styles.Highlight}>{userNumber}</Text>.
        </Text>
        <PrimaryButton onPress={onStartGame}>Start New Game</PrimaryButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 3,
    borderColor: Colors.primary800,
    overflow: "hidden",
    marginVertical: 36,
  },
  summaryText: {
    fontFamily: "play-fair",
    fontSize: 24,
    textAlign: "center",
    marginBottom: 24,
  },
  Highlight: {
    fontFamily: "play-fair-bold",
    color: Colors.primary500,
  },
});
