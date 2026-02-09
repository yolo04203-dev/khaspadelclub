import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { InfoRow } from "../components/InfoRow";
import { PrimaryButton } from "../components/PrimaryButton";

export function AmericanoScreen() {
  return (
    <ScreenContainer
      title="Americano"
      subtitle="Organize quick rotation sessions."
    >
      <SectionCard title="Next session">
        <InfoRow label="Start time" value="Tonight · 8:00 PM" />
        <InfoRow label="Players" value="12/16 confirmed" />
      </SectionCard>
      <SectionCard title="Actions">
        <PrimaryButton label="Join session" />
        <PrimaryButton label="Create new session" />
      </SectionCard>
    </ScreenContainer>
  );
}
