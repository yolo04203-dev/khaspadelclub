import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./native/contexts/AuthContext";
import {
  AdminScreen,
  AmericanoCreateScreen,
  AmericanoScreen,
  AmericanoSessionScreen,
  AuthScreen,
  ChallengesScreen,
  ContactScreen,
  CreateTeamScreen,
  DashboardScreen,
  FindOpponentsScreen,
  IndexScreen,
  LadderCreateScreen,
  LadderDetailScreen,
  LadderManageScreen,
  LaddersScreen,
  NotFoundScreen,
  PlayerProfileScreen,
  PlayersScreen,
  PrivacyScreen,
  ProfileScreen,
  StatsScreen,
  TermsScreen,
  TournamentCreateScreen,
  TournamentDetailScreen,
  TournamentsScreen
} from "./native/screens";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator initialRouteName="Index">
          <Stack.Screen name="Index" component={IndexScreen} options={{ title: "Home" }} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Auth" component={AuthScreen} options={{ title: "Sign In" }} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="PlayerProfile" component={PlayerProfileScreen} />
          <Stack.Screen name="Players" component={PlayersScreen} />
          <Stack.Screen name="FindOpponents" component={FindOpponentsScreen} options={{ title: "Find Opponents" }} />
          <Stack.Screen name="CreateTeam" component={CreateTeamScreen} options={{ title: "Create Team" }} />
          <Stack.Screen name="Challenges" component={ChallengesScreen} />
          <Stack.Screen name="Stats" component={StatsScreen} />
          <Stack.Screen name="Ladders" component={LaddersScreen} />
          <Stack.Screen name="LadderDetail" component={LadderDetailScreen} options={{ title: "Ladder Detail" }} />
          <Stack.Screen name="LadderCreate" component={LadderCreateScreen} options={{ title: "Create Ladder" }} />
          <Stack.Screen name="LadderManage" component={LadderManageScreen} options={{ title: "Manage Ladder" }} />
          <Stack.Screen name="Tournaments" component={TournamentsScreen} />
          <Stack.Screen name="TournamentDetail" component={TournamentDetailScreen} options={{ title: "Tournament Detail" }} />
          <Stack.Screen name="TournamentCreate" component={TournamentCreateScreen} options={{ title: "Create Tournament" }} />
          <Stack.Screen name="Americano" component={AmericanoScreen} />
          <Stack.Screen name="AmericanoSession" component={AmericanoSessionScreen} options={{ title: "Americano Session" }} />
          <Stack.Screen name="AmericanoCreate" component={AmericanoCreateScreen} options={{ title: "Create Americano" }} />
          <Stack.Screen name="Contact" component={ContactScreen} />
          <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ title: "Privacy Policy" }} />
          <Stack.Screen name="Terms" component={TermsScreen} options={{ title: "Terms of Service" }} />
          <Stack.Screen name="Admin" component={AdminScreen} />
          <Stack.Screen name="NotFound" component={NotFoundScreen} options={{ title: "Not Found" }} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}
