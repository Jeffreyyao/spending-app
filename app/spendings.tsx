import { ArrowDown, ArrowUp, Edit, MoreVertical, Plus, X } from "lucide-react-native";
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
  View,
} from "react-native";
import { useCategoryContext } from "./src/CategoryContext";
import { config } from "./src/config";

interface Spending {
  spendingId: string;
  amount: number;
  description: string;
  categoryId: number;
  dateOfSpending: string;
  currency?: string;
}

interface Category {
  categoryId: number;
  name: string;
}

type SortOption = 'date' | 'amount' | 'category';
type SortDirection = 'asc' | 'desc';

const CURRENCIES = [
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "HKD", symbol: "$", name: "Hong Kong Dollar" },
  { code: "JPY", symbol: "JP¥", name: "Japanese Yen" },
  { code: "USD", symbol: "US$", name: "US Dollar" },
];

export default function SpendingsScreen() {
  const { categories, categoriesVersion } = useCategoryContext();
  const [spendings, setSpendings] = useState<Spending[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sorting state
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [newSpending, setNewSpending] = useState({
    description: "",
    amount: "",
    categoryId: null as number | null,
    currency: "HKD",
    type: "spending" as "spending" | "income",
  });
  const [submitting, setSubmitting] = useState(false);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingSpending, setEditingSpending] = useState<Spending | null>(null);
  const [editSpending, setEditSpending] = useState({
    description: "",
    amount: "",
    categoryId: null as number | null,
    currency: "HKD",
    type: "spending" as "spending" | "income",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setError(null);

      // Fetch spendings
      const spendingsResponse = await fetch(
        `${config.API_BASE_URL}/spendings?db=${config.DB}`
      );
      if (!spendingsResponse.ok) {
        throw new Error(
          `Failed to fetch spendings: ${spendingsResponse.status}`
        );
      }
      const spendingsData = await spendingsResponse.json();

      setSpendings(spendingsData);
      // Categories are now managed by context, no need to fetch here
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Refresh spendings when categories change (but not categories themselves)
  useEffect(() => {
    if (categoriesVersion > 0) {
      // Only refresh spendings data, categories are already updated in context
      fetchData();
    }
  }, [categoriesVersion]);



  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories.find((cat) => cat.categoryId === categoryId);
    return category?.name || "Unknown";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatAmount = (amount: number, currency = "HKD") => {
    const currencyInfo =
      CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];
    return `${currencyInfo.symbol}${amount.toFixed(2)}`;
  };

  const handleAddSpending = async () => {
    if (
      !newSpending.amount.trim() ||
      !newSpending.categoryId
    ) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    const amount = parseFloat(newSpending.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    // Set amount sign based on type
    const finalAmount = newSpending.type === "income" ? Math.abs(amount) : -Math.abs(amount);

    setSubmitting(true);
    try {
      const response = await fetch(`${config.API_BASE_URL}/spendings?db=${config.DB}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: newSpending.description.trim(),
          amount: finalAmount,
          categoryId: newSpending.categoryId,
          currency: newSpending.currency,
          dateOfSpending: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add spending: ${response.status}`);
      }

      // Reset form and close modal
      setNewSpending({
        description: "",
        amount: "",
        categoryId: null,
        currency: "HKD",
        type: "spending",
      });
      setModalVisible(false);

      // Refresh data
      await fetchData();

      Alert.alert("Success", "Spending added successfully!");
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to add spending"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSpending = async (spendingId: string, description: string) => {
    try {
      const response = await fetch(
        `${config.API_BASE_URL}/spendings?db=${config.DB}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            spendingId: spendingId
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete spending: ${response.status}`);
      }

      // Update local state immediately for better UX
      setSpendings(prev => prev.filter(spending => spending.spendingId !== spendingId));
      
      // Refresh data from server
      await fetchData();
      Alert.alert("Success", "Spending deleted successfully!");
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to delete spending"
      );
    }
  };

  const handleEditSpending = async () => {
    if (editingSpending === null) {
      console.error("editingSpending null");
      return;
    }

    let amount = parseFloat(editSpending.amount);
    if (isNaN(amount)) {
      amount = 0;
      return;
    }

    // Set amount sign based on type
    const finalAmount = editSpending.type === "income" ? Math.abs(amount) : -Math.abs(amount);

    setEditSubmitting(true);
    try {
      const response = await fetch(`${config.API_BASE_URL}/spendings?db=${config.DB}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          spendingId: editingSpending.spendingId,
          description: editSpending.description.trim() || undefined,
          amount: finalAmount !== 0 ? finalAmount : undefined,
          categoryId: editSpending.categoryId || undefined,
          currency: editSpending.currency || undefined,
          dateOfSpending: editingSpending.dateOfSpending || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update spending: ${response.status}`);
      }

      // Reset form and close modal
      setEditingSpending(null);
      setEditSpending({
        description: "",
        amount: "",
        categoryId: null,
        currency: "HKD",
        type: "spending",
      });
      setEditModalVisible(false);

      // Refresh data
      await fetchData();

      Alert.alert("Success", "Spending updated successfully!");
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to update spending"
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  const openEditModal = (spending: Spending) => {
    setEditingSpending(spending);
    setEditSpending({
      description: spending.description || "",
      amount: Math.abs(spending.amount).toString(),
      categoryId: spending.categoryId,
      currency: spending.currency || "HKD",
      type: spending.amount >= 0 ? "income" : "spending",
    });
    setEditModalVisible(true);
  };

  const getSortedSpendings = () => {
    const sorted = [...spendings];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.dateOfSpending).getTime() - new Date(b.dateOfSpending).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'category':
          const categoryA = getCategoryName(a.categoryId);
          const categoryB = getCategoryName(b.categoryId);
          comparison = categoryA.localeCompare(categoryB);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  };

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      // Toggle direction if same option selected
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new option with default direction
      setSortBy(option);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (option: SortOption) => {
    if (sortBy !== option) return (<MoreVertical size={12} color="#666666"/>);
    return sortDirection === 'asc' ? (<ArrowUp size={15} color="white"/>) : (<ArrowDown size={15} color="white"/>);
  };

  const renderSortHeader = () => (
    <View style={styles.sortHeader}>
      <View style={styles.sortOptions}>
        <TouchableOpacity
          style={[
            styles.sortOption,
            sortBy === 'date' && styles.sortOptionSelected
          ]}
          onPress={() => handleSort('date')}
        >
          <Text style={[
            styles.sortOptionText,
            sortBy === 'date' && styles.sortOptionTextSelected
          ]}>
            Date {getSortIcon('date')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.sortOption,
            sortBy === 'amount' && styles.sortOptionSelected
          ]}
          onPress={() => handleSort('amount')}
        >
          <Text style={[
            styles.sortOptionText,
            sortBy === 'amount' && styles.sortOptionTextSelected
          ]}>
            Amount {getSortIcon('amount')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.sortOption,
            sortBy === 'category' && styles.sortOptionSelected
          ]}
          onPress={() => handleSort('category')}
        >
          <Text style={[
            styles.sortOptionText,
            sortBy === 'category' && styles.sortOptionTextSelected
          ]}>
            Category {getSortIcon('category')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSpendingItem = ({ item }: { item: Spending }) => (
    <View style={styles.spendingItem}>
      <View style={styles.spendingHeader}>
        <Text style={[
          styles.spendingAmount,
          { color: item.amount >= 0 ? '#007AFF' : '#FF9500' }
        ]}>
          {formatAmount(item.amount, item.currency)}
        </Text>
        <View style={styles.spendingActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openEditModal(item)}
          >
            <Edit size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteSpending(item.spendingId, item.description)}
          >
            <X size={16} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.spendingDetails}>
        <Text style={styles.spendingCategory}>
          {getCategoryName(item.categoryId)}
        </Text>
        <Text style={styles.spendingDate}>
          {formatDate(item.dateOfSpending)}
        </Text>
      </View>
      {item.description && (
        <View style={styles.spendingDescriptionContainer}>
          <Text style={styles.spendingDescription}>{item.description}</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator style={{ marginTop: 20 }} size="large" color="#666" />
        <Text style={styles.loadingText}>Loading spendings...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Text style={styles.retryText} onPress={fetchData}>
          Tap to retry
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {spendings.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No spendings found</Text>
          <Text style={styles.emptySubtext}>
            Pull to refresh or add new expenses
          </Text>
        </View>
      ) : (
        <>
          {renderSortHeader()}
          <FlatList
            data={getSortedSpendings()}
            renderItem={renderSpendingItem}
            keyExtractor={(item) => item.spendingId}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={true}
          />
        </>
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

      {/* Add Spending Modal */}
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
              <Text style={styles.modalTitle}>Add New Spending</Text>
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
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.textInput}
                value={newSpending.description}
                onChangeText={(text) =>
                  setNewSpending((prev) => ({ ...prev, description: text }))
                }
                placeholder="Enter spending description"
                placeholderTextColor="#999"
              />

              <Text style={styles.inputLabel}>Amount</Text>
              <View style={styles.amountRow}>
                <TextInput
                  style={[styles.textInput, styles.amountInput]}
                  value={newSpending.amount}
                  onChangeText={(text) =>
                    setNewSpending((prev) => ({ ...prev, amount: text }))
                  }
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      newSpending.type === "spending" && styles.typeOptionSpendingSelected
                    ]}
                    onPress={() => setNewSpending(prev => ({ ...prev, type: "spending" }))}
                  >
                    <Text style={[
                      styles.typeText,
                      newSpending.type === "spending" && styles.typeTextSelected
                    ]}>
                      Spending
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      newSpending.type === "income" && styles.typeOptionIncomeSelected
                    ]}
                    onPress={() => setNewSpending(prev => ({ ...prev, type: "income" }))}
                  >
                    <Text style={[
                      styles.typeText,
                      newSpending.type === "income" && styles.typeTextSelected
                    ]}>
                      Income
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.inputLabel}>Currency</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                style={styles.currencyContainer}
              >
                {CURRENCIES.map((currency) => (
                  <TouchableOpacity
                    key={currency.code}
                    style={[
                      styles.currencyOption,
                      newSpending.currency === currency.code &&
                        styles.currencyOptionSelected,
                    ]}
                    onPress={() =>
                      setNewSpending((prev) => ({
                        ...prev,
                        currency: currency.code,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.currencyText,
                        newSpending.currency === currency.code &&
                          styles.currencyTextSelected,
                      ]}
                    >
                      {currency.symbol} {currency.code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Category</Text>
              {categories.length === 0 ? (
                <Text style={styles.noCategoriesText}>
                  No categories available
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={true}
                  style={styles.categoryContainer}
              >
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.categoryId}
                      style={[
                        styles.categoryOption,
                        newSpending.categoryId === category.categoryId &&
                          styles.categoryOptionSelected,
                      ]}
                      onPress={() => {
                        console.log(
                          "Category selected:",
                          category.categoryId,
                          category.name
                        );
                        setNewSpending((prev) => {
                          const updated = {
                            ...prev,
                            categoryId: category.categoryId,
                          };
                          return updated;
                        });
                      }}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          newSpending.categoryId === category.categoryId &&
                            styles.categoryTextSelected,
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
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
                onPress={handleAddSpending}
                disabled={submitting}
              >
                <Text style={styles.addButtonText}>
                  {submitting ? "Adding..." : "Add Spending"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Spending Modal */}
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
              <Text style={styles.modalTitle}>Edit Spending</Text>
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
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.textInput}
                value={editSpending.description}
                onChangeText={(text) =>
                  setEditSpending((prev) => ({ ...prev, description: text }))
                }
                placeholder="Enter spending description"
                placeholderTextColor="#999"
              />

              <Text style={styles.inputLabel}>Amount</Text>
              <View style={styles.amountRow}>
                <TextInput
                  style={[styles.textInput, styles.amountInput]}
                  value={editSpending.amount}
                  onChangeText={(text) =>
                    setEditSpending((prev) => ({ ...prev, amount: text }))
                  }
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      editSpending.type === "spending" && styles.typeOptionSpendingSelected
                    ]}
                    onPress={() => setEditSpending(prev => ({ ...prev, type: "spending" }))}
                  >
                    <Text style={[
                      styles.typeText,
                      editSpending.type === "spending" && styles.typeTextSelected
                    ]}>
                      Spending
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      editSpending.type === "income" && styles.typeOptionIncomeSelected
                    ]}
                    onPress={() => setEditSpending(prev => ({ ...prev, type: "income" }))}
                  >
                    <Text style={[
                      styles.typeText,
                      editSpending.type === "income" && styles.typeTextSelected
                    ]}>
                      Income
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.inputLabel}>Currency</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                style={styles.currencyContainer}
              >
                {CURRENCIES.map((currency) => (
                  <TouchableOpacity
                    key={currency.code}
                    style={[
                      styles.currencyOption,
                      editSpending.currency === currency.code &&
                        styles.currencyOptionSelected,
                    ]}
                    onPress={() =>
                      setEditSpending((prev) => ({
                        ...prev,
                        currency: currency.code,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.currencyText,
                        editSpending.currency === currency.code &&
                          styles.currencyTextSelected,
                      ]}
                    >
                      {currency.symbol} {currency.code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Category</Text>
              {categories.length === 0 ? (
                <Text style={styles.noCategoriesText}>
                  No categories available
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={true}
                  style={styles.categoryContainer}
              >
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.categoryId}
                      style={[
                        styles.categoryOption,
                        editSpending.categoryId === category.categoryId &&
                          styles.categoryOptionSelected,
                      ]}
                      onPress={() => {
                        setEditSpending((prev) => ({
                          ...prev,
                          categoryId: category.categoryId,
                        }));
                      }}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          editSpending.categoryId === category.categoryId &&
                            styles.categoryTextSelected,
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
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
                onPress={handleEditSpending}
                disabled={editSubmitting}
              >
                <Text style={styles.addButtonText}>
                  {editSubmitting ? "Updating..." : "Update Spending"}
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
  spendingItem: {
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
  spendingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  spendingAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
    marginRight: 12,
    minWidth: 80,
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
    marginRight: 8,
  },
  spendingActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  spendingDescriptionContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  spendingDescription: {
    fontSize: 14,
    color: "#666",
  },
  spendingDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  spendingCategory: {
    fontSize: 14,
    color: "#666",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  spendingDate: {
    fontSize: 14,
    color: "#666",
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
  // Floating Action Button
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

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    width: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },

  modalBody: {
    padding: 20,
    paddingHorizontal: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#FAFAFA",
  },
  currencyContainer: {
    marginBottom: 16,
  },
  currencyOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  currencyOptionSelected: {
    backgroundColor: "#666",
    borderColor: "#666",
  },
  currencyText: {
    fontSize: 14,
    color: "#666",
  },
  currencyTextSelected: {
    color: "white",
    fontWeight: "600",
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  categoryOptionSelected: {
    backgroundColor: "#666",
    borderColor: "#666",
  },
  categoryText: {
    fontSize: 14,
    color: "#666",
  },
  categoryTextSelected: {
    color: "white",
    fontWeight: "600",
  },
  noCategoriesText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 20,
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    gap: 12,
    justifyContent: "space-between",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    minWidth: 0,
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
  addButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#666",
    justifyContent: "center",
    alignItems: "center",
    minWidth: 0,
  },
  addButtonDisabled: {
    backgroundColor: "#B0B0B0",
  },
  addButtonText: {
    fontSize: 16,
    color: "white",
    fontWeight: "600",
  },
  // Sort Header Styles
  sortHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#E0E0E0",
    borderBottomWidth: 1,
    borderBottomColor: "#D0D0D0",
  },
  sortHeaderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  sortOptions: {
    marginLeft: 15,
    flexDirection: "row",
    gap: 15,
  },
  sortOption: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  sortOptionSelected: {
    backgroundColor: "#666",
    borderColor: "#666",
  },
  sortOptionText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  sortOptionTextSelected: {
    color: "white",
    fontWeight: "600",
    textAlign: "center",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  // Amount and Type Selection Styles
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  amountInput: {
    flex: 1,
    minWidth: 120,
  },
  typeSelector: {
    flexDirection: "row",
    gap: 8,
    flexShrink: 0,
  },
  typeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    minWidth: 70,
    alignItems: "center",
  },
  typeOptionSpendingSelected: {
    backgroundColor: "#FF9500",
    borderColor: "#FF9500",
  },
  typeOptionIncomeSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  typeText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
    textAlign: "center",
  },
  typeTextSelected: {
    color: "white",
    fontWeight: "600",
  },
});

