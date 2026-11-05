// ==============================================================================
// Provider: AlertProvider.tsx
// Description: Centralized in-app alert and modal dialog system for MarsGuess.
//              Pure React Native implementation using custom animated backdrop,
//              tactical cyber-arcade styling, safe BackHandler subscriptions,
//              and support for default, cancel, and destructive button configurations.
//              Completely replaces legacy 'react-native-awesome-alerts' to eliminate
//              BackHandler.removeEventListener unmount crashes in React Native 0.70+.
// ==============================================================================

import Colors from "@/constants/colors";
import { FontFamily, Radius, Shadows, Spacing } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BackHandler,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type AlertButtonStyle = "default" | "cancel" | "destructive";

export type AlertButton = {
  text: string;
  style?: AlertButtonStyle;
  onPress?: () => void;
};

type AlertContextValue = {
  showAlert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
  ) => void;
  hideAlert: () => void;
};

const AlertContext = createContext<AlertContextValue | null>(null);

const DEFAULT_BUTTONS: AlertButton[] = [{ text: "OK", style: "default" }];

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [buttons, setButtons] = useState<AlertButton[]>(DEFAULT_BUTTONS);

  const hideAlert = useCallback(() => {
    setVisible(false);
  }, []);

  const showAlert = useCallback(
    (nextTitle: string, nextMessage?: string, nextButtons?: AlertButton[]) => {
      setTitle(nextTitle);
      setMessage(nextMessage ?? "");
      setButtons(
        nextButtons && nextButtons.length > 0 ? nextButtons : DEFAULT_BUTTONS,
      );
      setVisible(true);
    },
    [],
  );

  // Safe hardware back button handling with modern NativeEventSubscription
  useEffect(() => {
    if (!visible) return;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        hideAlert();
        return true;
      },
    );

    return () => {
      subscription.remove();
    };
  }, [visible, hideAlert]);

  const value = useMemo(
    () => ({ showAlert, hideAlert }),
    [showAlert, hideAlert],
  );

  // Derive dialog mood / theme based on buttons or content
  const isDestructive = buttons.some((b) => b.style === "destructive");

  return (
    <AlertContext.Provider value={value}>
      {children}
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={hideAlert}
      >
        <View style={styles.overlay}>
          {/* Backdrop dismissal */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={hideAlert}
            accessibilityRole="button"
            accessibilityLabel="Dismiss dialog"
          />

          {/* Tactical Dialog Container */}
          <View
            style={[
              styles.dialogContainer,
              isDestructive ? styles.destructiveBorder : styles.defaultBorder,
            ]}
          >
            {/* Header Icon Accent */}
            <View
              style={[
                styles.iconWrap,
                isDestructive ? styles.destructiveIconWrap : styles.defaultIconWrap,
              ]}
            >
              <Ionicons
                name={
                  isDestructive
                    ? "warning-outline"
                    : "information-circle-outline"
                }
                size={24}
                color={isDestructive ? Colors.coral : Colors.primary}
              />
            </View>

            {/* Title & Message */}
            {Boolean(title) && <Text style={styles.titleText}>{title}</Text>}
            {Boolean(message) && <Text style={styles.messageText}>{message}</Text>}

            {/* Actions Grid */}
            <View
              style={[
                styles.actionsContainer,
                buttons.length > 2 && styles.actionsVertical,
              ]}
            >
              {buttons.map((btn, index) => {
                const isCancel = btn.style === "cancel";
                const isBtnDestructive = btn.style === "destructive";

                return (
                  <Pressable
                    key={`${btn.text}-${index}`}
                    onPress={() => {
                      hideAlert();
                      btn.onPress?.();
                    }}
                    style={({ pressed }) => [
                      styles.actionButton,
                      isCancel && styles.cancelButton,
                      isBtnDestructive && styles.destructiveButton,
                      !isCancel && !isBtnDestructive && styles.primaryButton,
                      buttons.length <= 2 && styles.actionButtonFlex,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionButtonText,
                        isCancel && styles.cancelButtonText,
                        isBtnDestructive && styles.destructiveButtonText,
                        !isCancel && !isBtnDestructive && styles.primaryButtonText,
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}

export function useAppAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAppAlert must be used within AlertProvider");
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  dialogContainer: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    borderWidth: 1.5,
    ...Shadows.sm,
  },
  defaultBorder: {
    borderColor: Colors.borderAccent,
    ...Shadows.glowTeal,
  },
  destructiveBorder: {
    borderColor: "rgba(255, 71, 87, 0.45)",
    shadowColor: Colors.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    borderWidth: 1.5,
  },
  defaultIconWrap: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.borderAccent,
  },
  destructiveIconWrap: {
    backgroundColor: "rgba(255, 71, 87, 0.14)",
    borderColor: "rgba(255, 71, 87, 0.35)",
  },
  titleText: {
    fontFamily: FontFamily.display,
    fontSize: 18,
    color: Colors.text,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  messageText: {
    fontFamily: FontFamily.sans,
    fontSize: 13.5,
    lineHeight: 20,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    width: "100%",
    marginTop: Spacing.xs,
  },
  actionsVertical: {
    flexDirection: "column",
  },
  actionButtonFlex: {
    flex: 1,
  },
  actionButton: {
    paddingVertical: 11,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  cancelButton: {
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  destructiveButton: {
    backgroundColor: Colors.coral,
  },
  actionButtonText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    letterSpacing: 0.3,
  },
  primaryButtonText: {
    color: Colors.bg,
  },
  cancelButtonText: {
    color: Colors.textMuted,
  },
  destructiveButtonText: {
    color: Colors.white,
  },
});
