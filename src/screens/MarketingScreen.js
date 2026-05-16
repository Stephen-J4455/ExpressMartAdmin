import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ColorPicker from "react-native-wheel-color-picker";
import { useAdmin } from "../context/AdminContext";
import { useToast } from "../context/ToastContext";
import { colors } from "../theme/colors";
import { useResponsive } from "../hooks/useResponsive";

const H_PAD = 16;

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// ─── Coupon Modal ─────────────────────────────────────────────────────────────
const CouponModal = ({
  visible,
  coupon,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}) => {
  const [code, setCode] = useState(coupon?.code || "");
  const [discountType, setDiscountType] = useState(
    coupon?.discount_type || "percentage",
  );
  const [discountValue, setDiscountValue] = useState(
    String(coupon?.discount_value || ""),
  );
  const [minOrder, setMinOrder] = useState(
    String(coupon?.min_order_amount || ""),
  );
  const [maxUses, setMaxUses] = useState(String(coupon?.max_uses || ""));
  const [expiresAt, setExpiresAt] = useState(
    coupon?.expires_at ? coupon.expires_at.slice(0, 10) : "",
  );
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const isEdit = !!coupon;

  const handleSave = async () => {
    if (!code.trim() || !discountValue.trim()) {
      toast.error("Missing Fields", "Code and discount value are required");
      return;
    }
    const dv = parseFloat(discountValue);
    if (isNaN(dv) || dv <= 0) {
      toast.error("Invalid Value", "Discount value must be a positive number");
      return;
    }
    if (discountType === "percentage" && dv > 100) {
      toast.error("Invalid Value", "Percentage cannot exceed 100");
      return;
    }
    setSaving(true);
    const payload = {
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: dv,
      min_order_amount: minOrder ? parseFloat(minOrder) : null,
      max_uses: maxUses ? parseInt(maxUses) : null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    };
    try {
      if (isEdit) {
        await onUpdate(coupon.id, payload);
        toast.success("Updated", "Coupon updated successfully");
      } else {
        await onCreate(payload);
        toast.success("Created", "Coupon created successfully");
      }
      onClose();
    } catch (err) {
      toast.error("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Ionicons
              name="pricetag-outline"
              size={22}
              color={colors.primary}
            />
            <Text style={styles.modalTitle}>
              {isEdit ? "Edit Coupon" : "New Coupon"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          >
            <Text style={styles.fieldLabel}>Coupon Code *</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder="e.g. SAVE20"
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
            />

            <Text style={styles.fieldLabel}>Discount Type</Text>
            <View style={styles.typeRow}>
              {[
                { id: "percentage", label: "Percentage (%)" },
                { id: "fixed", label: "Fixed (GH₵)" },
              ].map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.typeChip,
                    discountType === t.id && styles.typeChipActive,
                  ]}
                  onPress={() => setDiscountType(t.id)}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      discountType === t.id && styles.typeChipTextActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Discount Value *</Text>
            <TextInput
              style={styles.input}
              value={discountValue}
              onChangeText={setDiscountValue}
              placeholder={
                discountType === "percentage" ? "e.g. 20" : "e.g. 10.00"
              }
              keyboardType="decimal-pad"
              placeholderTextColor={colors.muted}
            />

            <Text style={styles.fieldLabel}>Minimum Order Amount (GH₵)</Text>
            <TextInput
              style={styles.input}
              value={minOrder}
              onChangeText={setMinOrder}
              placeholder="Leave blank for no minimum"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.muted}
            />

            <Text style={styles.fieldLabel}>Max Uses</Text>
            <TextInput
              style={styles.input}
              value={maxUses}
              onChangeText={setMaxUses}
              placeholder="Leave blank for unlimited"
              keyboardType="number-pad"
              placeholderTextColor={colors.muted}
            />

            <Text style={styles.fieldLabel}>Expiry Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={expiresAt}
              onChangeText={setExpiresAt}
              placeholder="e.g. 2026-12-31"
              placeholderTextColor={colors.muted}
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {isEdit ? "Save Changes" : "Create Coupon"}
                </Text>
              )}
            </TouchableOpacity>

            {isEdit && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => {
                  onDelete(coupon.id);
                  onClose();
                }}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={colors.danger}
                />
                <Text style={styles.deleteBtnText}>Delete Coupon</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Category Modal ───────────────────────────────────────────────────────────
const COMMON_ICONS = [
  "grid-outline",
  "apps-outline",
  "shirt-outline",
  "restaurant-outline",
  "fast-food-outline",
  "nutrition-outline",
  "phone-portrait-outline",
  "laptop-outline",
  "desktop-outline",
  "game-controller-outline",
  "headset-outline",
  "home-outline",
  "bed-outline",
  "build-outline",
  "hammer-outline",
  "sparkles-outline",
  "rose-outline",
  "color-palette-outline",
  "football-outline",
  "barbell-outline",
  "book-outline",
  "school-outline",
  "car-outline",
  "car-sport-outline",
  "medical-outline",
  "bandage-outline",
  "paw-outline",
  "leaf-outline",
  "flower-outline",
  "musical-notes-outline",
  "bag-outline",
  "cart-outline",
  "gift-outline",
  "watch-outline",
  "diamond-outline",
  "hardware-chip-outline",
  "flash-outline",
  "wine-outline",
  "cafe-outline",
  "snow-outline",
  "sunny-outline",
  "umbrella-outline",
  "briefcase-outline",
  "construct-outline",
  "airplane-outline",
  "boat-outline",
  "planet-outline",
  "library-outline",
  "newspaper-outline",
  "tablet-portrait-outline",
  "tv-outline",
  "bicycle-outline",
  "camera-outline",
];

const COMMON_COLORS = [
  colors.primary,
  colors.success,
  colors.warning,
  colors.danger,
  colors.info,
  "#8B5CF6",
  "#EC4899",
  "#F97316",
  "#06B6D4",
  "#84CC16",
  "#22C55E",
  "#14B8A6",
  "#0EA5E9",
  "#3B82F6",
  "#6366F1",
  "#A855F7",
  "#D946EF",
  "#E11D48",
  "#F43F5E",
  "#EF4444",
  "#F59E0B",
  "#EAB308",
  "#10B981",
  "#64748B",
  "#334155",
  "#111827",
  "#7C2D12",
  "#365314",
  "#14532D",
  "#1E3A8A",
  "#312E81",
  "#581C87",
  "#881337",
];

const CategoryModal = ({
  visible,
  category,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}) => {
  const [name, setName] = useState(category?.name || "");
  const [icon, setIcon] = useState(category?.icon || "grid-outline");
  const [catColor, setCatColor] = useState(category?.color || colors.primary);
  const [customColor, setCustomColor] = useState(
    category?.color || colors.primary,
  );
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const isEdit = !!category;

  useEffect(() => {
    setName(category?.name || "");
    setIcon(category?.icon || "grid-outline");
    const nextColor = category?.color || colors.primary;
    setCatColor(nextColor);
    setCustomColor(nextColor);
  }, [category, visible]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Missing Name", "Category name is required");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await onUpdate(category.id, {
          name: name.trim(),
          icon,
          color: catColor,
        });
        toast.success("Updated", "Category updated");
      } else {
        await onCreate({ name: name.trim(), icon, color: catColor });
        toast.success("Created", "Category created");
      }
      onClose();
    } catch (err) {
      toast.error("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Ionicons name="grid-outline" size={22} color={colors.primary} />
            <Text style={styles.modalTitle}>
              {isEdit ? "Edit Category" : "New Category"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          >
            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Electronics"
              placeholderTextColor={colors.muted}
            />

            <Text style={styles.fieldLabel}>Icon</Text>
            <View style={styles.iconGrid}>
              {COMMON_ICONS.map((ic) => (
                <TouchableOpacity
                  key={ic}
                  style={[
                    styles.iconOption,
                    icon === ic && {
                      backgroundColor: colors.primary + "20",
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setIcon(ic)}
                >
                  <Ionicons
                    name={ic}
                    size={20}
                    color={icon === ic ? colors.primary : colors.muted}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Color</Text>
            <View style={styles.colorRow}>
              {COMMON_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    catColor === c && styles.colorSwatchActive,
                  ]}
                  onPress={() => setCatColor(c)}
                />
              ))}
            </View>

            <Text style={styles.fieldLabel}>Color Wheel</Text>
            <View style={styles.colorWheelWrap}>
              <ColorPicker
                color={customColor}
                thumbSize={24}
                sliderSize={24}
                noSnap
                row={false}
                swatches={false}
                onColorChangeComplete={(pickedColor) => {
                  setCustomColor(pickedColor);
                  setCatColor(pickedColor);
                }}
              />
            </View>

            <TextInput
              style={styles.input}
              value={customColor}
              onChangeText={(text) => {
                setCustomColor(text);
                if (/^#[0-9A-Fa-f]{6}$/.test(text)) {
                  setCatColor(text);
                }
              }}
              placeholder="#4F46E5"
              autoCapitalize="characters"
              placeholderTextColor={colors.muted}
            />
            <View style={styles.selectedColorRow}>
              <View
                style={[
                  styles.selectedColorPreview,
                  { backgroundColor: catColor || colors.primary },
                ]}
              />
              <Text style={styles.selectedColorText}>
                Selected: {catColor?.toUpperCase?.() || colors.primary}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {isEdit ? "Save Changes" : "Create Category"}
                </Text>
              )}
            </TouchableOpacity>

            {isEdit && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={async () => {
                  try {
                    await onDelete(category.id);
                    onClose();
                  } catch (err) {
                    toast.error("Error", err.message);
                  }
                }}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={colors.danger}
                />
                <Text style={styles.deleteBtnText}>Delete Category</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
export const MarketingScreen = () => {
  const {
    coupons,
    categories,
    products,
    loading,
    refresh,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useAdmin();
  const toast = useToast();
  const { cardColumns } = useResponsive();

  const [activeTab, setActiveTab] = useState("coupons"); // coupons | categories
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editCoupon, setEditCoupon] = useState(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editCategory, setEditCategory] = useState(null);

  const activeCoupons = coupons.filter((c) => c.is_active);
  const expiredCoupons = coupons.filter(
    (c) =>
      !c.is_active || (c.expires_at && new Date(c.expires_at) < new Date()),
  );

  const toggleCouponActive = async (coupon) => {
    await updateCoupon(coupon.id, { is_active: !coupon.is_active });
    toast.success(
      coupon.is_active ? "Deactivated" : "Activated",
      `Coupon ${coupon.code} ${coupon.is_active ? "deactivated" : "activated"}`,
    );
  };

  const handleDeleteCoupon = async (id) => {
    await deleteCoupon(id);
    toast.success("Deleted", "Coupon deleted");
  };

  const handleDeleteCategory = async (id) => {
    try {
      await deleteCategory(id);
      toast.success("Deleted", "Category deleted");
    } catch (err) {
      toast.error("Error", err.message);
      throw err;
    }
  };

  return (
    <View style={styles.container}>
      {/* Hero */}
      <LinearGradient
        colors={["#1e40af", "#2563eb", "#3b82f6"]}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.heroTopBar}>
          <View style={styles.heroPill}>
            <Ionicons name="pricetag-outline" size={12} color="#fff" />
            <Text style={styles.heroPillText}>Marketing</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>Marketing</Text>
        <Text style={styles.heroSub}>Coupons, discounts and categories</Text>
        <View style={styles.heroStrip}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{activeCoupons.length}</Text>
            <Text style={styles.heroStatLab}>Active Coupons</Text>
          </View>
          <View style={styles.heroStripDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{expiredCoupons.length}</Text>
            <Text style={styles.heroStatLab}>Expired</Text>
          </View>
          <View style={styles.heroStripDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{categories.length}</Text>
            <Text style={styles.heroStatLab}>Categories</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        {[
          {
            id: "coupons",
            label: "Coupons",
            icon: "pricetag-outline",
            badge: activeCoupons.length,
          },
          {
            id: "categories",
            label: "Categories",
            icon: "grid-outline",
            badge: categories.length,
          },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.id ? colors.primary : colors.muted}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{tab.badge}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "coupons" && (
        <FlatList
          data={coupons}
          keyExtractor={(item) => item.id}
          key={`coupons-${cardColumns}`}
          numColumns={cardColumns}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={{ padding: H_PAD, paddingBottom: 140 }}
          columnWrapperStyle={cardColumns > 1 ? { gap: 10 } : undefined}
          ListHeaderComponent={
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => {
                setEditCoupon(null);
                setShowCouponModal(true);
              }}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addBtnText}>New Coupon</Text>
            </TouchableOpacity>
          }
          renderItem={({ item: coupon }) => {
            const isExpired =
              coupon.expires_at && new Date(coupon.expires_at) < new Date();
            const statusColor =
              !coupon.is_active || isExpired ? colors.danger : colors.success;
            const usagePercent = coupon.max_uses
              ? Math.min(1, (coupon.current_uses || 0) / coupon.max_uses)
              : 0;
            return (
              <View style={{ flex: 1 }}>
                <View
                  style={[
                    styles.couponCard,
                    !coupon.is_active && { opacity: 0.7 },
                  ]}
                >
                  <View style={styles.couponTop}>
                    <View style={styles.couponCodeWrap}>
                      <Text style={styles.couponCode}>{coupon.code}</Text>
                      <View
                        style={[
                          styles.couponTypeBadge,
                          { backgroundColor: colors.primary + "18" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.couponTypeText,
                            { color: colors.primary },
                          ]}
                        >
                          {coupon.discount_type === "percentage"
                            ? `${coupon.discount_value}% OFF`
                            : `GH₵${coupon.discount_value} OFF`}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.couponActions}>
                      <TouchableOpacity
                        onPress={() => toggleCouponActive(coupon)}
                        style={styles.toggleBtn}
                      >
                        <Ionicons
                          name={coupon.is_active ? "eye" : "eye-off"}
                          size={16}
                          color={
                            coupon.is_active ? colors.success : colors.muted
                          }
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setEditCoupon(coupon);
                          setShowCouponModal(true);
                        }}
                        style={styles.toggleBtn}
                      >
                        <Ionicons
                          name="pencil-outline"
                          size={16}
                          color={colors.primary}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.couponMeta}>
                    <Text style={styles.couponMetaText}>
                      {coupon.min_order_amount
                        ? `Min order: GH₵${coupon.min_order_amount}`
                        : "No min order"}
                    </Text>
                    <Text
                      style={[styles.couponMetaText, { color: statusColor }]}
                    >
                      {isExpired
                        ? "Expired"
                        : coupon.expires_at
                          ? `Expires ${fmtDate(coupon.expires_at)}`
                          : "No expiry"}
                    </Text>
                  </View>

                  {coupon.max_uses && (
                    <View style={styles.usageWrap}>
                      <View style={styles.usageBar}>
                        <View
                          style={[
                            styles.usageFill,
                            {
                              width: `${usagePercent * 100}%`,
                              backgroundColor:
                                usagePercent > 0.8
                                  ? colors.danger
                                  : colors.primary,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.usageText}>
                        {coupon.current_uses || 0}/{coupon.max_uses} uses
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="pricetag-outline"
                size={48}
                color={colors.muted}
              />
              <Text style={styles.emptyText}>No coupons yet</Text>
            </View>
          }
        />
      )}

      {activeTab === "categories" && (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          key={`categories-${cardColumns}`}
          numColumns={cardColumns}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={{ padding: H_PAD, paddingBottom: 140 }}
          columnWrapperStyle={cardColumns > 1 ? { gap: 8 } : undefined}
          ListHeaderComponent={
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => {
                setEditCategory(null);
                setShowCatModal(true);
              }}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addBtnText}>New Category</Text>
            </TouchableOpacity>
          }
          renderItem={({ item: cat }) => {
            const productCount = products.filter(
              (p) => p.category === cat.name,
            ).length;
            return (
              <View style={{ flex: 1 }}>
                <View style={styles.catCard}>
                  <View
                    style={[
                      styles.catIcon,
                      { backgroundColor: (cat.color || colors.primary) + "20" },
                    ]}
                  >
                    <Ionicons
                      name={cat.icon || "grid-outline"}
                      size={22}
                      color={cat.color || colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catName}>{cat.name}</Text>
                    <Text style={styles.catCount}>{productCount} products</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.editCatBtn}
                    onPress={() => {
                      setEditCategory(cat);
                      setShowCatModal(true);
                    }}
                  >
                    <Ionicons
                      name="pencil-outline"
                      size={16}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="grid-outline" size={48} color={colors.muted} />
              <Text style={styles.emptyText}>No categories yet</Text>
            </View>
          }
        />
      )}

      <CouponModal
        visible={showCouponModal}
        coupon={editCoupon}
        onClose={() => {
          setShowCouponModal(false);
          setEditCoupon(null);
        }}
        onCreate={createCoupon}
        onUpdate={updateCoupon}
        onDelete={handleDeleteCoupon}
      />

      <CategoryModal
        visible={showCatModal}
        category={editCategory}
        onClose={() => {
          setShowCatModal(false);
          setEditCategory(null);
        }}
        onCreate={createCategory}
        onUpdate={updateCategory}
        onDelete={handleDeleteCategory}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  // Hero
  hero: { paddingHorizontal: H_PAD, paddingTop: 54, paddingBottom: 20 },
  heroTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroPillText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  heroTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  heroSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
    marginBottom: 14,
  },
  heroStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
  },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatVal: { fontSize: 18, fontWeight: "900", color: "#fff" },
  heroStatLab: { fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  heroStripDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 6,
    marginHorizontal: H_PAD,
    marginTop: -12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    zIndex: 5,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabActive: { backgroundColor: colors.primary + "10" },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.muted },
  tabTextActive: { color: colors.primary, fontWeight: "700" },
  tabBadge: {
    backgroundColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabBadgeText: { fontSize: 10, fontWeight: "700", color: colors.muted },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 14,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  // Coupon card
  couponCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  couponTop: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  couponCodeWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  couponCode: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.dark,
    letterSpacing: 1,
  },
  couponTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  couponTypeText: { fontSize: 11, fontWeight: "700" },
  couponActions: { flexDirection: "row", gap: 8 },
  toggleBtn: { padding: 6 },
  couponMeta: { flexDirection: "row", justifyContent: "space-between" },
  couponMetaText: { fontSize: 11, color: colors.muted },
  usageWrap: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  usageBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  usageFill: { height: 4, borderRadius: 2 },
  usageText: { fontSize: 10, color: colors.muted, minWidth: 60 },
  // Category card
  catCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  catIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  catName: { fontSize: 15, fontWeight: "700", color: colors.dark },
  catCount: { fontSize: 12, color: colors.muted, marginTop: 2 },
  editCatBtn: { padding: 8 },
  // Modal shared
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { flex: 1, fontSize: 17, fontWeight: "800", color: colors.dark },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.light,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: colors.dark,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeRow: { flexDirection: "row", gap: 8 },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.light,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  typeChipActive: {
    backgroundColor: colors.primary + "15",
    borderColor: colors.primary,
  },
  typeChipText: { fontSize: 13, fontWeight: "600", color: colors.muted },
  typeChipTextActive: { color: colors.primary },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 12,
  },
  deleteBtnText: { color: colors.danger, fontWeight: "600", fontSize: 14 },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  colorSwatch: { width: 32, height: 32, borderRadius: 16 },
  colorSwatchActive: { borderWidth: 3, borderColor: colors.dark },
  colorWheelWrap: {
    height: 240,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  selectedColorRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectedColorPreview: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedColorText: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { marginTop: 12, color: colors.muted, fontSize: 15 },
});
