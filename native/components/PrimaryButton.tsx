import { StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";

type PrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "outline";
  style?: ViewStyle;
};

export function PrimaryButton({
  label,
  onPress,
  variant = "primary",
  style
}: PrimaryButtonProps) {
  const isOutline = variant === "outline";
  return (
    <TouchableOpacity
      style={[styles.button, isOutline ? styles.outlineButton : styles.primaryButton, style]}
      onPress={onPress}
    >
      <Text style={[styles.label, isOutline ? styles.outlineLabel : styles.primaryLabel]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center"
  },
  primaryButton: {
    backgroundColor: "#1D4ED8"
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#CBD5F5"
  },
  label: {
    fontSize: 15,
    fontWeight: "600"
  },
  primaryLabel: {
    color: "#FFFFFF"
  },
  outlineLabel: {
    color: "#1D4ED8"
  }
});
