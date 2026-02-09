import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { InfoRow } from "../components/InfoRow";

export function StatsScreen() {
  return (
    <ScreenContainer
      title="Stats"
      subtitle="Performance insights and match analytics."
    >
      <SectionCard title="Season summary">
        <InfoRow label="Matches played" value="24" />
        <InfoRow label="Win percentage" value="58%" />
        <InfoRow label="Tie-breaks won" value="7" />
      </SectionCard>
      <SectionCard title="Progress">
        <InfoRow label="Ranking change" value="+3 positions" />
        <InfoRow label="Most played partner" value="Hana Alvi" />
      </SectionCard>
    </ScreenContainer>
  );
}
