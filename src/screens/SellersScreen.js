import { useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAdmin } from "../context/AdminContext";
import { useToast } from "../context/ToastContext";
import { colors } from "../theme/colors";
import { supabase } from "../../supabase";
import { useResponsive } from "../hooks/useResponsive";

const H_PAD = 16;
const CARD_GAP = 12;

const AVAILABLE_BADGES = [
  {
    id: "verified",
    label: "Verified",
    icon: "checkmark-circle",
    color: "#10B981",
  },
  { id: "top_seller", label: "Top Seller", icon: "trophy", color: "#F59E0B" },
  {
    id: "fast_shipping",
    label: "Fast Shipping",
    icon: "flash",
    color: "#3B82F6",
  },
  { id: "eco_friendly", label: "Eco Friendly", icon: "leaf", color: "#22C55E" },
  { id: "local", label: "Local", icon: "location", color: "#8B5CF6" },
  { id: "trending", label: "Trending", icon: "trending-up", color: "#EC4899" },
  { id: "premium", label: "Premium", icon: "star", color: "#EAB308" },
];

const SORT_OPTIONS = [
  { id: "rating", label: "Rating" },
  { id: "alphabetical", label: "A–Z" },
  { id: "recent", label: "Recent" },
];

// ─── SellerCard ───────────────────────────────────────────────────────────────
const SellerCard = ({ seller, onUpdate }) => {
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [verifyingAccount, setVerifyingAccount] = useState(false);
  const toast = useToast();

  const initials = (seller.name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isVerified = seller.badges?.includes("verified");

  const toggleAccountVerification = async () => {
    setVerifyingAccount(true);
    try {
      if (seller.account_verified) {
        toast.success("Success", "Account is already marked verified");
        onUpdate();
        return;
      }

      const { error } = await supabase
        .from("express_sellers")
        .update({ account_verified: true })
        .eq("id", seller.id);

      if (error) throw error;

      toast.success("Success", "Account marked verified in database");
      onUpdate();
    } catch (error) {
      toast.error("Error", error?.message || "Failed to update account status");
    } finally {
      setVerifyingAccount(false);
    }
  };

  const toggleBadge = async (badgeId) => {
    setUpdating(true);
    try {
      const currentBadges = seller.badges || [];
      const newBadges = currentBadges.includes(badgeId)
        ? currentBadges.filter((b) => b !== badgeId)
        : [...currentBadges, badgeId];

      const { error } = await supabase
        .from("express_sellers")
        .update({ badges: newBadges })
        .eq("id", seller.id);

      if (error) throw error;
      toast.success("Success", "Badges updated");
      onUpdate();
    } catch (error) {
      toast.error("Error", error.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <View style={styles.sellerCard}>
      {/* Card Header */}
      <View style={styles.scHeader}>
        {/* Avatar */}
        <LinearGradient
          colors={["#3b82f6", "#1d4ed8"]}
          style={styles.avatar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </LinearGradient>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <View style={styles.scNameRow}>
            <Text style={styles.scName} numberOfLines={1}>
              {seller.name}
            </Text>
            {isVerified && (
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            )}
          </View>
          <Text style={styles.scEmail} numberOfLines={1}>
            {seller.email}
          </Text>
          {seller.location ? (
            <View style={styles.scLocRow}>
              <Ionicons
                name="location-outline"
                size={12}
                color={colors.muted}
              />
              <Text style={styles.scLoc}>{seller.location}</Text>
            </View>
          ) : null}
        </View>

        {/* Rating chip */}
        <View style={styles.ratingChip}>
          <Ionicons name="star" size={12} color="#F59E0B" />
          <Text style={styles.ratingText}>{seller.rating || "–"}</Text>
        </View>
      </View>

      {/* Stats Strip */}
      <View style={styles.scStrip}>
        <View style={styles.scStat}>
          <Text style={styles.scStatVal}>{(seller.badges || []).length}</Text>
          <Text style={styles.scStatLab}>Badges</Text>
        </View>
        <View style={styles.scStripDiv} />
        <View style={styles.scStat}>
          <Text style={styles.scStatVal}>{seller.weekly_target || 0}</Text>
          <Text style={styles.scStatLab}>Target</Text>
        </View>
        <View style={styles.scStripDiv} />
        <View style={styles.scStat}>
          <Text style={styles.scStatVal}>
            {seller.fulfillment_speed || "Std"}
          </Text>
          <Text style={styles.scStatLab}>Speed</Text>
        </View>
        <Pressable
          style={styles.badgeBtn}
          onPress={() => setShowBadgeModal(true)}
        >
          <Ionicons name="ribbon-outline" size={14} color={colors.primary} />
          <Text style={styles.badgeBtnText}>Manage</Text>
        </Pressable>
      </View>

      <View style={styles.accountPanel}>
        <View style={styles.accountStatusRow}>
          <Text style={styles.accountHeading}>Account</Text>
          <View
            style={[
              styles.accountStatusPill,
              seller.account_verified
                ? styles.accountStatusVerified
                : styles.accountStatusUnverified,
            ]}
          >
            <Text
              style={[
                styles.accountStatusText,
                seller.account_verified
                  ? styles.accountStatusTextVerified
                  : styles.accountStatusTextUnverified,
              ]}
            >
              {seller.account_verified ? "Verified" : "Unverified"}
            </Text>
          </View>
        </View>

        <Text style={styles.accountLine}>
          Account Code: {seller.account_code || "Not set"}
        </Text>
        <Text style={styles.accountLine}>
          Subaccount: {seller.payment_account || "Not set"}
        </Text>
        <Text style={styles.accountLine}>
          Type: {seller.payment_provider || "-"} {seller.payment_currency || ""}
        </Text>

        <Pressable
          style={[
            styles.accountVerifyBtn,
            seller.account_verified
              ? styles.accountVerifyBtnDanger
              : styles.accountVerifyBtnPrimary,
          ]}
          onPress={toggleAccountVerification}
          disabled={verifyingAccount || seller.account_verified}
        >
          {verifyingAccount ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.accountVerifyBtnText}>
              {seller.account_verified ? "Already Verified" : "Mark Verified"}
            </Text>
          )}
        </Pressable>
      </View>

      {/* Badge chips */}
      {seller.badges && seller.badges.length > 0 && (
        <View style={styles.badgeRow}>
          {seller.badges.map((badgeId) => {
            const badge = AVAILABLE_BADGES.find((b) => b.id === badgeId);
            if (!badge) return null;
            return (
              <View
                key={badgeId}
                style={[
                  styles.badgeChip,
                  {
                    borderColor: badge.color + "60",
                    backgroundColor: badge.color + "15",
                  },
                ]}
              >
                <Ionicons name={badge.icon} size={11} color={badge.color} />
                <Text style={[styles.badgeChipText, { color: badge.color }]}>
                  {badge.label}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Badge Modal */}
      <Modal
        visible={showBadgeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBadgeModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowBadgeModal(false)}
        >
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            <View style={styles.modalTitleRow}>
              <View>
                <Text style={styles.modalTitle}>Manage Badges</Text>
                <Text style={styles.modalSub}>{seller.name}</Text>
              </View>
              <Pressable
                onPress={() => setShowBadgeModal(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {AVAILABLE_BADGES.map((badge) => {
                const isActive = seller.badges?.includes(badge.id);
                return (
                  <Pressable
                    key={badge.id}
                    style={[
                      styles.badgeOption,
                      isActive && {
                        borderColor: badge.color,
                        backgroundColor: badge.color + "10",
                      },
                    ]}
                    onPress={() => toggleBadge(badge.id)}
                    disabled={updating}
                  >
                    <View
                      style={[
                        styles.badgeOptionIcon,
                        { backgroundColor: badge.color + "20" },
                      ]}
                    >
                      <Ionicons
                        name={badge.icon}
                        size={20}
                        color={badge.color}
                      />
                    </View>
                    <Text style={styles.badgeOptionLabel}>{badge.label}</Text>
                    <View
                      style={[
                        styles.badgeCheck,
                        isActive && { backgroundColor: badge.color },
                      ]}
                    >
                      {isActive && (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

// ─── FormField helper ─────────────────────────────────────────────────────────
const FormField = ({ label, icon, required, ...inputProps }) => (
  <View style={styles.fieldWrap}>
    <View style={styles.fieldLabelRow}>
      <Ionicons name={icon} size={14} color={colors.muted} />
      <Text style={styles.fieldLabel}>
        {label}
        {required ? " *" : ""}
      </Text>
    </View>
    <TextInput
      style={styles.fieldInput}
      placeholderTextColor={colors.muted}
      {...inputProps}
    />
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const SellersScreen = () => {
  const { sellers, loading, refresh } = useAdmin();
  const toast = useToast();
  const { cardColumns, getItemWidth, horizontalPadding } = useResponsive();
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("rating");

  const createSeller = async () => {
    if (!name || !email || !password) {
      toast.warning("Missing info", "Please fill name, email, and password.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: "Seller", name, phone, location } },
      });
      if (error) throw error;

      const { error: insertError } = await supabase
        .from("express_sellers")
        .insert({
          user_id: data.user.id,
          name,
          email,
          phone,
          location,
          rating: 0,
          fulfillment_speed: "Standard",
          weekly_target: 100,
        });
      if (insertError) throw insertError;

      toast.success("Success", "Seller account created!");
      setName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setLocation("");
      setFormOpen(false);
      refresh();
    } catch (error) {
      toast.error("Error", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSellers = sellers
    .filter((seller) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        seller.name?.toLowerCase().includes(q) ||
        seller.email?.toLowerCase().includes(q) ||
        seller.location?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "recent")
        return b.created_at?.localeCompare(a.created_at || "") || 0;
      return (a.name || "").localeCompare(b.name || "");
    });

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={refresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* ── PAGE HEADER ── */}
      <LinearGradient
        colors={["#1e40af", "#2563eb", "#3b82f6"]}
        style={styles.pageHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View>
          <Text style={styles.pageKicker}>VENDOR MANAGEMENT</Text>
          <Text style={styles.pageTitle}>Sellers</Text>
          <Text style={styles.pageSub}>
            {sellers.length} vendor{sellers.length !== 1 ? "s" : ""} onboarded
          </Text>
        </View>
        <Pressable
          style={[styles.addBtn, formOpen && styles.addBtnClose]}
          onPress={() => setFormOpen((p) => !p)}
        >
          <Ionicons
            name={formOpen ? "close" : "person-add-outline"}
            size={18}
            color="#fff"
          />
          <Text style={styles.addBtnText}>
            {formOpen ? "Cancel" : "Add Seller"}
          </Text>
        </Pressable>
      </LinearGradient>

      {/* ── ADD SELLER FORM ── */}
      {formOpen && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>New Seller Account</Text>
          <Text style={styles.formSub}>
            Fill in the details to onboard a new vendor
          </Text>

          <FormField
            label="Full Name"
            icon="person-outline"
            required
            placeholder="e.g. Kofi Mensah"
            value={name}
            onChangeText={setName}
          />
          <FormField
            label="Email"
            icon="mail-outline"
            required
            placeholder="seller@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <FormField
            label="Password"
            icon="lock-closed-outline"
            required
            placeholder="Secure password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <FormField
            label="Phone"
            icon="call-outline"
            placeholder="+233 XX XXX XXXX"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <FormField
            label="Location"
            icon="location-outline"
            placeholder="City, Region"
            value={location}
            onChangeText={setLocation}
          />

          <Pressable
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={createSeller}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color="#fff"
                />
                <Text style={styles.submitBtnText}>Create Seller Account</Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      {/* ── SEARCH + SORT ── */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email or location…"
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>

      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((opt) => (
          <Pressable
            key={opt.id}
            style={[
              styles.sortPill,
              sortBy === opt.id && styles.sortPillActive,
            ]}
            onPress={() => setSortBy(opt.id)}
          >
            <Text
              style={[
                styles.sortPillText,
                sortBy === opt.id && styles.sortPillTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
        <Text style={styles.sortCount}>
          {filteredSellers.length} result
          {filteredSellers.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* ── SELLER LIST ── */}
      <FlatList
        data={filteredSellers}
        keyExtractor={(item) => item.id}
        key={`sellers-${cardColumns}`}
        numColumns={cardColumns}
        scrollEnabled={false}
        contentContainerStyle={{ gap: CARD_GAP }}
        columnWrapperStyle={cardColumns > 1 ? { gap: CARD_GAP } : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={52} color={colors.muted} />
            <Text style={styles.emptyTitle}>No sellers found</Text>
            <Text style={styles.emptySub}>
              {searchQuery
                ? "Try adjusting your search"
                : 'Tap "Add Seller" to onboard the first vendor'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ flex: 1 }}>
            <SellerCard seller={item} onUpdate={refresh} />
          </View>
        )}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F0F4F8" },
  content: {
    paddingHorizontal: H_PAD,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 80,
    gap: 0,
  },

  // Page Header
  pageHeader: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    shadowColor: "#1e40af",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  pageKicker: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  pageTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  pageSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  addBtnClose: {
    backgroundColor: "rgba(239,68,68,0.4)",
    borderColor: "rgba(239,68,68,0.6)",
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // Form Card
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  formTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.dark,
    marginBottom: 4,
  },
  formSub: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "500",
    marginBottom: 16,
  },
  fieldWrap: { marginBottom: 14 },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: 14,
    color: colors.dark,
    fontWeight: "500",
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
  },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  // Search + Sort
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.dark, fontWeight: "500" },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sortPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sortPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortPillText: { fontSize: 13, fontWeight: "700", color: colors.muted },
  sortPillTextActive: { color: "#fff" },
  sortCount: {
    marginLeft: "auto",
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
  },

  // Seller Card
  sellerCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  scHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "900" },
  scNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  scName: { fontSize: 15, fontWeight: "800", color: colors.dark, flex: 1 },
  scEmail: { fontSize: 12, color: colors.muted, fontWeight: "500" },
  scLocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 4,
  },
  scLoc: { fontSize: 12, color: colors.muted, fontWeight: "500" },
  ratingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  ratingText: { fontSize: 12, fontWeight: "800", color: "#92400E" },

  // Stat strip inside card
  scStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 10,
  },
  scStat: { alignItems: "center", flex: 1 },
  scStatVal: { fontSize: 15, fontWeight: "900", color: colors.dark },
  scStatLab: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: "600",
    marginTop: 1,
  },
  scStripDiv: { width: 1, height: 28, backgroundColor: "#E2E8F0" },
  badgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  badgeBtnText: { color: colors.primary, fontWeight: "700", fontSize: 11 },

  accountPanel: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 10,
    gap: 6,
  },
  accountStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  accountHeading: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.dark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  accountStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
  },
  accountStatusVerified: {
    backgroundColor: "#ECFDF5",
    borderColor: "#34D399",
  },
  accountStatusUnverified: {
    backgroundColor: "#FFFBEB",
    borderColor: "#F59E0B",
  },
  accountStatusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  accountStatusTextVerified: {
    color: "#047857",
  },
  accountStatusTextUnverified: {
    color: "#B45309",
  },
  accountLine: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
  },
  accountVerifyBtn: {
    marginTop: 6,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  accountVerifyBtnPrimary: {
    backgroundColor: colors.primary,
  },
  accountVerifyBtnDanger: {
    backgroundColor: "#EF4444",
  },
  accountVerifyBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
  },

  // Badge chips
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  badgeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeChipText: { fontSize: 11, fontWeight: "700" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    maxHeight: "80%",
  },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: 18,
  },
  modalTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.dark },
  modalSub: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "500",
    marginTop: 2,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  badgeOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeOptionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.dark,
  },
  badgeCheck: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  // Empty
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: colors.dark },
  emptySub: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "500",
    textAlign: "center",
    maxWidth: 260,
  },
});
