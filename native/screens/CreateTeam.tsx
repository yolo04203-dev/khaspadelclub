import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { InfoRow } from "../components/InfoRow";

export function CreateTeamScreen() {
  return (
    <ScreenContainer
      title="Create Team"
      subtitle="Build a team for league play or friendly matches."
    >
      <SectionCard title="Team details">
        <InfoRow label="Team name" value="Sunset Smashers" />
        <InfoRow label="Division" value="Intermediate" />
      </SectionCard>
      <SectionCard title="Invite members">
        <PrimaryButton label="Add players" />
        <PrimaryButton label="Send invitations" />
      </SectionCard>
    </ScreenContainer>
  );
}
