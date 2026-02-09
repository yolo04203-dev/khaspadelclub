import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { InfoRow } from "../components/InfoRow";

export function FindOpponentsScreen() {
  return (
    <ScreenContainer
      title="Find Opponents"
      subtitle="Set preferences and get matched with opponents."
    >
      <SectionCard title="Matching preferences">
        <InfoRow label="Skill range" value="Intermediate+" />
        <InfoRow label="Preferred time" value="After 6 PM" />
        <InfoRow label="Match type" value="Friendly" />
      </SectionCard>
      <SectionCard title="Start a match request">
        <PrimaryButton label="Search available players" />
        <PrimaryButton label="Invite a partner" />
      </SectionCard>
    </ScreenContainer>
  );
}
