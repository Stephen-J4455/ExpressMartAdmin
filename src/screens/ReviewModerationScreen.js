import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Pressable,
    ActivityIndicator,
    RefreshControl,
    ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAdmin } from "../context/AdminContext";
import { colors } from "../theme/colors";
import { SectionHeader } from "../components/SectionHeader";
import { StatusPill } from "../components/StatusPill";

export const ReviewModerationScreen = () => {
    const {
        reviews,
        comments,
        updateReviewStatus,
        updateCommentStatus,
        loading,
        refresh,
        products,
    } = useAdmin();
    const [activeTab, setActiveTab] = useState("reviews"); // 'reviews' or 'comments'
    const [filter, setFilter] = useState("all"); // 'all', 'pending', 'approved', 'rejected'

    const getProductName = (productId) => {
        const product = products.find((p) => p.id === productId);
        return product ? product.title : "Unknown Product";
    };

    const filteredItems = useMemo(() => {
        const items = activeTab === "reviews" ? reviews : comments;
        if (filter === "all") return items;
        if (filter === "pending") return items.filter(item => item.is_approved === null);
        if (filter === "approved") return items.filter(item => item.is_approved === true);
        if (filter === "rejected") return items.filter(item => item.is_approved === false);
        return items;
    }, [activeTab, reviews, comments, filter]);

    const stats = useMemo(() => {
        const r = reviews || [];
        const c = comments || [];
        return {
            pendingReviews: r.filter(i => i.is_approved === null).length,
            pendingComments: c.filter(i => i.is_approved === null).length,
        };
    }, [reviews, comments]);

    const renderReviewItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.userInfo}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {(item.express_profiles?.full_name || "U").charAt(0)}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.userName}>{item.express_profiles?.full_name || "Unknown User"}</Text>
                        <Text style={styles.userEmail}>{item.express_profiles?.email}</Text>
                    </View>
                </View>
                <View style={styles.badgeContainer}>
                    {item.is_approved === true && <View style={[styles.statusBadge, styles.approvedBadge]}><Text style={styles.statusText}>Approved</Text></View>}
                    {item.is_approved === false && <View style={[styles.statusBadge, styles.rejectedBadge]}><Text style={styles.statusText}>Rejected</Text></View>}
                    {item.is_approved === null && <View style={[styles.statusBadge, styles.pendingBadge]}><Text style={styles.statusText}>Pending</Text></View>}
                </View>
            </View>

            <View style={styles.productInfo}>
                <Ionicons name="cube-outline" size={14} color={colors.primary} />
                <Text style={styles.productName}>{getProductName(item.product_id)}</Text>
            </View>

            <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                        key={star}
                        name={star <= item.rating ? "star" : "star-outline"}
                        size={16}
                        color={colors.secondary}
                    />
                ))}
            </View>

            <Text style={styles.commentText}>{item.comment}</Text>
            <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton, item.is_approved === true && styles.disabledButton]}
                    onPress={() => updateReviewStatus(item.id, true)}
                    disabled={item.is_approved === true}
                >
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton, item.is_approved === false && styles.disabledButton]}
                    onPress={() => updateReviewStatus(item.id, false)}
                    disabled={item.is_approved === false}
                >
                    <Ionicons name="close-circle-outline" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Reject</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderCommentItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.userInfo}>
                    <View style={[styles.avatar, { backgroundColor: colors.infoLight }]}>
                        <Text style={[styles.avatarText, { color: colors.info }]}>
                            {(item.express_profiles?.full_name || "U").charAt(0)}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.userName}>{item.express_profiles?.full_name || "Unknown User"}</Text>
                        <Text style={styles.userEmail}>{item.express_profiles?.email}</Text>
                    </View>
                </View>
                <View style={styles.badgeContainer}>
                    {item.is_approved === true && <View style={[styles.statusBadge, styles.approvedBadge]}><Text style={styles.statusText}>Approved</Text></View>}
                    {item.is_approved === false && <View style={[styles.statusBadge, styles.rejectedBadge]}><Text style={styles.statusText}>Rejected</Text></View>}
                    {item.is_approved === null && <View style={[styles.statusBadge, styles.pendingBadge]}><Text style={styles.statusText}>Pending</Text></View>}
                </View>
            </View>

            <Text style={styles.commentText}>{item.comment}</Text>
            <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton, item.is_approved === true && styles.disabledButton]}
                    onPress={() => updateCommentStatus(item.id, true)}
                    disabled={item.is_approved === true}
                >
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton, item.is_approved === false && styles.disabledButton]}
                    onPress={() => updateCommentStatus(item.id, false)}
                    disabled={item.is_approved === false}
                >
                    <Ionicons name="close-circle-outline" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Reject</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>

            <View style={styles.tabContainer}>
                <Pressable
                    style={[styles.tab, activeTab === "reviews" && styles.tabActive]}
                    onPress={() => setActiveTab("reviews")}
                >
                    <Ionicons
                        name="star-outline"
                        size={18}
                        color={activeTab === "reviews" ? colors.primary : colors.muted}
                    />
                    <Text style={[styles.tabText, activeTab === "reviews" && styles.tabTextActive]}>
                        Reviews {stats.pendingReviews > 0 && `(${stats.pendingReviews})`}
                    </Text>
                </Pressable>
                <Pressable
                    style={[styles.tab, activeTab === "comments" && styles.tabActive]}
                    onPress={() => setActiveTab("comments")}
                >
                    <Ionicons
                        name="chatbox-outline"
                        size={18}
                        color={activeTab === "comments" ? colors.primary : colors.muted}
                    />
                    <Text style={[styles.tabText, activeTab === "comments" && styles.tabTextActive]}>
                        Comments {stats.pendingComments > 0 && `(${stats.pendingComments})`}
                    </Text>
                </Pressable>
            </View>

            <View style={styles.filters}>
                {["all", "pending", "approved", "rejected"].map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterChip, filter === f && styles.activeFilterChip]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterChipText, filter === f && styles.activeFilterChipText]}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={filteredItems}
                keyExtractor={(item) => item.id}
                renderItem={activeTab === "reviews" ? renderReviewItem : renderCommentItem}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubbles-outline" size={64} color={colors.muted} />
                        <Text style={styles.emptyText}>No {activeTab} found</Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.light,
    },
    tabContainer: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 6,
        marginHorizontal: 20,
        marginBottom: 20,
        marginTop: 10,
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
    filters: {
        flexDirection: "row",
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: colors.border,
    },
    activeFilterChip: {
        backgroundColor: colors.dark,
        borderColor: colors.dark,
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.muted,
    },
    activeFilterChipText: {
        color: "#fff",
    },
    list: {
        paddingHorizontal: 20,
        paddingBottom: 120,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    userInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flex: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        fontWeight: "800",
        color: colors.primary,
    },
    userName: {
        fontWeight: "700",
        color: colors.dark,
        fontSize: 14,
    },
    userEmail: {
        fontSize: 12,
        color: colors.muted,
    },
    badgeContainer: {
        marginLeft: 10,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: "800",
        textTransform: "uppercase",
    },
    pendingBadge: { backgroundColor: colors.warning + "20" },
    approvedBadge: { backgroundColor: colors.success + "20" },
    rejectedBadge: { backgroundColor: colors.danger + "20" },
    productInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 8,
    },
    productName: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: "700",
    },
    ratingRow: {
        flexDirection: "row",
        gap: 2,
        marginBottom: 8,
    },
    commentText: {
        fontSize: 14,
        color: colors.dark,
        lineHeight: 20,
        marginBottom: 8,
    },
    dateText: {
        fontSize: 11,
        color: colors.muted,
        marginBottom: 12,
    },
    actions: {
        flexDirection: "row",
        gap: 10,
    },
    actionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        borderRadius: 8,
    },
    approveButton: {
        backgroundColor: colors.success,
    },
    rejectButton: {
        backgroundColor: colors.danger,
    },
    disabledButton: {
        opacity: 0.5,
    },
    actionButtonText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "700",
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        marginTop: 60,
    },
    emptyText: {
        marginTop: 16,
        color: colors.muted,
        fontSize: 16,
        fontWeight: "600",
    },
});
