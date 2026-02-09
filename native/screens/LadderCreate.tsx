import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { InfoRow } from "../components/InfoRow";

export function LadderCreateScreen() {
  return (
    <ScreenContainer
      title="Create Ladder"
      subtitle="Set up a new ladder with eligibility rules."
    >
      <SectionCard title="Ladder setup">
        <InfoRow label="Format" value="Doubles" />
        <InfoRow label="Division" value="Intermediate" />
        <InfoRow label="Season length" value="8 weeks" />
      </SectionCard>
      <SectionCard title="Next steps">
        <PrimaryButton label="Save ladder settings" />
        <PrimaryButton label="Invite participants" />
      </SectionCard>
    </ScreenContainer>
  );
}
