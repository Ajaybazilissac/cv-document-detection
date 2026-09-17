import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

export const ImageCard = ({ title, stepNumber, base64Uri, description }) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Step {stepNumber}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>

      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}

      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: base64Uri }}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  badge: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
  },
  description: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 10,
    lineHeight: 16,
  },
  imageWrapper: {
    width: "100%",
    height: 240,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
