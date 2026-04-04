import { Pressable, StyleSheet, Text, View, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { StatusPill } from "./StatusPill";

export const ModerationCard = ({
  product,
  onApprove,
  onReject,
  onDetails,
  selected,
  onToggleSelect,
  getSellerName,
}) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
      onPress={onDetails}
    >
      <View style={styles.cardMain}>
        <Pressable style={styles.selector} onPress={onToggleSelect}>
          <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
            {selected ? (
              <Ionicons name="checkmark" size={12} color="#fff" />
            ) : null}
          </View>
        </Pressable>

        <View style={styles.productContent}>
          <View style={styles.imageContainer}>
            {product.thumbnail ? (
              <Image source={{ uri: product.thumbnail }} style={styles.image} />
            ) : (
              <View style={styles.placeholder}>
                <Ionicons name="image-outline" size={20} color={colors.muted} />
              </View>
            )}
          </View>

          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {product.title}
            </Text>

            <View style={styles.metaRow}>
              <Ionicons name="business-outline" size={12} color={colors.muted} />
              <Text style={styles.metaText} numberOfLines={1}>
                {getSellerName ? getSellerName(product.seller_id) : product.vendor}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Ionicons name="folder-outline" size={12} color={colors.muted} />
              <Text style={styles.metaText}>{product.category || "Uncategorized"}</Text>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.currency}>GH₵</Text>
              <Text style={styles.priceValue}>
                {Number(product.price || 0).toLocaleString()}
              </Text>
              <StatusPill value={product.status} size="small" />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.approveBtn]}
          onPress={onApprove}
        >
          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
          <Text style={styles.actionText}>Approve</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.rejectBtn]}
          onPress={onReject}
        >
          <Ionicons name="close-circle-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 12,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: "#F8FAFF",
  },
  cardMain: {
    flexDirection: "row",
    gap: 12,
  },
  selector: {
    justifyContent: "flex-start",
    paddingTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  productContent: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.dark,
    marginBottom: 2,
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
    flex: 1,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  currency: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    marginTop: 2,
  },
  priceValue: {
    fontSize: 17,
    fontWeight: "900",
    color: colors.primary,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  rejectBtn: {
    width: 44,
    backgroundColor: colors.danger,
  },
  actionText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },
});
