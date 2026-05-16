import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../supabase";
import notificationService from "../services/notificationService";
import { colors } from "../theme/colors";

const AdminContext = createContext();

// AsyncStorage keys
const AUTH_USER_KEY = "express_admin_user";
const AUTH_ROLE_KEY = "express_admin_role";

const normalizeStorageObjectPath = (value) => {
  if (!value || typeof value !== "string") return null;

  let path = value.trim();
  try {
    path = decodeURIComponent(path);
  } catch {
    // Keep original when URI decoding fails on malformed percent encodings.
  }

  path = path.trim();
  if (!path) return null;

  path = path.split("?")[0].split("#")[0];

  const pathPrefixes = [
    "/storage/v1/object/public/express-products/",
    "/storage/v1/object/sign/express-products/",
    "storage/v1/object/public/express-products/",
    "storage/v1/object/sign/express-products/",
    "public/express-products/",
    "sign/express-products/",
    "express-products/",
  ];

  for (const prefix of pathPrefixes) {
    if (path.startsWith(prefix)) {
      path = path.slice(prefix.length);
      break;
    }
  }

  path = path.replace(/^\/+/, "");

  return path || null;
};

const extractProductImageUrls = (product) => {
  const urls = [];

  const addUrl = (value) => {
    if (typeof value === "string" && value.trim()) {
      urls.push(value.trim());
    }
  };

  addUrl(product?.thumbnail);

  if (Array.isArray(product?.thumbnails)) {
    product.thumbnails.forEach((url) => addUrl(url));
  } else if (typeof product?.thumbnails === "string") {
    const raw = product.thumbnails.trim();
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((url) => addUrl(url));
        } else if (typeof parsed === "string") {
          addUrl(parsed);
        } else {
          addUrl(raw);
        }
      } catch {
        // Support Postgres array literal format: {"a","b"}
        const isPgArray = raw.startsWith("{") && raw.endsWith("}");
        if (isPgArray) {
          const inner = raw.slice(1, -1).trim();
          if (inner) {
            inner
              .split(",")
              .map((item) => item.trim().replace(/^"|"$/g, ""))
              .forEach((item) => addUrl(item));
          }
        } else {
          addUrl(raw);
        }
      }
    }
  }

  return Array.from(new Set(urls));
};

const buildStorageDeleteCandidates = (url) => {
  if (!url || typeof url !== "string") return [];

  const candidates = new Set();

  const addCandidate = (value) => {
    if (!value || typeof value !== "string") return;
    const trimmed = value.trim();
    if (!trimmed) return;

    candidates.add(trimmed);

    try {
      const normalized = normalizeStorageObjectPath(trimmed);
      if (normalized) candidates.add(normalized);
    } catch {
      // Ignore candidate normalization issues and continue with other candidates.
    }
  };

  const rawNoQuery = url.split("?")[0].split("#")[0].trim();
  addCandidate(rawNoQuery);

  // Mirror Express-Store status cleanup style: split by bucket token.
  if (rawNoQuery.includes("/express-products/")) {
    const [, rawPath = ""] = rawNoQuery.split("/express-products/");
    addCandidate(rawPath);
  }

  if (rawNoQuery.includes("express-products/")) {
    const [, rawPath = ""] = rawNoQuery.split("express-products/");
    addCandidate(rawPath);
  }

  if (/^https?:\/\//i.test(rawNoQuery)) {
    try {
      const pathname = new URL(rawNoQuery).pathname || "";
      addCandidate(pathname);

      if (pathname.includes("/express-products/")) {
        const [, rawPath = ""] = pathname.split("/express-products/");
        addCandidate(rawPath);
      }
    } catch {
      // Keep other candidates when URL parsing fails.
    }
  }

  addCandidate(getStoragePathFromUrl(rawNoQuery));

  const expanded = new Set();
  Array.from(candidates).forEach((candidate) => {
    const clean = String(candidate).replace(/^\/+/, "").trim();
    if (!clean || clean.includes("://")) return;

    expanded.add(clean);

    if (clean.startsWith("express-products/")) {
      expanded.add(clean.slice("express-products/".length));
    }

    if (!clean.startsWith("products/")) {
      expanded.add(`products/${clean}`);
    }
  });

  return Array.from(expanded).filter(Boolean);
};

const getStoragePathFromUrl = (url) => {
  if (!url || typeof url !== "string") return null;

  const cleanUrl = url.split("?")[0];
  const publicToken = "/storage/v1/object/public/express-products/";
  const signedToken = "/storage/v1/object/sign/express-products/";

  if (cleanUrl.includes(publicToken)) {
    return normalizeStorageObjectPath(cleanUrl.split(publicToken)[1] || "");
  }

  if (cleanUrl.includes(signedToken)) {
    return normalizeStorageObjectPath(cleanUrl.split(signedToken)[1] || "");
  }

  if (cleanUrl.startsWith("products/")) {
    return normalizeStorageObjectPath(cleanUrl);
  }

  try {
    const parsedUrl = new URL(cleanUrl);
    const bucketPathToken = "/express-products/";
    if (parsedUrl.pathname.includes(bucketPathToken)) {
      return normalizeStorageObjectPath(
        parsedUrl.pathname.split(bucketPathToken)[1] || "",
      );
    }
  } catch {
    return normalizeStorageObjectPath(cleanUrl);
  }

  return normalizeStorageObjectPath(cleanUrl);
};

