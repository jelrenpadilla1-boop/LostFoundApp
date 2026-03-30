import Icon from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { itemsAPI } from '../../api/items';
import { pickImage } from '../../components/common/ImagePicker';
import { useAuth } from '../../context/AuthContext';

export default function EditItemScreen({ route, navigation }) {
  const { type, id } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    item_name: '',
    description: '',
    category: '',
    photo: null,
    existing_photo: null,
    date: new Date(),
    latitude: '',
    longitude: '',
    location: '',
    status: '',
    showDatePicker: false,
  });

  const categories = [
    'Electronics',
    'Documents',
    'Jewelry',
    'Clothing',
    'Baggage',
    'Keys',
    'Wallet',
    'Books',
    'Sports Equipment',
    'Other',
  ];

  const statusOptions = type === 'lost' 
    ? ['pending', 'approved', 'found', 'returned', 'rejected']
    : ['pending', 'approved', 'claimed', 'returned', 'disposed', 'rejected'];

  useEffect(() => {
    loadItem();
  }, []);

  const loadItem = async () => {
    try {
      const response = await (type === 'lost'
        ? itemsAPI.getLostItem(id)
        : itemsAPI.getFoundItem(id));
      const item = response.data;
      
      setFormData({
        item_name: item.item_name,
        description: item.description,
        category: item.category,
        photo: null,
        existing_photo: item.photo,
        date: new Date(type === 'lost' ? item.date_lost : item.date_found),
        latitude: item.latitude?.toString() || '',
        longitude: item.longitude?.toString() || '',
        location: type === 'lost' ? item.lost_location || '' : item.found_location || '',
        status: item.status,
        showDatePicker: false,
      });
    } catch (error) {
      console.error('Error loading item:', error);
      Alert.alert('Error', 'Failed to load item details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleImagePick = async () => {
    const image = await pickImage();
    if (image) {
      setFormData({ ...formData, photo: image.uri });
    }
  };

  const handleSubmit = async () => {
    if (!formData.item_name || !formData.description || !formData.category) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        item_name: formData.item_name,
        description: formData.description,
        category: formData.category,
        [type === 'lost' ? 'lost_location' : 'found_location']: formData.location,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        status: formData.status,
      };

      if (type === 'lost') {
        data.date_lost = formData.date.toISOString().split('T')[0];
        if (formData.photo) {
          data.photo = formData.photo;
        }
        await itemsAPI.updateLostItem(id, data);
      } else {
        data.date_found = formData.date.toISOString().split('T')[0];
        if (formData.photo) {
          data.photo = formData.photo;
        }
        await itemsAPI.updateFoundItem(id, data);
      }

      Alert.alert('Success', 'Item updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update item');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00f0c8" />
      </View>
    );
  }

  const imageUrl = formData.photo || (formData.existing_photo 
    ? (formData.existing_photo.startsWith('http') 
      ? formData.existing_photo 
      : `http://192.168.1.100:8000/storage/${formData.existing_photo}`)
    : null);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Photo Upload */}
        <TouchableOpacity style={styles.photoContainer} onPress={handleImagePick}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Icon name="camera-outline" size={40} color="#ccc" />
              <Text style={styles.photoText}>Change Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Status (Admin only) */}
        {user?.isAdmin() && (
          <View style={styles.statusContainer}>
            <Text style={styles.label}>Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.statusList}>
                {statusOptions.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusChip,
                      formData.status === status && styles.statusChipActive,
                    ]}
                    onPress={() => setFormData({ ...formData, status })}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        formData.status === status && styles.statusTextActive,
                      ]}
                    >
                      {status.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Item Name */}
        <TextInput
          style={styles.input}
          placeholder="Item Name *"
          value={formData.item_name}
          onChangeText={(text) => setFormData({ ...formData, item_name: text })}
        />

        {/* Category */}
        <View style={styles.categoryContainer}>
          <Text style={styles.label}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoryList}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    formData.category === cat && styles.categoryChipActive,
                  ]}
                  onPress={() => setFormData({ ...formData, category: cat })}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      formData.category === cat && styles.categoryTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Description */}
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description *"
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          multiline
          numberOfLines={4}
        />

        {/* Date */}
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setFormData({ ...formData, showDatePicker: true })}
        >
          <Icon name="calendar-outline" size={20} color="#666" />
          <Text style={styles.dateText}>
            {type === 'lost' ? 'Date Lost: ' : 'Date Found: '}
            {formData.date.toLocaleDateString()}
          </Text>
        </TouchableOpacity>

        {formData.showDatePicker && (
          <DateTimePicker
            value={formData.date}
            mode="date"
            onChange={(event, selectedDate) => {
              setFormData({
                ...formData,
                date: selectedDate || formData.date,
                showDatePicker: false,
              });
            }}
          />
        )}

        {/* Location */}
        <TextInput
          style={styles.input}
          placeholder={type === 'lost' ? 'Lost Location *' : 'Found Location *'}
          value={formData.location}
          onChangeText={(text) => setFormData({ ...formData, location: text })}
        />

        {/* Coordinates (Optional) */}
        <View style={styles.coordinatesRow}>
          <TextInput
            style={[styles.input, styles.coordinateInput]}
            placeholder="Latitude (optional)"
            value={formData.latitude}
            onChangeText={(text) => setFormData({ ...formData, latitude: text })}
            keyboardType="decimal-pad"
          />
          <TextInput
            style={[styles.input, styles.coordinateInput]}
            placeholder="Longitude (optional)"
            value={formData.longitude}
            onChangeText={(text) => setFormData({ ...formData, longitude: text })}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Update Item</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    padding: 20,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  photo: {
    width: 150,
    height: 150,
    borderRadius: 8,
  },
  photoPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  photoText: {
    marginTop: 8,
    color: '#999',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusList: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  statusChipActive: {
    backgroundColor: '#00f0c8',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  statusTextActive: {
    color: '#fff',
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryList: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  categoryChipActive: {
    backgroundColor: '#00f0c8',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  categoryTextActive: {
    color: '#fff',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
  },
  dateText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  coordinatesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  coordinateInput: {
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#00f0c8',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});