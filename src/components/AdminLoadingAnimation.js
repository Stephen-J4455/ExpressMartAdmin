import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

const { width, height } = Dimensions.get("window");

export const AdminLoadingAnimation = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const shieldPulse = useRef(new Animated.Value(0)).current;
  const orbitAnim = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: false,
      }),
    ]).start();

    // Delayed text animation
    setTimeout(() => {
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 400);

    // Shield pulse animation
    const shieldAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shieldPulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shieldPulse, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    );

    // Orbiting animation
    const orbitAnimation = Animated.loop(
      Animated.timing(orbitAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      }),
    );

    shieldAnimation.start();
    orbitAnimation.start();

    return () => {
      shieldAnimation.stop();
      orbitAnimation.stop();
    };
  }, []);

  const orbitRotate = orbitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      {/* Grid Background */}
      <View style={styles.gridBackground}>
        {[...Array(8)].map((_, row) =>
          [...Array(8)].map((_, col) => (
            <Animated.View
              key={`${row}-${col}`}
              style={[
                styles.gridDot,
                {
                  opacity: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.1],
                  }),
                  transform: [
                    {
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                  ],
                },
              ]}
            />
          )),
        )}
      </View>

      {/* Main Loading Content */}
      <Animated.View
        style={[
          styles.loadingContent,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Central Shield with Pulse */}
        <View style={styles.shieldContainer}>
          <Animated.View
            style={[
              styles.shieldPulse,
              {
                opacity: shieldPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.2, 0.8],
                }),
                transform: [
                  {
                    scale: shieldPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.3],
                    }),
                  },
                ],
              },
            ]}
          />
          <Ionicons name="shield-checkmark" size={70} color={colors.primary} />
        </View>

        {/* Orbiting Icons */}
        <Animated.View
          style={[
            styles.orbitContainer,
            {
              transform: [{ rotate: orbitRotate }],
            },
          ]}
        >
          <View style={[styles.orbitIcon, styles.orbitIcon1]}>
            <Ionicons name="people" size={24} color={colors.secondary} />
          </View>
          <View style={[styles.orbitIcon, styles.orbitIcon2]}>
            <Ionicons name="analytics" size={24} color={colors.accent} />
          </View>
          <View style={[styles.orbitIcon, styles.orbitIcon3]}>
            <Ionicons name="settings" size={24} color={colors.warning} />
          </View>
          <View style={[styles.orbitIcon, styles.orbitIcon4]}>
            <Ionicons name="shield" size={24} color={colors.success} />
          </View>
        </Animated.View>

        {/* App Title */}
        <Animated.View style={{ opacity: textOpacity }}>
          <Text style={styles.appTitle}>ExpressMart Admin</Text>
          <Text style={styles.subtitle}>Control Center</Text>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>

          <Text style={styles.loadingText}>Initializing admin console...</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
    justifyContent: "center",
    alignItems: "center",
  },
  gridBackground: {
    position: "absolute",
    width: width,
    height: height,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    alignContent: "space-around",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  gridDot: {
    width: 3,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 1.5,
    margin: 15,
  },
  loadingContent: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  shieldContainer: {
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
    position: "relative",
  },
  shieldPulse: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary,
  },
  orbitContainer: {
    position: "absolute",
    width: 200,
    height: 200,
    top: "50%",
    left: "50%",
    marginTop: -100,
    marginLeft: -100,
  },
  orbitIcon: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.dark,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  orbitIcon1: {
    top: 0,
    left: "50%",
    marginLeft: -20,
  },
  orbitIcon2: {
    right: 0,
    top: "50%",
    marginTop: -20,
  },
  orbitIcon3: {
    bottom: 0,
    left: "50%",
    marginLeft: -20,
  },
  orbitIcon4: {
    left: 0,
    top: "50%",
    marginTop: -20,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.dark,
    marginBottom: 8,
    textAlign: "center",
    marginTop: 60,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    marginBottom: 32,
    textAlign: "center",
    fontWeight: "600",
  },
  progressContainer: {
    width: 200,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginBottom: 24,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    fontWeight: "500",
  },
});
