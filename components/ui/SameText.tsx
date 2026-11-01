import Colors from "@/constants/colors";
import React from "react";
import {
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
} from "react-native";

export default function SameText({
  children,
  style,
  muted,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  muted?: boolean;
}) {
  return (
    <Text
      style={[
        styles.text,
        muted && { color: Colors.textMuted },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: "play-fair",
    color: Colors.accentSoft,
    fontSize: 17,
    textAlign: "center",
    lineHeight: 24,
  },
});
