import React from "react";
import { GestureResponderEvent, StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";

interface FloatingActionButtonProps {
  onPress: (event: GestureResponderEvent) => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  children,
  style,
  accessibilityLabel,
}) => {
  return (
    <TouchableOpacity
      style={[styles.fab, style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#666",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
});

export default FloatingActionButton;


