import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../theme/colors";
import { setAlertHandler } from "../utils/alert";

const CustomAlertContext = createContext(null);

const DEFAULT_BUTTON = { text: "OK", style: "default" };

export const CustomAlertProvider = ({ children }) => {
  const [alertState, setAlertState] = useState(null);

  const showAlert = (title, message, buttons, options) => {
    const normalizedButtons =
      Array.isArray(buttons) && buttons.length > 0 ? buttons : [DEFAULT_BUTTON];

    setAlertState({
      title: title || "Notice",
      message: message || "",
      buttons: normalizedButtons,
      cancelable: options?.cancelable !== false,
    });
  };

  useEffect(() => {
    setAlertHandler(showAlert);
    return () => setAlertHandler(null);
  }, []);

  const closeAlert = () => setAlertState(null);

  const handlePress = (button) => {
    closeAlert();
    if (typeof button?.onPress === "function") button.onPress();
  };

  const value = useMemo(() => ({ showAlert }), []);

  return (
    <CustomAlertContext.Provider value={value}>
      {children}

      <Modal
        visible={!!alertState}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (alertState?.cancelable) closeAlert();
        }}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            if (alertState?.cancelable) closeAlert();
          }}
        >
          <Pressable style={styles.card}>
            <Text style={styles.title}>{alertState?.title}</Text>
            {!!alertState?.message && (
              <Text style={styles.message}>{alertState.message}</Text>
            )}

            <View style={styles.actions}>
              {alertState?.buttons?.map((button, index) => {
                const isDestructive = button?.style === "destructive";
                const isCancel = button?.style === "cancel";

                return (
                  <TouchableOpacity
                    key={`${button?.text || "button"}-${index}`}
                    style={[
                      styles.actionBtn,
                      isDestructive && styles.actionBtnDestructive,
                      isCancel && styles.actionBtnCancel,
                    ]}
                    onPress={() => handlePress(button)}
                  >
                    <Text
                      style={[
                        styles.actionText,
                        isDestructive && styles.actionTextDestructive,
                      ]}
                    >
                      {button?.text || "OK"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </CustomAlertContext.Provider>
  );
};

export const useCustomAlert = () => useContext(CustomAlertContext);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.dark,
  },
  message: {
    marginTop: 8,
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  actions: {
    marginTop: 16,
    gap: 10,
  },
  actionBtn: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    backgroundColor: "#fff",
  },
  actionBtnDestructive: {
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  actionBtnCancel: {
    backgroundColor: "#F8FAFC",
  },
  actionText: {
    color: colors.dark,
    fontWeight: "700",
    fontSize: 14,
  },
  actionTextDestructive: {
    color: colors.danger,
  },
});

