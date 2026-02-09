import { StyleSheet, Text, View } from "react-native";

type HeadingProps = {
  children: string;
};

export function Heading({ children }: HeadingProps) {
  return <Text style={styles.heading}>{children}</Text>;
}

export function SectionTitle({ children }: HeadingProps) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Paragraph({ children }: HeadingProps) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

type BulletListProps = {
  items: string[];
};

export function BulletList({ items }: BulletListProps) {
  return (
    <View style={styles.bulletList}>
      {items.map((item) => (
        <View key={item} style={styles.bulletItem}>
          <Text style={styles.bulletMarker}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0F172A"
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A"
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 20,
    color: "#475569"
  },
  bulletList: {
    gap: 8
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6
  },
  bulletMarker: {
    fontSize: 14,
    color: "#1D4ED8"
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#475569"
  }
});
