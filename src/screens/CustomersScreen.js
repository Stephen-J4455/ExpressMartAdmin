import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAdmin } from "../context/AdminContext";
import { useToast } from "../context/ToastContext";
import { useNotifications } from "../context/NotificationContext";
import { supabase } from "../../supabase";
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

const ROLE_FILTERS = ["all", "customer", "seller", "admin"];
const CUSTOMER_LIKE_ROLES = ["customer", "user"];

const normalizeRole = (role) => {
  const normalized = String(role || "")
    .trim()
    .toLowerCase();
  return normalized || "customer";
};

// ─── Customer Detail Modal ────────────────────────────────────────────────────
const CustomerModal = ({
  user,
  orders,
  onClose,
  onPromoteToSeller,
  onDemoteToCustomer,
  roleUpdating = false,
}) => {
  if (!user) return null;
  const currentRole = normalizeRole(user.role);

  const userOrders = orders.filter(
    (o) =>
      o.user_id === user.id ||
      String(o.customer ?? "")
        .toLowerCase()
        .includes(String(user.email ?? "").toLowerCase()),
  );
  const totalSpend = userOrders
    .filter((o) => o.payment_status === "success")
    .reduce((s, o) => s + Number(o.total || 0), 0);

  return (
    <Modal
      visible={!!user}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            style={styles.modalHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.modalAvatar}>
              <Text style={styles.modalAvatarText}>
                {(user.full_name || user.email || "?").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.modalName}>
                {user.full_name || "No Name"}
              </Text>
              <Text style={styles.modalEmail}>{user.email}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, flexGrow: 1 }}
          >
            {/* Stats */}
            <View style={styles.modalStats}>
              <View style={styles.modalStatBox}>
                <Text style={styles.modalStatVal}>{userOrders.length}</Text>
                <Text style={styles.modalStatLabel}>Orders</Text>
              </View>
              <View style={styles.modalStatBox}>
                <Text style={[styles.modalStatVal, { color: colors.success }]}>
                  GH₵{totalSpend.toFixed(2)}
                </Text>
                <Text style={styles.modalStatLabel}>Total Spend</Text>
              </View>
              <View style={styles.modalStatBox}>
                <Text style={[styles.modalStatVal, { color: colors.info }]}>
                  {currentRole}
                </Text>
                <Text style={styles.modalStatLabel}>Role</Text>
              </View>
            </View>

            {CUSTOMER_LIKE_ROLES.includes(currentRole) && (
              <View style={styles.roleSwitchBlock}>
                <Text style={styles.sectionTitle}>Promote to Seller</Text>
                <Text style={styles.roleSwitchHint}>
                  This will convert the account to seller and send a password
                  setup link so they can log in to the seller app (for Google
                  sign-up users too).
                </Text>
                <View style={styles.roleSwitchRow}>
                  <TouchableOpacity
                    style={[
                      styles.roleSwitchButton,
                      roleUpdating && styles.roleSwitchButtonDisabled,
                    ]}
                    disabled={roleUpdating}
                    onPress={() => onPromoteToSeller?.(user)}
                  >
                    {roleUpdating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.roleSwitchButtonText}>
                        Promote & Send Password Link
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {currentRole === "seller" && (
              <View style={styles.roleSwitchBlock}>
                <Text style={styles.sectionTitle}>Revert to Customer</Text>
                <Text style={styles.roleSwitchHint}>
                  This removes seller access and changes the account back to
                  customer.
                </Text>
                <View style={styles.roleSwitchRow}>
                  <TouchableOpacity
                    style={[
                      styles.roleSwitchButton,
                      styles.roleSwitchButtonDanger,
                      roleUpdating && styles.roleSwitchButtonDisabled,
                    ]}
                    disabled={roleUpdating}
                    onPress={() => onDemoteToCustomer?.(user)}
                  >
                    {roleUpdating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.roleSwitchButtonText}>
                        Change to Customer
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Details */}
            {[
              { label: "Phone", value: user.phone },
              { label: "Joined", value: fmtDate(user.created_at) },
              { label: "User ID", value: user.id?.slice(0, 16) + "…" },
            ].map((row) => (
              <View key={row.label} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{row.label}</Text>
                <Text style={styles.detailValue}>{row.value || "—"}</Text>
              </View>
            ))}

            {/* Recent Orders */}
            {userOrders.length > 0 && (
              <View style={{ marginTop: 20 }}>
                <Text style={styles.sectionTitle}>Recent Orders</Text>
                {userOrders.slice(0, 5).map((o) => (
                  <View key={o.id} style={styles.miniOrder}>
                    <View>
                      <Text style={styles.miniOrderNum}>#{o.order_number}</Text>
                      <Text style={styles.miniOrderDate}>
                        {fmtDate(o.created_at)}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.miniOrderTotal}>
                        GH₵{Number(o.total || 0).toFixed(2)}
                      </Text>
                      <Text
                        style={[
                          styles.miniOrderStatus,
                          {
                            color:
                              o.status === "delivered"
                                ? colors.success
                                : colors.warning,
                          },
                        ]}
                      >
                        {o.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── User Card ────────────────────────────────────────────────────────────────
const UserCard = ({ user, orderCount, totalSpend, onPress }) => {
  const initials = (user.full_name || user.email || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleColor =
    {
      admin: colors.danger,
      seller: colors.primary,
      user: colors.success,
      customer: colors.success,
    }[normalizeRole(user.role)] || colors.muted;

  return (
    <Pressable style={styles.card} onPress={() => onPress(user)}>
      <View style={styles.cardRow}>
        <LinearGradient
          colors={[colors.primary + "cc", colors.accent]}
          style={styles.avatar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </LinearGradient>

        <View style={{ flex: 1 }}>
          <Text style={styles.cardKicker}>User Profile</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.cardName} numberOfLines={1}>
              {user.full_name || "No Name"}
            </Text>
            <View
              style={[styles.roleChip, { backgroundColor: roleColor + "20" }]}
            >
              <Text style={[styles.roleChipText, { color: roleColor }]}>
                {normalizeRole(user.role)}
              </Text>
            </View>
          </View>
          <Text style={styles.cardEmail} numberOfLines={1}>
            {user.email}
          </Text>
          <Text style={styles.cardDate}>Joined {fmtDate(user.created_at)}</Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.cardOrderCount}>{orderCount}</Text>
          <Text style={styles.cardOrderLabel}>orders</Text>
          {totalSpend > 0 && (
            <Text style={styles.cardSpend}>GH₵{totalSpend.toFixed(0)}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
};

// ─── Broadcast Modal ──────────────────────────────────────────────────────────
const BroadcastModal = ({ visible, onClose }) => {
  const { sendNotification } = useNotifications();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState("customer");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Missing Fields", "Title and message are required");
      return;
    }
    setSending(true);
    try {
      // Fetch tokens for target type
      const { data: tokens, error } = await supabase
        .from("express_device_tokens")
        .select("fcm_token")
        .eq("app_type", targetType)
        .eq("is_active", true);

      if (error) throw error;
      if (!tokens || tokens.length === 0) {
        toast.error("No Devices", `No active ${targetType} devices found`);
        return;
      }

      await sendNotification({
        tokens: tokens.map((t) => t.fcm_token),
        title: title.trim(),
        body: body.trim(),
        notificationType: "system",
        android: { channelId: "default", priority: "high" },
      });

      toast.success(
        "Sent!",
        `Notification broadcast to ${tokens.length} ${targetType} device(s)`,
      );
      setTitle("");
      setBody("");
      onClose();
    } catch (err) {
      toast.error("Failed", err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.broadcastModal}>
          <View style={styles.broadcastHeader}>
            <Ionicons
              name="megaphone-outline"
              size={22}
              color={colors.primary}
            />
            <Text style={styles.broadcastTitle}>Broadcast Notification</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Target Audience</Text>
          <View style={styles.targetRow}>
            {["customer", "seller", "admin"].map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.targetChip,
                  targetType === t && styles.targetChipActive,
                ]}
                onPress={() => setTargetType(t)}
              >
                <Text
                  style={[
                    styles.targetChipText,
                    targetType === t && styles.targetChipTextActive,
                  ]}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            style={styles.broadcastInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Notification title…"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.fieldLabel}>Message</Text>
          <TextInput
            style={[
              styles.broadcastInput,
              { height: 80, textAlignVertical: "top" },
            ]}
            value={body}
            onChangeText={setBody}
            placeholder="Notification message…"
            placeholderTextColor={colors.muted}
            multiline
          />

          <TouchableOpacity
            style={[styles.sendBtn, sending && { opacity: 0.6 }]}
            onPress={handleSend}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="send-outline" size={16} color="#fff" />
                <Text style={styles.sendBtnText}>Broadcast</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
export const CustomersScreen = () => {
  const {
    users,
    orders,
    loading,
    refresh,
    promoteCustomerToSeller,
    updateUserRole,
  } = useAdmin();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [roleUpdating, setRoleUpdating] = useState(false);
  const { cardColumns } = useResponsive();

  // Build order stats per user
  const userOrderMap = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      if (!o.user_id) return;
      if (!map[o.user_id]) map[o.user_id] = { count: 0, spend: 0 };
      map[o.user_id].count += 1;
      if (o.payment_status === "success")
        map[o.user_id].spend += Number(o.total || 0);
    });
    return map;
  }, [orders]);

  const filtered = useMemo(() => {
    let list = users;
    if (roleFilter !== "all") {
      list = list.filter((u) => {
        const role = normalizeRole(u.role);
        if (roleFilter === "customer") return CUSTOMER_LIKE_ROLES.includes(role);
        return role === roleFilter;
      });
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (u) =>
          (u.full_name || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q) ||
          (u.phone || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [users, roleFilter, query]);

  const customerCount = users.filter(
    (u) => CUSTOMER_LIKE_ROLES.includes(normalizeRole(u.role)),
  ).length;
  const sellerCount = users.filter((u) => normalizeRole(u.role) === "seller")
    .length;

  const handlePromoteToSeller = async (user) => {
    if (!user?.id) return;
    if (!CUSTOMER_LIKE_ROLES.includes(normalizeRole(user.role))) {
      toast.warning("Not allowed", "Only customers can be promoted.");
      return;
    }
    try {
      setRoleUpdating(true);
      await promoteCustomerToSeller({
        userId: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
      });
      setSelectedUser((prev) => (prev ? { ...prev, role: "seller" } : prev));
      toast.success(
        "Promoted",
        `${user.email} is now seller. Password setup email sent.`,
      );
    } catch (error) {
      toast.error("Promotion failed", error.message || "Could not promote user");
    } finally {
      setRoleUpdating(false);
    }
  };

  const handleDemoteToCustomer = (user) => {
    if (!user?.id) return;
    if (normalizeRole(user.role) !== "seller") {
      toast.warning("Not allowed", "Only sellers can be changed to customer.");
      return;
    }

    const runDemotion = async () => {
      try {
        setRoleUpdating(true);
        await updateUserRole(user.id, "customer");
        setSelectedUser((prev) => (prev ? { ...prev, role: "customer" } : prev));
        toast.success("Role updated", `${user.email} is now customer.`);
      } catch (error) {
        toast.error("Update failed", error.message || "Could not change role");
      } finally {
        setRoleUpdating(false);
      }
    };

    if (Platform.OS === "web") {
      const confirmed = globalThis.confirm(
        `${user.email} will lose seller access. Continue?`,
      );
      if (!confirmed) return;
      runDemotion();
      return;
    }

    Alert.alert("Change role to customer?", `${user.email} will lose seller access.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Change Role",
        style: "destructive",
        onPress: runDemotion,
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Hero */}
      <LinearGradient
        colors={["#0f172a", "#1d4ed8", "#0ea5e9"]}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.heroGlowOne} />
        <View style={styles.heroGlowTwo} />
        <View style={styles.heroTopBar}>
          <View style={styles.heroPill}>
            <Ionicons name="people-outline" size={12} color="#fff" />
            <Text style={styles.heroPillText}>{users.length} users</Text>
          </View>
          <TouchableOpacity
            style={styles.broadcastBtn}
            onPress={() => setShowBroadcast(true)}
          >
            <Ionicons name="megaphone-outline" size={14} color="#fff" />
            <Text style={styles.broadcastBtnText}>Broadcast</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.heroTitle}>Customers</Text>
        <Text style={styles.heroSub}>Manage users and send notifications</Text>
        <View style={styles.heroStrip}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{customerCount}</Text>
            <Text style={styles.heroStatLab}>Customers</Text>
          </View>
          <View style={styles.heroStripDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{sellerCount}</Text>
            <Text style={styles.heroStatLab}>Sellers</Text>
          </View>
          <View style={styles.heroStripDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{users.length}</Text>
            <Text style={styles.heroStatLab}>Total</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.screenBody}>
        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons
            name="search-outline"
            size={16}
            color={colors.muted}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, email, phone…"
            placeholderTextColor={colors.muted}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={16} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterBlock}>
          <Text style={styles.filterTitle}>User Role</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContent}
          >
            {ROLE_FILTERS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.filterChip,
                  roleFilter === r && styles.filterChipActive,
                ]}
                onPress={() => setRoleFilter(r)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    roleFilter === r && styles.filterChipTextActive,
                  ]}
                >
                  {r === "all"
                    ? "All"
                    : r.charAt(0).toUpperCase() + r.slice(1) + "s"}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          key={`customers-${cardColumns}`}
          numColumns={cardColumns}
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <UserCard
                user={item}
                orderCount={userOrderMap[item.id]?.count || 0}
                totalSpend={userOrderMap[item.id]?.spend || 0}
                onPress={setSelectedUser}
              />
            </View>
          )}
          contentContainerStyle={{
            paddingHorizontal: H_PAD,
            paddingTop: 8,
            paddingBottom: 140,
          }}
          columnWrapperStyle={
            cardColumns > 1 ? { gap: 8, paddingHorizontal: H_PAD } : undefined
          }
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={colors.muted} />
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      </View>

      <CustomerModal
        user={selectedUser}
        orders={orders}
        onClose={() => setSelectedUser(null)}
        onPromoteToSeller={handlePromoteToSeller}
        onDemoteToCustomer={handleDemoteToCustomer}
        roleUpdating={roleUpdating}
      />

      <BroadcastModal
        visible={showBroadcast}
        onClose={() => setShowBroadcast(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  // Hero
  hero: {
    paddingHorizontal: H_PAD,
    paddingTop: 54,
    paddingBottom: 26,
    overflow: "hidden",
  },
  heroGlowOne: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -40,
    right: -30,
  },
  heroGlowTwo: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(14,165,233,0.25)",
    bottom: -28,
    left: -24,
  },
  screenBody: {
    flex: 1,
    marginTop: -12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.light,
    paddingTop: 12,
  },
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
  // Broadcast button in hero top bar
  broadcastBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  broadcastBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  // Search & filters
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: H_PAD,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.dark },
  filterBlock: { marginBottom: 6 },
  filterTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
    marginHorizontal: H_PAD,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  filterScroll: { marginBottom: 8 },
  filterContent: { paddingHorizontal: H_PAD, paddingVertical: 2 },
  filterChip: {
    paddingHorizontal: 14,
    height: 36,
    minWidth: 72,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#DDE3EC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  filterChipText: { fontSize: 12, color: colors.muted, fontWeight: "700" },
  filterChipTextActive: { color: "#fff" },
  // Cards
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E6EBF2",
    shadowColor: "#0f172a",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardKicker: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  cardName: { fontSize: 14, fontWeight: "700", color: colors.dark, flex: 1 },
  cardEmail: { fontSize: 12, color: colors.muted, marginTop: 2 },
  cardDate: { fontSize: 11, color: colors.muted, marginTop: 2 },
  roleChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  roleChipText: { fontSize: 10, fontWeight: "700" },
  cardOrderCount: { fontSize: 16, fontWeight: "800", color: colors.dark },
  cardOrderLabel: { fontSize: 10, color: colors.muted },
  cardSpend: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.success,
    marginTop: 2,
    backgroundColor: colors.success + "15",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: "hidden",
  },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { marginTop: 12, color: colors.muted, fontSize: 15 },
  // Customer Modal
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: "60%",
    maxHeight: "85%",
    overflow: "hidden",
  },
  modalHeader: { flexDirection: "row", alignItems: "center", padding: 20 },
  modalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalAvatarText: { color: "#fff", fontWeight: "800", fontSize: 20 },
  modalName: { fontSize: 17, fontWeight: "800", color: "#fff" },
  modalEmail: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  modalStats: { flexDirection: "row", gap: 8, marginBottom: 16 },
  modalStatBox: {
    flex: 1,
    backgroundColor: colors.light,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  modalStatVal: { fontSize: 16, fontWeight: "800", color: colors.dark },
  modalStatLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: { fontSize: 13, color: colors.muted },
  detailValue: { fontSize: 13, color: colors.dark, fontWeight: "500" },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  miniOrder: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  miniOrderNum: { fontSize: 13, fontWeight: "700", color: colors.dark },
  miniOrderDate: { fontSize: 11, color: colors.muted },
  miniOrderTotal: { fontSize: 13, fontWeight: "700", color: colors.dark },
  miniOrderStatus: { fontSize: 11, fontWeight: "600" },
  roleSwitchBlock: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#F8FAFC",
  },
  roleSwitchHint: {
    marginTop: -2,
    marginBottom: 10,
    color: colors.muted,
    fontSize: 12,
  },
  roleSwitchRow: {
    flexDirection: "row",
    gap: 8,
  },
  roleSwitchButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  roleSwitchButtonDanger: {
    backgroundColor: colors.danger,
  },
  roleSwitchButtonDisabled: {
    opacity: 0.65,
  },
  roleSwitchButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    textTransform: "capitalize",
  },
  // Broadcast Modal
  broadcastModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  broadcastHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  broadcastTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    color: colors.dark,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 14,
  },
  broadcastInput: {
    backgroundColor: colors.light,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: colors.dark,
    borderWidth: 1,
    borderColor: colors.border,
  },
  targetRow: { flexDirection: "row", gap: 8 },
  targetChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.light,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  targetChipActive: {
    backgroundColor: colors.primary + "15",
    borderColor: colors.primary,
  },
  targetChipText: { fontSize: 13, fontWeight: "600", color: colors.muted },
  targetChipTextActive: { color: colors.primary },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
  },
  sendBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
