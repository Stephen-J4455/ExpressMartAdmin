import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  Modal,
  ScrollView,
  Pressable,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { AdminProvider } from "./src/context/AdminContext";
import { ToastProvider } from "./src/context/ToastContext";
import { NotificationProvider } from "./src/context/NotificationContext";
import { colors } from "./src/theme/colors";
import { useResponsive } from "./src/hooks/useResponsive";
import { WebSidebar } from "./src/components/WebSidebar";
import AdminLoginScreen from "./src/screens/AdminLoginScreen";
import { AdminLoadingAnimation } from "./src/components/AdminLoadingAnimation";
import { OverviewScreen } from "./src/screens/OverviewScreen";
import { AdsManagementScreen } from "./src/screens/AdsManagementScreen";
import { SellersScreen } from "./src/screens/SellersScreen";
import { ModerationScreen } from "./src/screens/ModerationScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { SupportScreen } from "./src/screens/SupportScreen";
import { OrdersScreen } from "./src/screens/OrdersScreen";
import { CustomersScreen } from "./src/screens/CustomersScreen";
import { FinanceScreen } from "./src/screens/FinanceScreen";
import { MarketingScreen } from "./src/screens/MarketingScreen";
// password resets handled on the web; mobile screen no longer used
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import { UpdateManagerScreen } from "./src/screens/UpdateManagerScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const linking = {
  prefixes: ["expressmartadmin://"],
  config: {
    screens: {
      Login: "login",
      ForgotPassword: "forgot-password",
      AdminTabs: {
        screens: {
          Overview: "overview",
          Orders: "orders",
          Customers: "customers",
          Sellers: "sellers",
          Finance: "finance",
          Marketing: "marketing",
          Moderation: "moderation",
          Ads: "ads",
          Settings: "settings",
          Support: "support",
        },
      },
    },
  },
};
const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.light,
    card: "#fff",
    text: colors.dark,
    primary: colors.primary,
    border: "transparent",
  },
};
const MissingConfig = () => (
  <View style={styles.center}>
    <Ionicons name="cloud-offline-outline" size={64} color={colors.primary} />
    <Text style={[styles.title, { marginTop: 16 }]}>Supabase missing</Text>
    <Text style={styles.subtitle}>
      Open supabase.js and drop in your project URL and anon key.
    </Text>
  </View>
);

const AuthNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={AdminLoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  appBackground: {
    flex: 1,
    backgroundColor: colors.light,
    paddingTop: Platform.OS === "ios" ? 50 : 0,
  },
  scene: {
    flex: 1,
    backgroundColor: colors.light,
    paddingTop: Platform.OS === "ios" ? 50 : 0,
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 0,
    borderRadius: 28,
    height: 70,
    shadowColor: colors.dark,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabLabel: {
    fontWeight: "700",
    fontSize: 10,
    textAlign: "center",
    marginTop: 2,
  },
  tabItem: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  badge: {
    backgroundColor: colors.danger,
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    minWidth: 24,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.dark,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 12,
    color: colors.muted,
    textAlign: "center",
  },
  button: {
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  // More bottom sheet
  moreOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  moreSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
  },
  moreHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  moreTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.dark,
    marginBottom: 16,
  },
  moreGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  moreItem: {
    width: "30%",
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  moreIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  moreLabel: {
    fontSize: 11,
    textAlign: "center",
  },
});

