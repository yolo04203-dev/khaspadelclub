import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { InfoRow } from "../components/InfoRow";
import { PrimaryButton } from "../components/PrimaryButton";

export function ProfileScreen() {
  return (
    <ScreenContainer
      title="Profile"
      subtitle="Manage your member details and preferences."
    >
      <SectionCard title="Member profile">
        <InfoRow label="Name" value="Rania Al-Khas" />
        <InfoRow label="Level" value="Intermediate" />
        <InfoRow label="Preferred side" value="Backhand" />
      </SectionCard>
      <SectionCard title="Settings">
        <PrimaryButton label="Edit profile" />
        <PrimaryButton label="Notification preferences" />
      </SectionCard>
    </ScreenContainer>
  );
}
