import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, RefreshControl } from 'react-native';
import { useAppStore } from '../contexts/store';
import { PillTab, WebsiteCard, UpgradeModal } from '../components';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Website } from '../types/supabase';

type HomeScreenProps = { navigation: NativeStackNavigationProp<any> };

const DEMO_CATEGORIES = [
  { id: '1', name: 'Shopping', color: '#FF6B6B' },
  { id: '2', name: 'Grocery', color: '#4ECDC4' },
  { id: '3', name: 'Food', color: '#45B7D1' },
  { id: '4', name: 'Jobs', color: '#96CEB4' },
  { id: '5', name: 'Travel', color: '#FFEAA7' },
];

const DEMO_WEBSITES = [
  { id: '1', name: 'Walmart', url: 'https://walmart.com', category_id: '1', is_free: true },
  { id: '2', name: 'Target', url: 'https://target.com', category_id: '1', is_free: true },
  { id: '3', name: 'eBay', url: 'https://ebay.com', category_id: '1', is_free: false },
  { id: '4', name: 'Instacart', url: 'https://instacart.com', category_id: '2', is_free: true },
  { id: '5', name: 'Uber Eats', url: 'https://ubereats.com', category_id: '3', is_free: true },
  { id: '6', name: 'Indeed', url: 'https://indeed.com', category_id: '4', is_free: false },
  { id: '7', name: 'Airbnb', url: 'https://airbnb.com', category_id: '5', is_free: false },
  { id: '8', name: 'DoorDash', url: 'https://doordash.com', category_id: '3', is_free: true },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { colors } = useAppStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isMember] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const filteredWebsites = selectedCategory
    ? DEMO_WEBSITES.filter(w => w.category_id === selectedCategory)
    : DEMO_WEBSITES;

  const handlePress = (website: any) => {
    if (!website.is_free && !isMember) {
      setShowUpgrade(true);
    } else {
      navigation.navigate('WebView', { website });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>The Republic</Text>
      </View>

      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {DEMO_CATEGORIES.map((cat) => (
            <PillTab
              key={cat.id}
              title={cat.name}
              selected={selectedCategory === cat.id}
              onPress={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              color={cat.color}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredWebsites}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.websiteGrid}
        renderItem={({ item }) => (
          <WebsiteCard
            website={item}
            onPress={() => handlePress(item)}
            isLocked={!item.is_free && !isMember}
          />
        )}
      />

      <UpgradeModal
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => navigation.navigate('Membership')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, paddingTop: 48 },
  title: { fontSize: 28, fontWeight: '700' },
  categoryContainer: { paddingVertical: 8 },
  categoryScroll: { paddingHorizontal: 16, gap: 8, flexDirection: 'row' },
  websiteGrid: { padding: 12 },
});
