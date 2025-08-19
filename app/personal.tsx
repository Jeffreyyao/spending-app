import { Text, View } from "react-native";
import "../global.css";

export default function PersonalScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-gray-100">
      <Text className="text-2xl font-bold mb-2.5 text-gray-800">Personal</Text>
      <Text className="text-base text-gray-600">Your personal settings and profile</Text>
    </View>
  );
}
