import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  Switch,
  Dimensions,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import ColorPicker from "react-native-wheel-color-picker";
import { supabase } from "../../supabase";
import { colors } from "../theme/colors";
import { Alert } from "../utils/alert";

const { width } = Dimensions.get("window");

const TABS = [
  { id: "content", label: "Content", icon: "document-text" },
  { id: "design", label: "Design", icon: "color-palette" },
  { id: "targeting", label: "Targeting", icon: "options" },
  { id: "schedule", label: "Schedule", icon: "calendar" },
];

const STYLES = [
  "banner",
  "card",
  "popup",
  "carousel",
  "story",
  "fullscreen",
  "sidebar",
  "sticky_footer",
];

const PLACEMENTS = [
  "home",
  "messages",
  "search",
  "search_results",
  "category",
  "product_detail",
  "checkout",
  "feed",
  "profile",
  "notification",
];

const STYLE_PLACEMENT_RULES = {
  carousel: ["home", "search", "profile"],
  card: ["home", "product_detail", "category", "search_results"],
  popup: ["home", "product_detail", "category", "search_results"],
  story: ["home", "messages"],
};

const getAllowedPlacementsForStyle = (style) =>
  STYLE_PLACEMENT_RULES[style] || PLACEMENTS;

const parsePlacementArray = (placement) => {
  if (Array.isArray(placement)) {
    return placement.map((p) => String(p).trim()).filter(Boolean);
  }
  return String(placement || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
};

const CTA_PLATFORMS = [
  {
    id: "website",
    label: "Website",
    icon: "globe-outline",
    placeholder: "https://example.com/promo",
    helper: "Use a full page URL or domain.",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: "logo-whatsapp",
    placeholder: "+2348012345678 or wa.me/2348012345678",
    helper: "Phone number, wa.me link, or WhatsApp URL.",
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: "logo-instagram",
    placeholder: "@expressmart or instagram.com/expressmart",
    helper: "Username or Instagram profile URL.",
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: "logo-facebook",
    placeholder: "expressmart or facebook.com/expressmart",
    helper: "Page username or Facebook URL.",
  },
  {
    id: "discord",
    label: "Discord",
    icon: "logo-discord",
    placeholder: "abc123 or discord.gg/abc123",
    helper: "Invite code or Discord invite URL.",
  },
  {
    id: "tiktok",
    label: "TikTok",
    icon: "logo-tiktok",
    placeholder: "@expressmart or tiktok.com/@expressmart",
    helper: "Creator handle or TikTok profile URL.",
  },
  {
    id: "twitch",
    label: "Twitch",
    icon: "logo-twitch",
    placeholder: "expressmartlive or twitch.tv/expressmartlive",
    helper: "Channel name or Twitch profile URL.",
  },
  {
    id: "x",
    label: "X",
    icon: "logo-twitter",
    placeholder: "@expressmart or x.com/expressmart",
    helper: "Handle or X profile URL.",
  },
  {
    id: "telegram",
    label: "Telegram",
    icon: "paper-plane-outline",
    placeholder: "@expressmart or t.me/expressmart",
    helper: "Username or Telegram link.",
  },
];

const ensureHttpProtocol = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const sanitizeHandle = (value) =>
  String(value || "")
    .trim()
    .replace(/^@+/, "")
    .replace(/^\/+/, "")
    .split(/[/?#]/)[0];

const inferCtaPlatform = (value, savedPlatform) => {
  if (savedPlatform && CTA_PLATFORMS.some((p) => p.id === savedPlatform)) {
    return savedPlatform;
  }

  const raw = String(value || "").toLowerCase();
  if (!raw) return "website";
  if (raw.includes("whatsapp") || raw.includes("wa.me")) return "whatsapp";
  if (raw.includes("instagram")) return "instagram";
  if (raw.includes("facebook") || raw.includes("fb.me")) return "facebook";
  if (raw.includes("discord.gg") || raw.includes("discord.com")) {
    return "discord";
  }
  if (raw.includes("tiktok")) return "tiktok";
  if (raw.includes("twitch")) return "twitch";
  if (raw.includes("x.com") || raw.includes("twitter.com")) return "x";
  if (raw.includes("telegram") || raw.includes("t.me")) return "telegram";
  return "website";
};

const buildDestinationUrl = (platform, rawValue) => {
  const input = String(rawValue || "").trim();
  if (!input) return "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(input)) return input;

  switch (platform) {
    case "website":
      return ensureHttpProtocol(input);
    case "whatsapp": {
      if (/^(wa\.me|api\.whatsapp\.com)\//i.test(input)) {
        return `https://${input}`;
      }
      const phone = input.replace(/[^0-9]/g, "");
      return phone ? `https://wa.me/${phone}` : ensureHttpProtocol(input);
    }
    case "instagram": {
      const handle = sanitizeHandle(input);
      return handle
        ? `https://instagram.com/${handle}`
        : ensureHttpProtocol(input);
    }
    case "facebook": {
      const handle = sanitizeHandle(input);
      return handle
        ? `https://facebook.com/${handle}`
        : ensureHttpProtocol(input);
    }
    case "discord": {
      const invite = sanitizeHandle(input);
      if (!invite) return ensureHttpProtocol(input);
      if (/^invite\//i.test(invite)) {
        return `https://discord.gg/${invite.replace(/^invite\//i, "")}`;
      }
      return `https://discord.gg/${invite}`;
    }
    case "tiktok": {
      const handle = sanitizeHandle(input);
      return handle
        ? `https://www.tiktok.com/@${handle}`
        : ensureHttpProtocol(input);
    }
    case "twitch": {
      const handle = sanitizeHandle(input);
      return handle
        ? `https://www.twitch.tv/${handle}`
        : ensureHttpProtocol(input);
    }
    case "x": {
      const handle = sanitizeHandle(input);
      return handle ? `https://x.com/${handle}` : ensureHttpProtocol(input);
    }
    case "telegram": {
      const handle = sanitizeHandle(input);
      return handle ? `https://t.me/${handle}` : ensureHttpProtocol(input);
    }
    default:
      return ensureHttpProtocol(input);
  }
};

const FormRow = ({ label, children, description }) => (
  <View style={styles.formRow}>
    <View style={styles.formRowHeader}>
      <Text style={styles.formLabel}>{label}</Text>
      {description && <Text style={styles.formRowDesc}>{description}</Text>}
    </View>
    {children}
  </View>
);

export const AdEditor = ({ initialValues, onSave, onCancel, loading }) => {
  const inferredPlatform = inferCtaPlatform(
    initialValues?.cta_url,
    initialValues?.cta_platform,
  );
  const [activeTab, setActiveTab] = useState("content");
  const [uploading, setUploading] = useState(false);
  const [localImageUri, setLocalImageUri] = useState(null);
  const [datePicker, setDatePicker] = useState({
    visible: false,
    field: null,
    value: new Date(),
  });
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
    style: "banner",
    placement: "home",
    cta_text: "Shop Now",
    cta_url: "",
    cta_platform: inferredPlatform,
    discount_badge: "",
    background_color: "#FFFFFF",
    text_color: "#1E293B",
    accent_color: colors.primary,
    discount_color: colors.danger,
    border_radius: 30,
    is_active: true,
    show_on_web: true,
    show_on_mobile: true,
    start_date: "",
    end_date: "",
    use_image_as_bg: false,
    ...initialValues,
    cta_platform: initialValues?.cta_platform || inferredPlatform,
  });

  const allowedPlacements = getAllowedPlacementsForStyle(formData.style);

  const handleStyleChange = (style) => {
    setFormData((prev) => {
      const nextAllowed = getAllowedPlacementsForStyle(style);
      const current = parsePlacementArray(prev.placement);
      const filtered = current.filter((p) => nextAllowed.includes(p));

      return {
        ...prev,
        style,
        placement: filtered.length > 0 ? filtered : [nextAllowed[0]],
      };
    });
  };

  const openDatePicker = (field) => {
    const currentDate = formData[field]
      ? new Date(formData[field])
      : new Date();
    setDatePicker({
      visible: true,
      field,
      value: isNaN(currentDate.getTime()) ? new Date() : currentDate,
    });
  };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setDatePicker((prev) => ({ ...prev, visible: false }));
    }
    if (event.type === "dismissed") {
      setDatePicker((prev) => ({ ...prev, visible: false }));
      return;
    }
    if (selectedDate && datePicker.field) {
      updateField(datePicker.field, selectedDate.toISOString());
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLocalImageUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Error picking image: " + error.message);
    }
  };

  const uploadFile = async (uri) => {
    const cleanUri = uri?.split("?")[0] || "";
    const fileNameSegment = cleanUri.split("/").pop() || "";
    const parsedExt = fileNameSegment.includes(".")
      ? fileNameSegment.split(".").pop()?.toLowerCase()
      : null;
    const fileExt = parsedExt && parsedExt.length <= 5 ? parsedExt : "jpg";
    const normalizedExt = fileExt === "jpeg" ? "jpg" : fileExt;
    const fileName = `ad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${normalizedExt}`;

    let detectedContentType = null;
    if (Platform.OS === "web") {
      try {
        const resp = await fetch(uri);
        detectedContentType = resp.headers?.get?.("content-type") || null;
      } catch (error) {
        // Ignore content-type detection failures and use extension fallback.
      }
    }

    const contentType =
      detectedContentType ||
      `image/${normalizedExt === "jpg" ? "jpeg" : normalizedExt}`;

    let uploadRes;
    if (Platform.OS === "web") {
      const response = await fetch(uri);
      const blob = await response.blob();
      uploadRes = await supabase.storage
        .from("ad-images")
        .upload(fileName, blob, {
          contentType,
          cacheControl: "3600",
          upsert: false,
        });
    } else {
      const formDataUpload = new FormData();
      formDataUpload.append("file", {
        uri,
        type: contentType,
        name: fileName,
      });

      uploadRes = await supabase.storage
        .from("ad-images")
        .upload(fileName, formDataUpload, {
          contentType,
          cacheControl: "3600",
          upsert: false,
        });
    }

    const uploadError = uploadRes?.error;

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("ad-images").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSave = async () => {
    setUploading(true);
    try {
      let infoToSave = { ...formData };
      if (infoToSave.start_date === "") infoToSave.start_date = null;
      if (infoToSave.end_date === "") infoToSave.end_date = null;

      // Normalize placement to string for DB compatibility
      if (Array.isArray(infoToSave.placement)) {
        infoToSave.placement = infoToSave.placement.join(",");
      }

      const allowedForStyle = getAllowedPlacementsForStyle(infoToSave.style);
      const normalizedPlacements = parsePlacementArray(
        infoToSave.placement,
      ).filter((p) => allowedForStyle.includes(p));
      infoToSave.placement =
        normalizedPlacements.length > 0
          ? normalizedPlacements.join(",")
          : allowedForStyle[0];

      if (localImageUri) {
        const publicUrl = await uploadFile(localImageUri);
        infoToSave.image_url = publicUrl;
      }

      const normalizedCtaUrl = buildDestinationUrl(
        infoToSave.cta_platform,
        infoToSave.cta_url,
      );

      if (infoToSave.cta_url?.trim() && !normalizedCtaUrl) {
        throw new Error("Please provide a valid destination value.");
      }

      infoToSave.cta_url = normalizedCtaUrl || null;
      delete infoToSave.cta_platform;

      await onSave(infoToSave);
    } catch (error) {
      Alert.alert("Save failed", error.message);
    } finally {
      setUploading(false);
    }
  };

  const updateField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const renderPreview = () => {
    const imageSource = localImageUri || formData.image_url;
    const useImageBg = formData.use_image_as_bg && imageSource;
    const style = formData.style;

    const getFormatLayout = () => {
      switch (style) {
        case "banner":
          return { height: 100, width: "100%", flexDirection: "row" };
        case "story":
          return {
            height: 280,
            width: width * 0.4,
            alignSelf: "center",
            flexDirection: "column",
          };
        case "popup":
          return {
            height: 200,
            width: 200,
            alignSelf: "center",
            flexDirection: "column",
            borderWidth: 2,
          };
        case "fullscreen":
          return { height: 320, width: "100%", flexDirection: "column" };
        case "sidebar":
          return {
            height: 220,
            width: 120,
            alignSelf: "center",
            flexDirection: "column",
          };
        case "sticky_footer":
          return {
            height: 80,
            width: "100%",
            flexDirection: "row",
            borderTopWidth: 4,
            borderTopColor: formData.accent_color,
          };
        case "carousel":
          return { height: 160, width: "100%", flexDirection: "row" };
        default:
          return {
            height: useImageBg ? 160 : "auto",
            width: "100%",
            flexDirection: "row",
          };
      }
    };

    const layout = getFormatLayout();
    const isVertical = layout.flexDirection === "column";

    return (
      <View style={styles.previewContainer}>
        <View style={styles.previewHeaderRow}>
          <Ionicons name="eye-outline" size={16} color={colors.muted} />
          <Text style={styles.previewHeaderText}>
            LIVE PREVIEW: {style.toUpperCase()}
          </Text>
        </View>
        <View style={styles.previewWrapper}>
          <View
            style={[
              styles.previewCard,
              {
                backgroundColor: formData.background_color,
                borderRadius: formData.border_radius,
                height: layout.height,
                width: layout.width,
                alignSelf: layout.alignSelf || "auto",
              },
            ]}
          >
            {useImageBg && (
              <>
                <Image
                  source={{ uri: imageSource }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: "rgba(0,0,0,0.4)" },
                  ]}
                />
              </>
            )}

            <View
              style={[
                styles.previewMain,
                { flex: 1, padding: 16, flexDirection: layout.flexDirection },
                useImageBg && { padding: 20 },
              ]}
            >
              {!useImageBg && (
                <View
                  style={[
                    styles.previewImageContainer,
                    isVertical && {
                      width: "100%",
                      height: 100,
                      marginBottom: 10,
                    },
                  ]}
                >
                  {imageSource ? (
                    <Image
                      source={{ uri: imageSource }}
                      style={[
                        styles.previewImage,
                        isVertical && { width: "100%", height: "100%" },
                      ]}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.placeholderImage,
                        isVertical && { width: "100%", height: "100%" },
                      ]}
                    >
                      <Ionicons
                        name="image-outline"
                        size={32}
                        color={colors.muted}
                      />
                    </View>
                  )}
                  {formData.discount_badge ? (
                    <View
                      style={[
                        styles.previewBadge,
                        { backgroundColor: formData.discount_color },
                      ]}
                    >
                      <Text style={styles.previewBadgeText}>
                        {formData.discount_badge}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}

              <View
                style={[
                  styles.previewDetails,
                  useImageBg && { justifyContent: "flex-end" },
                  style === "sticky_footer" && {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  },
                ]}
              >
                {useImageBg && formData.discount_badge && (
                  <View
                    style={[
                      styles.previewBadge,
                      {
                        backgroundColor: formData.discount_color,
                        position: "relative",
                        alignSelf: "flex-start",
                        top: 0,
                        left: 0,
                        marginBottom: 8,
                      },
                    ]}
                  >
                    <Text style={styles.previewBadgeText}>
                      {formData.discount_badge}
                    </Text>
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Text
                      style={[
                        styles.previewTitle,
                        { color: useImageBg ? "#fff" : formData.text_color },
                        style === "banner" && { fontSize: 14 },
                      ]}
                      numberOfLines={1}
                    >
                      {formData.title || "Headline"}
                    </Text>
                    {style === "sticky_footer" && (
                      <View
                        style={[
                          styles.previewBtn,
                          {
                            backgroundColor: formData.accent_color,
                            marginTop: 0,
                          },
                        ]}
                      >
                        <Text style={styles.previewBtnText}>
                          {formData.cta_text || "Shop"}
                        </Text>
                      </View>
                    )}
                  </View>

                  {style !== "sticky_footer" && (
                    <Text
                      style={[
                        styles.previewDesc,
                        {
                          color: useImageBg ? "#fff" : formData.text_color,
                          opacity: 0.9,
                        },
                        style === "banner" && { fontSize: 11 },
                      ]}
                      numberOfLines={isVertical ? 2 : 1}
                    >
                      {formData.description || "Description..."}
                    </Text>
                  )}
                </View>

                {style !== "sticky_footer" && (
                  <View
                    style={[
                      styles.previewBtn,
                      {
                        backgroundColor: formData.accent_color,
                        marginTop: useImageBg ? 10 : 6,
                      },
                    ]}
                  >
                    <Text style={styles.previewBtnText}>
                      {formData.cta_text || "Shop Now"}
                    </Text>
                  </View>
                )}

                {style === "carousel" && (
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 4,
                      marginTop: 10,
                      alignSelf: "center",
                    }}
                  >
                    {[1, 2, 3].map((i) => (
                      <View
                        key={i}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor:
                            i === 1 ? formData.accent_color : "#CBD5E1",
                        }}
                      />
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderContentTab = () => (
    <View style={styles.tabScrollContent}>
      {(() => {
        const selectedPlatform =
          CTA_PLATFORMS.find((item) => item.id === formData.cta_platform) ||
          CTA_PLATFORMS[0];

        return (
          <>
            <FormRow
              label="Destination Platform"
              description="Choose where the CTA button should send users"
            >
              <View style={styles.optionGrid}>
                {CTA_PLATFORMS.map((platformOption) => {
                  const active = formData.cta_platform === platformOption.id;
                  return (
                    <TouchableOpacity
                      key={platformOption.id}
                      style={[
                        styles.optionItem,
                        active && styles.optionItemActive,
                      ]}
                      onPress={() =>
                        updateField("cta_platform", platformOption.id)
                      }
                    >
                      <View style={styles.optionWithIcon}>
                        <Ionicons
                          name={platformOption.icon}
                          size={14}
                          color={active ? colors.primary : colors.muted}
                        />
                        <Text
                          style={[
                            styles.optionText,
                            active && styles.optionTextActive,
                          ]}
                        >
                          {platformOption.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </FormRow>

            <FormRow
              label={`Destination Value (${selectedPlatform.label})`}
              description={selectedPlatform.helper}
            >
              <TextInput
                style={styles.input}
                value={formData.cta_url}
                onChangeText={(t) => updateField("cta_url", t)}
                placeholder={selectedPlatform.placeholder}
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </FormRow>
          </>
        );
      })()}

      <FormRow label="Headline" description="The main message of your ad">
        <TextInput
          style={styles.input}
          value={formData.title}
          onChangeText={(t) => updateField("title", t)}
          placeholder="e.g. Summer Mega Sale"
          placeholderTextColor="#94A3B8"
        />
      </FormRow>

      <FormRow label="Description" description="Tell them more about the offer">
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.description}
          onChangeText={(t) => updateField("description", t)}
          placeholder="Save up to 50% on all electronics..."
          placeholderTextColor="#94A3B8"
          multiline
        />
      </FormRow>

      <FormRow label="Visual Asset" description="High quality images work best">
        <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
          <Ionicons
            name="cloud-upload-outline"
            size={24}
            color={colors.primary}
          />
          <Text style={styles.imagePickerBtnText}>
            {localImageUri || formData.image_url
              ? "Change Media Asset"
              : "Select Image from Device"}
          </Text>
        </TouchableOpacity>
      </FormRow>

      <View style={styles.gridRow}>
        <View style={{ flex: 1 }}>
          <FormRow label="CTA Text">
            <TextInput
              style={styles.input}
              value={formData.cta_text}
              onChangeText={(t) => updateField("cta_text", t)}
              placeholder="Shop Now"
              placeholderTextColor="#94A3B8"
            />
          </FormRow>
        </View>
        <View style={{ flex: 1 }}>
          <FormRow label="Discount Label">
            <TextInput
              style={styles.input}
              value={formData.discount_badge}
              onChangeText={(t) => updateField("discount_badge", t)}
              placeholder="50% OFF"
              placeholderTextColor="#94A3B8"
            />
          </FormRow>
        </View>
      </View>
    </View>
  );

  const renderDesignTab = () => (
    <View style={styles.tabScrollContent}>
      <FormRow label="Ad Format Style">
        <View style={styles.optionGrid}>
          {STYLES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.optionItem,
                formData.style === s && styles.optionItemActive,
              ]}
              onPress={() => handleStyleChange(s)}
            >
              <Text
                style={[
                  styles.optionText,
                  formData.style === s && styles.optionTextActive,
                ]}
              >
                {s.replace("_", " ")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </FormRow>

      <View style={styles.settingsGroup}>
        <View style={styles.settingsRow}>
          <View>
            <Text style={styles.settingsTitle}>Image Background</Text>
            <Text style={styles.settingsSubtitle}>
              Overlay text on the asset
            </Text>
          </View>
          <Switch
            value={formData.use_image_as_bg}
            onValueChange={(v) => updateField("use_image_as_bg", v)}
            trackColor={{ false: "#E2E8F0", true: colors.primary }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingsRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingsTitle}>Corner Radius</Text>
            <Text style={styles.settingsSubtitle}>
              Card roundness ({formData.border_radius}px)
            </Text>
          </View>
          <TextInput
            style={[
              styles.input,
              styles.radiusInput,
            ]}
            value={String(formData.border_radius)}
            onChangeText={(t) => updateField("border_radius", Number(t) || 0)}
            keyboardType="numeric"
          />
        </View>
      </View>

      <FormRow label="Brand Palette">
        <View style={styles.paletteContainer}>
          {[
            { label: "Surface", key: "background_color" },
            { label: "Text", key: "text_color" },
            { label: "Accent", key: "accent_color" },
            { label: "Promo", key: "discount_color" },
          ].map((item, index, list) => (
            <View key={item.key}>
              <ColorControl
                label={item.label}
                color={formData[item.key]}
                onSelect={(c) => updateField(item.key, c)}
              />
              {index < list.length - 1 ? <View style={styles.paletteDivider} /> : null}
            </View>
          ))}
        </View>
      </FormRow>
      <View style={styles.designTabBottomSpace} />
    </View>
  );

  const renderTargetingTab = () => (
    <View style={styles.tabScrollContent}>
      <FormRow
        label="Contextual Placement"
        description="Select one or more surfaces for this ad style"
      >
        <View style={styles.optionGrid}>
          {allowedPlacements.map((p) => {
            const placements = Array.isArray(formData.placement)
              ? formData.placement
              : formData.placement?.split(",") || [];
            const isActive = placements.includes(p);

            return (
              <TouchableOpacity
                key={p}
                style={[styles.optionItem, isActive && styles.optionItemActive]}
                onPress={() => {
                  const next = isActive
                    ? placements.filter((x) => x !== p)
                    : [...placements, p];
                  updateField("placement", next);
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    isActive && styles.optionTextActive,
                  ]}
                >
                  {isActive ? "✓ " : ""}
                  {p.replace("_", " ")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </FormRow>

      <View style={styles.settingsGroup}>
        <View style={styles.settingsRow}>
          <View>
            <Text style={styles.settingsTitle}>Web Presence</Text>
            <Text style={styles.settingsSubtitle}>
              Enable for desktop browsers
            </Text>
          </View>
          <Switch
            value={formData.show_on_web}
            onValueChange={(v) => updateField("show_on_web", v)}
            trackColor={{ false: "#E2E8F0", true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.settingsRow}>
          <View>
            <Text style={styles.settingsTitle}>Mobile Apps</Text>
            <Text style={styles.settingsSubtitle}>
              Enable for iOS & Android
            </Text>
          </View>
          <Switch
            value={formData.show_on_mobile}
            onValueChange={(v) => updateField("show_on_mobile", v)}
            trackColor={{ false: "#E2E8F0", true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
      </View>
    </View>
  );

  const renderScheduleTab = () => (
    <View style={styles.tabScrollContent}>
      <View style={[styles.settingsGroup, { marginBottom: 24 }]}>
        <View style={styles.settingsRow}>
          <View>
            <Text style={styles.settingsTitle}>Status</Text>
            <Text style={styles.settingsSubtitle}>Activate immediately</Text>
          </View>
          <Switch
            value={formData.is_active}
            onValueChange={(v) => updateField("is_active", v)}
            trackColor={{ false: "#E2E8F0", true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <View style={styles.gridRow}>
        <View style={{ flex: 1 }}>
          <FormRow label="Start Date">
            <TouchableOpacity
              style={styles.datePickerTrigger}
              onPress={() => openDatePicker("start_date")}
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={colors.primary}
              />
              <Text
                style={[
                  styles.dateText,
                  !formData.start_date && { color: "#94A3B8" },
                ]}
              >
                {formData.start_date
                  ? new Date(formData.start_date).toLocaleDateString()
                  : "Set start"}
              </Text>
            </TouchableOpacity>
          </FormRow>
        </View>
        <View style={{ flex: 1 }}>
          <FormRow label="End Date">
            <TouchableOpacity
              style={styles.datePickerTrigger}
              onPress={() => openDatePicker("end_date")}
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={colors.primary}
              />
              <Text
                style={[
                  styles.dateText,
                  !formData.end_date && { color: "#94A3B8" },
                ]}
              >
                {formData.end_date
                  ? new Date(formData.end_date).toLocaleDateString()
                  : "Set end"}
              </Text>
            </TouchableOpacity>
          </FormRow>
        </View>
      </View>

      {datePicker.visible && (
        <View style={styles.datePickerWrapper}>
          <DateTimePicker
            value={datePicker.value}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onDateChange}
          />
          {Platform.OS === "ios" && (
            <TouchableOpacity
              onPress={() =>
                setDatePicker((prev) => ({ ...prev, visible: false }))
              }
              style={styles.doneBtn}
            >
              <Text style={styles.doneBtnText}>Apply Selection</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.headerSideBtn}>
          <Ionicons name="close" size={24} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {initialValues?.id ? "Edit Campaign" : "New Campaign"}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading || uploading}
          style={[
            styles.headerSaveBtn,
            (loading || uploading) && { opacity: 0.5 },
          ]}
        >
          <Text style={styles.saveText}>
            {loading || uploading ? "..." : "Publish"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabItem, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon + (activeTab === tab.id ? "" : "-outline")}
              size={18}
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

      {renderPreview()}

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.body}>
          {activeTab === "content" && renderContentTab()}
          {activeTab === "design" && renderDesignTab()}
          {activeTab === "targeting" && renderTargetingTab()}
          {activeTab === "schedule" && renderScheduleTab()}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const ColorControl = ({ label, color, onSelect }) => {
  const [showPresets, setShowPresets] = useState(false);
  return (
    <View style={[styles.colorControl, showPresets && styles.colorControlActive]}>
      <View style={styles.colorRow}>
        <View>
          <Text style={styles.colorLabel}>{label}</Text>
          <Text style={styles.colorValue}>{String(color || "").toUpperCase()}</Text>
        </View>
        <TouchableOpacity
          style={styles.colorAction}
          onPress={() => setShowPresets(!showPresets)}
        >
          <View style={[styles.colorTrigger, { backgroundColor: color }]}>
            {color === "#FFFFFF" && <View style={styles.colorBorder} />}
          </View>
          <Text style={styles.colorActionText}>Pick</Text>
        </TouchableOpacity>
      </View>
      {showPresets && (
        <View style={styles.presetsPopup}>
          <View style={styles.colorWheelWrap}>
            <ColorPicker
              color={color}
              onColorChangeComplete={onSelect}
              thumbSize={18}
              sliderSize={16}
              row={false}
              swatches={false}
              style={styles.colorWheel}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 52 : (StatusBar.currentHeight || 0) + 12,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.dark,
  },
  headerSideBtn: {
    padding: 4,
  },
  headerSaveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
  },
  tabTextActive: {
    color: colors.primary,
  },
  scroll: {
    flex: 1,
  },
  previewContainer: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  previewHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  previewHeaderText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 1,
  },
  previewWrapper: {
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  previewCard: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  previewMain: {
    flexDirection: "row",
    gap: 16,
    padding: 16,
  },
  previewImageContainer: {
    position: "relative",
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  previewBadge: {
    position: "absolute",
    top: -8,
    left: -8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  previewBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  previewDetails: {
    flex: 1,
    justifyContent: "space-between",
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  previewDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginVertical: 4,
  },
  previewBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 4,
  },
  previewBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  body: {
    padding: 16,
  },
  tabScrollContent: {
    gap: 20,
  },
  formRow: {
    gap: 8,
  },
  formRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.dark,
  },
  formRowDesc: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.dark,
  },
  radiusInput: {
    width: 60,
    height: 40,
    textAlign: "center",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  imagePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 16,
    justifyContent: "center",
  },
  imagePickerBtnText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  gridRow: {
    flexDirection: "row",
    gap: 16,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  optionWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  optionItemActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  optionTextActive: {
    color: colors.primary,
  },
  settingsGroup: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  settingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  settingsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.dark,
  },
  settingsSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },
  paletteContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "visible",
    gap: 2,
  },
  paletteDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },
  colorControl: {
    position: "relative",
    paddingVertical: 10,
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  colorControlActive: {
    zIndex: 200,
    elevation: 20,
  },
  colorLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
  },
  colorValue: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.dark,
    marginTop: 4,
    letterSpacing: 0.4,
  },
  colorAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  colorTrigger: {
    width: 26,
    height: 26,
    borderRadius: 13,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  colorActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  colorBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  presetsPopup: {
    position: "absolute",
    top: 52,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    width: 200,
    zIndex: 100,
    shadowColor: "#0f172a",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  colorWheelWrap: {
    width: "100%",
    height: 260,
  },
  colorWheel: {
    flex: 1,
  },
  designTabBottomSpace: { height: 220 },
  datePickerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 14,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.dark,
  },
  datePickerWrapper: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 8,
  },
  doneBtn: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  doneBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
});
