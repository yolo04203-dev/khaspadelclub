import { useNavigation } from "@react-navigation/native";
import { View } from "react-native";
import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { BulletList, Heading, Paragraph, SectionTitle } from "../components/Typography";

const features = [
  {
    title: "Ladder Rankings",
    description:
      "Real-time rankings with dynamic position tracking. Challenge teams above you and climb the ladder."
  },
  {
    title: "Challenge System",
    description:
      "Issue challenges to eligible opponents. Accept or decline with automated scheduling."
  },
  {
    title: "Multiple Modes",
    description:
      "Ladder, Americano, and Tournament modes. Switch between formats seamlessly."
  },
  {
    title: "Analytics Dashboard",
    description:
      "Track performance metrics, match history, and engagement stats at a glance."
  },
  {
    title: "Badges & Achievements",
    description: "Earn recognition for milestones. Most Active, Top Performer, and more."
  },
  {
    title: "Smart Notifications",
    description: "Stay updated with challenge alerts, match reminders, and ranking changes."
  }
];

const modes = [
  {
    title: "Ladder Mode",
    description:
      "Traditional ranking system where teams climb by winning challenges against higher-ranked opponents.",
    highlights: [
      "Challenge up to 5 ranks higher",
      "Real-time position updates",
      "Protection periods after matches"
    ]
  },
  {
    title: "Americano Mode",
    description:
      "Casual format with rotating partners. Perfect for social play and mixing skill levels.",
    highlights: [
      "Randomized partner assignments",
      "Point accumulation over rounds",
      "Great for large groups"
    ]
  },
  {
    title: "Tournament Mode",
    description:
      "Structured competition with brackets. Single elimination, double elimination, or round-robin formats.",
    highlights: ["Visual bracket displays", "Automated progression", "Finals and consolation rounds"]
  }
];

export function IndexScreen() {
  const navigation = useNavigation();

  return (
    <ScreenContainer
      title="Khas Padel Club"
      subtitle="The ultimate competition platform for paddle sports academies."
    >
      <SectionCard title="Welcome">
        <Heading>Elevate your paddle game</Heading>
        <Paragraph>
          Track rankings, issue challenges, and compete in real-time with a native mobile
          experience built for club members.
        </Paragraph>
        <View style={{ gap: 12 }}>
          <PrimaryButton
            label="Get Started"
            onPress={() => navigation.navigate("Auth" as never)}
          />
          <PrimaryButton
            label="View Live Demo"
            variant="outline"
            onPress={() => navigation.navigate("Ladders" as never)}
          />
        </View>
      </SectionCard>

      <SectionCard title="Key stats" description="A snapshot of activity across the club.">
        <View style={{ gap: 8 }}>
          <Paragraph>500+ Active players</Paragraph>
          <Paragraph>50+ Tournaments hosted</Paragraph>
          <Paragraph>1000+ Matches tracked</Paragraph>
        </View>
      </SectionCard>

      <SectionCard title="Features" description="Everything you need to compete.">
        <View style={{ gap: 12 }}>
          {features.map((feature) => (
            <View key={feature.title} style={{ gap: 4 }}>
              <SectionTitle>{feature.title}</SectionTitle>
              <Paragraph>{feature.description}</Paragraph>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Competition formats" description="Three ways to compete.">
        <View style={{ gap: 16 }}>
          {modes.map((mode) => (
            <View key={mode.title} style={{ gap: 6 }}>
              <SectionTitle>{mode.title}</SectionTitle>
              <Paragraph>{mode.description}</Paragraph>
              <BulletList items={mode.highlights} />
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Explore the app">
        <View style={{ gap: 12 }}>
          <PrimaryButton label="Dashboard" onPress={() => navigation.navigate("Dashboard" as never)} />
          <PrimaryButton label="Challenges" onPress={() => navigation.navigate("Challenges" as never)} />
          <PrimaryButton label="Americano Sessions" onPress={() => navigation.navigate("Americano" as never)} />
          <PrimaryButton label="Tournaments" onPress={() => navigation.navigate("Tournaments" as never)} />
        </View>
      </SectionCard>

      <SectionCard title="Support">
        <Paragraph>
          Need help? Contact the club team or review our privacy policy and terms of service.
        </Paragraph>
        <View style={{ gap: 12 }}>
          <PrimaryButton label="Contact us" variant="outline" onPress={() => navigation.navigate("Contact" as never)} />
          <PrimaryButton label="Privacy policy" variant="outline" onPress={() => navigation.navigate("Privacy" as never)} />
          <PrimaryButton label="Terms of service" variant="outline" onPress={() => navigation.navigate("Terms" as never)} />
        </View>
      </SectionCard>
    </ScreenContainer>
  );
}
