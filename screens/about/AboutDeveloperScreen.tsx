// ==============================================================================
// Screen: AboutDeveloperScreen.tsx
// Description: Creator spotlight and verified architecture overview for MarsGuess.
//              Features creator profile hero, authentic background, verified tech stack,
//              personal contact channels, Mars Coders supporter card, and full-screen preview.
// ==============================================================================

import ScreenBackground from "@/components/ui/ScreenBackground";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { FontFamily, Radius, Shadows, Spacing } from "@/constants/theme";
import { useAppAlert } from "@/context/AlertProvider";
import { useGame } from "@/context/GameProvider";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Statically resolved portrait asset from assets/images/creator.png
const CREATOR_IMAGE = require("@/assets/images/creator.png");

interface TechItem {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  category: string;
}

const VERIFIED_TECH_STACK: TechItem[] = [
  {
    id: "rn-expo",
    name: "React Native 0.88 & Expo SDK 58",
    icon: "phone-portrait-outline",
    category: "Mobile Core",
  },
  {
    id: "ts",
    name: "TypeScript (Strict)",
    icon: "code-slash-outline",
    category: "Language",
  },
  {
    id: "expo-router",
    name: "Expo Router",
    icon: "navigate-outline",
    category: "Architecture",
  },
  {
    id: "supabase-pg",
    name: "Supabase & PostgreSQL (RLS)",
    icon: "server-outline",
    category: "Cloud Backend",
  },
  {
    id: "async-storage",
    name: "AsyncStorage & Local Persistence",
    icon: "save-outline",
    category: "Persistence",
  },
  {
    id: "reanimated",
    name: "React Native Reanimated",
    icon: "sparkles-outline",
    category: "UI & Animations",
  },
];

interface ContactLink {
  id: string;
  label: string;
  display: string;
  icon: keyof typeof Ionicons.glyphMap;
  url: string;
  accentColor: string;
}

const PERSONAL_CONTACT_LINKS: ContactLink[] = [
  {
    id: "portfolio",
    label: "Personal Portfolio",
    display: "aliyaser-mousavi-portfolio.onrender.com",
    icon: "globe-outline",
    url: "https://aliyaser-mousavi-portfolio.onrender.com/",
    accentColor: Colors.primary,
  },
  {
    id: "email",
    label: "Email",
    display: "aliyasermousavi@gmail.com",
    icon: "mail-outline",
    url: "mailto:aliyasermousavi@gmail.com",
    accentColor: Colors.accent,
  },
  {
    id: "github",
    label: "GitHub",
    display: "github.com/Aliyaser-Mousavi",
    icon: "logo-github",
    url: "https://github.com/Aliyaser-Mousavi",
    accentColor: "#FFFFFF",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    display: "+93 782 899 827",
    icon: "logo-whatsapp",
    url: "https://wa.me/93782899827",
    accentColor: Colors.mint,
  },
  {
    id: "telegram",
    label: "Telegram",
    display: "+93 782 899 827",
    icon: "paper-plane-outline",
    url: "https://t.me/+93782899827",
    accentColor: Colors.primary,
  },
  {
    id: "phone",
    label: "Phone",
    display: "+93 782 899 827",
    icon: "call-outline",
    url: "tel:+93782899827",
    accentColor: Colors.coral,
  },
];

