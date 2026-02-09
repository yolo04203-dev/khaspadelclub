import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { InfoRow } from "../components/InfoRow";
import { PrimaryButton } from "../components/PrimaryButton";

export function LadderManageScreen() {
  return (
    <ScreenContainer
      title="Manage Ladder"
      subtitle="Administer standings, matches, and disputes."
    >
      <SectionCard title="Requests">
        <InfoRow label="New join requests" value="4" />
        <InfoRow label="Score disputes" value="1" />
      </SectionCard>
      <SectionCard title="Tools">
        <PrimaryButton label="Update standings" />
        <PrimaryButton label="Resolve disputes" />
      </SectionCard>
    </ScreenContainer>
  );
}
