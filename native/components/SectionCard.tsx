import { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

type SectionCardProps = PropsWithChildren<{
  title: string;
  description?: string;
}>;

export function SectionCard({
  title,
  description,
  children
}: SectionCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A"
  },
  description: {
    marginTop: 4,
    fontSize: 14,
    color: "#64748B"
  },
  content: {
    marginTop: 12,
    gap: 8
  }
});
