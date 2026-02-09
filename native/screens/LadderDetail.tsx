import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { InfoRow } from "../components/InfoRow";

export function LadderDetailScreen() {
  return (
    <ScreenContainer
      title="Ladder Detail"
      subtitle="Review standings and match history."
    >
      <SectionCard title="Current standings">
        <InfoRow label="#1" value="Team Pulse" />
        <InfoRow label="#2" value="Net Ninjas" />
        <InfoRow label="#3" value="Court Queens" />
      </SectionCard>
      <SectionCard title="Next challenge window">
        <InfoRow label="Opens" value="Friday 10:00 AM" />
        <InfoRow label="Closes" value="Sunday 7:00 PM" />
      </SectionCard>
    </ScreenContainer>
  );
}
