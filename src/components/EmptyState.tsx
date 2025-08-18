import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface EmptyStateProps {
  title: string;
  subtitle?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, subtitle }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});

export default EmptyState;


