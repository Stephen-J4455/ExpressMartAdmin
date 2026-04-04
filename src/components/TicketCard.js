import { Pressable, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { StatusPill } from "./StatusPill";

const priorityConfig = {
  low: { color: "#64748B", icon: "arrow-down-circle-outline", label: "Low-Prio" },
  medium: { color: "#3B82F6", icon: "alert-circle-outline", label: "Medium-Prio" },
  high: { color: "#F59E0B", icon: "warning-outline", label: "High-Prio" },
  urgent: { color: "#EF4444", icon: "flash-outline", label: "Urgent-Prio" },
};

export const TicketCard = ({ ticket, onResolve, onEscalate, onMarkAsRead }) => {
  const prio = priorityConfig[ticket.priority] || priorityConfig.medium;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.ticketInfo}>
          <Text style={styles.subject} numberOfLines={1}>{ticket.subject}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="business-outline" size={12} color={colors.muted} />
            <Text style={styles.metaText}>{ticket.vendor || "Direct User"}</Text>
            <View style={styles.dot} />
            <Text style={styles.metaText}>Ticket #{ticket.id.slice(0, 6).toUpperCase()}</Text>
          </View>
        </View>
        <StatusPill value={ticket.status} size="small" />
      </View>

      <View style={styles.prioBadge}>
        <Ionicons name={prio.icon} size={14} color={prio.color} />
        <Text style={[styles.prioText, { color: prio.color }]}>{prio.label}</Text>
      </View>

      <View style={styles.messageBox}>
        <Text style={styles.messageText} numberOfLines={2}>
          {ticket.messages?.[ticket.messages.length - 1]?.body || "Protocol initialized. Awaiting diagnostic data."}
        </Text>
      </View>

      <View style={styles.actionRow}>
        {ticket.status === "open" && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.readBtn]}
            onPress={onMarkAsRead}
          >
            <Ionicons name="eye-outline" size={18} color={colors.primary} />
            <Text style={[styles.btnText, styles.readText]}>Mark Read</Text>
          </TouchableOpacity>
        )}

        {ticket.status !== "resolved" && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.resolveBtn]}
            onPress={onResolve}
          >
            <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>Resolve</Text>
          </TouchableOpacity>
        )}

        {ticket.status !== "closed" && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.escalateBtn]}
            onPress={onEscalate}
          >
            <Ionicons name="arrow-up-circle-outline" size={18} color={colors.primary} />
            <Text style={[styles.btnText, styles.escalateText]}>Escalate</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  ticketInfo: {
    flex: 1,
    marginRight: 10,
  },
  subject: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.dark,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "500",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.muted,
    opacity: 0.3,
  },
  prioBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  prioText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  messageBox: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary + "40",
    marginBottom: 16,
  },
  messageText: {
    fontSize: 13,
    color: colors.dark,
    lineHeight: 18,
    fontWeight: "500",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
  },
  resolveBtn: {
    backgroundColor: colors.primary,
  },
  escalateBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  btnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },
  escalateText: {
    color: colors.primary,
  },
  readBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  readText: {
    color: colors.primary,
  },
});
