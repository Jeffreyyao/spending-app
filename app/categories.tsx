import { Edit, Plus, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import EmptyState from "../src/components/EmptyState";
import FloatingActionButton from "../src/components/FloatingActionButton";
import IconCircleButton from "../src/components/IconCircleButton";
import { config } from "../src/config";
import { useCategoryContext } from "../src/contexts/CategoryContext";

interface Category {
  categoryId: number;
  name: string;
}

export default function CategoriesScreen() {
  const { setCategories, refreshCategories } = useCategoryContext();
  const [categories, setLocalCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: "",
    categoryId: null
  });
  const [submitting, setSubmitting] = useState(false);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      setError(null);
      
      const categoriesResponse = await fetch(`${config.API_BASE_URL}/categories?db=${config.DB}`);
      if (!categoriesResponse.ok) {
        throw new Error(`Failed to fetch categories: ${categoriesResponse.status}`);
      }
      const categoriesData = await categoriesResponse.json();
      
      setLocalCategories(categoriesData);
      setCategories(categoriesData); // Update shared context
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);



  const onRefresh = () => {
    setRefreshing(true);
    fetchCategories();
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      Alert.alert("Error", "Please enter a category name");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${config.API_BASE_URL}/categories?db=${config.DB}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newCategory.name.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add category: ${response.status}`);
      }

      // Reset form and close modal
      setNewCategory({
        name: "",
        categoryId: null
      });
      setModalVisible(false);

      // Refresh data
      await fetchCategories();
      
      // Notify other screens to refresh their categories
      refreshCategories();

      Alert.alert("Success", "Category added successfully!");
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to add category"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/categories?db=${config.DB}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId: categoryId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to delete category: ${response.status}`);
      }

      // Update local state immediately for better UX
      setLocalCategories(prev => prev.filter(cat => cat.categoryId !== categoryId));
      
      // Refresh data from server
      await fetchCategories();
      
      // Notify other screens to refresh their categories
      refreshCategories();
      
      Alert.alert("Success", "Category deleted successfully!");
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to delete category"
      );
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !editName.trim()) {
      Alert.alert("Error", "Please enter a category name");
      return;
    }

    setEditSubmitting(true);
    try {
      const response = await fetch(`${config.API_BASE_URL}/categories?db=${config.DB}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId: editingCategory.categoryId,
          name: editName.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update category: ${response.status}`);
      }

      // Reset form and close modal
      setEditingCategory(null);
      setEditName("");
      setEditModalVisible(false);

      // Refresh data
      await fetchCategories();
      
      // Notify other screens to refresh their categories
      refreshCategories();

      Alert.alert("Success", "Category updated successfully!");
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to update category"
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setEditName(category.name);
    setEditModalVisible(true);
  };

  const getCategoryColor = (color?: string) => {
    if (color) {
      return color;
    }
    // Default colors if no color is provided
    const defaultColors = ['#666', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6'];
    return defaultColors[Math.floor(Math.random() * defaultColors.length)];
  };

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <View className="bg-white rounded-xl px-4 py-2 mb-3 shadow-sm">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-800">{item.name}</Text>
        </View>
        <View className="flex-row items-center">
          <IconCircleButton style={{ marginRight: 8 }} onPress={() => openEditModal(item)}>
            <Edit size={16} color="#666" />
          </IconCircleButton>
          <IconCircleButton onPress={() => handleDeleteCategory(item.categoryId)}>
            <X size={16} color="#666" />
          </IconCircleButton>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-gray-100">
        <ActivityIndicator className="mt-5" size="large" color="#666" />
        <Text className="mt-5 text-base text-gray-600 text-center">Loading categories...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-gray-100">
        <Text className="text-base text-red-500 text-center mb-2.5">Error: {error}</Text>
        <Text className="text-base text-gray-600 text-center underline" onPress={fetchCategories}>Tap to retry</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      {categories.length === 0 ? (
        <EmptyState title="No categories found" subtitle="Pull to refresh or add new categories" />
      ) : (
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.categoryId.toString()}
          className="flex-1"
          contentContainerStyle={{ padding: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={true}
        />
      )}

      {/* Floating Action Button */}
      <FloatingActionButton onPress={() => setModalVisible(true)} accessibilityLabel="Add category">
        <Plus size={24} color="white" />
      </FloatingActionButton>

      {/* Add Category Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-center items-center bg-black/50"
        >
          <View className="w-[90%] bg-white rounded-2xl p-5 shadow-lg">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-2xl font-bold text-gray-800">Add New Category</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="p-1"
              >
                <X size={16} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              className="mb-4"
              showsVerticalScrollIndicator={true}
            >
              <Text className="text-lg font-semibold text-gray-800 mb-2">Category Name</Text>
              <TextInput
                className="border border-gray-300 rounded-lg m-1 p-4 text-base text-gray-800 bg-gray-50"
                value={newCategory.name}
                onChangeText={(text) =>
                  setNewCategory((prev) => ({ ...prev, name: text }))
                }
                placeholder="Enter category name"
                placeholderTextColor="#999"
                autoFocus={true}
              />
            </ScrollView>

            <View className="flex-row justify-between gap-3">
              <TouchableOpacity
                className="flex-1 bg-gray-100 py-3 px-6 rounded-lg border border-gray-200 justify-center items-center"
                onPress={() => setModalVisible(false)}
              >
                <Text className="text-gray-600 text-base font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-3 px-6 rounded-lg border justify-center items-center ${
                  submitting 
                    ? 'bg-gray-300 border-gray-300' 
                    : 'bg-gray-600 border-gray-600'
                }`}
                onPress={handleAddCategory}
                disabled={submitting}
              >
                <Text className="text-white text-base font-bold">
                  {submitting ? "Adding..." : "Add Category"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-center items-center bg-black/50"
        >
          <View className="w-[90%] bg-white rounded-2xl p-5 shadow-lg">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-2xl font-bold text-gray-800">Edit Category</Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                className="p-1"
              >
                <X size={16} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              className="mb-4"
              showsVerticalScrollIndicator={true}
            >
              <Text className="text-lg font-semibold text-gray-800 mb-2">Category Name</Text>
              <TextInput
                className="border border-gray-300 rounded-lg m-1 p-4 text-base text-gray-800 bg-gray-50"
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter category name"
                placeholderTextColor="#999"
                autoFocus={true}
              />
            </ScrollView>

            <View className="flex-row justify-between gap-3">
              <TouchableOpacity
                className="flex-1 bg-gray-100 py-3 px-6 rounded-lg border border-gray-200 justify-center items-center"
                onPress={() => setEditModalVisible(false)}
              >
                <Text className="text-gray-600 text-base font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-3 px-6 rounded-lg border justify-center items-center ${
                  editSubmitting 
                    ? 'bg-gray-300 border-gray-300' 
                    : 'bg-gray-600 border-gray-600'
                }`}
                onPress={handleEditCategory}
                disabled={editSubmitting}
              >
                <Text className="text-white text-base font-bold">
                  {editSubmitting ? "Updating..." : "Update Category"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
