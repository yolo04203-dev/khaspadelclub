import { PropsWithChildren } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

type ScreenContainerProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

export function ScreenContainer({
  title,
  subtitle,
  children
}: ScreenContainerProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={styles.body}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24
  },
  header: {
    marginBottom: 16
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A"
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: "#475569"
  },
  body: {
    gap: 16
  }
});
