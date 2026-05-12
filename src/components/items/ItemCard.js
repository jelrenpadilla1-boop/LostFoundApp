import Icon from '@expo/vector-icons/Ionicons';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ItemCard({ item, type, onPress }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return '#4caf50';
      case 'pending':
        return '#ff9800';
      case 'found':
      case 'claimed':
        return '#2196f3';
      case 'returned':
        return '#9c27b0';
      case 'rejected':
        return '#f44336';
      default:
        return '#999';
    }
  };

  const getStatusText = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const imageUrl = item.photo 
    ? item.photo.startsWith('http') 
      ? item.photo 
      : `http://192.168.1.2:8000/storage/${item.photo}`
    : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Icon name="image-outline" size={32} color="#ccc" />
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {item.item_name}
        </Text>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.location} numberOfLines={1}>
          <Icon name="location-outline" size={12} color="#999" />
          {' '}
          {type === 'lost' ? item.lost_location : item.found_location || 'Location not specified'}
        </Text>
        <Text style={styles.date}>
          {type === 'lost' ? 'Lost on' : 'Found on'}{' '}
          {new Date(type === 'lost' ? item.date_lost : item.date_found).toLocaleDateString()}
        </Text>
        <View style={[styles.status, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  image: {
    width: 100,
    height: 100,
    backgroundColor: '#f5f5f5',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  category: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  location: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
  },
  status: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
});
