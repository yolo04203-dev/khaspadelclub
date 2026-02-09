import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { InfoRow } from "../components/InfoRow";
import { PrimaryButton } from "../components/PrimaryButton";

export function AdminScreen() {
  return (
    <ScreenContainer
      title="Admin"
      subtitle="Tools for managing members, courts, and events."
    >
      <SectionCard title="Today">
        <InfoRow label="Court bookings" value="18" />
        <InfoRow label="Pending approvals" value="2" />
      </SectionCard>
      <SectionCard title="Admin actions">
        <PrimaryButton label="Manage members" />
        <PrimaryButton label="Approve ladder results" />
      </SectionCard>
    </ScreenContainer>
  );
}
