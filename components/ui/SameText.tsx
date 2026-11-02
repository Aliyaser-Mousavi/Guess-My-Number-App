import Colors from "@/constants/colors";
import { FontFamily } from "@/constants/theme";
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
  accent,
  dim,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  muted?: boolean;
  accent?: boolean;
  dim?: boolean;
}) {
  return (
    <Text
      style={[
        styles.text,
        muted && styles.muted,
        accent && styles.accent,
        dim && styles.dim,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: FontFamily.body,
    color: Colors.text,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  muted: {
    color: Colors.textMuted,
  },
  accent: {
    color: Colors.accent,
    fontFamily: FontFamily.bodySemiBold,
  },
  dim: {
    color: Colors.textDim,
  },
});
