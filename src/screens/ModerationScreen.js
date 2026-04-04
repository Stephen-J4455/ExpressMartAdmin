import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
  Image,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAdmin } from "../context/AdminContext";
import { colors } from "../theme/colors";
import { SectionHeader } from "../components/SectionHeader";
import { ModerationCard } from "../components/ModerationCard";
import { StatusPill } from "../components/StatusPill";
import { useResponsive } from "../hooks/useResponsive";

const filters = [
  { key: "pending", label: "Pending" },
  { key: "draft", label: "Draft" },
  { key: "rejected", label: "Rejected" },
  { key: "active", label: "Active" },
];

export const ModerationScreen = () => {
  const {
    products,
    sellers,
    loading,
    refresh,
    updateProductStatus,
    featureProduct,
  } = useAdmin();
  const { cardColumns } = useResponsive();
  const [filter, setFilter] = useState("pending");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);

  const getSellerName = (sellerId) => {
    const seller = sellers.find((s) => s.id === sellerId);
    return seller ? seller.name : "Unknown Seller";
  };

  const items = useMemo(() => {
    return products
      .filter((product) => (filter ? product.status === filter : true))
      .filter(
        (product) =>
          product.title.toLowerCase().includes(query.toLowerCase()) ||
          product.vendor?.toLowerCase().includes(query.toLowerCase()),
      );
  }, [products, filter, query]);

  const statusBreakdown = useMemo(() => {
    return filters.map(({ key }) => ({
      key,
      total: products.filter((p) => p.status === key).length,
    }));
  }, [products]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id],
    );
  };

  const clearSelection = () => setSelectedIds([]);

  const bulkUpdate = async (status) => {
    if (!selectedIds.length) return;
    await Promise.all(selectedIds.map((id) => updateProductStatus(id, status)));
    clearSelection();
    refresh();
  };

  const bulkFeature = async () => {
    if (!selectedIds.length) return;
    await Promise.all(selectedIds.map((id) => featureProduct(id)));
    clearSelection();
    refresh();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refresh} />
      }
    >
      <SectionHeader
        title="Moderation"
        subtitle="Curate and approve submissions"
      />

      <View style={styles.premiumToolbar}>
        <View style={styles.metricsHeader}>
          <Text style={styles.toolbarTitle}>Submissions</Text>
          <View style={styles.selectionPill}>
            <Text style={styles.selectionText}>
              {selectedIds.length} Selected
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.metricsContainer}
        >
          {statusBreakdown.map(({ key, total }) => (
            <Pressable
              key={key}
              style={[
                styles.metricCard,
                filter === key && styles.metricCardActive,
              ]}
              onPress={() => setFilter(key)}
            >
              <Text
                style={[
                  styles.metricLabel,
                  filter === key && styles.metricLabelActive,
                ]}
              >
                {key}
              </Text>
              <Text
                style={[
                  styles.metricValue,
                  filter === key && styles.metricValueActive,
                ]}
              >
                {total}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.toolbarAction,
              styles.primaryAction,
              !selectedIds.length && styles.actionDisabled,
            ]}
            onPress={() => bulkUpdate("active")}
            disabled={!selectedIds.length}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.actionLabel}>Approve All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toolbarAction,
              styles.dangerAction,
              !selectedIds.length && styles.actionDisabled,
            ]}
            onPress={() => bulkUpdate("rejected")}
            disabled={!selectedIds.length}
          >
            <Ionicons name="close-circle" size={18} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toolbarAction,
              styles.secondaryAction,
              !selectedIds.length && styles.actionDisabled,
            ]}
            onPress={bulkFeature}
            disabled={!selectedIds.length}
          >
            <Ionicons name="star" size={18} color={colors.primary} />
          </TouchableOpacity>

          {selectedIds.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearSelection}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <TextInput
        placeholder="Search titles or vendors"
        style={styles.input}
        value={query}
        onChangeText={setQuery}
      />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        key={`moderation-${cardColumns}`}
        numColumns={cardColumns}
        scrollEnabled={false}
        contentContainerStyle={{ gap: 16 }}
        columnWrapperStyle={cardColumns > 1 ? { gap: 16 } : undefined}
        ListEmptyComponent={
          <Text style={styles.empty}>Nothing matches your filters.</Text>
        }
        renderItem={({ item }) => (
          <View style={{ flex: 1 }}>
            <ModerationCard
              product={item}
              onApprove={() => updateProductStatus(item.id, "active")}
              onReject={() => updateProductStatus(item.id, "rejected")}
              onDetails={() => setSelectedProduct(item)}
              selected={selectedIds.includes(item.id)}
              onToggleSelect={() => toggleSelect(item.id)}
              getSellerName={getSellerName}
            />
          </View>
        )}
      />

      <Modal
        visible={!!selectedProduct}
        animationType="slide"
        onRequestClose={() => setSelectedProduct(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setSelectedProduct(null)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={20} color={colors.dark} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Verification Audit</Text>
              <View style={{ width: 40 }} />
            </View>

            {selectedProduct && (
              <ScrollView
                style={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Hero Section */}
                <View style={styles.heroSection}>
                  <View style={styles.quickInfo}>
                    <View style={styles.titleRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.productTitle}>
                          {selectedProduct.title || "Untitled Product"}
                        </Text>
                        <Text style={styles.cardMeta}>
                          Identity {selectedProduct.id.slice(0, 8)}
                        </Text>
                      </View>
                      <StatusPill value={selectedProduct.status} />
                    </View>

                    <View style={styles.vendorRow}>
                      <Ionicons
                        name="person-circle-outline"
                        size={18}
                        color={colors.muted}
                      />
                      <Text style={styles.vendorText}>
                        {getSellerName(selectedProduct.seller_id)}
                      </Text>
                    </View>

                    <View style={styles.categoryRow}>
                      <Ionicons
                        name="grid-outline"
                        size={18}
                        color={colors.primary}
                      />
                      <Text style={styles.categoryText}>
                        {selectedProduct.category || "General Inventory"}
                      </Text>
                    </View>

                    <View style={styles.priceSection}>
                      <Text style={styles.mainPrice}>
                        GH₵{Number(selectedProduct.price || 0).toLocaleString()}
                      </Text>
                      {selectedProduct.compare_at_price > 0 && (
                        <Text style={styles.comparePrice}>
                          GH₵
                          {Number(
                            selectedProduct.compare_at_price,
                          ).toLocaleString()}
                        </Text>
                      )}
                      {selectedProduct.discount > 0 && (
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountText}>
                            -{selectedProduct.discount}%
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Thumbnail Gallery */}
                {selectedProduct.thumbnails?.length > 0 && (
                  <View style={styles.gallerySection}>
                    <Text style={styles.sectionTitle}>Asset Gallery</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.galleryContainer}
                    >
                      {selectedProduct.thumbnails
                        .filter((uri) => uri)
                        .map((uri, index) => (
                          <Pressable
                            key={index}
                            style={styles.galleryItem}
                            onPress={() => setFullscreenImage(uri)}
                          >
                            <Image
                              source={{ uri }}
                              style={styles.galleryImage}
                            />
                          </Pressable>
                        ))}
                    </ScrollView>
                  </View>
                )}

                {/* Description Card */}
                <View style={styles.infoCard}>
                  <View style={styles.cardHeader}>
                    <View
                      style={[
                        styles.actionIcon,
                        { backgroundColor: colors.primaryLight },
                      ]}
                    >
                      <Ionicons
                        name="document-text-outline"
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                    <Text style={styles.cardTitle}>Manifest & Details</Text>
                  </View>
                  <Text style={styles.descriptionText}>
                    {selectedProduct.description ||
                      "No tactical description provided."}
                  </Text>
                </View>

                {/* Badges & Tags Card */}
                {(selectedProduct.badges?.length > 0 ||
                  selectedProduct.tags?.length > 0) && (
                  <View style={styles.infoCard}>
                    <View style={styles.cardHeader}>
                      <View
                        style={[
                          styles.actionIcon,
                          { backgroundColor: colors.infoLight },
                        ]}
                      >
                        <Ionicons
                          name="pricetag-outline"
                          size={18}
                          color={colors.info}
                        />
                      </View>
                      <Text style={styles.cardTitle}>Platform Metadata</Text>
                    </View>

                    {selectedProduct.badges?.length > 0 && (
                      <View style={styles.labelGroup}>
                        <Text style={styles.labelGroupTitle}>
                          Active Highlights
                        </Text>
                        <View style={styles.badgesGrid}>
                          {selectedProduct.badges.map((badge, index) => (
                            <View
                              key={index}
                              style={[
                                styles.enhancedBadge,
                                { borderColor: colors.info + "40" },
                              ]}
                            >
                              <Ionicons
                                name="sparkles-outline"
                                size={14}
                                color={colors.info}
                              />
                              <Text
                                style={[
                                  styles.enhancedBadgeText,
                                  { color: colors.info },
                                ]}
                              >
                                {badge}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {selectedProduct.tags?.length > 0 && (
                      <View style={styles.labelGroup}>
                        <Text style={styles.labelGroupTitle}>
                          Discovery Tags
                        </Text>
                        <View style={styles.tagsGrid}>
                          {selectedProduct.tags.map((tag, index) => (
                            <View key={index} style={styles.tag}>
                              <Text style={styles.tagText}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* Variants Card */}
                {(selectedProduct.sizes?.length > 0 ||
                  selectedProduct.colors?.length > 0) && (
                  <View style={styles.infoCard}>
                    <View style={styles.cardHeader}>
                      <View
                        style={[
                          styles.actionIcon,
                          { backgroundColor: colors.warningLight },
                        ]}
                      >
                        <Ionicons
                          name="options-outline"
                          size={18}
                          color={colors.warning}
                        />
                      </View>
                      <Text style={styles.cardTitle}>
                        Configuration Variants
                      </Text>
                    </View>

                    {selectedProduct.sizes?.length > 0 && (
                      <View style={styles.variantGroup}>
                        <Text style={styles.variantLabel}>
                          Dimension Variants
                        </Text>
                        <View style={styles.sizesGrid}>
                          {selectedProduct.sizes.map((size, index) => (
                            <View key={index} style={styles.sizeChip}>
                              <Text style={styles.sizeText}>{size}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {selectedProduct.colors?.length > 0 && (
                      <View style={styles.variantGroup}>
                        <Text style={styles.variantLabel}>Colors</Text>
                        <View style={styles.colorsGrid}>
                          {selectedProduct.colors.map((color, index) => (
                            <View key={index} style={styles.colorChip}>
                              <View
                                style={[
                                  styles.colorDot,
                                  { backgroundColor: color.toLowerCase() },
                                ]}
                              />
                              <Text style={styles.colorText}>{color}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* Product Details Card */}
                <View style={styles.infoCard}>
                  <View style={styles.cardHeader}>
                    <View
                      style={[
                        styles.actionIcon,
                        { backgroundColor: colors.successLight },
                      ]}
                    >
                      <Ionicons
                        name="information-circle-outline"
                        size={18}
                        color={colors.success}
                      />
                    </View>
                    <Text style={styles.cardTitle}>
                      Technical Specifications
                    </Text>
                  </View>

                  <View style={styles.detailsGrid}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Supply Count</Text>
                      <Text style={styles.detailValue}>
                        {selectedProduct.quantity || 0} Units
                      </Text>
                    </View>

                    {selectedProduct.sku && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>
                          Stock Keeping Unit (SKU)
                        </Text>
                        <Text style={styles.detailValue}>
                          {selectedProduct.sku}
                        </Text>
                      </View>
                    )}

                    {selectedProduct.weight && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Net Weight</Text>
                        <Text style={styles.detailValue}>
                          {selectedProduct.weight}kg
                        </Text>
                      </View>
                    )}

                    {selectedProduct.barcode && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Platform Barcode</Text>
                        <Text style={styles.detailValue}>
                          {selectedProduct.barcode}
                        </Text>
                      </View>
                    )}

                    {selectedProduct.cost_price && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Acquisition Cost</Text>
                        <Text style={styles.detailValue}>
                          GH₵
                          {Number(selectedProduct.cost_price).toLocaleString()}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Inventory Settings Card */}
                <View style={styles.infoCard}>
                  <View style={styles.cardHeader}>
                    <View
                      style={[
                        styles.actionIcon,
                        { backgroundColor: colors.primaryLight },
                      ]}
                    >
                      <Ionicons
                        name="settings-outline"
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                    <Text style={styles.cardTitle}>Control Protocols</Text>
                  </View>

                  <View style={styles.settingsGrid}>
                    <View style={styles.settingItem}>
                      <View style={styles.settingInfo}>
                        <Text style={styles.settingLabel}>
                          Track Inventory Flow
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.settingBadge,
                          selectedProduct.track_inventory
                            ? styles.settingBadgeActive
                            : styles.settingBadgeInactive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.settingBadgeText,
                            selectedProduct.track_inventory
                              ? styles.settingBadgeTextActive
                              : styles.settingBadgeTextInactive,
                          ]}
                        >
                          {selectedProduct.track_inventory
                            ? "Active"
                            : "Offline"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.settingItem}>
                      <View style={styles.settingInfo}>
                        <Text style={styles.settingLabel}>
                          Backorder Allocation
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.settingBadge,
                          selectedProduct.allow_backorder
                            ? styles.settingBadgeWarning
                            : styles.settingBadgeInactive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.settingBadgeText,
                            selectedProduct.allow_backorder
                              ? styles.settingBadgeTextWarning
                              : styles.settingBadgeTextInactive,
                          ]}
                        >
                          {selectedProduct.allow_backorder
                            ? "Allowed"
                            : "Restricted"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Timestamps */}
                <View style={styles.timestampSection}>
                  <View style={styles.timestampRow}>
                    <Text style={styles.timestampLabel}>Vault Ingestion</Text>
                    <Text style={styles.timestampValue}>
                      {new Date(
                        selectedProduct.created_at,
                      ).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.timestampRow}>
                    <Text style={styles.timestampLabel}>System Sync</Text>
                    <Text style={styles.timestampValue}>
                      {new Date(
                        selectedProduct.updated_at,
                      ).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {/* Audit Actions */}
                <View style={styles.actionSection}>
                  <TouchableOpacity
                    style={[styles.auditButton, styles.approveConfirm]}
                    onPress={() => {
                      updateProductStatus(selectedProduct.id, "active");
                      setSelectedProduct(null);
                    }}
                  >
                    <Ionicons name="shield-checkmark" size={20} color="#fff" />
                    <Text style={styles.auditButtonText}>
                      Authorize Publication
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.auditButton, styles.rejectConfirm]}
                    onPress={() => {
                      updateProductStatus(selectedProduct.id, "rejected");
                      setSelectedProduct(null);
                    }}
                  >
                    <Ionicons name="alert-circle" size={20} color="#fff" />
                    <Text style={styles.auditButtonText}>Deny Submission</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Fullscreen Image Modal */}
      <Modal
        visible={!!fullscreenImage}
        animationType="fade"
        onRequestClose={() => setFullscreenImage(null)}
        statusBarTranslucent
      >
        <View style={styles.fullscreenContainer}>
          <Pressable
            style={styles.fullscreenCloseButton}
            onPress={() => setFullscreenImage(null)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          <Image
            source={{ uri: fullscreenImage }}
            style={styles.fullscreenImage}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
    padding: 16,
    paddingTop: Platform.OS === "android" ? 35 : 0,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4E8F0",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  premiumToolbar: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 16,
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  metricsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  toolbarTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.dark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  selectionPill: {
    backgroundColor: colors.primary + "10",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  selectionText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  metricsContainer: {
    gap: 10,
    paddingRight: 10,
  },
  metricCard: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    minWidth: 90,
  },
  metricCardActive: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  metricLabel: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  metricLabelActive: {
    color: "rgba(255,255,255,0.6)",
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.dark,
  },
  metricValueActive: {
    color: "#fff",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  toolbarAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    minHeight: 44,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  dangerAction: {
    width: 44,
    backgroundColor: colors.danger,
  },
  secondaryAction: {
    width: 44,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  actionLabel: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  clearBtn: {
    paddingHorizontal: 8,
  },
  clearText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "700",
  },
  empty: {
    color: colors.muted,
    marginTop: 36,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.light,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E4E8F0",
    backgroundColor: "#fff",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.dark,
  },
  detailsContainer: {
    padding: 16,
    gap: 16,
  },
  imagesScroll: {
    marginBottom: 8,
  },
  imagesContainer: {
    flexDirection: "row",
    gap: 8,
  },
  thumbnailImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    resizeMode: "cover",
  },
  detailsImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    resizeMode: "cover",
  },
  detailsContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.dark,
  },
  detailsMeta: {
    color: colors.muted,
    fontSize: 14,
  },
  detailsPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  comparePrice: {
    fontSize: 16,
    color: colors.muted,
    textDecorationLine: "line-through",
    marginLeft: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  discountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  discountLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  detailsDiscount: {
    color: colors.warning,
    fontWeight: "600",
  },
  detailsDescription: {
    color: colors.dark,
    lineHeight: 20,
  },
  detailsBadges: {
    color: colors.info,
    fontWeight: "600",
  },
  detailsTags: {
    color: colors.secondary,
    fontWeight: "600",
  },
  badgesContainer: {
    marginTop: 12,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: "600",
  },
  badgesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  badge: {
    backgroundColor: colors.light,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  badgeText: {
    fontSize: 13,
    color: colors.dark,
    fontWeight: "600",
  },
  badgeIcon: {
    marginRight: 4,
  },
  colorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.light,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  colorSwatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  badgeSuccess: {
    backgroundColor: colors.success + "20",
  },
  badgeTextSuccess: {
    color: colors.success,
  },
  badgeWarning: {
    backgroundColor: colors.warning + "20",
  },
  badgeTextWarning: {
    color: colors.warning,
  },
  badgeMuted: {
    backgroundColor: colors.light,
  },
  badgeTextMuted: {
    color: colors.muted,
  },
  badgeDiscount: {
    backgroundColor: colors.warning + "20",
  },
  badgeTextDiscount: {
    color: colors.warning,
    fontWeight: "600",
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  detailItem: {
    minWidth: "45%",
    backgroundColor: colors.light,
    padding: 8,
    borderRadius: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 14,
    color: colors.dark,
    fontWeight: "600",
    marginTop: 2,
  },
  variantsSection: {
    marginTop: 12,
    gap: 12,
  },
  inventorySection: {
    marginTop: 12,
    gap: 8,
  },
  inventoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inventoryLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  inventoryText: {
    color: colors.muted,
    fontSize: 14,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenCloseButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 8,
  },
  fullscreenImage: {
    width: "100%",
    height: "100%",
  },
  // Tactical Modal Redesign
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    marginTop: Platform.OS === "ios" ? 50 : 20,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.dark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scrollContent: {
    flex: 1,
  },
  heroSection: {
    backgroundColor: "#fff",
    padding: 24,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  quickInfo: {
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  productTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.dark,
    lineHeight: 28,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
    marginTop: 4,
  },
  vendorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  vendorText: {
    fontSize: 14,
    color: colors.dark,
    fontWeight: "700",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "700",
  },
  priceSection: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  mainPrice: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.dark,
  },
  comparePrice: {
    fontSize: 16,
    color: colors.muted,
    textDecorationLine: "line-through",
    fontWeight: "600",
  },
  discountBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  gallerySection: {
    padding: 20,
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.dark,
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  galleryContainer: {
    gap: 10,
    paddingBottom: 4,
  },
  galleryItem: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  infoCard: {
    backgroundColor: "#fff",
    padding: 24,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.dark,
  },
  descriptionText: {
    fontSize: 14,
    color: colors.dark,
    lineHeight: 22,
    fontWeight: "500",
  },
  labelGroup: {
    marginBottom: 16,
  },
  labelGroupTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    marginBottom: 8,
  },
  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  enhancedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
  },
  enhancedBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  tagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 12,
    color: colors.dark,
    fontWeight: "700",
  },
  variantGroup: {
    marginBottom: 16,
  },
  variantLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    marginBottom: 10,
  },
  sizesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sizeChip: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  sizeText: {
    fontSize: 13,
    color: colors.dark,
    fontWeight: "800",
  },
  colorsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  colorText: {
    fontSize: 13,
    color: colors.dark,
    fontWeight: "700",
  },
  timestampSection: {
    padding: 24,
    backgroundColor: "#fff",
    marginBottom: 40,
  },
  timestampRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  timestampLabel: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "600",
    flex: 1,
  },
  timestampValue: {
    fontSize: 13,
    color: colors.dark,
    fontWeight: "700",
  },
  // Details Grid
  detailsGrid: {
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: "600",
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: colors.dark,
    fontWeight: "700",
  },
  // Settings Grid
  settingsGrid: {
    gap: 16,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    color: colors.dark,
    fontWeight: "600",
  },
  settingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  settingBadgeActive: {
    backgroundColor: colors.success + "15",
  },
  settingBadgeWarning: {
    backgroundColor: colors.warning + "15",
  },
  settingBadgeInactive: {
    backgroundColor: "#F1F5F9",
  },
  settingBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  settingBadgeTextActive: {
    color: colors.success,
  },
  settingBadgeTextWarning: {
    color: colors.warning,
  },
  settingBadgeTextInactive: {
    color: colors.muted,
  },
  actionSection: {
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 32,
    backgroundColor: "#fff",
    paddingBottom: 60,
  },
  auditButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  approveConfirm: {
    backgroundColor: colors.primary,
  },
  rejectConfirm: {
    backgroundColor: colors.danger,
  },
  auditButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
