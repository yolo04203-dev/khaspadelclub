import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { InfoRow } from "../components/InfoRow";
import { PrimaryButton } from "../components/PrimaryButton";

export function ChallengesScreen() {
  return (
    <ScreenContainer
      title="Challenges"
      subtitle="Track open challenges and manage new requests."
    >
      <SectionCard title="Open challenges">
        <InfoRow label="Team Vega" value="Awaiting response" />
        <InfoRow label="Rania & Hana" value="Match in 3 days" />
      </SectionCard>
      <SectionCard title="Actions">
        <PrimaryButton label="Create a challenge" />
        <PrimaryButton label="Review pending invites" />
      </SectionCard>
    </ScreenContainer>
  );
}
