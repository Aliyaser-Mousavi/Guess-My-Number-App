import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
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

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";

type Props = {
  children: React.ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
};

const VARIANT_CONFIG: Record<
  ButtonVariant,
  { bg: string; text: string; border?: string }
> = {
  primary: {
    bg: Colors.primary,
    text: Colors.bg,
  },
  accent: {
    bg: Colors.accent,
    text: Colors.bg,
  },
  secondary: {
    bg: Colors.surfaceSoft,
    text: Colors.text,
    border: Colors.borderStrong,
  },
  ghost: {
    bg: "rgba(255, 255, 255, 0.04)",
    text: Colors.textMuted,
    border: Colors.border,
  },
  danger: {
    bg: Colors.coral,
    text: Colors.white,
  },
};

export default function PrimaryButton({
  children,
  onPress,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  style,
  icon,
}: Props) {
  const { buzz } = useGame();
  const config = VARIANT_CONFIG[variant];

  const sizeStyle = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
    lg: styles.sizeLg,
  }[size];

  const labelSizeStyle = {
    sm: styles.labelSm,
    md: styles.labelMd,
    lg: styles.labelLg,
  }[size];

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={() => {
        buzz("light");
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        sizeStyle,
        {
          backgroundColor: config.bg,
          borderColor: config.border ?? "transparent",
          borderWidth: config.border ? 1 : 0,
          opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={config.text} />
      ) : (
        <View style={styles.contentRow}>
          {icon}
          <Text style={[styles.label, labelSizeStyle, { color: config.text }]}>
            {children}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 5,
    width: "100%",
  },
  sizeSm: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sizeMd: {
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sizeLg: {
    minHeight: 58,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  label: {
    fontFamily: FontFamily.bodyBold,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  labelSm: {
    fontSize: 14,
  },
  labelMd: {
    fontSize: 15,
  },
  labelLg: {
    fontSize: 17,
  },
});
