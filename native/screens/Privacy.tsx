import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { Paragraph, SectionTitle } from "../components/Typography";

export function PrivacyScreen() {
  return (
    <ScreenContainer
      title="Privacy Policy"
      subtitle="How we collect, use, and protect your data."
    >
      <SectionCard title="1. Information we collect">
        <Paragraph>
          We collect information you provide directly to us, such as when you create an
          account, join a team, or participate in matches. This includes your email address,
          display name, and game statistics.
        </Paragraph>
      </SectionCard>
      <SectionCard title="2. How we use your information">
        <Paragraph>
          We use the information we collect to provide, maintain, and improve our services,
          including to track your rankings, display leaderboards, and facilitate challenges
          between teams.
        </Paragraph>
      </SectionCard>
      <SectionCard title="3. Information sharing">
        <Paragraph>
          Your team name, rankings, and match results are publicly visible on the leaderboard.
          We do not sell your personal information to third parties.
        </Paragraph>
      </SectionCard>
      <SectionCard title="4. Data security">
        <Paragraph>
          We implement appropriate security measures to protect your personal information.
          However, no method of transmission over the internet is 100% secure.
        </Paragraph>
      </SectionCard>
      <SectionCard title="5. Your rights">
        <Paragraph>
          You can access, update, or delete your account information at any time through your
          profile settings. Contact us if you need assistance.
        </Paragraph>
      </SectionCard>
      <SectionCard title="6. Contact us">
        <Paragraph>
          If you have any questions about this Privacy Policy, please contact us through the
          Contact screen.
        </Paragraph>
      </SectionCard>
      <SectionCard title="Last updated">
        <SectionTitle>{new Date().toLocaleDateString()}</SectionTitle>
      </SectionCard>
    </ScreenContainer>
  );
}