const AdminTabs = ({ onLogout }) => {
  const { isWide, sidebarWidth } = useResponsive();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarPosition: isWide ? "left" : "bottom",
        tabBarStyle: isWide
          ? { width: sidebarWidth, borderRightWidth: 0 }
          : { display: "none" },
        tabBarItemStyle: styles.tabItem,
      }}
      tabBar={(props) =>
        isWide ? (
          <WebSidebar {...props} sidebarWidth={sidebarWidth} />
        ) : (
          <DefaultAdminTabBar {...props} />
        )
      }
    >
      <Tab.Screen
        name="Overview"
        component={OverviewScreen}
        options={{
          tabBarLabel: "Overview",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarLabel: "Orders",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Customers"
        component={CustomersScreen}
        options={{
          tabBarLabel: "Customers",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Sellers"
        component={SellersScreen}
        options={{
          tabBarLabel: "Sellers",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Finance"
        component={FinanceScreen}
        options={{
          tabBarLabel: "Finance",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Marketing"
        component={MarketingScreen}
        options={{
          tabBarLabel: "Marketing",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pricetag-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Moderation"
        component={ModerationScreen}
        options={{
          tabBarLabel: "Moderation",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="shield-checkmark-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Ads"
        component={AdsManagementScreen}
        options={{
          tabBarLabel: "Ads",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="megaphone-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Updates"
        component={UpdateManagerScreen}
        options={{
          tabBarLabel: "Updates",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cloud-upload-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Support"
        component={SupportScreen}
        options={{
          tabBarLabel: "Support",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="help-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

/** Routes shown directly in the mobile bottom bar */
const PRIMARY_TABS = ["Overview", "Moderation", "Sellers", "Finance"];

/** Routes accessible via the "More" sheet */
const OVERFLOW_TABS = [
  "Orders",
  "Customers",
  "Marketing",
  "Ads",
  "Support",
  "Updates",
  "Settings",
];

const ADMIN_ICONS = {
  Overview: "home-outline",
  Orders: "receipt-outline",
  Customers: "person-outline",
  Sellers: "people-outline",
  Finance: "wallet-outline",
  Marketing: "pricetag-outline",
  Moderation: "shield-checkmark-outline",
  Ads: "megaphone-outline",
  Settings: "settings-outline",
  Support: "help-circle-outline",
  Updates: "cloud-upload-outline",
};

const ADMIN_ICONS_FILLED = {
  Overview: "home",
  Orders: "receipt",
  Customers: "person",
  Sellers: "people",
  Finance: "wallet",
  Marketing: "pricetag",
  Moderation: "shield-checkmark",
  Ads: "megaphone",
  Settings: "settings",
  Support: "help-circle",
  Updates: "cloud-upload",
};

const DefaultAdminTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const [moreOpen, setMoreOpen] = React.useState(false);

  const activeRoute = state.routes[state.index]?.name;
  const isOverflowActive = OVERFLOW_TABS.includes(activeRoute);

  const primaryRoutes = state.routes.filter((r) =>
    PRIMARY_TABS.includes(r.name),
  );

  const overflowRoutes = state.routes.filter((r) =>
    OVERFLOW_TABS.includes(r.name),
  );

  const navigateTo = (routeKey, routeName) => {
    setMoreOpen(false);
    const event = navigation.emit({
      type: "tabPress",
      target: routeKey,
      canPreventDefault: true,
    });
    const isFocused = activeRoute === routeName;
    if (!isFocused && !event.defaultPrevented) navigation.navigate(routeName);
  };

  return (
    <>
      {/* Bottom tab bar */}
      <View
        style={{
          position: "absolute",
          bottom: insets.bottom + 12,
          left: 16,
          right: 16,
        }}
      >
        <View style={styles.tabBar}>
          {primaryRoutes.map((route) => {
            const isFocused = activeRoute === route.name;
            const color = isFocused ? colors.primary : colors.muted;
            return (
              <TouchableOpacity
                key={route.key}
                onPress={() => navigateTo(route.key, route.name)}
                style={styles.tabItem}
              >
                <Ionicons
                  name={
                    isFocused
                      ? ADMIN_ICONS_FILLED[route.name]
                      : ADMIN_ICONS[route.name]
                  }
                  size={24}
                  color={color}
                />
                <Text style={[styles.tabLabel, { color }]}>{route.name}</Text>
              </TouchableOpacity>
            );
          })}

          {/* More button */}
          <TouchableOpacity
            onPress={() => setMoreOpen(true)}
            style={styles.tabItem}
          >
            <Ionicons
              name={isOverflowActive ? "grid" : "grid-outline"}
              size={24}
              color={isOverflowActive ? colors.primary : colors.muted}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: isOverflowActive ? colors.primary : colors.muted },
              ]}
            >
              More
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* More bottom sheet modal */}
      <Modal
        visible={moreOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setMoreOpen(false)}
      >
        <Pressable
          style={styles.moreOverlay}
          onPress={() => setMoreOpen(false)}
        >
          <Pressable
            style={styles.moreSheet}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.moreHandle} />
            <Text style={styles.moreTitle}>More</Text>
            <View style={styles.moreGrid}>
              {overflowRoutes.map((route) => {
                const isFocused = activeRoute === route.name;
                const color = isFocused ? colors.primary : colors.dark;
                const bg = isFocused ? colors.primary + "12" : colors.light;
                return (
                  <TouchableOpacity
                    key={route.key}
                    style={[styles.moreItem, { backgroundColor: bg }]}
                    onPress={() => navigateTo(route.key, route.name)}
                  >
                    <View
                      style={[
                        styles.moreIconWrap,
                        {
                          backgroundColor: isFocused
                            ? colors.primary + "20"
                            : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          isFocused
                            ? ADMIN_ICONS_FILLED[route.name]
                            : ADMIN_ICONS[route.name]
                        }
                        size={22}
                        color={color}
                      />
                    </View>
                    <Text
                      style={[
                        styles.moreLabel,
                        { color, fontWeight: isFocused ? "700" : "500" },
                      ]}
                    >
                      {route.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const AUTH_USER_KEY = "express_admin_user";
  const AUTH_ROLE_KEY = "express_admin_role";

  const storeAuthState = async (u, role) => {
    try {
      if (u) await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(u));
      else await AsyncStorage.removeItem(AUTH_USER_KEY);
      if (role) await AsyncStorage.setItem(AUTH_ROLE_KEY, role);
      else await AsyncStorage.removeItem(AUTH_ROLE_KEY);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    // ── Deep-link handler (password reset → web) ──────────────────────────
    const handleDeepLink = async (url) => {
      if (!url) return;
      try {
        if (url.includes("type=recovery") || url.includes("reset-password")) {
          const webUrl =
            "https://stephen-j4455.github.io/express-password-reset/password-reset.html" +
            (url.includes("?")
              ? url.slice(url.indexOf("?"))
              : url.includes("#")
                ? url.slice(url.indexOf("#"))
                : "");
          await Linking.openURL(webUrl);
        }
      } catch (e) {
        console.error(e);
      }
    };
    Linking.getInitialURL().then((url) => handleDeepLink(url));
    const urlSub = Linking.addEventListener("url", ({ url }) =>
      handleDeepLink(url),
    );

    // ── Role verification (runs OUTSIDE the auth callback) ───────────────
    // Supabase JS holds an internal session lock while the onAuthStateChange
    // callback executes.  Any Supabase DB/API call made *inside* that
    // callback also needs the lock → deadlock on web.  We break the chain
    // by deferring the DB query to a macrotask with setTimeout.
    let currentUserId = null;
    let mounted = true;

    const verifyRole = async (targetUser) => {
      if (!mounted) return;
      try {
        const { data, error } = await supabase
          .from("express_profiles")
          .select("role")
          .eq("id", targetUser.id)
          .maybeSingle();
        if (!mounted) return;
        const role =
          error && error.code !== "PGRST116" ? null : (data?.role ?? null);
        setUserRole(role);
        await storeAuthState(targetUser, role);
      } catch (e) {
        console.error("verifyRole error:", e);
        if (mounted) setUserRole(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // ── Auth state listener ───────────────────────────────────────────────
    // The callback is intentionally SYNCHRONOUS — no awaits, no Supabase
    // API calls — so it returns instantly and releases the internal lock.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT") {
        currentUserId = null;
        setUser(null);
        setUserRole(null);
        setLoading(false);
        storeAuthState(null, null); // fire-and-forget
        return;
      }

      const newUser = session?.user ?? null;
      const newId = newUser?.id ?? null;
      setUser(newUser);

      if (newId && newId !== currentUserId) {
        // New user (initial session on load, or fresh login) — verify role.
        currentUserId = newId;
        // Show loading screen while we verify the role in the DB so the
        // user doesn't flash an "Access Denied" / "Profile Not Found" state.
        setLoading(true);
        // setTimeout(fn, 0) defers to the next macrotask, after Supabase
        // has finished its internal session bookkeeping and released locks.
        setTimeout(() => verifyRole(newUser), 0);
      } else if (!newId) {
        currentUserId = null;
        setUserRole(null);
        setLoading(false);
      }
      // TOKEN_REFRESHED with same user: just update user ref, skip role refetch.
    });

    // Safety-net: never stay stuck on the loading screen.
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

    return () => {
      mounted = false;
      urlSub.remove();
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      await AsyncStorage.removeItem(AUTH_ROLE_KEY);
    } catch (e) {
      console.error(e);
    }
  };

  if (!supabase) {
    return (
      <SafeAreaProvider>
        <MissingConfig />
      </SafeAreaProvider>
    );
  }

  if (loading) {
    return (
      <SafeAreaProvider>
        <AdminLoadingAnimation />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <AdminProvider>
          <NotificationProvider userId={user?.id}>
            <NavigationContainer theme={navTheme} linking={linking}>
              <StatusBar style="dark" />
              {user && userRole === "admin" ? (
                <View style={styles.appBackground}>
                  <AdminTabs onLogout={handleLogout} />
                </View>
              ) : user && userRole && userRole !== "admin" ? (
                <View style={styles.scene}>
                  <View style={styles.center}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={80}
                      color={colors.danger}
                    />
                    <Text style={styles.title}>Access Denied</Text>
                    <Text style={styles.subtitle}>
                      Your account ({userRole}) does not have admin access.
                    </Text>
                    <TouchableOpacity
                      style={styles.button}
                      onPress={handleLogout}
                    >
                      <Text style={styles.buttonText}>Sign Out</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : user ? (
                <View style={styles.scene}>
                  <View style={styles.center}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={80}
                      color={colors.warning}
                    />
                    <Text style={styles.title}>Profile Not Found</Text>
                    <Text style={styles.subtitle}>
                      Your profile could not be verified. Please contact a
                      system administrator.
                    </Text>
                    <TouchableOpacity
                      style={styles.button}
                      onPress={handleLogout}
                    >
                      <Text style={styles.buttonText}>Sign Out</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <AuthNavigator />
              )}
            </NavigationContainer>
          </NotificationProvider>
        </AdminProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
