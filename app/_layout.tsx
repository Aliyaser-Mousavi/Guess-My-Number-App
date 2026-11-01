import { AlertProvider } from "@/context/AlertProvider";
import { GameProvider } from "@/context/GameProvider";
import Colors from "@/constants/colors";
import {
  DarkTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
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
    <GameProvider>
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
    </GameProvider>
  );
}
