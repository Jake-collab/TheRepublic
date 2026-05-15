import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../contexts/store';
import { useAuth } from '../contexts/AuthContext';
import { PillTab, WebsiteCard, UpgradeModal } from '../components';
import * as supabaseService from '../services/supabase';
import type { Category, Website } from '../types/supabase';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { colors, spacing } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const {
    categories,
    setCategories,
    selectedCategoryId,
    setSelectedCategoryId,
    websites,
    setWebsites,
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);

  const isPaidMember = user?.membership_active === true;

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategoryId) {
      loadWebsites(selectedCategoryId);
    }
  }, [selectedCategoryId]);

  const loadCategories = async () => {
    try {
      const data = await supabaseService.fetchCategories();
      if (data) {
        setCategories(data);
        if (data.length > 0 && !selectedCategoryId) {
          setSelectedCategoryId(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadWebsites = async (categoryId: string) => {
    setIsLoading(true);
    try {
      const data = await supabaseService.fetchWebsitesByCategory(categoryId);
      if (data) {
        setWebsites(data);
      }
    } catch (error) {
      console.error('Error loading websites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWebsitePress = async (website: Website) => {
    // Check if user can access
    if (!website.is_free && !isPaidMember) {
      setSelectedWebsite(website);
      setShowUpgradeModal(true);
      return;
    }

    // Navigate to WebView
    navigation.navigate('WebView', { website });
  };

  const handleUpgrade = () => {
    setShowUpgradeModal(false);
    navigation.navigate('Membership');
  };

  const handleMaybeLater = () => {
    setShowUpgradeModal(false);
    setSelectedWebsite(null);
  };

  const renderCategoryTab = ({ item, index }: { item: Category; index: number }) => {
    const isSelected = item.id === selectedCategoryId;
    return (
      <PillTab
        name={item.name}
        color={isSelected ? item.default_color_light : undefined}
        isSelected={isSelected}
        onPress={() => setSelectedCategoryId(item.id)}
      />
    );
  };

  const renderWebsiteItem = ({ item }: { item: Website }) => {
    const isLocked = !item.is_free && !isPaidMember;
    return (
      <WebsiteCard
        website={item}
        isLocked={isLocked}
        onPress={() => handleWebsitePress(item)}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Category Pills */}
      <View style={[styles.categoriesContainer, { borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((category) => (
            <PillTab
              key={category.id}
              name={category.name}
              color={category.default_color_light}
              isSelected={category.id === selectedCategoryId}
              onPress={() => setSelectedCategoryId(category.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Websites List */}
      <FlatList
        data={websites}
        renderItem={renderWebsiteItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => selectedCategoryId && loadWebsites(selectedCategoryId)}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No websites in this category
              </Text>
            </View>
          ) : null
        }
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={handleMaybeLater}
        onUpgrade={handleUpgrade}
        onMaybeLater={handleMaybeLater}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  categoriesContainer: {
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  categoriesContent: {
    paddingHorizontal: 16,
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
  },
  emptyText: {
    fontSize: 16,
  },
});