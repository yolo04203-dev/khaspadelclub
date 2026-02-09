import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { InfoRow } from "../components/InfoRow";

export function PlayerProfileScreen() {
  return (
    <ScreenContainer
      title="Player Profile"
      subtitle="Review stats, ranking history, and recent matches."
    >
      <SectionCard title="Current ranking">
        <InfoRow label="Ladder rank" value="#8" />
        <InfoRow label="Recent streak" value="W-W-L-W" />
      </SectionCard>
      <SectionCard title="Performance">
        <InfoRow label="Win rate" value="62%" />
        <InfoRow label="Matches played" value="41" />
      </SectionCard>
    </ScreenContainer>
  );
}
