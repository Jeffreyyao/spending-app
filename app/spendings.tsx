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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import EmptyState from "../src/components/EmptyState";
import FloatingActionButton from "../src/components/FloatingActionButton";
import IconCircleButton from "../src/components/IconCircleButton";
import { config } from "../src/config";
import { useCategoryContext } from "../src/contexts/CategoryContext";

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
  const { setCategories, categories, categoriesVersion } = useCategoryContext();
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

      // Fetch categories
      const categoriesResponse = await fetch(
        `${config.API_BASE_URL}/categories?db=${config.DB}`
      );
      if (!categoriesResponse.ok) {
        throw new Error(
          `Failed to fetch categories: ${categoriesResponse.status}`
        );
      }
      const categoriesData = await categoriesResponse.json();

      setSpendings(spendingsData);
      setCategories(categoriesData);
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
    <View className="flex-row justify-end items-center px-5 py-2.5 bg-gray-200 border-b border-gray-300">
      <View className="flex-row gap-[15px]">
        <TouchableOpacity
          className={`flex-row gap-1 items-center justify-center rounded-md p-2 ${
            sortBy === 'date' ? 'bg-[#666] border-[#666]' : 'bg-[#F5F5F5] border-[#E0E0E0]'
          }`}
          onPress={() => handleSort('date')}
        >
          <Text className={`${sortBy === 'date' ? 'text-[#F5F5F5]' : 'text-[#666]'}`}>
            Date
          </Text>
          {getSortIcon('date')}
        </TouchableOpacity>
        
        <TouchableOpacity
          className={`flex-row gap-1 items-center justify-center rounded-md p-2 ${
            sortBy === 'amount' ? 'bg-[#666] border-[#666]' : 'bg-[#F5F5F5] border-[#E0E0E0]'
          }`}
          onPress={() => handleSort('amount')}
        >
          <Text className={`${sortBy === 'amount' ? 'text-[#F5F5F5]' : 'text-[#666]'}`}>
            Amount
          </Text>
          {getSortIcon('amount')}
        </TouchableOpacity>
        
        <TouchableOpacity
          className={`flex-row gap-1 items-center justify-center rounded-md p-2 ${
            sortBy === 'category' ? 'bg-[#666] border-[#666]' : 'bg-[#F5F5F5] border-[#E0E0E0]'
          }`}
          onPress={() => handleSort('category')}
        >
          <Text className={`${sortBy === 'category' ? 'text-[#F5F5F5]' : 'text-[#666]'}`}>
            Category
          </Text>
          {getSortIcon('category')}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSpendingItem = ({ item }: { item: Spending }) => (
    <View className="bg-white rounded-xl px-4 py-2 mb-3 shadow-sm">
      <View className="flex-row items-center justify-between mb-2">
        <Text 
          className={`text-lg font-bold mr-3 min-w-[80px] ${
            item.amount >= 0 ? 'text-blue-500' : 'text-orange-500'
          }`}
        >
          {formatAmount(item.amount, item.currency)}
        </Text>
        <View className="flex-row items-center">
          <IconCircleButton
            style={{ marginRight: 8 }}
            onPress={() => openEditModal(item)}
          >
            <Edit size={16} color="#666" />
          </IconCircleButton>
          <IconCircleButton
            onPress={() => handleDeleteSpending(item.spendingId, item.description)}
          >
            <X size={16} color="#666" />
          </IconCircleButton>
        </View>
      </View>
      <View className="flex-row justify-between items-center">
        <Text className="text-sm text-gray-600 bg-blue-50 px-2 py-1 rounded-md">
          {getCategoryName(item.categoryId)}
        </Text>
        <Text className="text-sm text-gray-600">
          {formatDate(item.dateOfSpending)}
        </Text>
      </View>
      {item.description && (
        <View className="mt-2 pt-2 border-t border-gray-300">
          <Text className="text-sm text-gray-600">{item.description}</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-gray-100">
        <ActivityIndicator className="mt-5" size="large" color="#666" />
        <Text className="mt-5 text-base text-gray-600 text-center">Loading spendings...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-gray-100">
        <Text className="text-base text-red-500 text-center mb-2.5">Error: {error}</Text>
        <Text className="text-base text-gray-600 text-center underline" onPress={fetchData}>
          Tap to retry
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      {spendings.length === 0 ? (
        <EmptyState title="No spendings found" subtitle="Pull to refresh or add new expenses" />
      ) : (
        <>
          {renderSortHeader()}
          <FlatList
            data={getSortedSpendings()}
            renderItem={renderSpendingItem}
            keyExtractor={(item) => item.spendingId}
            className="flex-1"
            contentContainerStyle={{ padding: 20 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={true}
          />
        </>
      )}

      {/* Floating Action Button */}
      <FloatingActionButton
        onPress={() => setModalVisible(true)}
        accessibilityLabel="Add spending"
      >
        <Plus size={24} color="white" />
      </FloatingActionButton>

      {/* Add Spending Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-black/50 justify-end"
        >
          <View className="bg-white rounded-t-2xl max-h-[80%] w-full">
            <View className="flex-row justify-between items-center p-5 border-b border-gray-200">
              <Text className="text-xl font-bold text-gray-800">Add New Spending</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="w-[30px] h-[30px] rounded-full bg-gray-100 justify-center items-center"
              >
                <X size={16} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              className="p-5 px-4"
              showsVerticalScrollIndicator={true}
            >
              <Text className="text-base font-semibold text-gray-800 mb-2 mt-4">Description</Text>
              <TextInput
                className="border border-gray-200 rounded-lg p-3 text-base text-gray-800 bg-gray-50"
                value={newSpending.description}
                onChangeText={(text) =>
                  setNewSpending((prev) => ({ ...prev, description: text }))
                }
                placeholder="Enter spending description"
                placeholderTextColor="#999"
              />

              <Text className="text-base font-semibold text-gray-800 mb-2 mt-4">Amount</Text>
              <View className="flex-row items-center flex-wrap gap-2">
                <TextInput
                  className="flex-1 min-w-[120px] border border-gray-200 rounded-lg p-3 text-base text-gray-800 bg-gray-50"
                  value={newSpending.amount}
                  onChangeText={(text) =>
                    setNewSpending((prev) => ({ ...prev, amount: text }))
                  }
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
                <View className="flex-row gap-2 flex-shrink-0">
                  <TouchableOpacity
                    className={`px-3 py-2 rounded-2xl min-w-[70px] items-center ${
                      newSpending.type === "spending" 
                        ? 'bg-orange-500 border-orange-500' 
                        : 'bg-gray-100 border-gray-200'
                    } border`}
                    onPress={() => setNewSpending(prev => ({ ...prev, type: "spending" }))}
                  >
                    <Text className={`text-sm font-medium text-center ${
                      newSpending.type === "spending" 
                        ? 'text-white font-semibold' 
                        : 'text-gray-600'
                    }`}>
                      Spending
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`px-3 py-2 rounded-2xl min-w-[70px] items-center ${
                      newSpending.type === "income" 
                        ? 'bg-blue-500 border-blue-500' 
                        : 'bg-gray-100 border-gray-200'
                    } border`}
                    onPress={() => setNewSpending(prev => ({ ...prev, type: "income" }))}
                  >
                    <Text className={`text-sm font-medium text-center ${
                      newSpending.type === "income" 
                        ? 'text-white font-semibold' 
                        : 'text-gray-600'
                    }`}>
                      Income
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text className="text-base font-semibold text-gray-800 mb-2 mt-4">Currency</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                className="mb-4"
              >
                {CURRENCIES.map((currency) => (
                  <TouchableOpacity
                    key={currency.code}
                    className={`px-4 py-2 mr-2 rounded-full border ${
                      newSpending.currency === currency.code
                        ? 'bg-gray-600 border-gray-600'
                        : 'bg-gray-100 border-gray-200'
                    }`}
                    onPress={() =>
                      setNewSpending((prev) => ({
                        ...prev,
                        currency: currency.code,
                      }))
                    }
                  >
                    <Text
                      className={`text-sm ${
                        newSpending.currency === currency.code
                          ? 'text-white font-semibold'
                          : 'text-gray-600'
                      }`}
                    >
                      {currency.symbol} {currency.code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text className="text-base font-semibold text-gray-800 mb-2 mt-4">Category</Text>
              {categories.length === 0 ? (
                <Text className="text-sm text-gray-500 italic text-center py-5">
                  No categories available
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={true}
                  className="mb-4"
              >
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.categoryId}
                      className={`px-4 py-2 mr-2 rounded-full border ${
                        newSpending.categoryId === category.categoryId
                          ? 'bg-gray-600 border-gray-600'
                          : 'bg-gray-100 border-gray-200'
                      }`}
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
                        className={`text-sm ${
                          newSpending.categoryId === category.categoryId
                            ? 'text-white font-semibold'
                            : 'text-gray-600'
                        }`}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </ScrollView>

            <View className="flex-row p-5 border-t border-gray-200 gap-3 justify-between">
              <TouchableOpacity
                className="flex-1 py-3 rounded-lg bg-gray-100 justify-center items-center"
                onPress={() => setModalVisible(false)}
              >
                <Text className="text-base text-gray-600 font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-3 rounded-lg justify-center items-center ${
                  submitting ? 'bg-gray-400' : 'bg-gray-600'
                }`}
                onPress={handleAddSpending}
                disabled={submitting}
              >
                <Text className="text-base text-white font-semibold">
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
          className="flex-1 bg-black/50 justify-end"
        >
          <View className="bg-white rounded-t-2xl max-h-[80%] w-full">
            <View className="flex-row justify-between items-center p-5 border-b border-gray-200">
              <Text className="text-xl font-bold text-gray-800">Edit Spending</Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                className="w-[30px] h-[30px] rounded-full bg-gray-100 justify-center items-center"
              >
                <X size={16} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              className="p-5 px-4"
              showsVerticalScrollIndicator={true}
            >
              <Text className="text-base font-semibold text-gray-800 mb-2 mt-4">Description</Text>
              <TextInput
                className="border border-gray-200 rounded-lg p-3 text-base text-gray-800 bg-gray-50"
                value={editSpending.description}
                onChangeText={(text) =>
                  setEditSpending((prev) => ({ ...prev, description: text }))
                }
                placeholder="Enter spending description"
                placeholderTextColor="#999"
              />

              <Text className="text-base font-semibold text-gray-800 mb-2 mt-4">Amount</Text>
              <View className="flex-row items-center flex-wrap gap-2">
                <TextInput
                  className="flex-1 min-w-[120px] border border-gray-200 rounded-lg p-3 text-base text-gray-800 bg-gray-50"
                  value={editSpending.amount}
                  onChangeText={(text) =>
                    setEditSpending((prev) => ({ ...prev, amount: text }))
                  }
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
                <View className="flex-row gap-2 flex-shrink-0">
                  <TouchableOpacity
                    className={`px-3 py-2 rounded-2xl min-w-[70px] items-center ${
                      editSpending.type === "spending" 
                        ? 'bg-orange-500 border-orange-500' 
                        : 'bg-gray-100 border-gray-200'
                    } border`}
                    onPress={() => setEditSpending(prev => ({ ...prev, type: "spending" }))}
                  >
                    <Text className={`text-sm font-medium text-center ${
                      editSpending.type === "spending" 
                        ? 'text-white font-semibold' 
                        : 'text-gray-600'
                    }`}>
                      Spending
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`px-3 py-2 rounded-2xl min-w-[70px] items-center ${
                      editSpending.type === "income" 
                        ? 'bg-blue-500 border-blue-500' 
                        : 'bg-gray-100 border-gray-200'
                    } border`}
                    onPress={() => setEditSpending(prev => ({ ...prev, type: "income" }))}
                  >
                    <Text className={`text-sm font-medium text-center ${
                      editSpending.type === "income" 
                        ? 'text-white font-semibold' 
                        : 'text-gray-600'
                    }`}>
                      Income
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text className="text-base font-semibold text-gray-800 mb-2 mt-4">Currency</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                className="mb-4"
              >
                {CURRENCIES.map((currency) => (
                  <TouchableOpacity
                    key={currency.code}
                    className={`px-4 py-2 mr-2 rounded-full border ${
                      editSpending.currency === currency.code
                        ? 'bg-gray-600 border-gray-600'
                        : 'bg-gray-100 border-gray-200'
                    }`}
                    onPress={() =>
                      setEditSpending((prev) => ({
                        ...prev,
                        currency: currency.code,
                      }))
                    }
                  >
                    <Text
                      className={`text-sm ${
                        editSpending.currency === currency.code
                          ? 'text-white font-semibold'
                          : 'text-gray-600'
                      }`}
                    >
                      {currency.symbol} {currency.code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text className="text-base font-semibold text-gray-800 mb-2 mt-4">Category</Text>
              {categories.length === 0 ? (
                <Text className="text-sm text-gray-500 italic text-center py-5">
                  No categories available
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={true}
                  className="mb-4"
              >
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.categoryId}
                      className={`px-4 py-2 mr-2 rounded-full border ${
                        editSpending.categoryId === category.categoryId
                          ? 'bg-gray-600 border-gray-600'
                          : 'bg-gray-100 border-gray-200'
                      }`}
                      onPress={() => {
                        setEditSpending((prev) => ({
                          ...prev,
                          categoryId: category.categoryId,
                        }));
                      }}
                    >
                      <Text
                        className={`text-sm ${
                          editSpending.categoryId === category.categoryId
                            ? 'text-white font-semibold'
                            : 'text-gray-600'
                        }`}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </ScrollView>

            <View className="flex-row p-5 border-t border-gray-200 gap-3 justify-between">
              <TouchableOpacity
                className="flex-1 py-3 rounded-lg bg-gray-100 justify-center items-center"
                onPress={() => setEditModalVisible(false)}
              >
                <Text className="text-base text-gray-600 font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-3 rounded-lg justify-center items-center ${
                  editSubmitting ? 'bg-gray-400' : 'bg-gray-600'
                }`}
                onPress={handleEditSpending}
                disabled={editSubmitting}
              >
                <Text className="text-base text-white font-semibold">
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

