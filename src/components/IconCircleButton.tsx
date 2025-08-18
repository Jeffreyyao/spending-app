import React from "react";
import { GestureResponderEvent, StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";

interface IconCircleButtonProps {
  onPress: (event: GestureResponderEvent) => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  size?: number; // width/height
}

export const IconCircleButton: React.FC<IconCircleButtonProps> = ({
  onPress,
  children,
  style,
  size = 26,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, { width: size, height: size, borderRadius: size / 2 }, style]}
      onPress={onPress}
      accessibilityRole="button"
    >
      {children}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 6,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
});

export default IconCircleButton;


