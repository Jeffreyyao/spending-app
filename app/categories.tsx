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
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
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
    <View style={styles.categoryItem}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{item.name}</Text>
        </View>
        <View style={styles.categoryActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openEditModal(item)}
          >
            <Edit size={16} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteCategory(item.categoryId)}
          >
            <X size={16} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator style={{ marginTop: 20 }} size="large" color="#666" />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Text style={styles.retryText} onPress={fetchCategories}>Tap to retry</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {categories.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No categories found</Text>
          <Text style={styles.emptySubtext}>Pull to refresh or add new categories</Text>
        </View>
      ) : (
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.categoryId.toString()}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={true}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setModalVisible(true);
        }}
      >
        <Plus size={24} color="white" />
      </TouchableOpacity>

      {/* Add Category Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Category</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={16} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalBody}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.inputLabel}>Category Name</Text>
              <TextInput
                style={styles.textInput}
                value={newCategory.name}
                onChangeText={(text) =>
                  setNewCategory((prev) => ({ ...prev, name: text }))
                }
                placeholder="Enter category name"
                placeholderTextColor="#999"
                autoFocus={true}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.addButton,
                  submitting && styles.addButtonDisabled,
                ]}
                onPress={handleAddCategory}
                disabled={submitting}
              >
                <Text style={styles.addButtonText}>
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
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Category</Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={16} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalBody}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.inputLabel}>Category Name</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter category name"
                placeholderTextColor="#999"
                autoFocus={true}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.addButton,
                  editSubmitting && styles.addButtonDisabled,
                ]}
                onPress={handleEditCategory}
                disabled={editSubmitting}
              >
                <Text style={styles.addButtonText}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#FF3B30",
    textAlign: "center",
    marginBottom: 10,
  },
  retryText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    textDecorationLine: "underline",
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
  },
  categoryItem: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  categoryId: {
    fontSize: 12,
    color: "#999",
    fontFamily: "monospace",
  },
  deleteButton: {
    padding: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  editButton: {
    padding: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginRight: 8,
  },
  categoryActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
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

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 7,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },

  modalBody: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    margin: 3,
    padding: 15,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#f9f9f9",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F0F0F0",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    justifyContent: "center",
    alignItems: "center",
    minWidth: 0,
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  addButton: {
    flex: 1,
    backgroundColor: "#666",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#666",
    justifyContent: "center",
    alignItems: "center",
    minWidth: 0,
  },
  addButtonDisabled: {
    backgroundColor: "#ccc",
    borderColor: "#ccc",
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
