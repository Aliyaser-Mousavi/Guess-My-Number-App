import PrimaryButton from "@/components/ui/PrimaryButton";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
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
  const { width, height } = useWindowDimensions();

  let imageSize = 300;

  if (width < 380) {
    imageSize = 150;
  }

  if (height < 400) {
    imageSize = 100;
  }

  const imageStyle = {
    width: imageSize,
    height: imageSize,
    borderRadius: imageSize / 2,
    marginVertical: height < 400 ? 10 : 36,
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.rootContainer}>
        <Title>GAME OVER!</Title>
        <View style={[styles.imageContainer, imageStyle]}>
          <SuccessImage width={imageSize} height={imageSize} />
        </View>
        <View style={styles.resultContainer}>
          <Text style={styles.summaryText}>
            Your phone needed{" "}
            <Text style={styles.highlight}>{roundsNumber}</Text> rounds to guess
            the number <Text style={styles.highlight}>{userNumber}</Text>.
          </Text>
          <View style={styles.buttonWrapper}>
            <PrimaryButton onPress={onStartGame}>Start New Game</PrimaryButton>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  rootContainer: {
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    borderWidth: 3,
    borderColor: Colors.primary800,
    backgroundColor: Colors.primary500,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  resultContainer: {
    alignItems: "center",
  },
  summaryText: {
    fontFamily: "play-fair",
    fontSize: 22,
    textAlign: "center",
    marginBottom: 24,
    color: "white", // Better contrast against game background
  },
  highlight: {
    fontFamily: "play-fair-bold",
    color: Colors.accent500, // Using Accent color for highlight
    fontSize: 26,
  },
  buttonWrapper: {
    width: "100%",
    minWidth: 200,
  },
});
