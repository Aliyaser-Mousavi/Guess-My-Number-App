import PrimaryButton from "@/components/ui/PrimaryButton";
import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import { useAuth } from "@/context/AuthProvider";
import { useGame } from "@/context/GameProvider";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Mode = "login" | "register" | "forgot" | "update_password";

type Props = {
  visible: boolean;
  onClose: () => void;
  initialMode?: Mode;
};

export default function AuthModal({
  visible,
  onClose,
  initialMode = "login",
}: Props) {
  const {
    signIn,
    signUp,
    sendPasswordReset,
    updatePassword,
    isRecoveryMode,
    clearRecoveryMode,
  } = useAuth();
  const { profile, buzz, playSound, isRTL } = useGame();

  const [activeTab, setActiveTab] = useState<Mode | null>(null);
  const mode: Mode = isRecoveryMode ? "update_password" : (activeTab ?? initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState(profile.displayName || "");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!visible) return null;

  function resetForm() {
    setEmail("");
    setPassword("");
    setPasswordConfirmation("");
    setUsername("");
    setErrorMsg("");
    setSuccessMsg("");
    setActiveTab(null);
  }

  function switchMode(newMode: Mode) {
    buzz("light");
    setErrorMsg("");
    setSuccessMsg("");
    setActiveTab(newMode);
  }

  async function handleLogin() {
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    const res = await signIn({ email, password });
    setLoading(false);

    if (res.success) {
      buzz("success");
      playSound("victory");
      resetForm();
      onClose();
    } else {
      buzz("error");
      playSound("guess_wrong");
      setErrorMsg(res.error ?? "Login failed.");
    }
  }

  async function handleRegister() {
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    const res = await signUp({
      email,
      password,
      passwordConfirmation,
      username,
      displayName: displayName || "Number Hunter",
      avatarId: profile.avatarId,
      titleId: profile.titleId,
    });
    setLoading(false);

    if (res.success) {
      buzz("success");
      playSound("victory");
      if (res.requiresEmailConfirmation) {
        setSuccessMsg(
          "Registration successful! Please check your email inbox to verify your account.",
        );
      } else {
        resetForm();
        onClose();
      }
    } else {
      buzz("error");
      playSound("guess_wrong");
      setErrorMsg(res.error ?? "Registration failed.");
    }
  }

  async function handleForgot() {
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    const res = await sendPasswordReset(email);
    setLoading(false);

    if (res.success) {
      buzz("success");
      setSuccessMsg(
        "Password reset link has been dispatched. Please check your inbox.",
      );
    } else {
      buzz("error");
      setErrorMsg(res.error ?? "Could not send reset link.");
    }
  }

  async function handleUpdatePassword() {
    setErrorMsg("");
    setSuccessMsg("");

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      buzz("error");
      return;
    }
    if (password !== passwordConfirmation) {
      setErrorMsg("Passwords do not match.");
      buzz("error");
      return;
    }

    setLoading(true);
    const res = await updatePassword(password);
    setLoading(false);

    if (res.success) {
      buzz("success");
      clearRecoveryMode();
      setSuccessMsg("Password updated successfully! You may now sign in.");
      setTimeout(() => switchMode("login"), 2000);
    } else {
      buzz("error");
      setErrorMsg(res.error ?? "Failed to update password.");
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalBox}>
            {/* Header */}
            <View style={[styles.headerRow, isRTL && styles.rowReverse]}>
              <View style={[styles.titleIconRow, isRTL && styles.rowReverse]}>
                <Ionicons
                  name={
                    mode === "register"
                      ? "person-add"
                      : mode === "forgot"
                      ? "key"
                      : "log-in"
                  }
                  size={20}
                  color={Colors.accent}
                />
                <Text style={styles.modalTitle}>
                  {mode === "login"
                    ? "Sign In to Hunter Account"
                    : mode === "register"
                    ? "Create Hunter Account"
                    : mode === "forgot"
                    ? "Reset Password"
                    : "Set New Password"}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={({ pressed }) => [
                  styles.closeBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="close" size={20} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Tab Selector (for login vs register) */}
              {(mode === "login" || mode === "register") && (
                <View style={[styles.tabSelector, isRTL && styles.rowReverse]}>
                  <Pressable
                    onPress={() => switchMode("login")}
                    style={[
                      styles.tabBtn,
                      mode === "login" && styles.tabBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabBtnText,
                        mode === "login" && styles.tabBtnTextActive,
                      ]}
                    >
                      Sign In
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => switchMode("register")}
                    style={[
                      styles.tabBtn,
                      mode === "register" && styles.tabBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabBtnText,
                        mode === "register" && styles.tabBtnTextActive,
                      ]}
                    >
                      Create Account
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Status & Error Feedback */}
              {errorMsg ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color={Colors.coral} />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              {successMsg ? (
                <View style={styles.successBanner}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.mint} />
                  <Text style={styles.successText}>{successMsg}</Text>
                </View>
              ) : null}

              {/* Form Fields */}
              {mode !== "update_password" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                  <TextInput
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      if (errorMsg) setErrorMsg("");
                    }}
                    placeholder="hunter@example.com"
                    placeholderTextColor={Colors.textDim}
                    style={styles.textInput}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                </View>
              )}

              {mode === "register" && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      UNIQUE USERNAME (3-20 characters)
                    </Text>
                    <TextInput
                      value={username}
                      onChangeText={(val) => {
                        setUsername(val.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                        if (errorMsg) setErrorMsg("");
                      }}
                      placeholder="e.g. cyber_hunter"
                      placeholderTextColor={Colors.textDim}
                      style={styles.textInput}
                      autoCapitalize="none"
                      maxLength={20}
                      autoCorrect={false}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>DISPLAY NAME</Text>
                    <TextInput
                      value={displayName}
                      onChangeText={(val) => setDisplayName(val)}
                      placeholder="Your Public Name"
                      placeholderTextColor={Colors.textDim}
                      style={styles.textInput}
                      maxLength={30}
                    />
                  </View>
                </>
              )}

              {mode !== "forgot" && (
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>
                      {mode === "update_password" ? "NEW PASSWORD" : "PASSWORD"}
                    </Text>
                    {mode === "login" && (
                      <Pressable onPress={() => switchMode("forgot")}>
                        <Text style={styles.forgotLink}>Forgot?</Text>
                      </Pressable>
                    )}
                  </View>
                  <View style={styles.passwordWrap}>
                    <TextInput
                      value={password}
                      onChangeText={(val) => {
                        setPassword(val);
                        if (errorMsg) setErrorMsg("");
                      }}
                      placeholder="At least 6 characters"
                      placeholderTextColor={Colors.textDim}
                      secureTextEntry={!showPassword}
                      style={[styles.textInput, { flex: 1 }]}
                      autoCapitalize="none"
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off" : "eye"}
                        size={18}
                        color={Colors.textMuted}
                      />
                    </Pressable>
                  </View>
                </View>
              )}

              {(mode === "register" || mode === "update_password") && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
                  <TextInput
                    value={passwordConfirmation}
                    onChangeText={(val) => {
                      setPasswordConfirmation(val);
                      if (errorMsg) setErrorMsg("");
                    }}
                    placeholder="Repeat password"
                    placeholderTextColor={Colors.textDim}
                    secureTextEntry={!showPassword}
                    style={styles.textInput}
                    autoCapitalize="none"
                  />
                </View>
              )}

              {/* Guest Progress Preservation Note */}
              {mode === "register" && (
                <View style={styles.infoBox}>
                  <Ionicons name="shield-checkmark" size={15} color={Colors.mint} />
                  <Text style={styles.infoText}>
                    Creating an account secures your progress. Your current local
                    stats and earned achievements will be preserved!
                  </Text>
                </View>
              )}

              {/* Submit CTA */}
              <View style={styles.submitWrap}>
                {loading ? (
                  <View style={styles.loadingWrap}>
                    <ActivityIndicator size="small" color={Colors.accent} />
                    <Text style={styles.loadingText}>Connecting to Oracle…</Text>
                  </View>
                ) : (
                  <PrimaryButton
                    variant="accent"
                    size="lg"
                    onPress={() => {
                      if (mode === "login") handleLogin();
                      else if (mode === "register") handleRegister();
                      else if (mode === "forgot") handleForgot();
                      else handleUpdatePassword();
                    }}
                  >
                    {mode === "login"
                      ? "Sign In"
                      : mode === "register"
                      ? "Create Account"
                      : mode === "forgot"
                      ? "Send Reset Link"
                      : "Save New Password"}
                  </PrimaryButton>
                )}
              </View>

              {/* Guest Mode & Switch Links */}
              {mode === "forgot" ? (
                <Pressable
                  onPress={() => switchMode("login")}
                  style={styles.guestLinkWrap}
                >
                  <Text style={styles.guestLinkText}>← Back to Sign In</Text>
                </Pressable>
              ) : mode !== "update_password" ? (
                <Pressable onPress={onClose} style={styles.guestLinkWrap}>
                  <Text style={styles.guestLinkText}>
                    Continue as Guest (Offline Mode) →
                  </Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    justifyContent: "flex-end",
  },
  safe: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    maxHeight: "92%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  titleIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontFamily: FontFamily.display,
    fontSize: 17,
    color: Colors.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.6,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  tabSelector: {
    flexDirection: "row",
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.md,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: Radius.sm,
  },
  tabBtnActive: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  tabBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: Colors.textMuted,
  },
  tabBtnTextActive: {
    color: Colors.accent,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 71, 87, 0.12)",
    borderRadius: Radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 71, 87, 0.3)",
  },
  errorText: {
    fontFamily: FontFamily.sans,
    fontSize: 12,
    color: Colors.coral,
    flex: 1,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(46, 213, 115, 0.12)",
    borderRadius: Radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(46, 213, 115, 0.3)",
  },
  successText: {
    fontFamily: FontFamily.sans,
    fontSize: 12,
    color: Colors.mint,
    flex: 1,
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inputLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  forgotLink: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
    color: Colors.accent,
  },
  textInput: {
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontFamily: FontFamily.sansMedium,
    fontSize: 14,
  },
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(46, 213, 115, 0.08)",
    padding: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(46, 213, 115, 0.2)",
  },
  infoText: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
    lineHeight: 16,
  },
  submitWrap: {
    marginTop: 4,
  },
  loadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
  },
  loadingText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: Colors.textMuted,
  },
  guestLinkWrap: {
    alignItems: "center",
    paddingVertical: 8,
  },
  guestLinkText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    color: Colors.textDim,
  },
});
