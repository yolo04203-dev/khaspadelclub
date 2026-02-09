import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { InfoRow } from "../components/InfoRow";
import { PrimaryButton } from "../components/PrimaryButton";

export function LaddersScreen() {
  return (
    <ScreenContainer
      title="Ladders"
      subtitle="Join ladders and follow the competitive rankings."
    >
      <SectionCard title="Active ladders">
        <InfoRow label="Women’s Ladder" value="Level 3" />
        <InfoRow label="Mixed Ladder" value="Open" />
      </SectionCard>
      <SectionCard title="Manage participation">
        <PrimaryButton label="Join a ladder" />
        <PrimaryButton label="View ladder details" />
      </SectionCard>
    </ScreenContainer>
  );
}
