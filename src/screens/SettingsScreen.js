import React, { useEffect, useState } from "react";
import {
  FlatList,
  Switch,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAdmin } from "../context/AdminContext";
import { useToast } from "../context/ToastContext";
import { colors } from "../theme/colors";

export const SettingsScreen = () => {
  const {
    settings,
    updateSetting,
    loading,
    refresh,
    orders,
    sellers,
    products,
    users,
  } = useAdmin();
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("fees"); // fees | audit

  // Local state for form fields
  const [serviceFeePercentage, setServiceFeePercentage] = useState(
    settings.service_fee_percentage || "5",
  );
  const [defaultCommissionRate, setDefaultCommissionRate] = useState(
    settings.default_commission_rate || "0",
  );
  const [flashSaleEnabled, setFlashSaleEnabled] = useState(
    settings.flash_sale_enabled === "true" ||
      settings.flash_sale_enabled === true,
  );
  const [redisProductsCacheEnabled, setRedisProductsCacheEnabled] = useState(
    settings.redis_products_cache_enabled === "true" ||
      settings.redis_products_cache_enabled === true,
  );

  useEffect(() => {
    setServiceFeePercentage(String(settings.service_fee_percentage || "5"));
    setDefaultCommissionRate(String(settings.default_commission_rate || "0"));
    setFlashSaleEnabled(
      settings.flash_sale_enabled === "true" ||
        settings.flash_sale_enabled === true,
    );
    setRedisProductsCacheEnabled(
      settings.redis_products_cache_enabled === "true" ||
        settings.redis_products_cache_enabled === true,
    );
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const pct = parseFloat(serviceFeePercentage);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        toast.error(
          "Invalid Value",
          "Service fee percentage must be between 0 and 100",
        );
        setIsSaving(false);
        return;
      }
      const comm = parseFloat(defaultCommissionRate);
      if (isNaN(comm) || comm < 0 || comm > 100) {
        toast.error(
          "Invalid Value",
          "Commission rate must be between 0 and 100",
        );
        setIsSaving(false);
        return;
      }
      await Promise.all([
        updateSetting("service_fee_percentage", serviceFeePercentage),
        updateSetting("default_commission_rate", defaultCommissionRate),
        updateSetting("flash_sale_enabled", String(flashSaleEnabled)),
        updateSetting(
          "redis_products_cache_enabled",
          String(redisProductsCacheEnabled),
        ),
      ]);
      toast.success("Saved", "Settings saved successfully");
    } catch (error) {
      toast.error("Error", "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Build audit log entries from existing context data
  const auditEntries = React.useMemo(() => {
    const entries = [];
    orders.slice(0, 30).forEach((o) => {
      if (o.updated_at && o.updated_at !== o.created_at) {
        entries.push({
          at: o.updated_at,
          action: `Order #${o.order_number} → ${o.status}`,
          icon: "receipt-outline",
          color: colors.info,
        });
      }
    });
    sellers.slice(0, 20).forEach((s) => {
      if (s.created_at) {
        entries.push({
          at: s.created_at,
          action: `Seller registered: ${s.name}`,
          icon: "person-add-outline",
          color: colors.success,
        });
      }
    });
    return entries.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 50);
  }, [orders, sellers]);

  if (loading && !Object.keys(settings).length) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const fmtAt = (iso) =>
    new Date(iso).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        {[
          { id: "fees", label: "Fees & Config", icon: "calculator-outline" },
          { id: "audit", label: "Audit Log", icon: "document-text-outline" },
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

      {activeTab === "fees" && (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 140 }}
        >
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="calculator-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.sectionTitle}>Fees & Thresholds</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Service Fee Percentage (%)</Text>
              <TextInput
                style={styles.input}
                value={serviceFeePercentage}
                onChangeText={setServiceFeePercentage}
                keyboardType="decimal-pad"
                placeholder="e.g. 5"
              />
              <Text style={styles.hint}>
                Charged on product subtotal as a service fee. Deducted from
                seller earnings.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Default Commission Rate (%)</Text>
              <TextInput
                style={styles.input}
                value={defaultCommissionRate}
                onChangeText={setDefaultCommissionRate}
                keyboardType="decimal-pad"
                placeholder="e.g. 0"
              />
              <Text style={styles.hint}>
                Platform commission on seller transactions. Can be overridden
                per-seller.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flash-outline" size={20} color={colors.warning} />
              <Text style={styles.sectionTitle}>Flash Sales</Text>
            </View>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Enable Flash Sales</Text>
                <Text style={styles.hint}>
                  Allow sellers to create flash sale promotions.
                </Text>
              </View>
              <Switch
                value={flashSaleEnabled}
                onValueChange={setFlashSaleEnabled}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="server-outline" size={20} color={colors.info} />
              <Text style={styles.sectionTitle}>Product Cache</Text>
            </View>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Enable Redis Product Cache</Text>
                <Text style={styles.hint}>
                  Uses the cached-products Edge Function with Redis for product
                  list reads.
                </Text>
              </View>
              <Switch
                value={redisProductsCacheEnabled}
                onValueChange={setRedisProductsCacheEnabled}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="save-outline"
                  size={20}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.saveButtonText}>Save Settings</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={colors.info}
            />
            <Text style={styles.infoText}>
              These settings affect all users across the ExpressMart ecosystem
              immediately.
            </Text>
          </View>

          {/* Platform Stats */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="stats-chart-outline"
                size={20}
                color={colors.success}
              />
              <Text style={styles.sectionTitle}>Platform Stats</Text>
            </View>
            {[
              { label: "Total Products", value: products.length },
              { label: "Total Users", value: users.length },
              { label: "Total Sellers", value: sellers.length },
              { label: "Total Orders", value: orders.length },
            ].map((row) => (
              <View key={row.label} style={styles.statRow}>
                <Text style={styles.statLabel}>{row.label}</Text>
                <Text style={styles.statValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {activeTab === "audit" && (
        <FlatList
          data={auditEntries}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
          renderItem={({ item }) => (
            <View style={styles.auditRow}>
              <View
                style={[
                  styles.auditIcon,
                  { backgroundColor: item.color + "18" },
                ]}
              >
                <Ionicons name={item.icon} size={16} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.auditAction}>{item.action}</Text>
                <Text style={styles.auditAt}>{fmtAt(item.at)}</Text>
              </View>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <Ionicons
                name="document-text-outline"
                size={48}
                color={colors.muted}
              />
              <Text style={{ marginTop: 12, color: colors.muted }}>
                No audit entries yet
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
    paddingTop: 50,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 6,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  tabActive: {
    backgroundColor: colors.primary + "10",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.muted,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statLabel: {
    fontSize: 14,
    color: colors.muted,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.dark,
  },
  auditRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  auditIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  auditAction: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.dark,
    marginBottom: 2,
  },
  auditAt: {
    fontSize: 11,
    color: colors.muted,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.dark,
  },
  refreshButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 25,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.dark,
    marginLeft: 10,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.dark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.light,
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.dark,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hint: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 6,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 55,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 20,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: `${colors.info}10`,
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: colors.info,
    lineHeight: 18,
  },
});
