import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { InfoRow } from "../components/InfoRow";
import { PrimaryButton } from "../components/PrimaryButton";

export function TournamentCreateScreen() {
  return (
    <ScreenContainer
      title="Create Tournament"
      subtitle="Launch a new competitive event."
    >
      <SectionCard title="Tournament setup">
        <InfoRow label="Name" value="Autumn Rally" />
        <InfoRow label="Teams limit" value="16" />
        <InfoRow label="Format" value="Best of 3" />
      </SectionCard>
      <SectionCard title="Next steps">
        <PrimaryButton label="Publish tournament" />
        <PrimaryButton label="Invite participants" />
      </SectionCard>
    </ScreenContainer>
  );
}
