import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { StyleSheet } from "react-native";
import AwesomeAlert from "react-native-awesome-alerts";

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

  const cancelButton = buttons.find((b) => b.style === "cancel");
  const confirmButton =
    buttons.find((b) => b.style !== "cancel") ?? buttons[buttons.length - 1];
  const hasTwoActions = buttons.length > 1 && !!cancelButton;

  const confirmIsDestructive = confirmButton?.style === "destructive";

  const value = useMemo(
    () => ({ showAlert, hideAlert }),
    [showAlert, hideAlert],
  );

  return (
    <AlertContext.Provider value={value}>
      {children}
      <AwesomeAlert
        show={visible}
        showProgress={false}
        title={title}
        message={message}
        closeOnTouchOutside
        closeOnHardwareBackPress
        showCancelButton={hasTwoActions}
        showConfirmButton
        cancelText={cancelButton?.text ?? "Cancel"}
        confirmText={confirmButton?.text ?? "OK"}
        onDismiss={hideAlert}
        onCancelPressed={() => {
          hideAlert();
          cancelButton?.onPress?.();
        }}
        onConfirmPressed={() => {
          hideAlert();
          confirmButton?.onPress?.();
        }}
        titleStyle={styles.title}
        messageStyle={styles.message}
        contentContainerStyle={styles.container}
        overlayStyle={styles.overlay}
        cancelButtonColor={Colors.surfaceSoft}
        confirmButtonColor={
          confirmIsDestructive ? Colors.coral : Colors.primary
        }
        cancelButtonTextStyle={styles.cancelText}
        confirmButtonTextStyle={styles.confirmText}
        cancelButtonStyle={styles.actionBtn}
        confirmButtonStyle={styles.actionBtn}
      />
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
    backgroundColor: Colors.overlay,
  },
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    paddingTop: 22,
    paddingBottom: 16,
    paddingHorizontal: 20,
    width: 310,
  },
  title: {
    fontFamily: FontFamily.display,
    color: Colors.text,
    fontSize: 19,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  message: {
    fontFamily: FontFamily.body,
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
  },
  actionBtn: {
    borderRadius: Radius.sm,
    paddingHorizontal: 18,
    paddingVertical: 11,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
  confirmText: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.bg,
    fontSize: 14,
    textAlign: "center",
  },
});
