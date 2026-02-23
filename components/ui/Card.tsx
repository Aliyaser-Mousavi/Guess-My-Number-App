import Colors from "@/constants/colors";
import { StyleSheet, View } from "react-native";
export default function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}
const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 36,
    borderRadius: 8,
    backgroundColor: Colors.primary800,
    elevation: 4,
    shadowColor: "black",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    shadowOpacity: 0.25,
  },
});
