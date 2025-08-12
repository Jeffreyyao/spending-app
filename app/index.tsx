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

interface Spending {
  spendingId: string;
  amount: number;
  description: string;
  category: string;
  dateOfSpending: string;
  currency?: string;
}

interface Category {
  categoryId: string;
  name: string;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
];

export default function SpendingsScreen() {
  const [spendings, setSpendings] = useState<Spending[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [newSpending, setNewSpending] = useState({
    description: '',
    amount: '',
    category: '',
    currency: 'USD'
  });
  const [submitting, setSubmitting] = useState(false);

  const API_BASE_URL = "https://accounting-api.zyaoaq.workers.dev";
  // const API_BASE_URL = "http://localhost:8787";
  const DB = "accounting-0";

  const fetchData = async () => {
    try {
      setError(null);
      
      // Fetch spendings
      const spendingsResponse = await fetch(`${API_BASE_URL}/spendings?db=${DB}`);
      if (!spendingsResponse.ok) {
        throw new Error(`Failed to fetch spendings: ${spendingsResponse.status}`);
      }
      const spendingsData = await spendingsResponse.json();
      
      // Fetch categories
      const categoriesResponse = await fetch(`${API_BASE_URL}/categories?db=${DB}`);
      if (!categoriesResponse.ok) {
        throw new Error(`Failed to fetch categories: ${categoriesResponse.status}`);
      }
      const categoriesData = await categoriesResponse.json();
      
      setSpendings(spendingsData);
      setCategories(categoriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.categoryId === categoryId);
    return category?.name || 'Unknown';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatAmount = (amount: number, currency = 'USD') => {
    const currencyInfo = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
    return `${currencyInfo.symbol}${amount.toFixed(2)}`;
  };

  const handleAddSpending = async () => {
    if (!newSpending.description.trim() || !newSpending.amount.trim() || !newSpending.category) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const amount = parseFloat(newSpending.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/spending/add?db=${DB}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: newSpending.description.trim(),
          amount: amount,
          category: newSpending.category,
          currency: newSpending.currency,
          dateOfSpending: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add spending: ${response.status}`);
      }

      // Reset form and close modal
      setNewSpending({
        description: '',
        amount: '',
        category: '',
        currency: 'USD'
      });
      setModalVisible(false);
      
      // Refresh data
      await fetchData();
      
      Alert.alert('Success', 'Spending added successfully!');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add spending');
    } finally {
      setSubmitting(false);
    }
  };

  const renderSpendingItem = ({ item }: { item: Spending }) => (
    <View style={styles.spendingItem}>
      <View style={styles.spendingHeader}>
        <Text style={styles.spendingAmount}>{formatAmount(item.amount, item.currency)}</Text>
      </View>
      <View style={styles.spendingDetails}>
        <Text style={styles.spendingCategory}>{getCategoryName(item.category)}</Text>
        <Text style={styles.spendingDate}>{formatDate(item.dateOfSpending)}</Text>
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
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading spendings...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Text style={styles.retryText} onPress={fetchData}>Tap to retry</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Spendings</Text>
      <Text style={styles.subtitle}>Track your expenses here</Text>
      
      {spendings.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No spendings found</Text>
          <Text style={styles.emptySubtext}>Pull to refresh or add new expenses</Text>
        </View>
      ) : (
        <FlatList
          data={spendings}
          renderItem={renderSpendingItem}
          keyExtractor={(item) => item.spendingId}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => {
          setModalVisible(true);
        }}
      >
        <Text style={styles.fabText}>+</Text>
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
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.textInput}
                value={newSpending.description}
                onChangeText={(text) => setNewSpending(prev => ({ ...prev, description: text }))}
                placeholder="Enter spending description"
                placeholderTextColor="#999"
              />

              <Text style={styles.inputLabel}>Amount</Text>
              <TextInput
                style={styles.textInput}
                value={newSpending.amount}
                onChangeText={(text) => setNewSpending(prev => ({ ...prev, amount: text }))}
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Currency</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.currencyContainer}
              >
                {CURRENCIES.map((currency) => (
                  <TouchableOpacity
                    key={currency.code}
                    style={[
                      styles.currencyOption,
                      newSpending.currency === currency.code && styles.currencyOptionSelected
                    ]}
                    onPress={() => setNewSpending(prev => ({ ...prev, currency: currency.code }))}
                  >
                    <Text style={[
                      styles.currencyText,
                      newSpending.currency === currency.code && styles.currencyTextSelected
                    ]}>
                      {currency.symbol} {currency.code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Category</Text>
              {categories.length === 0 ? (
                <Text style={styles.noCategoriesText}>No categories available</Text>
              ) : (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoryContainer}
                >
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.categoryId}
                      style={[
                        styles.categoryOption,
                        newSpending.category === category.categoryId && styles.categoryOptionSelected
                      ]}
                      onPress={() => {
                        console.log('Category selected:', category.categoryId, category.name);
                        setNewSpending(prev => {
                          const updated = { ...prev, category: category.categoryId };
                          return updated;
                        });
                      }}
                    >
                      <Text style={[
                        styles.categoryText,
                        newSpending.category === category.categoryId && styles.categoryTextSelected
                      ]}>
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
                style={[styles.addButton, submitting && styles.addButtonDisabled]}
                onPress={handleAddSpending}
                disabled={submitting}
              >
                <Text style={styles.addButtonText}>
                  {submitting ? 'Adding...' : 'Add Spending'}
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 60,
    marginBottom: 10,
    marginHorizontal: 20,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    marginHorizontal: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    fontSize: 16,
    color: "#FF3B30",
    textAlign: "center",
    marginBottom: 10,
  },
  retryText: {
    fontSize: 16,
    color: "#007AFF",
    textAlign: "center",
    textDecorationLine: "underline",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    marginBottom: 8,
  },
  spendingAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF3B30",
    marginRight: 12,
    minWidth: 80,
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
    fontStyle: "italic",
  },
  spendingDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  spendingCategory: {
    fontSize: 14,
    color: "#007AFF",
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
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  fabText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#FAFAFA',
  },
  currencyContainer: {
    marginBottom: 16,
  },
  currencyOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  currencyOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  currencyText: {
    fontSize: 14,
    color: '#666',
  },
  currencyTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  categoryOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  categoryTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  noCategoriesText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  addButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  addButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});
