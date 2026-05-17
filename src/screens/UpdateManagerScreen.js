import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../supabase";
import { colors } from "../theme/colors";
import { Alert } from "../utils/alert";

export const UpdateManagerScreen = () => {
  const [app, setApp] = useState("customer");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [platformValue, setPlatformValue] = useState("android");
  const [platformPickerOpen, setPlatformPickerOpen] = useState(false);
  const [latestVersion, setLatestVersion] = useState("");
  const [minVersion, setMinVersion] = useState("");
  const [forceUpdate, setForceUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [app, platformValue]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      let config = null;
      if (platformValue) {
        const { data, error } = await supabase
          .from("app_updates")
          .select("*")
          .eq("app", app)
          .eq("platform", platformValue)
          .maybeSingle();
        if (error && error.code !== "PGRST116") throw error;
        config = data;
      }

      if (!config) {
        const { data, error } = await supabase
          .from("app_updates")
          .select("*")
          .eq("app", app)
          .is("platform", null)
          .maybeSingle();
        if (error && error.code !== "PGRST116") throw error;
        config = data;
      }

      if (config) {
        setLatestVersion(config.latest_version || "");
        setMinVersion(config.min_version || "");
        setForceUpdate(!!config.force_update);
        setUpdateMessage(config.update_message || "");
        setDownloadUrl(config.download_url || "");
        setPlatformValue(config.platform || platformValue || "android");
      } else {
        setLatestVersion("");
        setMinVersion("");
        setForceUpdate(false);
        setUpdateMessage("");
        setDownloadUrl("");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to fetch update config");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const payload = {
        app,
        platform: platformValue || null,
        latest_version: latestVersion || null,
        min_version: minVersion || null,
        force_update: forceUpdate,
        update_message: updateMessage || null,
        download_url: downloadUrl || null,
        published_at: new Date(),
      };
      const { error } = await supabase
        .from("app_updates")
        .upsert(payload, { onConflict: "app,platform" })
        .select()
        .maybeSingle();
      if (error) throw error;
      Alert.alert("Saved", "Update configuration saved");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to save update configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete", `Delete update configuration for ${app}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            let q = supabase.from("app_updates").delete().eq("app", app);
            if (platformValue) q = q.eq("platform", platformValue);
            else q = q.is("platform", null);
            const { error } = await q;
            if (error) throw error;
            Alert.alert("Deleted");
            setLatestVersion("");
            setMinVersion("");
            setForceUpdate(false);
            setUpdateMessage("");
            setDownloadUrl("");
          } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to delete configuration");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#0f172a", "#1e293b", "#334155"]}
          style={styles.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroPill}>
              <Ionicons name="rocket-outline" size={12} color="#fff" />
              <Text style={styles.heroPillText}>Version Control</Text>
            </View>
            {loading && (
              <View style={styles.loadingBadge}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.loadingBadgeText}>Syncing</Text>
              </View>
            )}
          </View>
          <Text style={styles.heroTitle}>Update Manager</Text>
          <Text style={styles.heroSub}>
            Control app versions, forced upgrades, and release messaging.
          </Text>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Target Build</Text>
          <Text style={styles.label}>App</Text>
          <TouchableOpacity
            style={styles.pickerWrap}
            onPress={() => setPickerOpen((s) => !s)}
          >
            <Text style={styles.pickerText}>{app}</Text>
            <Ionicons
              name={pickerOpen ? "chevron-up" : "chevron-down"}
              size={16}
              color={colors.muted}
            />
          </TouchableOpacity>
          {pickerOpen && (
            <View style={styles.pickerDropdown}>
              {["customer", "seller", "admin"].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => {
                    setApp(opt);
                    setPickerOpen(false);
                  }}
                  style={styles.pickerOptionWrap}
                >
                  <Text
                    style={
                      opt === app
                        ? styles.pickerOptionSelected
                        : styles.pickerOption
                    }
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Platform</Text>
          <TouchableOpacity
            style={styles.pickerWrap}
            onPress={() => setPlatformPickerOpen((s) => !s)}
          >
            <Text style={styles.pickerText}>{platformValue}</Text>
            <Ionicons
              name={platformPickerOpen ? "chevron-up" : "chevron-down"}
              size={16}
              color={colors.muted}
            />
          </TouchableOpacity>
          {platformPickerOpen && (
            <View style={styles.pickerDropdown}>
              {["android", "ios"].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => {
                    setPlatformValue(opt);
                    setPlatformPickerOpen(false);
                  }}
                  style={styles.pickerOptionWrap}
                >
                  <Text
                    style={
                      opt === platformValue
                        ? styles.pickerOptionSelected
                        : styles.pickerOption
                    }
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Version Rules</Text>
          <Text style={styles.label}>Latest Version</Text>
          <TextInput
            value={latestVersion}
            onChangeText={setLatestVersion}
            placeholder="e.g. 1.2.0"
            style={styles.input}
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.label}>Minimum Allowed Version</Text>
          <TextInput
            value={minVersion}
            onChangeText={setMinVersion}
            placeholder="e.g. 1.1.0"
            style={styles.input}
            placeholderTextColor={colors.muted}
          />

          <View style={styles.switchCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Force Update</Text>
              <Text style={styles.switchHint}>
                Require update for versions below the minimum allowed version.
              </Text>
            </View>
            <Switch value={forceUpdate} onValueChange={setForceUpdate} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Prompt</Text>
          <Text style={styles.label}>Update Message / Release Notes</Text>
          <TextInput
            value={updateMessage}
            onChangeText={setUpdateMessage}
            placeholder="Short message to show users"
            style={[styles.input, styles.textarea]}
            placeholderTextColor={colors.muted}
            multiline
          />

          <Text style={styles.label}>Download / Release URL</Text>
          <TextInput
            value={downloadUrl}
            onChangeText={setDownloadUrl}
            placeholder="https://example.com/update"
            style={styles.input}
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={styles.saveText}>{loading ? "Saving..." : "Save"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.deleteBtn, loading && styles.buttonDisabled]}
          onPress={handleDelete}
          disabled={loading}
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light },
  container: { flex: 1, backgroundColor: colors.light },
  content: { paddingHorizontal: 16, paddingTop: 50, paddingBottom: 140 },
  hero: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroPillText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  loadingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  loadingBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  heroTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  heroSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginTop: 4,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: colors.muted,
    fontWeight: "700",
    marginBottom: 12,
  },
  label: {
    fontWeight: "700",
    color: colors.dark,
    marginBottom: 8,
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#F8FAFC",
    color: colors.dark,
    fontSize: 14,
  },
  textarea: {
    height: 120,
    textAlignVertical: "top",
  },
  switchCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
  },
  switchTitle: { fontSize: 14, fontWeight: "700", color: colors.dark },
  switchHint: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 17,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  saveText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  deleteBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  deleteText: { color: colors.danger, fontWeight: "800", fontSize: 15 },
  buttonDisabled: { opacity: 0.6 },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerText: {
    color: colors.dark,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  pickerDropdown: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  pickerOptionWrap: { paddingVertical: 10, paddingHorizontal: 12 },
  pickerOption: { color: colors.dark, textTransform: "capitalize" },
  pickerOptionSelected: {
    color: colors.primary,
    fontWeight: "800",
    textTransform: "capitalize",
  },
});
