import { Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";

const NAV_ITEMS = [
  { name: "Overview", icon: "home-outline", iconFocused: "home" },
  { name: "Products", icon: "cube-outline", iconFocused: "cube" },
  { name: "Orders", icon: "receipt-outline", iconFocused: "receipt" },
  { name: "Customers", icon: "person-outline", iconFocused: "person" },
  { name: "Sellers", icon: "people-outline", iconFocused: "people" },
  { name: "Finance", icon: "wallet-outline", iconFocused: "wallet" },
  { name: "Marketing", icon: "pricetag-outline", iconFocused: "pricetag" },
  {
    name: "Moderation",
    icon: "shield-checkmark-outline",
    iconFocused: "shield-checkmark",
  },
  {
    name: "Reviews",
    icon: "chatbox-ellipses-outline",
    iconFocused: "chatbox-ellipses",
  },
  { name: "Ads", icon: "megaphone-outline", iconFocused: "megaphone" },
  { name: "Support", icon: "help-circle-outline", iconFocused: "help-circle" },
  { name: "Settings", icon: "settings-outline", iconFocused: "settings" },
];

export const WebSidebar = ({
  state,
  navigation,
  sidebarWidth,
  pendingModerationCount = 0,
}) => {
  const insets = useSafeAreaInsets();
  const activeRoute = state?.routes?.[state.index]?.name;
  const moderationBadgeText =
    pendingModerationCount > 99
      ? "99+"
      : String(Math.max(0, pendingModerationCount));

  return (
    <View
      style={[
        styles.container,
        { width: sidebarWidth, paddingTop: insets.top },
      ]}
    >
      {/* Brand */}
      <View style={styles.brandContainer}>
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          style={styles.brandIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="shield-checkmark" size={22} color="#fff" />
        </LinearGradient>
        {sidebarWidth >= 200 && (
          <Text style={styles.brandText}>Admin Panel</Text>
        )}
      </View>

      {/* Nav Items */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.navList}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeRoute === item.name;
          return (
            <Pressable
              key={item.name}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => navigation.navigate(item.name)}
            >
              {isActive && (
                <LinearGradient
                  colors={[colors.primary + "15", colors.accent + "08"]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              )}
              <View style={styles.navItemContent}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={isActive ? item.iconFocused : item.icon}
                    size={22}
                    color={isActive ? colors.primary : colors.muted}
                  />
                </View>
                {sidebarWidth >= 200 && (
                  <Text
                    style={[styles.navLabel, isActive && styles.navLabelActive]}
                  >
                    {item.name}
                  </Text>
                )}
                {item.name === "Moderation" && pendingModerationCount > 0 && (
                  <View style={styles.navBadge}>
                    <Text style={styles.navBadgeText}>
                      {moderationBadgeText}
                    </Text>
                  </View>
                )}
              </View>
              {isActive && <View style={styles.activeIndicator} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRightWidth: 1,
    borderRightColor: "#F1F5F9",
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 12,
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.dark,
    letterSpacing: -0.5,
  },
  navList: {
    paddingHorizontal: 12,
    gap: 4,
  },
  navItem: {
    borderRadius: 12,
    overflow: "hidden",
    minHeight: 48,
    justifyContent: "center",
  },
  navItemActive: {
    backgroundColor: "transparent",
  },
  navItemContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.muted,
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: "800",
  },
  navBadge: {
    marginLeft: "auto",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  navBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 12,
  },
  activeIndicator: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
});
