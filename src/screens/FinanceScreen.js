import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
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

const PAYOUT_STATUS = ["all", "pending", "completed", "rejected"];
const PAYOUT_STATUS_COLORS = {
  pending: colors.warning,
  completed: colors.success,
  rejected: colors.danger,
};

// ─── Payout Detail Modal ──────────────────────────────────────────────────────
const PayoutModal = ({ payout, sellers, onClose, onProcess }) => {
  const [processing, setProcessing] = useState(false);
  const [txRef, setTxRef] = useState("");

  if (!payout) return null;
  const seller = sellers.find((s) => s.id === payout.seller_id);

  const handleAction = async (action) => {
    setProcessing(true);
    await onProcess(payout.id, action, action === "completed" ? txRef : null);
    setProcessing(false);
    onClose();
  };

  const statusColor = PAYOUT_STATUS_COLORS[payout.status] || colors.muted;

  return (
    <Modal
      visible={!!payout}
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
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Payout Request</Text>
              <Text style={styles.modalSub}>
                {seller?.name || "Unknown Seller"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <View style={[styles.amountCard, { borderColor: statusColor }]}>
              <Text style={styles.amountLabel}>Amount Requested</Text>
              <Text style={[styles.amountValue, { color: statusColor }]}>
                {fmt(payout.amount)}
              </Text>
              <View
                style={[
                  styles.statusChip,
                  { backgroundColor: statusColor + "20" },
                ]}
              >
                <View
                  style={[styles.statusDot, { backgroundColor: statusColor }]}
                />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {payout.status?.charAt(0).toUpperCase() +
                    payout.status?.slice(1)}
                </Text>
              </View>
            </View>

            {[
              { label: "Seller Email", value: seller?.email },
              { label: "Seller Phone", value: seller?.phone },
              { label: "Requested", value: fmtDate(payout.created_at) },
              { label: "Processed", value: fmtDate(payout.processed_at) },
              { label: "Transaction Ref", value: payout.transaction_reference },
              { label: "Payout ID", value: payout.id?.slice(0, 16) + "…" },
            ].map((row) =>
              row.value ? (
                <View key={row.label} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{row.label}</Text>
                  <Text style={styles.detailValue}>{row.value}</Text>
                </View>
              ) : null,
            )}

            {payout.status === "pending" && (
              <>
                <Text style={styles.fieldLabel}>
                  Transaction Reference (optional)
                </Text>
                <TextInput
                  style={styles.refInput}
                  value={txRef}
                  onChangeText={setTxRef}
                  placeholder="Paystack transfer reference…"
                  placeholderTextColor={colors.muted}
                />
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      { flex: 1, backgroundColor: colors.success },
                      processing && { opacity: 0.6 },
                    ]}
                    onPress={() => handleAction("completed")}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={16}
                          color="#fff"
                        />
                        <Text style={styles.actionBtnText}>Approve</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      { flex: 1, backgroundColor: colors.danger },
                      processing && { opacity: 0.6 },
                    ]}
                    onPress={() => handleAction("rejected")}
                    disabled={processing}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={16}
                      color="#fff"
                    />
                    <Text style={styles.actionBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Payout Card ──────────────────────────────────────────────────────────────
const PayoutCard = ({ payout, seller, onPress }) => {
  const statusColor = PAYOUT_STATUS_COLORS[payout.status] || colors.muted;
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(payout)}>
      <View style={styles.cardRow}>
        <View
          style={[styles.payoutIcon, { backgroundColor: statusColor + "20" }]}
        >
          <Ionicons
            name={
              payout.status === "completed"
                ? "checkmark-circle"
                : payout.status === "rejected"
                  ? "close-circle"
                  : "time"
            }
            size={22}
            color={statusColor}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>
            {seller?.name || "Unknown Seller"}
          </Text>
          <Text style={styles.cardDate}>{fmtDate(payout.created_at)}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.cardAmount, { color: statusColor }]}>
            {fmt(payout.amount)}
          </Text>
          <View
            style={[styles.statusChip, { backgroundColor: statusColor + "18" }]}
          >
            <View
              style={[styles.statusDot, { backgroundColor: statusColor }]}
            />
            <Text
              style={[styles.statusText, { color: statusColor, fontSize: 10 }]}
            >
              {payout.status?.charAt(0).toUpperCase() + payout.status?.slice(1)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
export const FinanceScreen = () => {
  const {
    payouts,
    sellers,
    transactionPayments,
    orders,
    metrics,
    loading,
    refresh,
    processPayout,
  } = useAdmin();
  const toast = useToast();
  const { cardColumns } = useResponsive();

  const [activeTab, setActiveTab] = useState("payouts"); // payouts | analytics
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPayout, setSelectedPayout] = useState(null);

  const filteredPayouts = useMemo(() => {
    if (statusFilter === "all") return payouts;
    return payouts.filter((p) => p.status === statusFilter);
  }, [payouts, statusFilter]);

  const pendingPayouts = payouts.filter((p) => p.status === "pending");
  const pendingTotal = pendingPayouts.reduce(
    (s, p) => s + Number(p.amount || 0),
    0,
  );
  const completedTotal = payouts
    .filter((p) => p.status === "completed")
    .reduce((s, p) => s + Number(p.amount || 0), 0);

  const handleProcess = async (id, status, ref) => {
    await processPayout(id, status, ref);
    toast.success(
      status === "completed" ? "Payout Approved" : "Payout Rejected",
      status === "completed"
        ? "Payout marked as completed"
        : "Payout has been rejected",
    );
  };

  // Analytics data derived from transactionPayments & metrics
  const analRows = [
    {
      label: "Total Order Revenue",
      value: fmt(
        orders
          .filter((o) => o.payment_status === "success")
          .reduce((s, o) => s + Number(o.total || 0), 0),
      ),
      icon: "cash-outline",
      color: colors.dark,
    },
    {
      label: "Service Fees Collected",
      value: fmt(metrics?.totalServiceFees),
      icon: "receipt-outline",
      color: colors.primary,
    },
    {
      label: "Platform Commission",
      value: fmt(metrics?.totalCommissions),
      icon: "trending-up-outline",
      color: colors.info,
    },
    {
      label: "Paystack Processing Fees",
      value: fmt(metrics?.totalPaystackFees),
      icon: "card-outline",
      color: colors.warning,
    },
    {
      label: "Net Platform Revenue",
      value: fmt(metrics?.netPlatformRevenue),
      icon: "wallet-outline",
      color: colors.success,
    },
    {
      label: "Total Paid Out",
      value: fmt(completedTotal),
      icon: "arrow-up-circle-outline",
      color: colors.danger,
    },
    {
      label: "Pending Payouts",
      value: fmt(pendingTotal),
      icon: "hourglass-outline",
      color: colors.warning,
    },
  ];

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
            <Ionicons name="wallet-outline" size={12} color="#fff" />
            <Text style={styles.heroPillText}>Finance</Text>
          </View>
          {pendingPayouts.length > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>
                {pendingPayouts.length} pending
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.heroTitle}>Finance</Text>
        <Text style={styles.heroSub}>Payouts, revenue and analytics</Text>
        <View style={styles.heroStrip}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{pendingPayouts.length}</Text>
            <Text style={styles.heroStatLab}>Pending Payouts</Text>
          </View>
          <View style={styles.heroStripDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{fmt(pendingTotal)}</Text>
            <Text style={styles.heroStatLab}>Awaiting</Text>
          </View>
          <View style={styles.heroStripDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>
              {fmt(metrics?.netPlatformRevenue)}
            </Text>
            <Text style={styles.heroStatLab}>Net Revenue</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {[
          { id: "payouts", label: "Payouts", icon: "arrow-up-circle-outline" },
          { id: "analytics", label: "Analytics", icon: "bar-chart-outline" },
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
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "payouts" && (
        <>
          {/* Status Filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={{ paddingHorizontal: H_PAD }}
          >
            {PAYOUT_STATUS.map((s) => (
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

          <FlatList
            data={filteredPayouts}
            keyExtractor={(item) => item.id}
            key={`payouts-${cardColumns}`}
            numColumns={cardColumns}
            renderItem={({ item }) => (
              <View style={{ flex: 1 }}>
                <PayoutCard
                  payout={item}
                  seller={sellers.find((s) => s.id === item.seller_id)}
                  onPress={setSelectedPayout}
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
                <Ionicons
                  name="wallet-outline"
                  size={48}
                  color={colors.muted}
                />
                <Text style={styles.emptyText}>No payout requests</Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        </>
      )}

      {activeTab === "analytics" && (
        <ScrollView
          contentContainerStyle={{ padding: H_PAD, paddingBottom: 140 }}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* Period Performance */}
          <View style={styles.periodCard}>
            <Text style={styles.periodTitle}>Today</Text>
            <View style={styles.periodRow}>
              <View style={styles.periodStat}>
                <Text style={styles.periodVal}>
                  {fmt(metrics?.platformEarningsToday)}
                </Text>
                <Text style={styles.periodLabel}>Platform Earnings</Text>
              </View>
              <View style={styles.periodStat}>
                <Text style={styles.periodVal}>
                  {fmt(metrics?.serviceFeeToday)}
                </Text>
                <Text style={styles.periodLabel}>Service Fees</Text>
              </View>
            </View>
          </View>

          <View style={[styles.periodCard, { marginTop: 12 }]}>
            <Text style={styles.periodTitle}>This Month</Text>
            <View style={styles.periodRow}>
              <View style={styles.periodStat}>
                <Text style={styles.periodVal}>
                  {fmt(metrics?.platformEarningsThisMonth)}
                </Text>
                <Text style={styles.periodLabel}>Platform Earnings</Text>
              </View>
              <View style={styles.periodStat}>
                <Text style={styles.periodVal}>
                  {fmt(metrics?.commissionThisMonth)}
                </Text>
                <Text style={styles.periodLabel}>Commission</Text>
              </View>
            </View>
          </View>

          {/* All-time breakdown */}
          <Text
            style={[styles.periodTitle, { marginTop: 20, marginBottom: 8 }]}
          >
            All-Time Breakdown
          </Text>
          {analRows.map((row) => (
            <View key={row.label} style={styles.analRow}>
              <View
                style={[styles.analIcon, { backgroundColor: row.color + "18" }]}
              >
                <Ionicons name={row.icon} size={18} color={row.color} />
              </View>
              <Text style={styles.analLabel}>{row.label}</Text>
              <Text style={[styles.analValue, { color: row.color }]}>
                {row.value}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      <PayoutModal
        payout={selectedPayout}
        sellers={sellers}
        onClose={() => setSelectedPayout(null)}
        onProcess={handleProcess}
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
  heroStatVal: { fontSize: 15, fontWeight: "900", color: "#fff" },
  heroStatLab: { fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  heroStripDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  pendingBadge: {
    backgroundColor: "rgba(245,158,11,0.85)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 6,
    marginHorizontal: H_PAD,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabActive: { backgroundColor: colors.primary + "10" },
  tabText: { fontSize: 14, fontWeight: "600", color: colors.muted },
  tabTextActive: { color: colors.primary, fontWeight: "700" },
  filterScroll: { marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 16,
    height: 36,
    minWidth: 64,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
    elevation: 2,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  payoutIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  cardName: { fontSize: 14, fontWeight: "700", color: colors.dark },
  cardDate: { fontSize: 11, color: colors.muted, marginTop: 2 },
  cardAmount: { fontSize: 16, fontWeight: "800" },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { marginTop: 12, color: colors.muted, fontSize: 15 },
  // Payout Modal
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    overflow: "hidden",
  },
  modalHeader: { flexDirection: "row", alignItems: "center", padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  modalSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  amountCard: {
    alignItems: "center",
    padding: 20,
    borderWidth: 1.5,
    borderRadius: 16,
    marginBottom: 16,
  },
  amountLabel: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  amountValue: { fontSize: 32, fontWeight: "800", marginVertical: 4 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: { fontSize: 13, color: colors.muted },
  detailValue: { fontSize: 13, color: colors.dark, fontWeight: "500" },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 6,
  },
  refInput: {
    backgroundColor: colors.light,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: colors.dark,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 13,
  },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  // Analytics
  periodCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  periodTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  periodRow: { flexDirection: "row", gap: 16 },
  periodStat: { flex: 1 },
  periodVal: { fontSize: 18, fontWeight: "800", color: colors.dark },
  periodLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
  analRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  analIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  analLabel: { flex: 1, fontSize: 13, color: colors.dark, fontWeight: "500" },
  analValue: { fontSize: 14, fontWeight: "800" },
});
