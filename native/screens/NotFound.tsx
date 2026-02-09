import { Text } from "react-native";
import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";

export function NotFoundScreen() {
  return (
    <ScreenContainer
      title="Not Found"
      subtitle="We couldn't locate that screen."
    >
      <SectionCard title="Try again">
        <Text>Head back to the home screen to continue exploring the app.</Text>
      </SectionCard>
    </ScreenContainer>
  );
}