const normalizeIdentity = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

export const AdminProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [banners, setBanners] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [ads, setAds] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [settings, setSettings] = useState({});
  const [reviews, setReviews] = useState([]);
  const [comments, setComments] = useState([]);
  const [transactionPayments, setTransactionPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const channelsRef = useRef([]);

  const resetState = useCallback(() => {
    setProducts([]);
    setCategories([]);
    setOrders([]);
    setSellers([]);
    setTickets([]);
    setUsers([]);
    setBanners([]);
    setCoupons([]);
    setAds([]);
    setPayouts([]);
    setSettings({});
    setReviews([]);
    setComments([]);
    setTransactionPayments([]);
    setError("");
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      await AsyncStorage.removeItem(AUTH_ROLE_KEY);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError("");
    try {
      // Ensure we have a signed-in admin and a profile row with role=admin
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Not signed in");
        setLoading(false);
        return;
      }

      // Check if user has admin role
      const { data: profile, error: profileError } = await supabase
        .from("express_profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        // PGRST116 is "no rows returned" - means profile doesn't exist yet
        console.error("Profile check error:", profileError);
        throw profileError;
      }

      if (!profile || profile.role !== "admin") {
        throw new Error(
          "Access denied: This account is not an admin. Please contact a system administrator to promote your account to admin role.",
        );
      }

      const [
        productsRes,
        categoriesRes,
        ordersRes,
        sellersRes,
        ticketsRes,
        usersRes,
        bannersRes,
        couponsRes,
        adsRes,
        payoutsRes,
        settingsRes,
        transactionPaymentsRes,
      ] = await Promise.all([
        supabase
          .from("express_products")
          .select(
            "id,title,vendor,seller_id,price,category,status,badges,created_at,thumbnail,quantity,description,discount,sizes,colors,sku,weight,barcode,compare_at_price,cost_price,tags,track_inventory,allow_backorder,thumbnails,updated_at",
          )
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("express_categories")
          .select("id,name,icon,color")
          .order("name"),
        supabase
          .from("express_orders")
          .select(
            "id,order_number,vendor,seller_id,status,total,service_fee,payment_status,paid_at,customer,eta,created_at,updated_at,shipped_at,delivered_at",
          )
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("express_sellers")
          .select(
            "id,user_id,name,email,phone,location,rating,fulfillment_speed,weekly_target,avatar,created_at,is_verified,commission_rate,badges,payment_platform,payment_account,account_code,payment_provider,payment_currency,account_verified",
          )
          .order("name"),
        supabase
          .from("express_support_tickets")
          .select(
            "id,vendor,seller_id,user_id,subject,status,priority,messages,created_at",
          )
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("express_profiles")
          .select("id,full_name,email,phone,avatar_url,role,created_at")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("express_banners")
          .select("*")
          .order("sort_order", { ascending: true }),
        supabase
          .from("express_coupons")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("express_ads")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("express_payouts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("express_settings").select("*"),
        // Fetch transaction payment records (those linked to an order, not subaccount setup rows)
        // Use a more defensive select that works even if new columns don't exist yet
        supabase
          .from("express_payments")
          .select("*")
          .not("order_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

      // Fetch reviews and comments separately as they might have join issues
      let revsData, commsData;

      const { data: rd, error: re } = await supabase
        .from("express_reviews")
        .select("*, express_profiles(full_name, email)")
        .order("created_at", { ascending: false });

      if (
        re &&
        (re.code === "PGRST200" || re.message.includes("relationship"))
      ) {
        console.warn("Reviews join failed, falling back to basic select");
        const { data: frd } = await supabase
          .from("express_reviews")
          .select("*")
          .order("created_at", { ascending: false });
        revsData = frd;
      } else {
        revsData = rd;
        if (re) console.error("Reviews fetch error:", re);
      }

      const { data: cd, error: ce } = await supabase
        .from("express_review_comments")
        .select("*, express_profiles(full_name, email)")
        .order("created_at", { ascending: false });

      if (
        ce &&
        (ce.code === "PGRST200" || ce.message.includes("relationship"))
      ) {
        console.warn("Comments join failed, falling back to basic select");
        const { data: fcd } = await supabase
          .from("express_review_comments")
          .select("*")
          .order("created_at", { ascending: false });
        commsData = fcd;
      } else {
        commsData = cd;
        if (ce) console.error("Comments fetch error:", ce);
      }

      let resolvedProducts = productsRes.data || [];
      if (productsRes.error) {
        console.warn(
          "Products fetch failed with strict select, retrying with fallback:",
          productsRes.error,
        );

        const { data: fallbackProducts, error: fallbackProductsError } =
          await supabase
            .from("express_products")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(200);

        if (fallbackProductsError) {
          console.error(
            "Products fallback fetch error:",
            fallbackProductsError,
          );
          throw fallbackProductsError;
        }

        resolvedProducts = fallbackProducts || [];
      }

      if (categoriesRes.error)
        console.warn("Categories fetch error:", categoriesRes.error);
      if (ordersRes.error) console.warn("Orders fetch error:", ordersRes.error);
      if (sellersRes.error)
        console.warn("Sellers fetch error:", sellersRes.error);
      if (ticketsRes.error)
        console.warn("Tickets fetch error:", ticketsRes.error);
      if (usersRes.error) console.warn("Users fetch error:", usersRes.error);
      if (bannersRes.error)
        console.warn("Banners fetch error:", bannersRes.error);
      if (couponsRes.error)
        console.warn("Coupons fetch error:", couponsRes.error);
      if (adsRes.error) console.warn("Ads fetch error:", adsRes.error);
      if (payoutsRes.error)
        console.warn("Payouts fetch error:", payoutsRes.error);
      if (settingsRes.error)
        console.warn("Settings fetch error:", settingsRes.error);

      setProducts(resolvedProducts);
      setCategories(categoriesRes.error ? [] : categoriesRes.data || []);
      setOrders(ordersRes.error ? [] : ordersRes.data || []);
      setSellers(sellersRes.error ? [] : sellersRes.data || []);
      setTickets(ticketsRes.error ? [] : ticketsRes.data || []);
      setUsers(usersRes.error ? [] : usersRes.data || []);
      setBanners(bannersRes.error ? [] : bannersRes.data || []);
      setCoupons(couponsRes.error ? [] : couponsRes.data || []);
      setAds(adsRes.error ? [] : adsRes.data || []);
      setPayouts(payoutsRes.error ? [] : payoutsRes.data || []);
      setReviews(revsData || []);
      setComments(commsData || []);
      if (transactionPaymentsRes.error) {
        console.warn(
          "Payment records fetch error (non-fatal):",
          transactionPaymentsRes.error,
        );
      } else {
        setTransactionPayments(transactionPaymentsRes.data || []);
      }

      const settingsMap = {};
      (settingsRes.error ? [] : settingsRes.data || []).forEach((s) => {
        settingsMap[s.key] = s.value;
      });
      setSettings(settingsMap);
    } catch (err) {
      console.error("fetchAll error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Setup realtime subscriptions
  useEffect(() => {
    if (!supabase) return;

    const initialize = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        await fetchAll();
      } else {
        setLoading(false);
      }
    };

    initialize();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT") {
          resetState();
          setLoading(false);
          channelsRef.current.forEach((channel) => {
            supabase.removeChannel(channel);
          });
          channelsRef.current = [];
          return;
        }

        if (session) {
          await fetchAll();
        }
      },
    );

    // Subscribe to new orders
    const ordersChannel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "express_orders" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setOrders((prev) => [payload.new, ...prev]);
            Alert.alert(
              "New Order",
              `Order #${payload.new.order_number} received!`,
            );
          } else if (payload.eventType === "UPDATE") {
            setOrders((prev) =>
              prev.map((o) => (o.id === payload.new.id ? payload.new : o)),
            );
          } else if (payload.eventType === "DELETE") {
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    // Subscribe to product changes
    const productsChannel = supabase
      .channel("admin-products")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "express_products" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setProducts((prev) => [payload.new, ...prev]);
            if (payload.new.status === "pending") {
              Alert.alert("New Product", `"${payload.new.title}" needs review`);
            }
          } else if (payload.eventType === "UPDATE") {
            setProducts((prev) =>
              prev.map((p) => (p.id === payload.new.id ? payload.new : p)),
            );
          } else if (payload.eventType === "DELETE") {
            setProducts((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    // Subscribe to support tickets
    const ticketsChannel = supabase
      .channel("admin-tickets")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "express_support_tickets" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTickets((prev) => [payload.new, ...prev]);
            Alert.alert("New Support Ticket", payload.new.subject);
          } else if (payload.eventType === "UPDATE") {
            setTickets((prev) =>
              prev.map((t) => (t.id === payload.new.id ? payload.new : t)),
            );
          }
        },
      )
      .subscribe();

    // Subscribe to new sellers
    const sellersChannel = supabase
      .channel("admin-sellers")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "express_sellers" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setSellers((prev) => [payload.new, ...prev]);
            Alert.alert("New Seller", `${payload.new.name} has registered`);
          } else if (payload.eventType === "UPDATE") {
            setSellers((prev) =>
              prev.map((s) => (s.id === payload.new.id ? payload.new : s)),
            );
          }
        },
      )
      .subscribe();

    channelsRef.current = [
      ordersChannel,
      productsChannel,
      ticketsChannel,
      sellersChannel,
    ];

    return () => {
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      authListener?.subscription?.unsubscribe();
    };
  }, [fetchAll, resetState]);

  const sellersWithComputedRatings = useMemo(() => {
    if (!sellers.length) return sellers;

    const approvedReviews = reviews.filter(
      (review) =>
        review?.is_approved === true &&
        review?.product_id &&
        Number.isFinite(Number(review?.rating)),
    );

    const productRatingStats = approvedReviews.reduce((acc, review) => {
      const productId = review.product_id;
      if (!acc[productId]) acc[productId] = { sum: 0, count: 0 };
      acc[productId].sum += Number(review.rating);
      acc[productId].count += 1;
      return acc;
    }, {});

    const productAverageRatings = Object.entries(productRatingStats).reduce(
      (acc, [productId, stats]) => {
        acc[productId] =
          stats.count > 0 ? Number((stats.sum / stats.count).toFixed(2)) : null;
        return acc;
      },
      {},
    );

    const productSellerIdentityById = products.reduce((acc, product) => {
      if (!product?.id) return acc;
      acc[product.id] = {
        sellerId: normalizeIdentity(product.seller_id),
        vendor: normalizeIdentity(product.vendor),
      };
      return acc;
    }, {});

    const sellerRatingById = sellers.reduce((acc, seller) => {
      const sellerIdKey = normalizeIdentity(seller?.id);
      const sellerNameKey = normalizeIdentity(seller?.name);

      const matchingProductIds = Object.entries(productSellerIdentityById)
        .filter(([, productIdentity]) => {
          if (sellerIdKey && productIdentity.sellerId === sellerIdKey) return true;
          if (sellerNameKey && productIdentity.vendor === sellerNameKey) return true;
          return false;
        })
        .map(([productId]) => productId);

      const productRatings = matchingProductIds
        .map((productId) => productAverageRatings[productId])
        .filter((value) => Number.isFinite(Number(value)));

      if (!productRatings.length) {
        acc[seller.id] = null;
        return acc;
      }

      const total = productRatings.reduce((sum, value) => sum + Number(value), 0);
      acc[seller.id] = Number((total / productRatings.length).toFixed(1));
      return acc;
    }, {});

    return sellers.map((seller) => ({
      ...seller,
      rating: sellerRatingById[seller.id],
    }));
  }, [sellers, products, reviews]);

  const metrics = useMemo(() => {
    const pendingProducts = products.filter(
      (p) => p.status === "pending",
    ).length;
    const activeProducts = products.filter((p) => p.status === "active").length;
    const reviewQueue = products.filter((p) => p.status === "draft").length;
    const totalRevenue = orders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0,
    );
    const pendingOrders = orders.filter((o) => o.status === "pending").length;
    const completedOrders = orders.filter(
      (o) => o.status === "delivered",
    ).length;
    const escalations = tickets.filter((t) => t.priority === "urgent").length;
    const openTickets = tickets.filter((t) => t.status === "open").length;
    const pendingPayouts = payouts.filter((p) => p.status === "pending").length;

    // Payment fee analytics — only from successful transaction records
    const successfulPayments = transactionPayments.filter(
      (p) => p.status === "success",
    );
    // Total Paystack processing fees deducted (convert from pesewas to GHS)
    const totalPaystackFees =
      successfulPayments.reduce(
        (sum, p) => sum + (Number(p.paystack_fee_pesewas) || 0),
        0,
      ) / 100;
    // Total service/delivery fees collected — all go to main Paystack account
    const totalServiceFees = successfulPayments.reduce(
      (sum, p) => sum + (Number(p.service_fee_amount) || 0),
      0,
    );
    // Total platform commission from sellers
    const totalCommissions = successfulPayments.reduce(
      (sum, p) => sum + (Number(p.platform_commission) || 0),
      0,
    );
    // Net platform revenue = service fees + commissions − Paystack processing fees
    const netPlatformRevenue = Math.max(
      0,
      totalServiceFees + totalCommissions - totalPaystackFees,
    );

    // Combined platform earnings headline (service fees + commission, before Paystack cut)
    const totalPlatformEarnings = totalServiceFees + totalCommissions;

    // Period breakdowns — use paid_at when available, fall back to created_at
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).toISOString();
    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).toISOString();

    // Service fee today / this month from express_payments
    const serviceFeeToday = successfulPayments
      .filter((p) => (p.paid_at || p.created_at) >= startOfToday)
      .reduce((sum, p) => sum + (Number(p.service_fee_amount) || 0), 0);

    const serviceFeeThisMonth = successfulPayments
      .filter((p) => (p.paid_at || p.created_at) >= startOfMonth)
      .reduce((sum, p) => sum + (Number(p.service_fee_amount) || 0), 0);

    // Fallback period totals from orders (covers orders that predate express_payments fee columns)
    const paidOrders = orders.filter((o) => o.payment_status === "success");
    const serviceFeeFromOrders = paidOrders.reduce(
      (sum, o) => sum + (Number(o.service_fee) || 0),
      0,
    );
    const resolvedServiceFees =
      totalServiceFees > 0 ? totalServiceFees : serviceFeeFromOrders;

    const serviceFeeTodayResolved =
      serviceFeeToday > 0
        ? serviceFeeToday
        : paidOrders
            .filter((o) => (o.paid_at || o.created_at) >= startOfToday)
            .reduce((sum, o) => sum + (Number(o.service_fee) || 0), 0);

    const serviceFeeThisMonthResolved =
      serviceFeeThisMonth > 0
        ? serviceFeeThisMonth
        : paidOrders
            .filter((o) => (o.paid_at || o.created_at) >= startOfMonth)
            .reduce((sum, o) => sum + (Number(o.service_fee) || 0), 0);

    // Commission period breakdowns
    const commissionToday = successfulPayments
      .filter((p) => (p.paid_at || p.created_at) >= startOfToday)
      .reduce((sum, p) => sum + (Number(p.platform_commission) || 0), 0);

    const commissionThisMonth = successfulPayments
      .filter((p) => (p.paid_at || p.created_at) >= startOfMonth)
      .reduce((sum, p) => sum + (Number(p.platform_commission) || 0), 0);

    return {
      pendingProducts,
      activeProducts,
      reviewQueue,
      totalRevenue,
      pendingOrders,
      completedOrders,
      escalations,
      openTickets,
      pendingPayouts,
      vendors: sellersWithComputedRatings.length,
      totalUsers: users.length,
      // Payment fee metrics
      totalPaystackFees,
      totalServiceFees: resolvedServiceFees,
      totalCommissions,
      netPlatformRevenue,
      totalPlatformEarnings: resolvedServiceFees + totalCommissions,
      // Period breakdowns
      serviceFeeToday: serviceFeeTodayResolved,
      serviceFeeThisMonth: serviceFeeThisMonthResolved,
      commissionToday,
      commissionThisMonth,
      platformEarningsToday: serviceFeeTodayResolved + commissionToday,
      platformEarningsThisMonth:
        serviceFeeThisMonthResolved + commissionThisMonth,
    };
  }, [
    products,
    orders,
    tickets,
    sellersWithComputedRatings,
    users,
    payouts,
    transactionPayments,
  ]);

  const updateProductStatus = useCallback(async (productId, status) => {
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from("express_products")
      .update({ status })
      .eq("id", productId);
    if (updateError) {
      Alert.alert("Unable to update product", updateError.message);
      return;
    }
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, status } : p)),
    );
  }, []);

  const deleteProduct = useCallback(
    async (productId) => {
      if (!supabase) return;

      let targetProduct = products.find((p) => p.id === productId) || null;

      if (!targetProduct) {
        const { data: productData, error: fetchError } = await supabase
          .from("express_products")
          .select("id, thumbnail, thumbnails")
          .eq("id", productId)
          .maybeSingle();

        if (fetchError) {
          Alert.alert("Unable to delete product", fetchError.message);
          return;
        }

        targetProduct = productData;
      }

      const rawUrls = extractProductImageUrls(targetProduct);

      const objectPaths = Array.from(
        new Set(rawUrls.flatMap((url) => buildStorageDeleteCandidates(url))),
      );

      if (rawUrls.length > 0 && objectPaths.length === 0) {
        Alert.alert(
          "Unable to delete product images",
          "Image paths could not be resolved from this product record. Product deletion was cancelled to prevent orphaned files.",
        );
        return;
      }

      if (objectPaths.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < objectPaths.length; i += chunkSize) {
          const chunk = objectPaths.slice(i, i + chunkSize);
          const { error: storageDeleteError } = await supabase.storage
            .from("express-products")
            .remove(chunk);

          if (storageDeleteError) {
            Alert.alert(
              "Unable to delete product images",
              storageDeleteError.message,
            );
            return;
          }
        }
      }

      const { error: deleteError } = await supabase
        .from("express_products")
        .delete()
        .eq("id", productId);

      if (deleteError) {
        Alert.alert("Unable to delete product", deleteError.message);
        return;
      }

      setProducts((prev) => prev.filter((p) => p.id !== productId));
    },
    [products],
  );

  const featureProduct = useCallback(
    async (productId) => {
      if (!supabase) return;
      const target = products.find((p) => p.id === productId);
      const badges = target?.badges?.length
        ? Array.from(new Set([...target.badges, "featured"]))
        : ["featured"];
      const { error: updateError } = await supabase
        .from("express_products")
        .update({ badges })
        .eq("id", productId);
      if (updateError) {
        Alert.alert("Unable to feature product", updateError.message);
        return;
      }
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, badges } : p)),
      );
    },
    [products],
  );

  const updateOrderStatus = useCallback(
    async (orderId, status) => {
      if (!supabase) return;

      // capture current order for notification
      const existing = orders.find((o) => o.id === orderId);

      const updates = { status, updated_at: new Date().toISOString() };
      if (status === "shipped") {
        updates.shipped_at = new Date().toISOString();
      } else if (status === "delivered") {
        updates.delivered_at = new Date().toISOString();
      }
      const { error: updateError } = await supabase
        .from("express_orders")
        .update(updates)
        .eq("id", orderId);
      if (updateError) {
        Alert.alert("Unable to update order", updateError.message);
        return;
      }
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...updates } : o)),
      );

      // send push notification to customer
      try {
        let customerId = existing?.user_id;
        let orderNumber = existing?.order_number;

        if (!customerId) {
          const { data: freshOrder, error: fetchErr } = await supabase
            .from("express_orders")
            .select("user_id,order_number")
            .eq("id", orderId)
            .single();
          if (fetchErr) {
            console.error(
              "Failed to fetch order for notification (admin):",
              fetchErr,
            );
          } else if (freshOrder) {
            customerId = freshOrder.user_id;
            orderNumber = freshOrder.order_number;
          }
        }

        if (customerId) {
          await notificationService.notifyCustomerOrderUpdate(
            customerId,
            orderId,
            status,
            orderNumber,
          );
        }
      } catch (err) {
        console.error("Failed to send order notification (admin):", err);
      }
    },
    [orders],
  );

  const updateTicketStatus = useCallback(async (ticketId, status) => {
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from("express_support_tickets")
      .update({ status })
      .eq("id", ticketId);
    if (updateError) {
      Alert.alert("Unable to update ticket", updateError.message);
      return;
    }
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status } : t)),
    );
  }, []);

  const addTicketMessage = useCallback(
    async (ticketId, message) => {
      if (!supabase) return;
      const target = tickets.find((t) => t.id === ticketId);
      const newMessages = [
        ...(target?.messages || []),
        {
          at: new Date().toISOString(),
          author: "Admin",
          body: message,
        },
      ];
      const { error: updateError } = await supabase
        .from("express_support_tickets")
        .update({ messages: newMessages })
        .eq("id", ticketId);
      if (updateError) {
        Alert.alert("Unable to reply to ticket", updateError.message);
        return;
      }
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId ? { ...t, messages: newMessages } : t,
        ),
      );
    },
    [tickets],
  );

  const updateReviewStatus = useCallback(async (reviewId, is_approved) => {
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from("express_reviews")
      .update({ is_approved, updated_at: new Date().toISOString() })
      .eq("id", reviewId);
    if (updateError) {
      Alert.alert("Unable to update review", updateError.message);
      return;
    }
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, is_approved } : r)),
    );
  }, []);

  const updateCommentStatus = useCallback(async (commentId, is_approved) => {
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from("express_review_comments")
      .update({ is_approved, updated_at: new Date().toISOString() })
      .eq("id", commentId);
    if (updateError) {
      Alert.alert("Unable to update comment", updateError.message);
      return;
    }
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, is_approved } : c)),
    );
  }, []);

  const deleteReview = useCallback(async (reviewId) => {
    if (!supabase) return;
    const { error: deleteError } = await supabase
      .from("express_reviews")
      .delete()
      .eq("id", reviewId);
    if (deleteError) {
      Alert.alert("Unable to remove review", deleteError.message);
      return;
    }
    setReviews((prev) => prev.filter((review) => review.id !== reviewId));
  }, []);

  const deleteComment = useCallback(async (commentId) => {
    if (!supabase) return;
    const { error: deleteError } = await supabase
      .from("express_review_comments")
      .delete()
      .eq("id", commentId);
    if (deleteError) {
      Alert.alert("Unable to remove comment", deleteError.message);
      return;
    }
    setComments((prev) => prev.filter((comment) => comment.id !== commentId));
  }, []);

  // Seller management
  const verifySeller = useCallback(async (sellerId, isVerified = true) => {
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from("express_sellers")
      .update({ is_verified: isVerified })
      .eq("id", sellerId);
    if (updateError) {
      Alert.alert("Unable to verify seller", updateError.message);
      return;
    }
    setSellers((prev) =>
      prev.map((s) =>
        s.id === sellerId ? { ...s, is_verified: isVerified } : s,
      ),
    );
  }, []);

  const updateSellerCommission = useCallback(
    async (sellerId, commissionRate) => {
      if (!supabase) return;
      const { error: updateError } = await supabase
        .from("express_sellers")
        .update({ commission_rate: commissionRate })
        .eq("id", sellerId);
      if (updateError) {
        Alert.alert("Unable to update commission", updateError.message);
        return;
      }
      setSellers((prev) =>
        prev.map((s) =>
          s.id === sellerId ? { ...s, commission_rate: commissionRate } : s,
        ),
      );
    },
    [],
  );

  const updateUserRole = useCallback(async (userId, role) => {
    if (!supabase) throw new Error("Supabase is not initialized");

    const normalizedRole = String(role || "")
      .trim()
      .toLowerCase();
    if (!normalizedRole) {
      throw new Error("A valid role is required.");
    }

    const { error: updateError } = await supabase
      .from("express_profiles")
      .update({ role: normalizedRole })
      .eq("id", userId);
    if (updateError) {
      throw new Error(updateError.message);
    }

    if (normalizedRole !== "seller") {
      const { error: sellerDeleteError } = await supabase
        .from("express_sellers")
        .delete()
        .eq("user_id", userId);
      if (sellerDeleteError) {
        throw new Error(sellerDeleteError.message);
      }
      setSellers((prev) => prev.filter((s) => s.user_id !== userId));
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: normalizedRole } : u)),
    );
  }, []);

  const deleteSeller = useCallback(async (sellerId) => {
    if (!supabase) throw new Error("Supabase is not initialized");
    if (!sellerId) throw new Error("Seller ID is required.");

    const seller = sellers.find((s) => s.id === sellerId);
    if (!seller) throw new Error("Seller not found.");

    const { error: deleteError } = await supabase
      .from("express_sellers")
      .delete()
      .eq("id", sellerId);
    if (deleteError) {
      throw new Error(deleteError.message);
    }

    setSellers((prev) => prev.filter((s) => s.id !== sellerId));

    if (seller.user_id) {
      await updateUserRole(seller.user_id, "customer");
    }
  }, [sellers, updateUserRole]);

  const promoteCustomerToSeller = useCallback(
    async ({ userId, email, fullName = "", phone = null }) => {
      if (!supabase) throw new Error("Supabase is not initialized");
      if (!userId) throw new Error("User ID is required.");
      if (!email) throw new Error("User email is required.");

      const normalizedName =
        String(fullName || "")
          .trim()
          .replace(/\s+/g, " ") ||
        String(email).split("@")[0] ||
        "Seller";

      const { data: existingSeller, error: sellerFetchError } = await supabase
        .from("express_sellers")
        .select("id,user_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (sellerFetchError) {
        throw new Error(sellerFetchError.message);
      }

      if (!existingSeller) {
        const basePayload = {
          user_id: userId,
          name: normalizedName,
          email,
          phone,
          rating: 0,
          fulfillment_speed: "Standard",
          weekly_target: 100,
        };

        let insertedSeller = null;
        const { data: inserted, error: insertSellerError } = await supabase
          .from("express_sellers")
          .insert(basePayload)
          .select("*")
          .single();

        if (insertSellerError) {
          if (insertSellerError.code !== "23505") {
            throw new Error(insertSellerError.message);
          }

          const fallbackName = `${normalizedName}-${String(userId).slice(0, 6)}`;
          const { data: fallbackInserted, error: fallbackInsertError } =
            await supabase
              .from("express_sellers")
              .insert({ ...basePayload, name: fallbackName })
              .select("*")
              .single();
          if (fallbackInsertError) {
            throw new Error(fallbackInsertError.message);
          }
          insertedSeller = fallbackInserted;
        } else {
          insertedSeller = inserted;
        }

        if (insertedSeller) {
          setSellers((prev) =>
            prev.some((s) => s.id === insertedSeller.id)
              ? prev
              : [insertedSeller, ...prev],
          );
        }
      }

      await updateUserRole(userId, "seller");

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo:
            "https://stephen-j4455.github.io/express-password-reset/password-reset.html?scheme=expressseller",
        },
      );
      if (resetError) {
        throw new Error(resetError.message);
      }
    },
    [updateUserRole],
  );

  // Category management
  const createCategory = useCallback(async ({ name, icon, color }) => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const safeName = name?.trim();
    if (!safeName) throw new Error("Category name is required");
    const { data, error: insertError } = await supabase
      .from("express_categories")
      .insert({
        name: safeName,
        icon: icon || "grid-outline",
        color: color || colors.primary,
      })
      .select()
      .single();
    if (insertError) {
      throw new Error(insertError.message);
    }
    setCategories((prev) => [...prev, data]);
    return data;
  }, []);

  const updateCategory = useCallback(async (categoryId, updates) => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const existingCategory = categories.find((c) => c.id === categoryId);
    if (!existingCategory) throw new Error("Category not found");

    const normalizedUpdates = {
      ...updates,
      name: updates?.name?.trim() || existingCategory.name,
      icon: updates?.icon || existingCategory.icon || "grid-outline",
      color: updates?.color || existingCategory.color || colors.primary,
    };

    const { data: updatedCategory, error: updateError } = await supabase
      .from("express_categories")
      .update(normalizedUpdates)
      .eq("id", categoryId)
      .select()
      .single();
    if (updateError) {
      throw new Error(updateError.message);
    }

    if (
      normalizedUpdates.name &&
      normalizedUpdates.name !== existingCategory.name
    ) {
      const { error: productsUpdateError } = await supabase
        .from("express_products")
        .update({ category: normalizedUpdates.name })
        .eq("category", existingCategory.name);
      if (productsUpdateError) {
        throw new Error(productsUpdateError.message);
      }
      setProducts((prev) =>
        prev.map((p) =>
          p.category === existingCategory.name
            ? { ...p, category: normalizedUpdates.name }
            : p,
        ),
      );
    }

    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? updatedCategory : c)),
    );
    return updatedCategory;
  }, [categories]);

  const deleteCategory = useCallback(async (categoryId) => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { error: deleteError } = await supabase
      .from("express_categories")
      .delete()
      .eq("id", categoryId);
    if (deleteError) {
      throw new Error(deleteError.message);
    }
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    return true;
  }, []);

  // Banner management
  const createBanner = useCallback(
    async ({ title, image_url, action_type, action_value, display_order }) => {
      if (!supabase) return;
      const { data, error: insertError } = await supabase
        .from("express_banners")
        .insert({
          title,
          image_url,
          action_type,
          action_value,
          display_order,
          is_active: true,
        })
        .select()
        .single();
      if (insertError) {
        Alert.alert("Unable to create banner", insertError.message);
        return;
      }
      setBanners((prev) => [...prev, data]);
    },
    [],
  );

  const updateBanner = useCallback(async (bannerId, updates) => {
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from("express_banners")
      .update(updates)
      .eq("id", bannerId);
    if (updateError) {
      Alert.alert("Unable to update banner", updateError.message);
      return;
    }
    setBanners((prev) =>
      prev.map((b) => (b.id === bannerId ? { ...b, ...updates } : b)),
    );
  }, []);

  const deleteBanner = useCallback(async (bannerId) => {
    if (!supabase) return;
    const { error: deleteError } = await supabase
      .from("express_banners")
      .delete()
      .eq("id", bannerId);
    if (deleteError) {
      Alert.alert("Unable to delete banner", deleteError.message);
      return;
    }
    setBanners((prev) => prev.filter((b) => b.id !== bannerId));
  }, []);

  // Coupon management
  const createCoupon = useCallback(
    async ({
      code,
      discount_type,
      discount_value,
      min_order_amount,
      max_uses,
      expires_at,
    }) => {
      if (!supabase) return;
      const { data, error: insertError } = await supabase
        .from("express_coupons")
        .insert({
          code: code.toUpperCase(),
          discount_type,
          discount_value,
          min_order_amount,
          max_uses,
          expires_at,
          is_active: true,
          current_uses: 0,
        })
        .select()
        .single();
      if (insertError) {
        Alert.alert("Unable to create coupon", insertError.message);
        return;
      }
      setCoupons((prev) => [data, ...prev]);
    },
    [],
  );

  const updateCoupon = useCallback(async (couponId, updates) => {
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from("express_coupons")
      .update(updates)
      .eq("id", couponId);
    if (updateError) {
      Alert.alert("Unable to update coupon", updateError.message);
      return;
    }
    setCoupons((prev) =>
      prev.map((c) => (c.id === couponId ? { ...c, ...updates } : c)),
    );
  }, []);

  const deleteCoupon = useCallback(async (couponId) => {
    if (!supabase) return;
    const { error: deleteError } = await supabase
      .from("express_coupons")
      .delete()
      .eq("id", couponId);
    if (deleteError) {
      Alert.alert("Unable to delete coupon", deleteError.message);
      return;
    }
    setCoupons((prev) => prev.filter((c) => c.id !== couponId));
  }, []);

  // Payout management
  const processPayout = useCallback(
    async (payoutId, status, transactionRef = null) => {
      if (!supabase) return;
      const updates = {
        status,
        processed_at: status === "completed" ? new Date().toISOString() : null,
        transaction_reference: transactionRef,
      };
      const { error: updateError } = await supabase
        .from("express_payouts")
        .update(updates)
        .eq("id", payoutId);
      if (updateError) {
        Alert.alert("Unable to process payout", updateError.message);
        return;
      }
      setPayouts((prev) =>
        prev.map((p) => (p.id === payoutId ? { ...p, ...updates } : p)),
      );
    },
    [],
  );

  // Settings management
  const updateSetting = useCallback(async (key, value) => {
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from("express_settings")
      .upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );

    if (updateError) {
      Alert.alert("Unable to update setting", updateError.message);
      return;
    }

    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const value = {
    products,
    categories,
    orders,
    sellers: sellersWithComputedRatings,
    tickets,
    users,
    banners,
    coupons,
    ads,
    payouts,
    loading,
    error,
    metrics,
    refresh: fetchAll,
    // Product actions
    updateProductStatus,
    deleteProduct,
    featureProduct,
    // Order actions
    updateOrderStatus,
    // Ticket actions
    updateTicketStatus,
    addTicketMessage,
    // Seller actions
    verifySeller,
    updateSellerCommission,
    deleteSeller,
    updateUserRole,
    promoteCustomerToSeller,
    // Category actions
    createCategory,
    updateCategory,
    deleteCategory,
    // Banner actions
    createBanner,
    updateBanner,
    deleteBanner,
    // Coupon actions
    createCoupon,
    updateCoupon,
    deleteCoupon,
    // Payout actions
    processPayout,
    // Settings actions
    updateSetting,
    settings,
    reviews,
    comments,
    updateReviewStatus,
    updateCommentStatus,
    deleteReview,
    deleteComment,
    logout,
    transactionPayments,
  };

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within AdminProvider");
  }
  return context;
};
