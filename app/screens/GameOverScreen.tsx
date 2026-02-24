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
    imageSize = 80;
  }
  const imageStyle = {
    width: imageSize,
    height: imageSize,
    borderRadius: imageSize / 2,
  };
  return (
    <ScrollView style={styles.screen}>
      <View style={styles.rootContainer}>
        <Title>GAME OVER!</Title>
        <View style={[styles.imageContainer, imageStyle]}>
          <SuccessImage width={300} height={300} />
        </View>
        <View>
          <Text style={styles.summaryText}>
            Your phone needed{" "}
            <Text style={styles.Highlight}>{roundsNumber}</Text> rounds to guess
            the number <Text style={styles.Highlight}>{userNumber}</Text>.
          </Text>
          <PrimaryButton onPress={onStartGame}>Start New Game</PrimaryButton>
        </View>
      </View>
    </ScrollView>
  );
}
// const deviceWidth = Dimensions.get("window").width;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  rootContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    // width: deviceWidth < 380 ? 150 : 300,
    // height: deviceWidth < 380 ? 150 : 300,
    // borderRadius: deviceWidth < 380 ? 75 : 150,
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
