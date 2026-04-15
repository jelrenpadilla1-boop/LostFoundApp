// src/components/items/ItemCard.js
import { LinearGradient } from 'expo-linear-gradient';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const API_BASE_URL = 'http://10.116.78.132:8092';

export default function ItemCard({ item, type, onPress }) {
  
  const getImageUrl = (photo) => {
    if (!photo) return null;
    if (photo.startsWith('http')) return photo;
    if (photo.startsWith('/storage/')) {
      return `${API_BASE_URL}${photo}`;
    }
    return `${API_BASE_URL}/storage/${photo}`;
  };

  const getStatusColor = (status) => {
    console.log('Status received:', status); // Debug log
    
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'active':
        return '#4caf50';
      case 'pending':
        return '#ff9800';
      case 'found':
        return '#2196f3';
      case 'claimed':
        return '#2196f3';
      case 'returned':
        return '#9c27b0';
      case 'recovered':
        return '#2e7d32';
      case 'rejected':
        return '#f44336';
      default:
        return '#999';
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      pending: 'Pending',
      approved: 'Active',
      active: 'Active',
      found: 'Found',
      claimed: 'Claimed',
      returned: 'Returned',
      recovered: 'Recovered',
      rejected: 'Rejected',
    };
    return statusMap[status?.toLowerCase()] || status || 'Unknown';
  };

  const getLocationText = () => {
    if (type === 'lost') {
      return item.lost_location || 'Location not specified';
    }
    return item.found_location || 'Location not specified';
  };

  const getDateText = () => {
    if (type === 'lost') {
      return item.date_lost ? new Date(item.date_lost).toLocaleDateString() : 'Date not specified';
    }
    return item.date_found ? new Date(item.date_found).toLocaleDateString() : 'Date not specified';
  };

  const getDateLabel = () => {
    return type === 'lost' ? 'Lost on' : 'Found on';
  };

  const imageUrl = getImageUrl(item.photo);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {imageUrl ? (
        <Image 
          source={{ uri: imageUrl }} 
          style={styles.image}
        />
      ) : (
        <LinearGradient
          colors={['#e50914', '#b20710']}
          style={[styles.image, styles.placeholder]}
        >
          <Icon name="image-outline" size={32} color="#fff" />
        </LinearGradient>
      )}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {item.item_name || 'Unnamed Item'}
        </Text>
        <Text style={styles.category}>{item.category || 'Uncategorized'}</Text>
        
        <View style={styles.locationContainer}>
          <Icon name="location-outline" size={12} color="#999" />
          <Text style={styles.location} numberOfLines={1}>
            {getLocationText()}
          </Text>
        </View>
        
        <Text style={styles.date}>
          {getDateLabel()} {getDateText()}
        </Text>
        
        {/* ALWAYS show status badge - backend already filters */}
        <View style={[styles.status, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
        
        {/* Show user info for admin view */}
        {item.user && item.user.name && (
          <View style={styles.userContainer}>
            <Icon name="person-outline" size={10} color="#999" />
            <Text style={styles.userName} numberOfLines={1}>
              {item.user.name}
            </Text>
          </View>
        )}
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  location: {
    fontSize: 11,
    color: '#999',
    marginLeft: 2,
    flex: 1,
  },
  date: {
    fontSize: 11,
    color: '#999',
    marginBottom: 6,
  },
  status: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  userName: {
    fontSize: 10,
    color: '#999',
    marginLeft: 2,
  },
});