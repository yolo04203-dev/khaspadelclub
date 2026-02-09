import { useState } from "react";
import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { FormField } from "../components/FormField";
import { Paragraph } from "../components/Typography";

export function ContactScreen() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const handleChange = (key: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <ScreenContainer
      title="Contact"
      subtitle="Reach the club team or request support."
    >
      <SectionCard title="Send us a message">
        <Paragraph>
          Have questions or feedback? Fill out the form below and we&apos;ll get back to you
          soon.
        </Paragraph>
        <FormField
          label="Name"
          value={formData.name}
          placeholder="Your name"
          onChangeText={(value) => handleChange("name", value)}
        />
        <FormField
          label="Email"
          value={formData.email}
          placeholder="you@example.com"
          onChangeText={(value) => handleChange("email", value)}
        />
        <FormField
          label="Subject"
          value={formData.subject}
          placeholder="How can we help?"
          onChangeText={(value) => handleChange("subject", value)}
        />
        <FormField
          label="Message"
          value={formData.message}
          placeholder="Tell us more..."
          multiline
          onChangeText={(value) => handleChange("message", value)}
        />
        <PrimaryButton label="Send message" />
      </SectionCard>
      <SectionCard title="Club office">
        <Paragraph>Phone: +971 555 0101</Paragraph>
        <Paragraph>Email: hello@khaspadelclub.com</Paragraph>
        <Paragraph>Hours: 7:00 AM - 11:00 PM (daily)</Paragraph>
      </SectionCard>
    </ScreenContainer>
  );
}