export default function AboutDeveloperScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  const { buzz, playSound } = useGame();
  const { showAlert } = useAppAlert();
  const [modalVisible, setModalVisible] = useState(false);

  // App version and metadata
  const appVersion =
    Constants.expoConfig?.version ??
    (Constants as any)?.manifest2?.extra?.expoClient?.version ??
    "1.0.0";
  const appName = "MarsGuess";
  const currentYear = new Date().getFullYear();

  const handleOpenUrl = async (url: string) => {
    buzz("light");
    playSound("button_click");
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        showAlert(
          "Unable to Open Link",
          `Please check your network connection or app settings.\n\n${url}`,
        );
      }
    } catch {
      showAlert(
        "Unable to Open Link",
        `Please check your network connection or app settings.\n\n${url}`,
      );
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* Navigation Bar */}
        <View style={styles.headerBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => {
              buzz("light");
              playSound("button_click");
              onBack();
            }}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <Title size="md" color={Colors.text}>
              About Developer
            </Title>
            <Text style={styles.headerSubtitle}>MarsGuess Creator</Text>
          </View>

          {/* Balance spacer */}
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section A: Hero Creator Spotlight Card */}
          <View style={styles.heroSpotlightContainer}>
            <LinearGradient
              colors={["rgba(0, 229, 255, 0.12)", "rgba(10, 14, 23, 0.85)"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.heroGradientBackground}
            />

            {/* Glowing Avatar Chamber with Unclipped Zoom Badge */}
            <View style={styles.avatarChamber}>
              {/* Outer ambient glow halo */}
              <View style={styles.avatarAmbientHalo} />

              {/* Main circular avatar ring */}
              <View style={styles.avatarRingOuter}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="View full developer portrait"
                  accessibilityHint="Double tap to open full screen photo preview"
                  onPress={() => {
                    buzz("light");
                    playSound("button_click");
                    setModalVisible(true);
                  }}
                  style={({ pressed }) => [
                    styles.avatarImageWrapper,
                    pressed && styles.avatarImagePressed,
                  ]}
                >
                  <Image
                    source={CREATOR_IMAGE}
                    style={styles.avatarImage}
                    contentFit="cover"
                    transition={250}
                  />
                </Pressable>
              </View>

              {/* Floating Zoom Badge (Outside the clipping container) */}
              {/* <Pressable
                accessibilityRole="button"
                accessibilityLabel="Enlarge portrait"
                onPress={() => {
                  buzz("light");
                  playSound("button_click");
                  setModalVisible(true);
                }}
                style={({ pressed }) => [
                  styles.avatarZoomBadgeFloating,
                  pressed && { transform: [{ scale: 0.9 }] },
                ]}
              >
                <Ionicons name="expand" size={13} color={Colors.bg} />
              </Pressable> */}
            </View>

            {/* Creator Identity Meta */}
            <View style={styles.creatorMetaBlock}>
              <Text style={styles.developerName}>Aliyaser Mousavi</Text>

              <View style={styles.creatorBadge}>
                <Ionicons name="sparkles" size={12} color={Colors.accent} />
                <Text style={styles.creatorBadgeText}>MarsGuess Creator</Text>
              </View>

              <Text style={styles.developerTitle}>
                Frontend Developer · Learning Mobile Development
              </Text>
            </View>
          </View>

          {/* Section B: About the Developer Introduction */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconPill}>
                <Ionicons
                  name="person-outline"
                  size={16}
                  color={Colors.primary}
                />
              </View>
              <Text style={styles.sectionHeading}>About the Developer</Text>
            </View>
            <Text style={styles.bioBody}>
              {
                "Hi, I'm Aliyaser Mousavi, a frontend developer who enjoys building clean, intuitive, and interactive digital experiences. I'm currently expanding my skills in mobile app development. MarsGuess is one of my personal projects, built to explore game design, mobile development, and modern application architecture."
              }
            </Text>
          </View>

          {/* Section C: Verified Technology Stack */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconPill}>
                <Ionicons
                  name="layers-outline"
                  size={16}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.sectionHeading}>
                  Verified Technology Stack
                </Text>
                <Text style={styles.sectionSubtext}>
                  Core technologies powering the MarsGuess codebase
                </Text>
              </View>
            </View>

            <View style={styles.techBentoGrid}>
              {VERIFIED_TECH_STACK.map((tech) => (
                <View key={tech.id} style={styles.techBentoCard}>
                  <View style={styles.techIconPill}>
                    <Ionicons
                      name={tech.icon}
                      size={17}
                      color={Colors.accent}
                    />
                  </View>
                  <View style={styles.techBentoMeta}>
                    <Text style={styles.techName}>{tech.name}</Text>
                    <Text style={styles.techCategory}>{tech.category}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Section D: Personal Contact Links */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconPill}>
                <Ionicons
                  name="link-outline"
                  size={16}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.sectionHeading}>
                  Personal Contact & Channels
                </Text>
                <Text style={styles.sectionSubtext}>
                  Direct channels to connect with the developer
                </Text>
              </View>
            </View>

            <View style={styles.linksContainer}>
              {PERSONAL_CONTACT_LINKS.map((link) => (
                <Pressable
                  key={link.id}
                  accessibilityRole="button"
                  accessibilityLabel={link.label}
                  onPress={() => handleOpenUrl(link.url)}
                  style={({ pressed }) => [
                    styles.linkCard,
                    pressed && styles.linkCardPressed,
                  ]}
                >
                  <View style={styles.linkLeftGroup}>
                    <View
                      style={[
                        styles.linkIconWrap,
                        { borderColor: `${link.accentColor}40` },
                      ]}
                    >
                      <Ionicons
                        name={link.icon}
                        size={18}
                        color={link.accentColor}
                      />
                    </View>
                    <View style={styles.linkTextWrap}>
                      <Text style={styles.linkLabel}>{link.label}</Text>
                      <Text style={styles.linkSubtext} numberOfLines={1}>
                        {link.display}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.linkChevronCircle}>
                    <Ionicons
                      name="open-outline"
                      size={14}
                      color={Colors.textDim}
                    />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Section E: Project Supporter */}
          <View style={styles.supporterCard}>
            <LinearGradient
              colors={["rgba(255, 184, 0, 0.08)", "rgba(10, 14, 23, 0.95)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.supporterGradientBg}
            />

            <View style={styles.sectionTitleRow}>
              <View
                style={[
                  styles.sectionIconPill,
                  {
                    backgroundColor: "rgba(255, 184, 0, 0.12)",
                    borderColor: "rgba(255, 184, 0, 0.3)",
                  },
                ]}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={16}
                  color={Colors.accent}
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.sectionHeading}>
                  Supported by Mars Coders
                </Text>
                <Text style={styles.sectionSubtext}>Project Supporter</Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Visit Mars Coders Website"
              onPress={() => handleOpenUrl("https://www.marscoders.tech/")}
              style={({ pressed }) => [
                styles.supporterActionCard,
                pressed && styles.linkCardPressed,
              ]}
            >
              <View style={styles.linkLeftGroup}>
                <View style={styles.supporterLogoWrap}>
                  <Ionicons name="globe" size={18} color={Colors.accent} />
                </View>
                <View style={styles.linkTextWrap}>
                  <View style={styles.supporterTitleRow}>
                    <Text style={styles.linkLabel}>Mars Coders</Text>
                    <View style={styles.supporterBadge}>
                      <Text style={styles.supporterBadgeText}>
                        Official Supporter
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.linkSubtext}>
                    https://www.marscoders.tech/
                  </Text>
                </View>
              </View>

              <View style={styles.linkChevronCircle}>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={Colors.accent}
                />
              </View>
            </Pressable>
          </View>

          {/* Section F: Application Footer */}
          <View style={styles.footerContainer}>
            <View style={styles.footerLogoBadge}>
              <Ionicons name="planet" size={18} color={Colors.accent} />
              <Text style={styles.footerAppName}>{appName}</Text>
            </View>
            <Text style={styles.footerVersion}>Version {appVersion}</Text>
            <Text style={styles.footerCopyright}>
              © {currentYear} {appName}. All rights reserved.
            </Text>
          </View>
        </ScrollView>

        {/* Modal: Full Screen Portrait Preview */}
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <SafeAreaView
              style={styles.modalSafeArea}
              edges={["top", "bottom"]}
            >
              <View style={styles.modalHeader}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  onPress={() => {
                    buzz("light");
                    setModalVisible(false);
                  }}
                  style={({ pressed }) => [
                    styles.modalCloseButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Ionicons name="close" size={24} color={Colors.text} />
                </Pressable>
              </View>

              <View style={styles.modalImageContainer}>
                <Image
                  source={CREATOR_IMAGE}
                  style={styles.modalFullImage}
                  contentFit="contain"
                  transition={300}
                />
              </View>

              <View style={styles.modalCaptionCard}>
                <Text style={styles.modalCaptionName}>Aliyaser Mousavi</Text>
                <Text style={styles.modalCaptionRole}>
                  Frontend Developer · Learning Mobile Development
                </Text>
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTitleWrap: {
    alignItems: "center",
  },
  headerSubtitle: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.accent,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
  },

  /* Hero Creator Spotlight Card */
  heroSpotlightContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderAccent,
    overflow: "hidden",
    position: "relative",
    ...Shadows.glowTeal,
  },
  heroGradientBackground: {
    ...StyleSheet.absoluteFill,
  },

  /* Avatar Chamber with Unclipped Zoom Badge */
  avatarChamber: {
    width: 130,
    height: 130,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: Spacing.md,
  },
  avatarAmbientHalo: {
    position: "absolute",
    width: 126,
    height: 126,
    borderRadius: 63,
    backgroundColor: "rgba(0, 229, 255, 0.14)",
  },
  avatarRingOuter: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 3,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
    padding: 3,
    ...Shadows.glowTeal,
  },
  avatarImageWrapper: {
    width: "100%",
    height: "100%",
    borderRadius: 52,
    overflow: "hidden",
    backgroundColor: Colors.bg,
  },
  avatarImagePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarZoomBadgeFloating: {
    position: "absolute",
    right: 4,
    bottom: 4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.bg,
    elevation: 5,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 5,
  },

  /* Creator Meta Info */
  creatorMetaBlock: {
    alignItems: "center",
  },
  developerName: {
    fontFamily: FontFamily.display,
    fontSize: 24,
    color: Colors.text,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  creatorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 184, 0, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.35)",
    marginTop: 8,
  },
  creatorBadgeText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.accent,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  developerTitle: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 8,
    textAlign: "center",
  },

  /* Section Card Standards */
  sectionCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: Spacing.md,
  },
  sectionIconPill: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  sectionHeading: {
    fontFamily: FontFamily.sansBold,
    fontSize: 15,
    color: Colors.text,
  },
  sectionSubtext: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.textDim,
    marginTop: 1,
  },
  bioBody: {
    fontFamily: FontFamily.body,
    fontSize: 13.5,
    lineHeight: 22,
    color: Colors.textMuted,
  },

  /* Tech Stack Grid */
  techBentoGrid: {
    gap: 8,
  },
  techBentoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  techIconPill: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255, 184, 0, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.25)",
  },
  techBentoMeta: {
    flex: 1,
  },
  techName: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
    color: Colors.text,
  },
  techCategory: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.accent,
    marginTop: 1,
    letterSpacing: 0.3,
  },

  /* Personal Contact Links */
  linksContainer: {
    gap: 10,
  },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  linkCardPressed: {
    backgroundColor: Colors.surfaceHighlight,
    borderColor: Colors.primaryDark,
  },
  linkLeftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  linkIconWrap: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  linkTextWrap: {
    flex: 1,
  },
  linkLabel: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: Colors.text,
  },
  linkSubtext: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  linkChevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Supporter Section */
  supporterCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.3)",
    overflow: "hidden",
    position: "relative",
    ...Shadows.glowGold,
  },
  supporterGradientBg: {
    ...StyleSheet.absoluteFill,
  },
  supporterActionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.25)",
  },
  supporterLogoWrap: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255, 184, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.3)",
  },
  supporterTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  supporterBadge: {
    backgroundColor: "rgba(255, 184, 0, 0.14)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.35)",
  },
  supporterBadgeText: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    color: Colors.accent,
    fontWeight: "700",
  },

  /* Footer */
  footerContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: 6,
  },
  footerLogoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 4,
  },
  footerAppName: {
    fontFamily: FontFamily.display,
    fontSize: 14,
    color: Colors.text,
    letterSpacing: 0.5,
  },
  footerVersion: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.textDim,
  },
  footerCopyright: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.textDim,
  },

  /* Full Screen Image Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.94)",
  },
  modalSafeArea: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalImageContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  modalFullImage: {
    width: "100%",
    height: "100%",
    maxHeight: 520,
    borderRadius: Radius.lg,
  },
  modalCaptionCard: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  modalCaptionName: {
    fontFamily: FontFamily.display,
    fontSize: 18,
    color: Colors.text,
  },
  modalCaptionRole: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
