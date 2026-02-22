import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider, Portal } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { en, registerTranslation } from 'react-native-paper-dates';

// Providers
import { AppProvider, useApp } from './src/store/store';
import { darkTheme, lightTheme, navigationThemes } from './src/theme';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import CountryProvincesScreen from './src/screens/CountryProvincesScreen';
import ProvinceDetailScreen from './src/screens/ProvinceDetailScreen';
import GenerateScreen from './src/screens/GenerateScreen';
import TripsScreen from './src/screens/TripsScreen';
import ItineraryDetailScreen from './src/screens/ItineraryDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Register date picker locale
registerTranslation('en', en);

// Create navigators
const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const GenerateStack = createNativeStackNavigator();
const TripsStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

// Stack navigators for each tab
function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen
        name="Home"
        component={HomeScreen}
      />
      <HomeStack.Screen
        name="CountryProvinces"
        component={CountryProvincesScreen}
      />
      <HomeStack.Screen
        name="ProvinceDetail"
        component={ProvinceDetailScreen}
      />
    </HomeStack.Navigator>
  );
}

function GenerateStackScreen() {
  return (
    <GenerateStack.Navigator screenOptions={{ headerShown: false }}>
      <GenerateStack.Screen
        name="Generate"
        component={GenerateScreen}
      />
    </GenerateStack.Navigator>
  );
}

function TripsStackScreen() {
  return (
    <TripsStack.Navigator screenOptions={{ headerShown: false }}>
      <TripsStack.Screen
        name="Trips"
        component={TripsScreen}
      />
      <TripsStack.Screen
        name="ItineraryDetail"
        component={ItineraryDetailScreen}
      />
    </TripsStack.Navigator>
  );
}

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen
        name="Profile"
        component={ProfileScreen}
      />
    </ProfileStack.Navigator>
  );
}

function AppContent() {
  const colorScheme = useColorScheme();
  const { state } = useApp();
  const isDarkMode = state.themeMode === 'system' ? colorScheme === 'dark' : state.themeMode === 'dark';
  const activeTheme = isDarkMode ? darkTheme : lightTheme;
  const activeNavigationTheme = isDarkMode ? navigationThemes.dark : navigationThemes.light;

  const appNavigationTheme = {
    ...activeNavigationTheme,
    fonts: (activeNavigationTheme as any).fonts ?? NavigationDefaultTheme.fonts,
  };

  return (
      <PaperProvider theme={activeTheme}>
        <Portal.Host>
          <NavigationContainer theme={appNavigationTheme}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />
            <Tab.Navigator
              screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: activeTheme.colors.primary,
                tabBarInactiveTintColor: activeTheme.colors.onSurfaceVariant,
                tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
                tabBarStyle: {
                  height: 70,
                  paddingBottom: 12,
                  paddingTop: 8,
                  backgroundColor: activeTheme.colors.surface,
                  borderTopColor: activeTheme.colors.outlineVariant,
                },
              }}
            >
              <Tab.Screen
                name="HomeTab"
                component={HomeStackScreen}
                options={{
                  title: 'Home',
                  tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="home" size={size} color={color} />
                  ),
                }}
              />
              <Tab.Screen
                name="GenerateTab"
                component={GenerateStackScreen}
                options={{
                  title: 'Generate',
                  tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="plus-circle" size={size} color={color} />
                  ),
                }}
              />
              <Tab.Screen
                name="TripsTab"
                component={TripsStackScreen}
                options={{
                  title: 'My Trips',
                  tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="map" size={size} color={color} />
                  ),
                }}
              />
              <Tab.Screen
                name="ProfileTab"
                component={ProfileStackScreen}
                options={{
                  title: 'Profile',
                  tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="account" size={size} color={color} />
                  ),
                }}
              />
            </Tab.Navigator>
          </NavigationContainer>
        </Portal.Host>
      </PaperProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
    <AppProvider>
      <AppContent />
    </AppProvider>
    </SafeAreaProvider>
  );
}
