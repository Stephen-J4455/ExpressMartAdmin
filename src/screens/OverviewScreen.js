import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-gifted-charts";
import { useAdmin } from "../context/AdminContext";
import { colors } from "../theme/colors";
import { StatusPill } from "../components/StatusPill";
import { StatCard } from "../components/StatCard";
import { useResponsive } from "../hooks/useResponsive";

const CARD_GAP = 12;
const H_PAD = 16;

const fmt = (n) =>
  `GH₵${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatSellerRating = (rating) => {
  if (rating === null || rating === undefined || rating === "") return "–";
  const parsedRating = Number(rating);
  return Number.isFinite(parsedRating) ? parsedRating.toFixed(1) : "–";
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const RevenueRow = ({ dot, label, value, valueColor, bold }) => (
  <View style={styles.revRow}>
    <View style={[styles.revDot, { backgroundColor: dot }]} />
    <Text
      style={[
        styles.revLabel,
        bold && { fontWeight: "800", color: colors.dark },
      ]}
    >
      {label}
    </Text>
    <Text
      style={[
        styles.revValue,
        { color: valueColor || colors.dark },
        bold && { fontWeight: "800" },
      ]}
    >
      {value}
    </Text>
  </View>
);

const SectionLabel = ({ title, count }) => (
  <View style={styles.sectionLabel}>
    <Text style={styles.sectionLabelText}>{title}</Text>
    {count !== undefined && (
      <View style={styles.sectionBadge}>
        <Text style={styles.sectionBadgeText}>{count}</Text>
      </View>
    )}
  </View>
);

const AreaTrendCard = ({ title, subtitle, data, color }) => {
  const chartWidth = Math.max(320, data.length * 70);
  return (
    <View style={styles.areaCard}>
      <View style={styles.areaHeader}>
        <Text style={styles.areaTitle}>{title}</Text>
        <Text style={styles.areaSub}>{subtitle}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <LineChart
          areaChart
          data={data}
          width={chartWidth}
          height={170}
          color={color}
          thickness={2}
          startFillColor={`${color}3A`}
          endFillColor={`${color}08`}
          initialSpacing={14}
          noOfSections={3}
          hideDataPoints={false}
          dataPointsColor={color}
          dataPointsRadius={3}
          xAxisColor="#E5E7EB"
          yAxisColor="transparent"
          yAxisTextStyle={{ color: colors.muted, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: colors.muted, fontSize: 10 }}
          rulesType="solid"
          rulesColor="#EEF2F7"
        />
      </ScrollView>
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

export const OverviewScreen = () => {
  const {
    metrics,
    sellers,
    orders,
    products,
    users,
    ads,
    loading,
    refresh,
    logout,
  } = useAdmin();
  const { gridColumns, cardColumns, getItemWidth, horizontalPadding, isWide } =
    useResponsive();
  const KPI_W = getItemWidth(gridColumns, horizontalPadding, CARD_GAP);
  const CHIP_W = getItemWidth(cardColumns, horizontalPadding, CARD_GAP);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const customers = users.filter(
    (u) => !u.role || u.role === "customer" || u.role === "user",
  );
  const activeOrders = orders.filter((o) =>
    ["processing", "packed", "shipped"].includes(
      o.status?.toLowerCase?.() || "",
    ),
  );
  const activeAds = (ads || []).filter((ad) => ad.is_active).length;
  const inactiveAds = (ads || []).filter((ad) => !ad.is_active).length;
  const spotlightSellers = sellers.slice(0, 4);
  const recentOrders = orders.slice(0, 5);
  const watchlist = products.filter((p) => p.status === "pending").slice(0, 5);
  const pendingModerations =
    (metrics.pendingProducts || 0) + (metrics.reviewQueue || 0);

  const keyMetricChartData = useMemo(
    () => [
      { value: Number(metrics.totalUsers || customers.length || 0), label: "Users" },
      { value: Number(metrics.vendors || 0), label: "Vendors" },
      { value: Number(metrics.platformEarningsToday || 0), label: "Today" },
      { value: Number(metrics.platformEarningsThisMonth || 0), label: "Month" },
      { value: Number(metrics.netPlatformRevenue || 0), label: "Net" },
    ],
    [metrics, customers.length],
  );

  const operationsChartData = useMemo(
    () => [
      { value: Number(activeOrders.length || 0), label: "Orders" },
      { value: Number(pendingModerations || 0), label: "Moderation" },
      { value: Number(activeAds || 0), label: "Ads On" },
      { value: Number(inactiveAds || 0), label: "Ads Off" },
      { value: Number(metrics.openTickets || 0), label: "Tickets" },
    ],
    [
      activeOrders.length,
      pendingModerations,
      activeAds,
      inactiveAds,
      metrics.openTickets,
    ],
  );
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={refresh}
          tintColor="#fff"
          colors={[colors.primary]}
        />
      }
    >
      {/* ── HERO ── */}
      <LinearGradient
        colors={["#1e40af", "#2563eb", "#3b82f6"]}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Top bar */}
        <View style={styles.heroTopBar}>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Text style={styles.heroDate}>{today}</Text>
          <View style={styles.heroIcons}>
            <TouchableOpacity onPress={refresh} style={styles.heroIconBtn}>
              <Ionicons name="sync-outline" size={20} color="#fff" />
            </TouchableOpacity>
            {logout && (
              <TouchableOpacity onPress={logout} style={styles.heroIconBtn}>
                <Ionicons name="log-out-outline" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Title */}
        <Text style={styles.heroTitle}>{"ExpressMart\nControl Centre"}</Text>
        <Text style={styles.heroSub}>Marketplace health at a glance</Text>

        {/* Stat strip */}
        <View style={styles.heroStrip}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>
              {fmt(metrics.netPlatformRevenue)}
            </Text>
            <Text style={styles.heroStatLab}>Net Profit</Text>
          </View>
          <View style={styles.heroStripDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>
              {customers.length || metrics.totalUsers || 0}
            </Text>
            <Text style={styles.heroStatLab}>Customers</Text>
          </View>
          <View style={styles.heroStripDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{metrics.vendors || 0}</Text>
            <Text style={styles.heroStatLab}>Vendors</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── KPI GRID ── */}
      <SectionLabel title="Key Metrics" />
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiStatCell, { width: KPI_W }]}>
          <StatCard
            label="Total Customers"
            value={customers.length || metrics.totalUsers || 0}
            hint="ExpressMart users"
            trend="+2.8%"
            tone="primary"
          />
        </View>
        <View style={[styles.kpiStatCell, { width: KPI_W }]}>
          <StatCard
            label="Active Vendors"
            value={metrics.vendors || 0}
            hint="Express-Store sellers"
            trend="+1.4%"
            tone="success"
          />
        </View>
        <View style={[styles.kpiStatCell, { width: KPI_W }]}>
          <StatCard
            label="Net Profit"
            value={fmt(metrics.netPlatformRevenue)}
            hint={`Today: ${fmt(metrics.platformEarningsToday)}`}
            trend="+3.6%"
            tone="info"
          />
        </View>
        <View style={[styles.kpiStatCell, { width: KPI_W }]}>
          <StatCard
            label="Active Products"
            value={
              metrics.activeProducts ||
              products.filter((p) => p.status === "active").length
            }
            hint="Currently listed"
            trend="+0.9%"
            tone="warning"
          />
        </View>
      </View>
      <AreaTrendCard
        title="Key Metrics Trend"
        subtitle="Users, vendors and earnings health"
        data={keyMetricChartData}
        color={colors.primary}
      />

      {/* ── REVENUE CARD ── */}
      <SectionLabel title="Platform Revenue" />
      <View style={styles.card}>
        {/* Gross headline */}
        <Text style={styles.cardOverline}>GROSS REVENUE</Text>
        <Text style={styles.cardHeadline}>{fmt(metrics.totalRevenue)}</Text>

        {/* Period pills */}
        <View style={styles.pillRow}>
          <View style={styles.pill}>
            <Text style={styles.pillLabel}>Today </Text>
            <Text style={styles.pillVal}>
              {fmt(metrics.platformEarningsToday)}
            </Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillLabel}>This Month </Text>
            <Text style={styles.pillVal}>
              {fmt(metrics.platformEarningsThisMonth)}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Revenue breakdown rows */}
        <RevenueRow
          dot="#3b82f6"
          label="Service Fees (all-time)"
          value={fmt(metrics.totalServiceFees)}
        />
        <RevenueRow
          dot="#06b6d4"
          label="Today"
          value={fmt(metrics.serviceFeeToday)}
        />
        <RevenueRow
          dot="#06b6d4"
          label="This Month"
          value={fmt(metrics.serviceFeeThisMonth)}
        />
        <RevenueRow
          dot="#10b981"
          label="Commission (all-time)"
          value={fmt(metrics.totalCommissions)}
        />
        <RevenueRow
          dot="#10b981"
          label="Commission Today"
          value={fmt(metrics.commissionToday)}
        />
        <RevenueRow
          dot="#10b981"
          label="Commission This Month"
          value={fmt(metrics.commissionThisMonth)}
        />
        <RevenueRow
          dot="#f59e0b"
          label="Paystack Fees (deducted)"
          value={`−${fmt(metrics.totalPaystackFees)}`}
          valueColor={colors.warning}
        />

        <View style={styles.cardDivider} />

        {/* Net highlight */}
        <View style={styles.netBox}>
          <Text style={styles.netLabel}>Net Platform Revenue</Text>
          <Text style={styles.netValue}>{fmt(metrics.netPlatformRevenue)}</Text>
        </View>
      </View>

      {/* ── OPS GRID ── */}
      <SectionLabel title="Operations" />
      <AreaTrendCard
        title="Operations Trend"
        subtitle="Activity and queue load overview"
        data={operationsChartData}
        color={colors.success}
      />
      {isWide ? (
        <View style={styles.opsGridWrap}>
          {[
            {
              icon: "bicycle-outline",
              color: colors.success,
              label: "Active Orders",
              value: activeOrders.length,
            },
            {
              icon: "time-outline",
              color: colors.warning,
              label: "Pending Moderations",
              value: pendingModerations,
            },
            {
              icon: "megaphone-outline",
              color: colors.primary,
              label: "Active Ads",
              value: activeAds,
            },
            {
              icon: "megaphone-outline",
              color: colors.muted,
              label: "Inactive Ads",
              value: inactiveAds,
            },
            {
              icon: "cash-outline",
              color: "#06b6d4",
              label: "Total Service Fees",
              value: fmt(metrics.totalServiceFees),
            },
            {
              icon: "chatbubble-ellipses-outline",
              color: colors.danger,
              label: "Open Tickets",
              value: metrics.openTickets || 0,
            },
          ].map((item) => (
            <View
              key={item.label}
              style={[styles.opsTile, { flex: 1, minWidth: 120 }]}
            >
              <View
                style={[
                  styles.opsIconWrap,
                  { backgroundColor: item.color + "20" },
                ]}
              >
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={styles.opsTileVal}>{item.value}</Text>
              <Text style={styles.opsTileLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.opsRow}
        >
          {[
            {
              icon: "bicycle-outline",
              color: colors.success,
              label: "Active Orders",
              value: activeOrders.length,
            },
            {
              icon: "time-outline",
              color: colors.warning,
              label: "Pending Moderations",
              value: pendingModerations,
            },
            {
              icon: "megaphone-outline",
              color: colors.primary,
              label: "Active Ads",
              value: activeAds,
            },
            {
              icon: "megaphone-outline",
              color: colors.muted,
              label: "Inactive Ads",
              value: inactiveAds,
            },
            {
              icon: "cash-outline",
              color: "#06b6d4",
              label: "Total Service Fees",
              value: fmt(metrics.totalServiceFees),
            },
            {
              icon: "chatbubble-ellipses-outline",
              color: colors.danger,
              label: "Open Tickets",
              value: metrics.openTickets || 0,
            },
          ].map((item) => (
            <View key={item.label} style={styles.opsTile}>
              <View
                style={[
                  styles.opsIconWrap,
                  { backgroundColor: item.color + "20" },
                ]}
              >
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={styles.opsTileVal}>{item.value}</Text>
              <Text style={styles.opsTileLabel}>{item.label}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── TOP SELLERS ── */}
      <SectionLabel title="Top Sellers" count={spotlightSellers.length} />
      <View style={styles.sellersWrap}>
        {spotlightSellers.map((seller) => {
          const initials = (seller.name || "?")
            .split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
          return (
            <View
              key={seller.id}
              style={[styles.sellerChip, { width: CHIP_W }]}
            >
              <View style={styles.sellerAvatar}>
                <Text style={styles.sellerInitials}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sellerName} numberOfLines={1}>
                  {seller.name}
                </Text>
                {seller.location ? (
                  <Text style={styles.sellerMeta} numberOfLines={1}>
                    <Ionicons
                      name="location-outline"
                      size={11}
                      color={colors.muted}
                    />{" "}
                    {seller.location}
                  </Text>
                ) : null}
              </View>
              <View style={styles.sellerRating}>
                <Ionicons name="star" size={12} color="#f59e0b" />
                <Text style={styles.sellerRatingText}>
                  {formatSellerRating(seller.rating)}
                </Text>
              </View>
            </View>
          );
        })}
        {!spotlightSellers.length && (
          <Text style={styles.emptyText}>No sellers found.</Text>
        )}
      </View>

      {/* ── RECENT ORDERS ── */}
      <SectionLabel title="Recent Orders" count={recentOrders.length} />
      <View style={styles.card}>
        {recentOrders.map((order, i) => (
          <View
            key={order.id}
            style={[styles.orderRow, i > 0 && styles.orderRowBorder]}
          >
            <View style={styles.orderIconBox}>
              <Ionicons name="receipt-outline" size={18} color={colors.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderNum}>
                #{order.order_number || order.id?.slice(0, 8)}
              </Text>
              <Text style={styles.orderVendor}>
                {order.vendor || "Unknown vendor"}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Text style={styles.orderAmt}>
                GH₵{Number(order.total || 0).toLocaleString()}
              </Text>
              <StatusPill value={order.status} />
            </View>
          </View>
        ))}
        {!recentOrders.length && (
          <Text style={styles.emptyText}>No recent orders.</Text>
        )}
      </View>

      {/* ── PENDING REVIEW ── */}
      <SectionLabel title="Pending Review" count={watchlist.length} />
      <View style={styles.card}>
        {watchlist.map((item, i) => (
          <View
            key={item.id}
            style={[styles.watchRow, i > 0 && styles.orderRowBorder]}
          >
            <View style={styles.watchIconBox}>
              <Ionicons name="time-outline" size={18} color={colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderNum} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.orderVendor}>
                {item.vendor || "External Vendor"}
              </Text>
            </View>
            <Text style={styles.watchPrice}>
              GH₵{Number(item.price || 0).toFixed(2)}
            </Text>
          </View>
        ))}
        {!watchlist.length && (
          <View style={styles.allClear}>
            <Ionicons
              name="checkmark-circle"
              size={44}
              color={colors.success}
            />
            <Text style={styles.allClearText}>
              All items cleared — great work!
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F0F4F8" },
  content: {
    paddingHorizontal: H_PAD,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 120,
    gap: 0,
  },

  // Hero
  hero: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 24,
    shadowColor: "#1e40af",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  heroTopBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#4ade80",
  },
  liveText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  heroDate: {
    flex: 1,
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  heroIcons: { flexDirection: "row", gap: 8 },
  heroIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -1,
    lineHeight: 36,
    marginBottom: 6,
  },
  heroSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 24,
  },
  heroStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatVal: { color: "#fff", fontSize: 16, fontWeight: "900" },
  heroStatLab: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  heroStripDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 2,
  },

  // Section label
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 20,
    gap: 8,
  },
  sectionLabelText: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.dark,
    letterSpacing: -0.3,
  },
  sectionBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sectionBadgeText: { color: colors.primary, fontSize: 11, fontWeight: "800" },

  // KPI cards
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
    marginBottom: 4,
  },
  kpiStatCell: {
    maxWidth: "100%",
  },
  areaCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  areaHeader: { marginBottom: 10 },
  areaTitle: { fontSize: 14, fontWeight: "800", color: colors.dark },
  areaSub: { fontSize: 11, color: colors.muted, marginTop: 2 },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardOverline: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  cardHeadline: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.dark,
    letterSpacing: -1,
    marginTop: 4,
    marginBottom: 12,
  },
  deleteModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  deleteModalCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
  },
  deleteModalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.dark,
    marginBottom: 8,
  },
  deleteModalText: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 12,
  },
  deleteModalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.dark,
  },
  deleteModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
  },
  deleteModalCancel: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  deleteModalCancelText: {
    color: colors.muted,
    fontWeight: "600",
  },
  deleteModalDelete: {
    backgroundColor: colors.danger,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 88,
    alignItems: "center",
  },
  deleteModalDeleteText: {
    color: "#fff",
    fontWeight: "700",
  },
  pillRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillLabel: { fontSize: 11, color: colors.primary, fontWeight: "600" },
  pillVal: { fontSize: 12, color: colors.primary, fontWeight: "800" },
  cardDivider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 12 },

  // Revenue rows
  revRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    gap: 8,
  },
  revDot: { width: 8, height: 8, borderRadius: 4 },
  revLabel: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.muted },
  revValue: { fontSize: 13, fontWeight: "700" },
  netBox: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  netLabel: { fontSize: 14, fontWeight: "800", color: colors.dark },
  netValue: { fontSize: 18, fontWeight: "900", color: colors.success },

  // Ops
  opsRow: { paddingBottom: 6, gap: CARD_GAP, paddingRight: H_PAD },
  opsGridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
    marginBottom: 4,
  },
  opsTile: {
    width: 120,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  opsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  opsTileVal: { fontSize: 22, fontWeight: "900", color: colors.dark },
  opsTileLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
    textAlign: "center",
  },

  // Sellers
  sellersWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
    marginBottom: 4,
  },
  sellerChip: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  sellerInitials: { fontSize: 14, fontWeight: "900", color: colors.primary },
  sellerName: { fontSize: 13, fontWeight: "800", color: colors.dark },
  sellerMeta: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "500",
    marginTop: 2,
  },
  sellerRating: { flexDirection: "row", alignItems: "center", gap: 2 },
  sellerRatingText: { fontSize: 12, fontWeight: "800", color: colors.dark },

  // Orders
  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  orderRowBorder: { borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  orderIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  orderNum: { fontSize: 13, fontWeight: "800", color: colors.dark },
  orderVendor: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "500",
    marginTop: 2,
  },
  orderAmt: { fontSize: 13, fontWeight: "800", color: colors.dark },

  // Watch
  watchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  watchIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#FFFBEB",
    alignItems: "center",
    justifyContent: "center",
  },
  watchPrice: { fontSize: 13, fontWeight: "800", color: colors.primary },
  allClear: { alignItems: "center", paddingVertical: 24, gap: 8 },
  allClearText: { color: colors.success, fontWeight: "700", fontSize: 14 },

  emptyText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 20,
  },
});
