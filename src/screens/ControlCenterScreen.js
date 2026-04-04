import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { SupportScreen } from "./SupportScreen";
import { ReviewModerationScreen } from "./ReviewModerationScreen";
import { SettingsScreen } from "./SettingsScreen";
import { StatusModerationScreen } from "./StatusModerationScreen";

export const ControlCenterScreen = () => {
    const [activeTab, setActiveTab] = useState("support"); // 'support', 'reviews', 'settings'

    const renderContent = () => {
        switch (activeTab) {
            case "support":
                return <SupportScreen />;
            case "reviews":
                return <ReviewModerationScreen />;
            case "settings":
                return <SettingsScreen />;
            case "statuses":
                return <StatusModerationScreen />;
            default:
                return <SupportScreen />;
        }
    };

    const TabButton = ({ id, label, icon }) => (
        <TouchableOpacity
            style={[styles.tabButton, activeTab === id && styles.tabButtonActive]}
            onPress={() => setActiveTab(id)}
        >
            <Ionicons
                name={activeTab === id ? icon : `${icon}-outline`}
                size={20}
                color={activeTab === id ? colors.primary : colors.muted}
            />
            <Text
                style={[styles.tabLabel, activeTab === id && styles.tabLabelActive]}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.tabContainer}>
                <TabButton id="support" label="Support" icon="chatbubbles" />
                <TabButton id="reviews" label="Reviews" icon="chatbox-ellipses" />
                <TabButton id="statuses" label="Statuses" icon="images" />
                <TabButton id="settings" label="Settings" icon="settings" />
            </View>
            <View style={styles.content}>{renderContent()}</View>
        </SafeAreaView>
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
        paddingHorizontal: 16,
        paddingTop: Platform.OS === "ios" ? 20 : 50,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 8,
    },
    tabButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6,
    },
    tabButtonActive: {
        backgroundColor: colors.primary + "10",
    },
    tabLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: colors.muted,
    },
    tabLabelActive: {
        color: colors.primary,
        fontWeight: "700",
    },
    content: {
        flex: 1,
    },
});
