import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  Switch,
  RefreshControl,
  StyleSheet,
  Pressable,
  Modal,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../supabase";
import { colors } from "../theme/colors";
import { Alert } from "../utils/alert";
import { AdEditor } from "../components/AdEditor";
import { StatCard } from "../components/StatCard";
import { SectionHeader } from "../components/SectionHeader";
import { useResponsive } from "../hooks/useResponsive";

export const AdsManagementScreen = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const { cardColumns } = useResponsive();

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("express_ads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch ads");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingAd(null);
    setModalVisible(true);
  };

  const handleEdit = (ad) => {
    setEditingAd(ad);
    setModalVisible(true);
  };

  const handleSave = async (formData) => {
    if (!formData.title || !formData.image_url) {
      Alert.alert("Error", "Title and image URL are required");
      return;
    }

    setLoading(true);
    try {
      if (editingAd) {
        const { error } = await supabase
          .from("express_ads")
          .update(formData)
          .eq("id", editingAd.id);

        if (error) throw error;
        Alert.alert("Success", "Ad updated successfully");
      } else {
        const { error } = await supabase.from("express_ads").insert([formData]);

        if (error) throw error;
        Alert.alert("Success", "Ad created successfully");
      }

      setModalVisible(false);
      fetchAds();
    } catch (error) {
      Alert.alert("Error", error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (adId) => {
    Alert.alert("Delete Ad", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("express_ads")
              .delete()
              .eq("id", adId);

            if (error) throw error;
            Alert.alert("Success", "Ad deleted");
            fetchAds();
          } catch (error) {
            Alert.alert("Error", error.message);
          }
        },
      },
    ]);
  };

  const handleToggleActive = async (ad) => {
    try {
      const { error } = await supabase
        .from("express_ads")
        .update({ is_active: !ad.is_active })
        .eq("id", ad.id);

      if (error) throw error;
      fetchAds();
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const activeAdsCount = ads.filter((ad) => ad.is_active).length;

  const renderAdCard = ({ item }) => (
    <View style={[styles.adCardContainer, { flex: 1 }]}>
      <View style={styles.adCardMain}>
        <View style={styles.thumbnailContainer}>
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={styles.adCardThumbnail}
            />
          ) : (
            <View style={[styles.adCardThumbnail, styles.placeholderThumbnail]}>
              <Ionicons name="image-outline" size={24} color={colors.muted} />
            </View>
          )}
        </View>

        <View style={styles.adCardInfo}>
          <View style={styles.adCardHeaderTop}>
            <Text style={styles.adCardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Switch
              value={item.is_active}
              onValueChange={() => handleToggleActive(item)}
              trackColor={{ false: "#D1D5DB", true: colors.primary }}
              thumbColor={item.is_active ? "#fff" : "#f4f3f4"}
            />
          </View>

          <View style={styles.adCardMeta}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.style}</Text>
            </View>
            {(item.placement || "")
              .split(",")
              .filter(Boolean)
              .map((p, idx) => (
                <View
                  key={idx}
                  style={[styles.tag, { backgroundColor: colors.light }]}
                >
                  <Text style={[styles.tagText, { color: colors.muted }]}>
                    {p.replace("_", " ")}
                  </Text>
                </View>
              ))}
          </View>

          <View style={styles.adCardStats}>
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={14} color={colors.muted} />
              <Text style={styles.adCardStatText}>{item.impressions || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons
                name="hand-right-outline"
                size={14}
                color={colors.muted}
              />
              <Text style={styles.adCardStatText}>{item.clicks || 0}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.adCardButtons}>
        <TouchableOpacity
          style={[styles.button, styles.editButton]}
          onPress={() => handleEdit(item)}
        >
          <Ionicons name="pencil" size={16} color={colors.primary} />
          <Text style={styles.buttonTextEdit}>Edit Campaign</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={() => handleDelete(item.id)}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={ads}
        keyExtractor={(item) => item.id}
        key={`ads-${cardColumns}`}
        numColumns={cardColumns}
        renderItem={renderAdCard}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={cardColumns > 1 ? { gap: 12 } : undefined}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchAds} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.statsGrid}>
              <StatCard
                label="Total Campaigns"
                value={ads.length}
                hint="All-time reach"
                trend="+3.2%"
                tone="info"
              />
              <StatCard
                label="Active Now"
                value={activeAdsCount}
                hint="Live on storefront"
                trend="+1.5%"
                tone="success"
              />
            </View>

            <SectionHeader
              title="Active Campaigns"
              subtitle="Manage visibility and content"
            />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="images-outline" size={48} color={colors.muted} />
            </View>
            <Text style={styles.emptyTitle}>No Ads Found</Text>
            <Text style={styles.emptySubtitle}>
              Your campaign list is currently empty.
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleAddNew}>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Create Your First Ad</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={handleAddNew}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setModalVisible(false)}
      >
        <AdEditor
          initialValues={editingAd}
          onSave={handleSave}
          onCancel={() => setModalVisible(false)}
          loading={loading}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 40,
    marginBottom: 24,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  adCardContainer: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E4E8F0",
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  adCardMain: {
    flexDirection: "row",
    gap: 16,
  },
  thumbnailContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  adCardThumbnail: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: colors.light,
  },
  placeholderThumbnail: {
    alignItems: "center",
    justifyContent: "center",
  },
  adCardInfo: {
    flex: 1,
    justifyContent: "center",
  },
  adCardHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  adCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.dark,
    flex: 1,
  },
  adCardMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  tag: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
  },
  adCardStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  adCardStatText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#E4E8F0",
    marginVertical: 14,
  },
  adCardButtons: {
    flexDirection: "row",
    gap: 10,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.primaryLight,
    gap: 8,
  },
  deleteButton: {
    width: 44,
    backgroundColor: "#FEE2E2",
  },
  buttonTextEdit: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    bottom: 90,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.light,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.dark,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 6,
    textAlign: "center",
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 24,
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
