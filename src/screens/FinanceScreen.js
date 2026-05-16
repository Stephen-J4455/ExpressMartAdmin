import { useEffect, useMemo, useRef, useState } from "react";
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
import { LineChart } from "react-native-gifted-charts";
import Svg, { Circle, Path } from "react-native-svg";
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

const polarToCartesian = (cx, cy, r, angleDeg) => {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
};

const describeArcSegment = (cx, cy, r, startAngle, endAngle) => {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
};

const TrendLineAreaChart = ({ title, subtitle, data, color = colors.primary }) => {
  const chartData = data.map((item) => ({ value: item.value, label: item.label }));
  const chartWidth = Math.max(320, data.length * 52);
  const scrollRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [chartWidth, data]);

  return (
    <View style={[styles.chartCard, { marginTop: 12 }]}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>{title}</Text>
        <Text style={styles.chartSub}>{subtitle}</Text>
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 8 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        <LineChart
          areaChart
          data={chartData}
          width={chartWidth}
          height={160}
          color={color}
          thickness={2}
          startFillColor={`${color}44`}
          endFillColor={`${color}08`}
          initialSpacing={12}
          noOfSections={3}
          hideDataPoints={false}
          dataPointsColor={color}
          dataPointsRadius={3}
          xAxisColor="#E5E7EB"
          yAxisColor="transparent"
          yAxisTextStyle={{ color: colors.muted, fontSize: 9 }}
          xAxisLabelTextStyle={{ color: colors.muted, fontSize: 9 }}
          rulesType="solid"
          rulesColor="#EEF2F7"
          isAnimated
          animationDuration={700}
        />
      </ScrollView>
    </View>
  );
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
  const { cardColumns, isWide, isMobile } = useResponsive();

  const [activeTab, setActiveTab] = useState("analytics"); // analytics | payouts
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

  const revenueCompositionData = useMemo(() => {
    return [
      {
        id: "service-fees",
        label: "Service Fees",
        value: Number(metrics?.totalServiceFees || 0),
        color: colors.primary,
      },
      {
        id: "commission",
        label: "Commission",
        value: Number(metrics?.totalCommissions || 0),
        color: colors.info,
      },
      {
        id: "processing",
        label: "Processing Fees",
        value: Number(metrics?.totalPaystackFees || 0),
        color: colors.warning,
      },
      {
        id: "payouts",
        label: "Payouts",
        value: Number(completedTotal || 0),
        color: colors.danger,
      },
    ];
  }, [metrics, completedTotal]);

  const monthlyEarningsTrend = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }).map((_, i) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
      const label = monthDate.toLocaleDateString("en-GB", { month: "short" });

      const successfulForMonth = transactionPayments.filter((p) => {
        if (p.status !== "success") return false;
        const iso = p.paid_at || p.created_at;
        if (!iso) return false;
        const d = new Date(iso);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return key === monthKey;
      });

      const platformEarnings = successfulForMonth.reduce(
        (sum, p) =>
          sum +
          Number(p.service_fee_amount || 0) +
          Number(p.platform_commission || 0),
        0,
      );

      return {
        key: monthKey,
        label,
        value: platformEarnings,
      };
    });

    return months;
  }, [transactionPayments]);

  const dailyTrend = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      const key = d.toISOString().slice(0, 10);
      const value = transactionPayments
        .filter((p) => {
          if (p.status !== "success") return false;
          const iso = p.paid_at || p.created_at;
          return iso && new Date(iso).toISOString().slice(0, 10) === key;
        })
        .reduce(
          (sum, p) =>
            sum +
            Number(p.service_fee_amount || 0) +
            Number(p.platform_commission || 0),
          0,
        );
      return {
        key,
        label: d.toLocaleDateString("en-GB", { weekday: "short" }),
        value,
      };
    });
  }, [transactionPayments]);

  const weeklyTrend = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 8 }).map((_, i) => {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay() - (7 * (7 - i) - 1));
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      const value = transactionPayments
        .filter((p) => {
          if (p.status !== "success") return false;
          const iso = p.paid_at || p.created_at;
          if (!iso) return false;
          const d = new Date(iso);
          return d >= start && d <= end;
        })
        .reduce(
          (sum, p) =>
            sum +
            Number(p.service_fee_amount || 0) +
            Number(p.platform_commission || 0),
          0,
        );
      return {
        key: `${start.toISOString().slice(0, 10)}-${i}`,
        label: `W${i + 1}`,
        value,
      };
    });
  }, [transactionPayments]);

  const yearlyTrend = useMemo(() => {
    const yearNow = new Date().getFullYear();
    return Array.from({ length: 5 }).map((_, i) => {
      const year = yearNow - (4 - i);
      const value = transactionPayments
        .filter((p) => {
          if (p.status !== "success") return false;
          const iso = p.paid_at || p.created_at;
          return iso && new Date(iso).getFullYear() === year;
        })
        .reduce(
          (sum, p) =>
            sum +
            Number(p.service_fee_amount || 0) +
            Number(p.platform_commission || 0),
          0,
        );
      return { key: String(year), label: String(year), value };
    });
  }, [transactionPayments]);

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
    <View style={[styles.container, isMobile && styles.containerMobile]}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        {[
          { id: "analytics", label: "Analytics", icon: "bar-chart-outline" },
          { id: "payouts", label: "Payouts", icon: "arrow-up-circle-outline" },
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
          <View style={[styles.chartCard, { marginTop: 12 }]}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Revenue Composition</Text>
              <Text style={styles.chartSub}>Financial flow distribution</Text>
            </View>
            {(() => {
              const chartData = revenueCompositionData.filter((i) => i.value > 0);
              const total = chartData.reduce((sum, i) => sum + i.value, 0) || 1;
              const cx = 90;
              const cy = 90;
              const radius = 72;
              let angle = 0;
              return (
                <>
                  <View style={styles.pieWrap}>
                    <Svg width={180} height={180}>
                      {chartData.map((item) => {
                        const sweep = (item.value / total) * 360;
                        const path = describeArcSegment(
                          cx,
                          cy,
                          radius,
                          angle,
                          angle + sweep,
                        );
                        angle += sweep;
                        return <Path key={item.id} d={path} fill={item.color} />;
                      })}
                      <Circle cx={cx} cy={cy} r={40} fill="#fff" />
                    </Svg>
                    <View style={styles.pieCenter}>
                      <Text style={styles.pieCenterLabel}>Total</Text>
                      <Text style={styles.pieCenterValue}>{fmt(total)}</Text>
                    </View>
                  </View>
                  {chartData.map((item) => (
                    <View key={item.id} style={styles.chartRow}>
                      <View style={styles.chartRowHead}>
                        <View style={styles.chartLegendLabel}>
                          <View
                            style={[
                              styles.chartLegendDot,
                              { backgroundColor: item.color },
                            ]}
                          />
                          <Text style={styles.chartRowLabel}>{item.label}</Text>
                        </View>
                        <Text style={styles.chartRowMeta}>
                          {fmt(item.value)} •{" "}
                          {((item.value / total) * 100).toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              );
            })()}
          </View>

          <View style={[styles.chartGrid, isWide && styles.chartGridWide]}>
            <View style={[styles.chartGridItem, isWide && styles.chartGridItemWide]}>
              <TrendLineAreaChart
                title="Daily Trend"
                subtitle="Last 7 days"
                data={dailyTrend}
                color={colors.info}
              />
            </View>
            <View style={[styles.chartGridItem, isWide && styles.chartGridItemWide]}>
              <TrendLineAreaChart
                title="Weekly Trend"
                subtitle="Last 8 weeks"
                data={weeklyTrend}
                color={colors.success}
              />
            </View>
            <View style={[styles.chartGridItem, isWide && styles.chartGridItemWide]}>
              <TrendLineAreaChart
                title="6-Month Earnings Trend"
                subtitle="Platform earnings (service fees + commission)"
                data={monthlyEarningsTrend}
                color={colors.primary}
              />
            </View>
            <View style={[styles.chartGridItem, isWide && styles.chartGridItemWide]}>
              <TrendLineAreaChart
                title="Yearly Trend"
                subtitle="Last 5 years"
                data={yearlyTrend}
                color={colors.warning}
              />
            </View>
          </View>

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
  containerMobile: { paddingTop: 30 },
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
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  chartGrid: {
    marginTop: 4,
    marginBottom: 16,
  },
  chartGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  chartGridItem: {
    width: "100%",
  },
  chartGridItemWide: {
    width: "48.8%",
  },
  chartHeader: { marginBottom: 12 },
  chartTitle: { fontSize: 15, fontWeight: "800", color: colors.dark },
  chartSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  chartRow: { marginBottom: 10 },
  chartRowHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  chartRowLabel: { fontSize: 12, color: colors.dark, fontWeight: "600" },
  chartRowMeta: { fontSize: 12, color: colors.muted, fontWeight: "700" },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
    minWidth: 4,
  },
  lineChartScroll: {
    marginTop: 8,
    marginHorizontal: -H_PAD,
    paddingHorizontal: H_PAD,
  },
  lineChartContainer: {
    paddingRight: H_PAD,
  },
  lineChart: {
    height: 210,
    position: "relative",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingTop: 14,
    paddingBottom: 44,
    overflow: "hidden",
    minWidth: 360,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  lineChartGrid: {
    position: "absolute",
    left: 10,
    right: 10,
    top: 14,
    height: 1,
    borderTopWidth: 1,
    borderTopColor: "#DDE5F0",
    borderStyle: "dashed",
  },
  lineSegment: {
    position: "absolute",
    height: 2,
    backgroundColor: colors.primary,
  },
  areaColumn: {
    position: "absolute",
    width: 24,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  lineDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: "#fff",
  },
  lineXLabel: {
    position: "absolute",
    top: 170,
    width: 24,
    textAlign: "center",
    fontSize: 11,
    color: colors.muted,
    fontWeight: "700",
  },
  pieWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  pieCenter: {
    position: "absolute",
    alignItems: "center",
  },
  pieCenterLabel: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "700",
  },
  pieCenterValue: {
    fontSize: 11,
    color: colors.dark,
    fontWeight: "800",
    marginTop: 2,
  },
  chartLegendLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chartLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  lineValueLabel: {
    position: "absolute",
    top: 152,
    width: 52,
    textAlign: "center",
    fontSize: 9,
    color: colors.dark,
    fontWeight: "700",
  },
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
