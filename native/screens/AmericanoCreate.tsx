import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { InfoRow } from "../components/InfoRow";
import { PrimaryButton } from "../components/PrimaryButton";

export function AmericanoCreateScreen() {
  return (
    <ScreenContainer
      title="Create Americano"
      subtitle="Schedule a quick-rotation event."
    >
      <SectionCard title="Session setup">
        <InfoRow label="Date" value="Saturday" />
        <InfoRow label="Start time" value="6:30 PM" />
        <InfoRow label="Max players" value="16" />
      </SectionCard>
      <SectionCard title="Actions">
        <PrimaryButton label="Save session" />
        <PrimaryButton label="Notify players" />
      </SectionCard>
    </ScreenContainer>
  );
}
