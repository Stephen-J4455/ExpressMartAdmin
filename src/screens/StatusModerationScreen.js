import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    RefreshControl,
    Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../supabase";
import { colors } from "../theme/colors";

export const StatusModerationScreen = () => {
    const [statuses, setStatuses] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchStatuses = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("express_seller_statuses")
                .select(`
                    *,
                    seller:express_sellers(id, name, avatar)
                `)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setStatuses(data || []);
        } catch (err) {
            console.error("Error fetching statuses:", err);
            Alert.alert("Error", "Failed to fetch statuses");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatuses();
    }, []);

    const handleDeleteStatus = (id) => {
        Alert.alert(
            "Delete Status",
            "Are you sure you want to delete this status? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from("express_seller_statuses")
                                .delete()
                                .eq("id", id);

                            if (error) throw error;
                            setStatuses(statuses.filter((s) => s.id !== id));
                        } catch (err) {
                            console.error("Error deleting status:", err);
                            Alert.alert("Error", "Failed to delete status");
                        }
                    },
                },
            ]
        );
    };

    const renderItem = ({ item }) => {
        const isExpired = new Date(item.expires_at) < new Date();

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.sellerInfo}>
                        <Image source={{ uri: item.seller.avatar }} style={styles.avatar} />
                        <View>
                            <Text style={styles.sellerName}>{item.seller.name}</Text>
                            <Text style={styles.timeText}>
                                {new Date(item.created_at).toLocaleString()}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteStatus(item.id)}>
                        <Ionicons name="trash-outline" size={24} color={colors.danger} />
                    </TouchableOpacity>
                </View>

                <View style={styles.mediaContainer}>
                    <Image source={{ uri: item.media_url }} style={styles.mediaImage} />
                    {isExpired && (
                        <View style={styles.expiredBadge}>
                            <Text style={styles.expiredText}>EXPIRED</Text>
                        </View>
                    )}
                </View>

                {item.status_text && (
                    <Text style={styles.statusText}>{item.status_text}</Text>
                )}

                <View style={styles.cardFooter}>
                    <Text style={[styles.statusIndicator, isExpired ? styles.expired : styles.active]}>
                        {isExpired ? "Inactive" : "Visible"}
                    </Text>
                    <Text style={styles.expiresText}>
                        Expires: {new Date(item.expires_at).toLocaleDateString()}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={statuses}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={fetchStatuses} />
                }
                ListEmptyComponent={
                    !loading && (
                        <View style={styles.emptyState}>
                            <Ionicons name="images-outline" size={48} color={colors.muted} />
                            <Text style={styles.emptyText}>No statuses found</Text>
                        </View>
                    )
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
    list: {
        padding: 16,
        paddingBottom: 40,
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
        alignItems: "center",
        marginBottom: 12,
    },
    sellerInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.light,
    },
    sellerName: {
        fontSize: 15,
        fontWeight: "700",
        color: colors.dark,
    },
    timeText: {
        fontSize: 12,
        color: colors.muted,
    },
    mediaContainer: {
        width: "100%",
        aspectRatio: 9 / 16,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: colors.light,
        marginBottom: 12,
        position: 'relative',
    },
    mediaImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    expiredBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
    },
    expiredText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
    },
    statusText: {
        fontSize: 14,
        color: colors.dark,
        lineHeight: 20,
        marginBottom: 12,
    },
    cardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    statusIndicator: {
        fontSize: 13,
        fontWeight: "700",
    },
    active: {
        color: colors.success,
    },
    expired: {
        color: colors.muted,
    },
    expiresText: {
        fontSize: 12,
        color: colors.muted,
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
        gap: 12,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.muted,
    },
});
