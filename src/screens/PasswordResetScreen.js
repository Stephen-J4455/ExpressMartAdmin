import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../supabase";
import { useToast } from "../context/ToastContext";
import { colors } from "../theme/colors";

export default function PasswordResetScreen({
  navigation,
  onComplete,
  recoveryToken,
  refreshToken,
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const toast = useToast();

  React.useEffect(() => {
    if (!recoveryToken) {
      setStatusMessage(
        "Invalid reset link: missing token. Please use the email link.",
      );
    }
  }, [recoveryToken, refreshToken]);

  const handleUpdate = async () => {
    if (loading) {
      return;
    }
    setLoading(true);

    if (!recoveryToken) {
      toast.error("Reset link invalid or expired");
      setStatusMessage("Invalid link: token missing.");
      setLoading(false);
      return;
    }

    // ensure auth session exists
    try {
      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession();
      if (!existingSession) {
        if (recoveryToken) {
          const { data: setData, error: setErr } =
            await supabase.auth.setSession({
              access_token: recoveryToken,
              refresh_token: refreshToken || "",
            });
          if (setErr) throw setErr;
          const {
            data: { session: newSession },
            error: newErr,
          } = await supabase.auth.getSession();
          if (!newSession) {
            throw new Error("unable to establish session after setSession");
          }
        } else {
          setStatusMessage(
            "No auth session available. Please try the link again or login first.",
          );
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.error("admin session setup error", err);
      toast.error("Failed to initialise session");
      setLoading(false);
      return;
    }

    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      setStatusMessage("Updating password...");
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      toast.success("Password updated successfully");
      setStatusMessage("✅ Password updated! Redirecting…");
      if (onComplete) {
        onComplete();
      } else if (navigation) {
        navigation.navigate("Login");
      }
    } catch (error) {
      console.error("admin password reset error", error);
      const msg = error.message || "Failed to update password";
      try {
        toast.error(msg);
      } catch (e) {
        console.error("toast failed", e);
      }
      setStatusMessage(`❌ ${msg}`);
    } finally {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn("admin signOut after reset failed", e);
      }
      setLoading(false);
      setTimeout(() => setStatusMessage(""), 5000);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="key" size={40} color={colors.primary} />
          </View>
          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>
            Your new password must be different from previously used passwords.
          </Text>
        </View>

        {statusMessage ? (
          <Text style={styles.status}>{statusMessage}</Text>
        ) : null}
        {!recoveryToken && (
          <Text style={[styles.status, { color: colors.warning }]}>
            Token required – open link from your email.
          </Text>
        )}

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={colors.muted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="New Password"
              placeholderTextColor={colors.muted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color={colors.muted}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={colors.muted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor={colors.muted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleUpdate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Reset Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  status: {
    textAlign: "center",
    color: colors.primary,
    marginVertical: 12,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    alignSelf: "center",
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.dark,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.dark,
  },
  button: {
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
