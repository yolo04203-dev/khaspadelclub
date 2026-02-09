import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { FormField } from "../components/FormField";
import { Paragraph, SectionTitle } from "../components/Typography";
import { useAuth } from "../contexts/AuthContext";

export function AuthScreen() {
  const navigation = useNavigation();
  const { signIn, signUp, authError, isLoading, user } = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (key: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const statusMessage = useMemo(() => {
    if (isLoading) return "Checking session…";
    if (user) return `Signed in as ${user.email ?? "member"}.`;
    return null;
  }, [isLoading, user]);

  useEffect(() => {
    if (!isLoading && user) {
      navigation.navigate("Dashboard" as never);
    }
  }, [isLoading, navigation, user]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    if (mode === "sign-in") {
      await signIn(formData.email, formData.password);
    } else {
      await signUp(formData.email, formData.password, formData.displayName);
    }
    setIsSubmitting(false);
  };

  return (
    <ScreenContainer
      title="Sign In"
      subtitle="Secure access for members and club admins."
    >
      <SectionCard title="Account access">
        <Paragraph>
          {mode === "sign-in"
            ? "Welcome back. Sign in to manage your teams and matches."
            : "Create an account to join ladders and tournaments."}
        </Paragraph>
        {statusMessage ? <Text style={{ color: "#475569" }}>{statusMessage}</Text> : null}
        {authError ? <Text style={{ color: "#DC2626" }}>{authError}</Text> : null}
        {mode === "sign-up" ? (
          <FormField
            label="Display name"
            value={formData.displayName}
            placeholder="Your name"
            onChangeText={(value) => handleChange("displayName", value)}
            autoCapitalize="words"
          />
        ) : null}
        <FormField
          label="Email"
          value={formData.email}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          onChangeText={(value) => handleChange("email", value)}
        />
        <FormField
          label="Password"
          value={formData.password}
          placeholder="••••••••"
          secureTextEntry
          onChangeText={(value) => handleChange("password", value)}
        />
        <PrimaryButton
          label={isSubmitting ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
          onPress={handleSubmit}
        />
        <View style={{ gap: 8 }}>
          <SectionTitle>{mode === "sign-in" ? "New here?" : "Already have an account?"}</SectionTitle>
          <PrimaryButton
            label={mode === "sign-in" ? "Create an account" : "Back to sign in"}
            variant="outline"
            onPress={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
          />
        </View>
      </SectionCard>
      <SectionCard title="Next steps">
        <Paragraph>
          Once signed in, you can manage your teams, issue challenges, and view your ladder
          position.
        </Paragraph>
        <PrimaryButton
          label="Go to dashboard"
          variant="outline"
          onPress={() => navigation.navigate("Dashboard" as never)}
        />
      </SectionCard>
    </ScreenContainer>
  );
}
