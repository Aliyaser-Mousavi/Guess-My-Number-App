import { AlertProvider } from "@/context/AlertProvider";
import { AuthProvider } from "@/context/AuthProvider";
import { GameProvider } from "@/context/GameProvider";
import { SyncProvider } from "@/context/SyncProvider";
import Colors from "@/constants/colors";
import {
  DarkTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import "react-native-reanimated";

const AppTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.bg,
    card: Colors.surface,
    text: Colors.text,
    border: Colors.border,
    primary: Colors.primary,
  },
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <GameProvider>
        <SyncProvider>
          <AlertProvider>
            <ThemeProvider value={AppTheme}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: Colors.bg },
                  animation: "fade",
                }}
              />
            </ThemeProvider>
          </AlertProvider>
        </SyncProvider>
      </GameProvider>
    </AuthProvider>
  );
}
