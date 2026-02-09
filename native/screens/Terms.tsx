import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { Paragraph, SectionTitle } from "../components/Typography";

export function TermsScreen() {
  return (
    <ScreenContainer
      title="Terms of Service"
      subtitle="Usage guidelines for members and guests."
    >
      <SectionCard title="1. Acceptance of terms">
        <Paragraph>
          By accessing and using Paddle Leaderboard, you agree to be bound by these Terms of
          Service. If you do not agree to these terms, please do not use our service.
        </Paragraph>
      </SectionCard>
      <SectionCard title="2. Account registration">
        <Paragraph>
          You must provide accurate information when creating an account. You are responsible
          for maintaining the security of your account and all activities under your account.
        </Paragraph>
      </SectionCard>
      <SectionCard title="3. User conduct">
        <Paragraph>
          Users agree to use the platform fairly and honestly. Cheating, harassment, or any
          form of abuse is strictly prohibited and may result in account suspension.
        </Paragraph>
      </SectionCard>
      <SectionCard title="4. Match results">
        <Paragraph>
          All match results must be reported accurately. Falsifying match results may result in
          penalties including ranking adjustments or account suspension.
        </Paragraph>
      </SectionCard>
      <SectionCard title="5. Challenges">
        <Paragraph>
          Teams must respond to challenges within the specified timeframe. Challenges that
          expire without response may affect your team&apos;s standing.
        </Paragraph>
      </SectionCard>
      <SectionCard title="6. Modifications">
        <Paragraph>
          We reserve the right to modify these terms at any time. Continued use of the service
          after changes constitutes acceptance of the new terms.
        </Paragraph>
      </SectionCard>
      <SectionCard title="7. Termination">
        <Paragraph>
          We may terminate or suspend your account at our discretion for violations of these
          terms or for any other reason we deem appropriate.
        </Paragraph>
      </SectionCard>
      <SectionCard title="Last updated">
        <SectionTitle>{new Date().toLocaleDateString()}</SectionTitle>
      </SectionCard>
    </ScreenContainer>
  );
}
