// Home screen - province selection

import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Searchbar,ActivityIndicator, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ErrorCard } from '../../components/common/ErrorCard';
import { ProvinceCard } from '../../components/ProvinceCard';
import { useProvinces } from '../../hooks/useProvinces';
import type { HomeStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const { provinces, loading, error, refresh } = useProvinces();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showPullToRefreshHint, setShowPullToRefreshHint] = React.useState(false);

  const filteredProvinces = (provinces || []).filter((province) =>
    province.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    province.region_display.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProvincePress = (slug: string) => {
    navigation.navigate('ProvinceDetail', { slug });
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowPullToRefreshHint(offsetY < -24 && !loading);
  };

  if (loading && (!provinces || provinces.length === 0)) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading destinations...
        </Text>
      </SafeAreaView>
    );
  }

  if (error && (!provinces || provinces.length === 0)) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <ErrorCard message={error} onRetry={refresh} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Hero Section */}
      <View style={styles.hero}>
        <Text variant="headlineLarge" style={styles.heroTitle}>
          Where do you want to go?
        </Text>
        <Text variant="bodyLarge" style={styles.heroSubtitle}>
          Discover amazing destinations across the Philippines
        </Text>
      </View>

      {/* Search */}
      <Searchbar
        placeholder="Search destinations..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      {/* Province Grid */}
      {showPullToRefreshHint && (
        <View
          style={[
            styles.pullHintContainer,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Pull down to refresh destinations
          </Text>
        </View>
      )}
      <FlatList
        data={filteredProvinces}
        keyExtractor={(item) => item.slug}
        renderItem={({ item }) => (
          <ProvinceCard province={item} onPress={() => handleProvincePress(item.slug)} />
        )}
        numColumns={1}
        contentContainerStyle={styles.list}
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
            <Text variant="bodyLarge">No destinations found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
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
