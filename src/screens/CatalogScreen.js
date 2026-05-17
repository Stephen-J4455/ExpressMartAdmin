import { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAdmin } from "../context/AdminContext";
import { colors } from "../theme/colors";
import { SectionHeader } from "../components/SectionHeader";
import { StatusPill } from "../components/StatusPill";
import { useResponsive } from "../hooks/useResponsive";
import { Alert } from "../utils/alert";

export const CatalogScreen = () => {
  const { categories, products, sellers, loading, refresh, deleteProduct } =
    useAdmin();
  const { cardColumns } = useResponsive();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [menuProduct, setMenuProduct] = useState(null);

  const getSellerName = (sellerId) => {
    const seller = sellers.find((s) => s.id === sellerId);
    return seller ? seller.name : "Unknown Seller";
  };

  const getCategoryIcon = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes("food") || lower.includes("grocery"))
      return "restaurant";
    if (lower.includes("clothing") || lower.includes("fashion")) return "shirt";
    if (lower.includes("electronics")) return "phone-portrait";
    if (lower.includes("home") || lower.includes("furniture")) return "home";
    if (lower.includes("beauty") || lower.includes("cosmetics"))
      return "sparkles";
    if (lower.includes("sports")) return "football";
    if (lower.includes("books")) return "book";
    return "grid";
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
        return "checkmark-circle";
      case "pending":
        return "time";
      case "draft":
        return "document";
      case "rejected":
        return "close-circle";
      default:
        return "list";
    }
  };

  const rows = useMemo(() => {
    let scoped = selectedCategory
      ? products.filter((product) => product.category === selectedCategory)
      : products;

    if (statusFilter !== "all") {
      scoped = scoped.filter((product) => product.status === statusFilter);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      scoped = scoped.filter(
        (product) =>
          product.title.toLowerCase().includes(q) ||
          product.vendor?.toLowerCase().includes(q),
      );
    }

    if (sortBy === "price-desc") {
      scoped = [...scoped].sort(
        (a, b) => Number(b.price || 0) - Number(a.price || 0),
      );
    } else if (sortBy === "price-asc") {
      scoped = [...scoped].sort(
        (a, b) => Number(a.price || 0) - Number(b.price || 0),
      );
    } else if (sortBy === "alpha") {
      scoped = [...scoped].sort((a, b) => a.title.localeCompare(b.title));
    }

    return scoped.slice(0, 100);
  }, [products, selectedCategory, statusFilter, query, sortBy]);

  const summary = useMemo(() => {
    return categories
      .map((category) => {
        const scoped = products.filter(
          (product) => product.category === category.name,
        );
        return {
          id: category.id,
          name: category.name,
          color: category.color,
          total: scoped.length,
          active: scoped.filter((product) => product.status === "active")
            .length,
          pending: scoped.filter((product) => product.status === "pending")
            .length,
        };
      })
      .sort((a, b) => b.active - a.active);
  }, [categories, products]);

  const handleProductOptions = (product) => {
    setMenuProduct(product);
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 40,
          paddingBottom: 100,
        }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
      >
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <Ionicons
              name="search-outline"
              size={20}
              color={colors.muted}
              style={styles.searchIcon}
            />
            <TextInput
              placeholder="Search products or vendors..."
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholderTextColor="#94A3B8"
            />
          </View>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => {
              const order = ["latest", "price-desc", "price-asc", "alpha"];
              const next = order[(order.indexOf(sortBy) + 1) % order.length];
              setSortBy(next);
            }}
          >
            <Ionicons name="funnel-outline" size={18} color={colors.dark} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statusFiltersScroll}
        >
          <View style={styles.statusFilters}>
            {["all", "active", "pending", "draft", "rejected"].map((status) => (
              <Pressable
                key={status}
                style={[
                  styles.statusChip,
                  statusFilter === status && styles.statusChipActive,
                ]}
                onPress={() => setStatusFilter(status)}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    statusFilter === status && styles.statusChipTextActive,
                  ]}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <SectionHeader
          title="Category Distribution"
          subtitle="Inventory analytics by segment"
          style={{ marginTop: 8 }}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {summary.map((bucket) => (
            <Pressable
              key={bucket.id}
              style={[
                styles.categoryCard,
                selectedCategory === bucket.name && styles.categoryCardSelected,
              ]}
              onPress={() =>
                setSelectedCategory((prev) =>
                  prev === bucket.name ? null : bucket.name,
                )
              }
            >
              <View
                style={[
                  styles.categoryIconBox,
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <Ionicons
                  name={getCategoryIcon(bucket.name)}
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.categoryTitle} numberOfLines={1}>
                  {bucket.name}
                </Text>
                <Text style={styles.categoryMeta}>{bucket.total} products</Text>
              </View>
              <View style={styles.categoryStats}>
                <Text style={styles.categoryDetail}>
                  {bucket.active} active
                </Text>
                <Text style={styles.categoryDetailMuted}>
                  {bucket.pending} pending
                </Text>
              </View>
            </Pressable>
          ))}
          {!summary.length ? (
            <Text style={styles.empty}>No categories yet.</Text>
          ) : null}
        </ScrollView>

        <SectionHeader
          title={
            selectedCategory ? `${selectedCategory} catalog` : "All products"
          }
          subtitle="Sorted by latest"
          action={
            selectedCategory ? (
              <Pressable onPress={() => setSelectedCategory(null)}>
                <Text style={styles.clear}>Clear filter</Text>
              </Pressable>
            ) : null
          }
        />

        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          key={`catalog-${cardColumns}`}
          numColumns={cardColumns}
          scrollEnabled={false}
          contentContainerStyle={{ gap: 14 }}
          columnWrapperStyle={cardColumns > 1 ? { gap: 14 } : undefined}
          ListEmptyComponent={
            <View style={styles.cleanState}>
              <Ionicons name="search-outline" size={48} color={colors.muted} />
              <Text style={styles.empty}>No matching products found.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <Pressable
                style={({ pressed }) => [
                  styles.productRow,
                  pressed && styles.productRowPressed,
                ]}
                onPress={() => setSelectedProduct(item)}
              >
                <View style={styles.productImageContainer}>
                  {item.thumbnail ? (
                    <Image
                      source={{ uri: item.thumbnail }}
                      style={styles.productImage}
                    />
                  ) : (
                    <View style={styles.productImagePlaceholder}>
                      <Ionicons
                        name="image-outline"
                        size={24}
                        color={colors.muted}
                      />
                    </View>
                  )}
                </View>

                <View style={styles.productInfo}>
                  <Text style={styles.productTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.vendorRow}>
                    <Ionicons
                      name="business-outline"
                      size={12}
                      color={colors.muted}
                    />
                    <Text style={styles.productVendor} numberOfLines={1}>
                      {item.vendor}
                    </Text>
                  </View>
                  <View style={styles.productPriceRow}>
                    <Text style={styles.currencySymbol}>GH₵</Text>
                    <Text style={styles.productPrice}>
                      {Number(item.price || 0).toLocaleString()}
                    </Text>
                    {item.compare_at_price > 0 && (
                      <Text style={styles.productComparePrice}>
                        GH₵{Number(item.compare_at_price).toLocaleString()}
                      </Text>
                    )}
                    <StatusPill value={item.status} size="small" />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() => handleProductOptions(item)}
                >
                  <Ionicons
                    name="ellipsis-vertical-outline"
                    size={18}
                    color={colors.muted}
                  />
                </TouchableOpacity>
              </Pressable>
            </View>
          )}
        />
      </ScrollView>

      {/* Product Details Modal */}
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
              <Text style={styles.modalTitle}>Product Profile</Text>
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
                          {selectedProduct.badges.map((badge, index) => {
                            const badgeConfig = [
                              {
                                id: "free_shipping",
                                label: "Free Shipping",
                                icon: "airplane-outline",
                                color: "#3B82F6",
                              },
                              {
                                id: "flash_deal",
                                label: "Flash Deal",
                                icon: "flash-outline",
                                color: "#EF4444",
                              },
                              {
                                id: "new_arrival",
                                label: "New Arrival",
                                icon: "sparkles-outline",
                                color: "#8B5CF6",
                              },
                              {
                                id: "bestseller",
                                label: "Bestseller",
                                icon: "trophy-outline",
                                color: "#F59E0B",
                              },
                              {
                                id: "limited_stock",
                                label: "Limited Stock",
                                icon: "alert-circle-outline",
                                color: "#DC2626",
                              },
                              {
                                id: "top_rated",
                                label: "Top Rated",
                                icon: "star-outline",
                                color: "#EAB308",
                              },
                            ].find(
                              (b) =>
                                b.label.toLowerCase() === badge.toLowerCase(),
                            ) || {
                              label: badge,
                              icon: "pricetag-outline",
                              color: "#64748B",
                            };

                            return (
                              <View
                                key={index}
                                style={[
                                  styles.enhancedBadge,
                                  { borderColor: badgeConfig.color + "40" },
                                ]}
                              >
                                <Ionicons
                                  name={badgeConfig.icon}
                                  size={14}
                                  color={badgeConfig.color}
                                />
                                <Text
                                  style={[
                                    styles.enhancedBadgeText,
                                    { color: badgeConfig.color },
                                  ]}
                                >
                                  {badge}
                                </Text>
                              </View>
                            );
                          })}
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
                        <Text style={styles.variantLabel}>Color Palette</Text>
                        <View style={styles.colorsGrid}>
                          {selectedProduct.colors.map((color, index) => {
                            const colorConfig = [
                              { name: "Black", hex: "#000000" },
                              { name: "White", hex: "#FFFFFF" },
                              { name: "Red", hex: "#EF4444" },
                              { name: "Blue", hex: "#3B82F6" },
                              { name: "Green", hex: "#10B981" },
                              { name: "Yellow", hex: "#F59E0B" },
                              { name: "Purple", hex: "#8B5CF6" },
                              { name: "Pink", hex: "#EC4899" },
                              { name: "Orange", hex: "#F97316" },
                              { name: "Brown", hex: "#92400E" },
                              { name: "Gray", hex: "#6B7280" },
                              { name: "Navy", hex: "#1E3A8A" },
                            ].find(
                              (c) =>
                                c.name.toLowerCase() === color.toLowerCase(),
                            ) || { name: color, hex: "#64748B" };

                            return (
                              <View key={index} style={styles.colorChip}>
                                <View
                                  style={[
                                    styles.colorDot,
                                    { backgroundColor: colorConfig.hex },
                                  ]}
                                />
                                <Text style={styles.colorText}>{color}</Text>
                              </View>
                            );
                          })}
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

      {/* Custom Menu Modal */}
      <Modal
        visible={!!menuProduct}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuProduct(null)}
      >
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setMenuProduct(null)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuHeaderTitle}>Management Console</Text>
              <Text style={styles.menuHeaderSubtitle}>
                {menuProduct?.title}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuProduct(null);
                Alert.alert(
                  "Coming Soon",
                  "Attribute modification module is under development.",
                );
              }}
            >
              <View
                style={[
                  styles.menuItemIcon,
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <Ionicons
                  name="settings-outline"
                  size={18}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.menuItemText}>Configure Attributes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemDestructive]}
              onPress={() => {
                const prod = menuProduct;
                setMenuProduct(null);
                Alert.alert(
                  "Delete Product",
                  `Are you sure you want to delete "${prod.title}"? This action is irreversible.`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => deleteProduct(prod.id),
                    },
                  ],
                );
              }}
            >
              <View
                style={[
                  styles.menuItemIcon,
                  { backgroundColor: colors.dangerLight },
                ]}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={colors.danger}
                />
              </View>
              <Text style={[styles.menuItemText, { color: colors.danger }]}>
                Delete Product
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCancelButton}
              onPress={() => setMenuProduct(null)}
            >
              <Text style={styles.menuCancelText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  categoryScroll: {
    marginBottom: 24,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  categoryScrollContent: {
    gap: 12,
    paddingRight: 16,
  },
  categoryCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    width: 240,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  categoryCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  categoryIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTitle: {
    fontWeight: "800",
    color: colors.dark,
    fontSize: 14,
  },
  categoryMeta: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    fontWeight: "600",
  },
  categoryStats: {
    alignItems: "flex-end",
  },
  categoryDetail: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "700",
  },
  categoryDetailMuted: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
    fontWeight: "600",
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.dark,
    fontWeight: "500",
  },
  sortButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  statusFiltersScroll: {
    marginBottom: 16,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  statusFilters: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 16,
  },
  statusChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  statusChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusChipText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "700",
  },
  statusChipTextActive: {
    color: "#fff",
  },
  productRow: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  productRowPressed: {
    backgroundColor: "#F8FAFC",
  },
  productImageContainer: {
    position: "relative",
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
  },
  productImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  productStatusBadge: {
    position: "absolute",
    top: -6,
    left: -6,
  },
  productInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.dark,
  },
  vendorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  productVendor: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
  },
  cardMeta: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "600",
    marginTop: 2,
  },
  productPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  currencySymbol: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    marginTop: 2,
  },
  productPrice: {
    fontSize: 17,
    fontWeight: "900",
    color: colors.primary,
  },
  productComparePrice: {
    fontSize: 13,
    color: colors.muted,
    textDecorationLine: "line-through",
    fontWeight: "500",
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  cleanState: {
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  empty: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  clear: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  // Modal Styles
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
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.dark,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
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
    gap: 16,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  vendorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  vendorText: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: "600",
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
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  mainPrice: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.dark,
  },
  comparePrice: {
    fontSize: 18,
    color: colors.muted,
    textDecorationLine: "line-through",
    fontWeight: "500",
  },
  discountBadge: {
    backgroundColor: colors.danger,
    paddingHorizontal: 10,
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
    paddingRight: 20,
    gap: 12,
  },
  galleryItem: {
    width: 140,
    height: 140,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
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
    gap: 10,
    marginBottom: 16,
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
    marginBottom: 20,
  },
  labelGroupTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  enhancedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "#fff",
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
    fontWeight: "600",
  },
  variantGroup: {
    marginBottom: 20,
  },
  variantLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.dark,
    marginBottom: 10,
  },
  sizesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sizeChip: {
    minWidth: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  sizeText: {
    fontSize: 13,
    color: colors.dark,
    fontWeight: "700",
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  colorText: {
    fontSize: 13,
    color: colors.dark,
    fontWeight: "600",
  },
  detailsGrid: {
    gap: 14,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
    gap: 12,
  },
  settingLabel: {
    fontSize: 14,
    color: colors.dark,
    fontWeight: "600",
  },
  settingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  settingBadgeActive: {
    backgroundColor: colors.successLight,
  },
  settingBadgeWarning: {
    backgroundColor: colors.warningLight,
  },
  settingBadgeInactive: {
    backgroundColor: "#F1F5F9",
  },
  settingBadgeText: {
    fontSize: 12,
    fontWeight: "700",
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
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenImage: {
    width: "100%",
    height: "100%",
  },
  productRowPressed: {
    backgroundColor: colors.light,
  },
  // Custom Menu Styles
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  menuContainer: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  menuHeader: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 16,
  },
  menuHeaderTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  menuHeaderSubtitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.dark,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 12,
    marginBottom: 8,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.dark,
  },
  menuCancelButton: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  menuCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.muted,
  },
});
