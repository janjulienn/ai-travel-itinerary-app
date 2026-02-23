// Home screen - country selection

import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Searchbar,ActivityIndicator, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { hasAndroidBottomNavigationBar } from '../../constants';
import { ErrorCard } from '../../components/common/ErrorCard';
import { useCountries } from '../../hooks/useProvinces';
import type { HomeStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const hasAndroidBottomNavigationBarVisible = hasAndroidBottomNavigationBar(insets.bottom);
  const { countries, loading, error, refresh } = useCountries();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showPullToRefreshHint, setShowPullToRefreshHint] = React.useState(false);

  const filteredCountries = (countries || []).filter((country) =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCountryPress = (countrySlug: string, countryName: string) => {
    navigation.navigate('CountryProvinces', { countrySlug, countryName });
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowPullToRefreshHint(offsetY < -24 && !loading);
  };

  if (loading && (!countries || countries.length === 0)) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading destinations...
        </Text>
      </SafeAreaView>
    );
  }

  if (error && (!countries || countries.length === 0)) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <ErrorCard message={error} onRetry={refresh} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Hero Section */}
      <View style={styles.hero}>
        <Text variant="headlineLarge" style={styles.heroTitle}>
          Where do you want to go?
        </Text>
        <Text variant="bodyLarge" style={styles.heroSubtitle}>
          Explore countries first, then discover top destination provinces
        </Text>
      </View>

      {/* Search */}
      <Searchbar
        placeholder="Search countries..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      {/* Country List */}
      {showPullToRefreshHint && (
        <View
          style={[
            styles.pullHintContainer,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Pull down to refresh countries
          </Text>
        </View>
      )}
      <FlatList
        data={filteredCountries}
        keyExtractor={(item) => item.slug}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleCountryPress(item.slug, item.name)}
            style={[styles.countryCard, { backgroundColor: theme.colors.surface }]}
          >
            {!!(item.image_url || item.photos?.[0]) && (
              <Image
                source={{ uri: item.image_url || item.photos?.[0] }}
                style={styles.countryImage}
                resizeMode="cover"
              />
            )}
            <Text variant="titleMedium" style={styles.countryName}>
              {item.name}
            </Text>
            {!!item.description && (
              <Text
                variant="bodySmall"
                numberOfLines={2}
                style={[styles.countryDescription, { color: theme.colors.onSurfaceVariant }]}
              >
                {item.description}
              </Text>
            )}
          </Pressable>
        )}
        numColumns={1}
        contentContainerStyle={[
          styles.list,
          hasAndroidBottomNavigationBarVisible ? { paddingBottom: tabBarHeight + 12 } : null,
        ]}
        onScroll={handleScroll}
        onScrollEndDrag={() => setShowPullToRefreshHint(false)}
        onMomentumScrollEnd={() => setShowPullToRefreshHint(false)}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            title="Pull down to refresh"
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge">No countries found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
  },
  hero: {
    padding: 24,
    paddingBottom: 16,
  },
  heroTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  heroSubtitle: {
    opacity: 0.7,
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 2,
  },
  list: {
    padding: 8,
  },
  countryCard: {
    borderRadius: 12,
    marginHorizontal: 8,
    marginVertical: 6,
    padding: 12,
    overflow: 'hidden',
  },
  countryImage: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    marginBottom: 10,
  },
  countryName: {
    fontWeight: '700',
  },
  countryDescription: {
    marginTop: 8,
    lineHeight: 18,
  },
  pullHintContainer: {
    alignSelf: 'center',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
    marginBottom: 4,
  },
  empty: {
    padding: 48,
    alignItems: 'center',
  },
});
