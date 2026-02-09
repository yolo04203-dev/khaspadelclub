import { StyleSheet, Text, View } from "react-native";

type InfoRowProps = {
  label: string;
  value: string;
};

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  label: {
    fontSize: 14,
    color: "#64748B"
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A"
  }
});
