import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import SuccessImage from "../../assets/images/success.svg";

export default function GameOverScreen() {
  return (
    <View style={styles.rootContainer}>
      <Title>GAME OVER!</Title>
      <View style={styles.imageContainer}>
        <SuccessImage width={300} height={300} />
      </View>
      <View>
        <Text>Your phone needed X rounds to guess the number Y.</Text>
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
});
