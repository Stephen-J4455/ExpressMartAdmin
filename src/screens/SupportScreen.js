import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAdmin } from "../context/AdminContext";
import { colors } from "../theme/colors";
import { SectionHeader } from "../components/SectionHeader";
import { TicketCard } from "../components/TicketCard";
import { useResponsive } from "../hooks/useResponsive";

export const SupportScreen = () => {
  const {
    tickets,
    users,
    loading,
    refresh,
    updateTicketStatus,
    addTicketMessage,
  } = useAdmin();
  const { cardColumns } = useResponsive();
  const [activeTab, setActiveTab] = useState("tickets"); // "tickets" | "users"
  const [searchQuery, setSearchQuery] = useState("");
  const [replyTicket, setReplyTicket] = useState(null);
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const submitReply = async () => {
    if (!replyTicket || !message) return;
    await addTicketMessage(replyTicket, message);
    setMessage("");
  };

  const filteredTickets = tickets.filter((ticket) => {
    const statusOk =
      statusFilter === "all" || ticket.status?.toLowerCase() === statusFilter;
    const priorityOk =
      priorityFilter === "all" ||
      ticket.priority?.toLowerCase() === priorityFilter;
    return statusOk && priorityOk;
  });

  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.phone?.includes(query)
    );
  });

  const macros = [
    "Thanks for reporting. We're investigating and will update you shortly.",
    "Escalating to engineering. Expect a follow-up in under 1 hour.",
    "Resolved in backend. Please retry and confirm if the issue persists.",
  ];

  return (
    <View style={styles.container}>
      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, activeTab === "tickets" && styles.tabActive]}
          onPress={() => setActiveTab("tickets")}
        >
          <Ionicons
            name="chatbubbles-outline"
            size={18}
            color={activeTab === "tickets" ? colors.primary : colors.muted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "tickets" && styles.tabTextActive,
            ]}
          >
            Tickets
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "users" && styles.tabActive]}
          onPress={() => setActiveTab("users")}
        >
          <Ionicons
            name="people-outline"
            size={18}
            color={activeTab === "users" ? colors.primary : colors.muted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "users" && styles.tabTextActive,
            ]}
          >
            User Profiles
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
      >
        {activeTab === "tickets" ? (
          <>
            <View style={styles.filtersRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {["all", "open", "in_progress", "resolved"].map((status) => (
                  <Pressable
                    key={status}
                    style={[
                      styles.statusChip,
                      statusFilter === status && styles.statusChipActive,
                    ]}
                    onPress={() => setStatusFilter(status)}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        statusFilter === status && styles.statusChipTextActive,
                      ]}
                    >
                      {status.replace("_", " ")}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {["all", "low", "medium", "high", "urgent"].map((priority) => (
                  <Pressable
                    key={priority}
                    style={[
                      styles.priorityChip,
                      priorityFilter === priority && styles.priorityChipActive,
                    ]}
                    onPress={() => setPriorityFilter(priority)}
                  >
                    <Text
                      style={[
                        styles.priorityChipText,
                        priorityFilter === priority &&
                          styles.priorityChipTextActive,
                      ]}
                    >
                      {priority}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <FlatList
              data={filteredTickets}
              keyExtractor={(item) => item.id}
              key={`tickets-${cardColumns}`}
              numColumns={cardColumns}
              scrollEnabled={false}
              contentContainerStyle={{ gap: 12 }}
              columnWrapperStyle={cardColumns > 1 ? { gap: 12 } : undefined}
              ListEmptyComponent={
                <Text style={styles.empty}>No tickets match the criteria.</Text>
              }
              renderItem={({ item }) => (
                <View style={{ flex: 1 }}>
                  <TicketCard
                    ticket={item}
                    onResolve={() => updateTicketStatus(item.id, "resolved")}
                    onMarkAsRead={() =>
                      updateTicketStatus(item.id, "in_progress")
                    }
                    onEscalate={() => {
                      setReplyTicket(item.id);
                      setMessage(`We are escalating ticket ${item.id}.`);
                      updateTicketStatus(item.id, "in_progress");
                    }}
                  />
                </View>
              )}
            />
          </>
        ) : (
          <View style={styles.usersSection}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={20} color={colors.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Find users by name, email or phone..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery("")}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={colors.muted}
                  />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.userList}>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <View key={user.id} style={styles.userCard}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.avatarText}>
                        {user.full_name?.charAt(0).toUpperCase() || "U"}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <View style={styles.userHeader}>
                        <Text style={styles.userName}>
                          {user.full_name || "Unknown User"}
                        </Text>
                        <View
                          style={[
                            styles.roleBadge,
                            user.role === "vendor" && styles.vendorBadge,
                          ]}
                        >
                          <Text
                            style={[
                              styles.roleText,
                              user.role === "vendor" && styles.vendorText,
                            ]}
                          >
                            {user.role || "customer"}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.userEmail}>{user.email}</Text>
                      <View style={styles.userMeta}>
                        <Ionicons
                          name="call-outline"
                          size={12}
                          color={colors.muted}
                        />
                        <Text style={styles.metaText}>
                          {user.phone || "No phone"}
                        </Text>
                        <View style={styles.dot} />
                        <Text style={styles.metaText}>
                          Joined{" "}
                          {new Date(user.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.empty}>No users found.</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!replyTicket}
        transparent
        animationType="slide"
        onRequestClose={() => setReplyTicket(null)}
      >
        <Pressable style={styles.replyOverlay} onPress={() => setReplyTicket(null)} />
        <View style={styles.replyCard}>
          <Text style={styles.replyTitle}>Reply to ticket</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.macros}
          >
            {macros.map((macro) => (
              <Pressable
                key={macro}
                style={styles.macroChip}
                onPress={() => setMessage(macro)}
              >
                <Text style={styles.macroText}>{macro}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <TextInput
            style={styles.textarea}
            placeholder="Type your update"
            multiline
            value={message}
            onChangeText={setMessage}
          />
          <View style={styles.replyActions}>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => setReplyTicket(null)}
            >
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.primaryButton,
                !message && styles.primaryButtonDisabled,
              ]}
              onPress={submitReply}
              disabled={!message}
            >
              <Text style={styles.primaryText}>Send update</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
    padding: 16,
    paddingTop: 45,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 6,
    marginBottom: 20,
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
  filtersRow: {
    gap: 12,
    marginBottom: 20,
  },
  chipRow: {
    gap: 8,
    paddingRight: 10,
  },
  statusChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statusChipActive: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  statusChipText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  statusChipTextActive: {
    color: "#fff",
  },
  priorityChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  priorityChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  priorityChipText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  priorityChipTextActive: {
    color: "#fff",
  },
  usersSection: {
    gap: 16,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.dark,
    fontWeight: "500",
  },
  userList: {
    gap: 12,
  },
  userCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    alignItems: "center",
    gap: 16,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.primary,
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userName: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.dark,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  roleText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.muted,
    textTransform: "uppercase",
  },
  vendorBadge: {
    backgroundColor: colors.secondary + "15",
  },
  vendorText: {
    color: colors.secondary,
  },
  userEmail: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "500",
  },
  userMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "600",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.muted,
    opacity: 0.3,
  },
  empty: {
    textAlign: "center",
    color: colors.muted,
    fontSize: 14,
    marginTop: 40,
    fontWeight: "600",
  },
  replyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  replyCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  replyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.dark,
    marginBottom: 16,
  },
  macros: {
    gap: 8,
    paddingBottom: 12,
  },
  macroChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  macroText: {
    color: colors.dark,
    fontWeight: "700",
    fontSize: 12,
  },
  textarea: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    height: 120,
    fontSize: 14,
    color: colors.dark,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    textAlignVertical: "top",
    marginBottom: 16,
  },
  replyActions: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
  },
  secondaryText: {
    color: colors.dark,
    fontWeight: "800",
    fontSize: 14,
  },
  primaryButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
});
