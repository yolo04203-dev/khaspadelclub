import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

type FormFieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps["keyboardType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
};

export function FormField({
  label,
  value,
  placeholder,
  multiline,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize
}: FormFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline ? styles.textArea : null]}
        value={value}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        multiline={multiline}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A"
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#FFFFFF"
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top"
  }
});
