import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { InfoRow } from "../components/InfoRow";

export function PlayersScreen() {
  return (
    <ScreenContainer
      title="Players"
      subtitle="Discover and connect with active club members."
    >
      <SectionCard title="Featured players">
        <InfoRow label="Amina Khan" value="Advanced" />
        <InfoRow label="Sara Noor" value="Intermediate" />
        <InfoRow label="Leila Zane" value="Beginner" />
      </SectionCard>
      <SectionCard title="Filters">
        <InfoRow label="Availability" value="Weeknights" />
        <InfoRow label="Preferred format" value="Doubles" />
      </SectionCard>
    </ScreenContainer>
  );
}
