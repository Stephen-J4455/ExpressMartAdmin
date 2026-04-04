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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAdmin } from "../context/AdminContext";
import { useToast } from "../context/ToastContext";
import { colors } from "../theme/colors";
import { StatusPill } from "../components/StatusPill";
import { useResponsive } from "../hooks/useResponsive";

const H_PAD = 16;

const fmt = (n) =>
  `GH₵${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatCustomer = (c) => {
  if (!c) return "";
  if (typeof c === "string") return c;
  if (typeof c === "object") {
    return c.name || c.full_name || c.email || c.phone || JSON.stringify(c);
  }
  return String(c);
};

const STATUS_OPTIONS = [
  "all",
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
];

const STATUS_COLORS = {
  pending: colors.warning,
  confirmed: colors.info,
  processing: colors.primary,
  packed: "#8B5CF6",
  shipped: "#06B6D4",
  delivered: colors.success,
  cancelled: colors.danger,
};

// ─── Order Detail Modal ───────────────────────────────────────────────────────
const OrderDetailModal = ({ order, sellers, onClose, onUpdateStatus }) => {
  const [updating, setUpdating] = useState(false);
  const sellerName =
    sellers.find((s) => s.id === order?.seller_id)?.name ||
    order?.vendor ||
    "Unknown";

  const NEXT_STATUS = {
    pending: "confirmed",
    confirmed: "processing",
    processing: "packed",
    packed: "shipped",
    shipped: "delivered",
  };

  const handleAdvance = async () => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setUpdating(true);
    await onUpdateStatus(order.id, next);
    setUpdating(false);
    onClose();
  };

  if (!order) return null;

  const nextStatus = NEXT_STATUS[order.status];
  const statusColor = STATUS_COLORS[order.status] || colors.muted;

  return (
    <Modal
      visible={!!order}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.detailModal}>
          {/* Header */}
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            style={styles.detailHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.detailOrderNum}>
                Order #{order.order_number}
              </Text>
              <Text style={styles.detailDate}>{fmtDate(order.created_at)}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView
            style={styles.detailBody}
            showsVerticalScrollIndicator={false}
          >
            {/* Status Row */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusColor + "20" },
                ]}
              >
                <View
                  style={[styles.statusDot, { backgroundColor: statusColor }]}
                />
                <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                  {order.status?.charAt(0).toUpperCase() +
                    order.status?.slice(1)}
                </Text>
              </View>
            </View>

            {/* Seller */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Seller</Text>
              <Text style={styles.detailValue}>{sellerName}</Text>
            </View>

            {/* Customer */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Customer</Text>
              <Text style={styles.detailValue}>
                {formatCustomer(order.customer) || "—"}
              </Text>
            </View>

            {/* Amounts */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Payment</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total</Text>
                <Text
                  style={[
                    styles.detailValue,
                    { fontWeight: "700", color: colors.dark },
                  ]}
                >
                  {fmt(order.total)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Service Fee</Text>
                <Text style={styles.detailValue}>{fmt(order.service_fee)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Status</Text>
                <Text
                  style={[
                    styles.detailValue,
                    {
                      color:
                        order.payment_status === "success"
                          ? colors.success
                          : colors.warning,
                    },
                  ]}
                >
                  {order.payment_status || "pending"}
                </Text>
              </View>
              {order.paid_at && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Paid At</Text>
                  <Text style={styles.detailValue}>
                    {fmtDate(order.paid_at)}
                  </Text>
                </View>
              )}
            </View>

            {/* Timeline */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Timeline</Text>
              {[
                { label: "Ordered", value: order.created_at },
                { label: "Updated", value: order.updated_at },
                { label: "Shipped", value: order.shipped_at },
                { label: "Delivered", value: order.delivered_at },
              ].map((row) =>
                row.value ? (
                  <View key={row.label} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{row.label}</Text>
                    <Text style={styles.detailValue}>{fmtDate(row.value)}</Text>
                  </View>
                ) : null,
              )}
            </View>
          </ScrollView>

          {/* Advance Status Button */}
          {nextStatus && order.payment_status === "success" && (
            <View style={styles.detailFooter}>
              <TouchableOpacity
                style={[styles.advanceBtn, updating && { opacity: 0.6 }]}
                onPress={handleAdvance}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name="arrow-forward-circle-outline"
                      size={18}
                      color="#fff"
                    />
                    <Text style={styles.advanceBtnText}>
                      Mark as{" "}
                      {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ─── Order Card ───────────────────────────────────────────────────────────────
const OrderCard = ({ order, sellers, onPress }) => {
  const statusColor = STATUS_COLORS[order.status] || colors.muted;
  return (
    <Pressable style={styles.card} onPress={() => onPress(order)}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardKicker}>Order</Text>
          <Text style={styles.cardOrderNum}>#{order.order_number}</Text>
          <Text style={styles.cardVendor} numberOfLines={1}>
            {sellers.find((s) => s.id === order.seller_id)?.name ||
              order.vendor ||
              "Unknown"}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.cardTotal}>{fmt(order.total)}</Text>
          <Text style={styles.cardDate}>{fmtDate(order.created_at)}</Text>
        </View>
      </View>
      <View style={styles.cardBottom}>
        <View
          style={[styles.statusChip, { backgroundColor: statusColor + "18" }]}
        >
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusChipText, { color: statusColor }]}>
            {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
          </Text>
        </View>
        <Text
          style={[
            styles.paymentTag,
            {
              backgroundColor:
                order.payment_status === "success"
                  ? colors.success + "15"
                  : colors.warning + "12",
              color:
                order.payment_status === "success"
                  ? colors.success
                  : colors.warning,
            },
          ]}
        >
          {order.payment_status === "success" ? "Paid" : "Unpaid"}
        </Text>
      </View>
    </Pressable>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
export const OrdersScreen = () => {
  const { orders, sellers, loading, refresh, updateOrderStatus, metrics } =
    useAdmin();
  const toast = useToast();
  const { cardColumns } = useResponsive();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const filtered = useMemo(() => {
    let list = orders;
    if (statusFilter !== "all")
      list = list.filter((o) => o.status === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((o) => {
        const cust = formatCustomer(o.customer).toLowerCase();
        return (
          String(o.order_number).toLowerCase().includes(q) ||
          (cust || "").includes(q) ||
          (String(o.vendor || "").toLowerCase() || "").includes(q)
        );
      });
    }
    return list;
  }, [orders, statusFilter, query]);

  const handleUpdateStatus = async (orderId, status) => {
    await updateOrderStatus(orderId, status);
    toast.success("Status Updated", `Order marked as ${status}`);
  };

  // Summary stats
  const totalRevenue = orders
    .filter((o) => o.payment_status === "success")
    .reduce((s, o) => s + Number(o.total || 0), 0);

  const stats = [
    {
      label: "Total Orders",
      value: orders.length,
      color: colors.primary,
      icon: "receipt-outline",
    },
    {
      label: "Pending",
      value: metrics?.pendingOrders ?? 0,
      color: colors.warning,
      icon: "time-outline",
    },
    {
      label: "Delivered",
      value: metrics?.completedOrders ?? 0,
      color: colors.success,
      icon: "checkmark-circle-outline",
    },
    {
      label: "Revenue",
      value: fmt(totalRevenue),
      color: colors.info,
      icon: "cash-outline",
    },
  ];

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
            <Ionicons name="receipt-outline" size={12} color="#fff" />
            <Text style={styles.heroPillText}>{orders.length} orders</Text>
          </View>
          <TouchableOpacity onPress={refresh} style={styles.heroIconBtn}>
            <Ionicons name="sync-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.heroTitle}>Orders</Text>
        <Text style={styles.heroSub}>Track and manage customer orders</Text>
        <View style={styles.heroStrip}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>
              {metrics?.pendingOrders ?? 0}
            </Text>
            <Text style={styles.heroStatLab}>Pending</Text>
          </View>
          <View style={styles.heroStripDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>
              {
                orders.filter((o) =>
                  ["processing", "packed", "shipped"].includes(o.status),
                ).length
              }
            </Text>
            <Text style={styles.heroStatLab}>Active</Text>
          </View>
          <View style={styles.heroStripDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>
              {metrics?.completedOrders ?? 0}
            </Text>
            <Text style={styles.heroStatLab}>Delivered</Text>
          </View>
          <View style={styles.heroStripDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{fmt(totalRevenue)}</Text>
            <Text style={styles.heroStatLab}>Revenue</Text>
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
            placeholder="Search orders, customers…"
            placeholderTextColor={colors.muted}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={16} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterBlock}>
          <Text style={styles.filterTitle}>Order Status</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContent}
          >
            {STATUS_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.filterChip,
                  statusFilter === s && styles.filterChipActive,
                ]}
                onPress={() => setStatusFilter(s)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === s && styles.filterChipTextActive,
                  ]}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          key={`orders-${cardColumns}`}
          numColumns={cardColumns}
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <OrderCard
                order={item}
                sellers={sellers}
                onPress={setSelectedOrder}
              />
            </View>
          )}
          contentContainerStyle={{
            paddingHorizontal: H_PAD,
            paddingTop: 8,
            paddingBottom: 140,
          }}
          columnWrapperStyle={
            cardColumns > 1 ? { gap: 10, paddingHorizontal: H_PAD } : undefined
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
              <Ionicons name="receipt-outline" size={48} color={colors.muted} />
              <Text style={styles.emptyText}>No orders found</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      </View>

      <OrderDetailModal
        order={selectedOrder}
        sellers={sellers}
        onClose={() => setSelectedOrder(null)}
        onUpdateStatus={handleUpdateStatus}
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
  heroIconBtn: { padding: 6 },
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
  heroStatVal: { fontSize: 16, fontWeight: "900", color: "#fff" },
  heroStatLab: { fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  heroStripDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
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
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardKicker: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardOrderNum: { fontSize: 15, fontWeight: "800", color: colors.dark },
  cardVendor: { fontSize: 12, color: colors.muted, marginTop: 2 },
  cardTotal: { fontSize: 15, fontWeight: "700", color: colors.dark },
  cardDate: { fontSize: 11, color: colors.muted, marginTop: 2 },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusChipText: { fontSize: 11, fontWeight: "700" },
  paymentTag: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    overflow: "hidden",
  },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { marginTop: 12, color: colors.muted, fontSize: 15 },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  detailModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    overflow: "hidden",
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  detailOrderNum: { fontSize: 18, fontWeight: "800", color: "#fff" },
  detailDate: { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  closeBtn: { padding: 4 },
  detailBody: { paddingHorizontal: 20 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: { fontSize: 13, color: colors.muted },
  detailValue: { fontSize: 13, color: colors.dark, fontWeight: "500" },
  detailSection: { marginTop: 16 },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: { fontSize: 12, fontWeight: "700" },
  detailFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  advanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  advanceBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
