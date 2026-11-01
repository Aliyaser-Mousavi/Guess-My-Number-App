import Colors from "@/constants/colors";
import { useGame } from "@/context/GameProvider";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";

type Props = {
  children: React.ReactNode;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
};

const VARIANT_STYLES: Record<
  Variant,
  { bg: string; text: string; border?: string }
> = {
  primary: { bg: Colors.primary, text: Colors.white },
  accent: { bg: Colors.accent, text: Colors.bg },
  secondary: {
    bg: Colors.surface,
    text: Colors.text,
    border: Colors.borderStrong,
  },
  ghost: {
    bg: "transparent",
    text: Colors.textMuted,
    border: Colors.border,
  },
  danger: { bg: Colors.coral, text: Colors.white },
};

export default function PrimaryButton({
  children,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
  icon,
}: Props) {
  const { buzz } = useGame();
  const palette = VARIANT_STYLES[variant];

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={() => {
        buzz("light");
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border ?? "transparent",
          borderWidth: palette.border ? 1 : 0,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[styles.label, { color: palette.text }]}>
            {children}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
    width: "100%",
  },
  row: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  label: {
    fontFamily: "play-fair-bold",
    fontSize: 16,
    letterSpacing: 0.3,
    textAlign: "center",
  },
});
