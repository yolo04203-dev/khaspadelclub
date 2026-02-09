import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { InfoRow } from "../components/InfoRow";

export function AmericanoSessionScreen() {
  return (
    <ScreenContainer
      title="Americano Session"
      subtitle="Session logistics and match rotations."
    >
      <SectionCard title="Session info">
        <InfoRow label="Courts" value="3" />
        <InfoRow label="Rounds" value="6" />
        <InfoRow label="Format" value="Timed sets" />
      </SectionCard>
      <SectionCard title="Check-in">
        <InfoRow label="Arrived" value="9 players" />
        <InfoRow label="Pending" value="3 players" />
      </SectionCard>
    </ScreenContainer>
  );
}
