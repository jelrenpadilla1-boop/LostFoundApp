// src/screens/main/MapScreen.js
import Icon from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { WebView } from 'react-native-webview';
import { mapAPI } from '../../api/map';

const { width, height } = Dimensions.get('window');

export default function MapScreen({ navigation }) {
    const webViewRef = useRef(null);
    const [items, setItems] = useState([]);
    const [lostItems, setLostItems] = useState([]);
    const [foundItems, setFoundItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mapReady, setMapReady] = useState(false);
    const [htmlContent, setHtmlContent] = useState('');
    const [userLocation, setUserLocation] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [showList, setShowList] = useState(false);
    const [apiError, setApiError] = useState(null);
    
    // Filter states
    const [selectedCategory, setSelectedCategory] = useState('');
    const [showLost, setShowLost] = useState(true);
    const [showFound, setShowFound] = useState(true);
    const [categories, setCategories] = useState([]);
    
    // Statistics
    const [stats, setStats] = useState({
        lostCount: 0,
        foundCount: 0,
        totalOnMap: 0,
        withCoords: 0,
        needsGeocoding: 0
    });

    useEffect(() => {
        loadItems();
        getUserLocation();
    }, []);

    const loadItems = async () => {
        try {
            setLoading(true);
            setApiError(null);
            const response = await mapAPI.getItems();
            console.log('Map items response:', JSON.stringify(response.data, null, 2));
            
            if (!response.data) {
                throw new Error('No data received from server');
            }
            
            let lost = [];
            let found = [];
            
            if (response.data.success === false) {
                throw new Error(response.data.message || 'Failed to load map items');
            }
            
            // Extract lost items with status
            if (response.data.lost && Array.isArray(response.data.lost)) {
                lost = response.data.lost.map(item => ({ 
                    ...item, 
                    type: 'lost',
                    latitude: item.latitude || null,
                    longitude: item.longitude || null,
                    location_name: item.location_name || item.lost_location || null,
                    status: item.status || 'approved'
                }));
            }
            
            // Extract found items with status
            if (response.data.found && Array.isArray(response.data.found)) {
                found = response.data.found.map(item => ({ 
                    ...item, 
                    type: 'found',
                    latitude: item.latitude || null,
                    longitude: item.longitude || null,
                    location_name: item.location_name || item.found_location || null,
                    status: item.status || 'approved'
                }));
            }
            
            console.log(`Loaded ${lost.length} lost items, ${found.length} found items`);
            
            setLostItems(lost);
            setFoundItems(found);
            
            // Use the 'all' array from the response if available
            const allItems = (response.data.all && Array.isArray(response.data.all)) 
                ? response.data.all 
                : [...lost, ...found];
            
            setItems(allItems);
            
            // Extract unique categories
            const uniqueCategories = [...new Set(allItems.map(item => item.category).filter(c => c))];
            setCategories(uniqueCategories.sort());
            
            // Count items with coordinates vs needing geocoding
            const withCoords = allItems.filter(item => item.latitude && item.longitude).length;
            const needsGeocoding = allItems.filter(item => (!item.latitude || !item.longitude) && item.location_name).length;
            
            console.log(`Items with coordinates: ${withCoords}, Needs geocoding: ${needsGeocoding}`);
            
            // Update stats
            setStats({
                lostCount: lost.length,
                foundCount: found.length,
                totalOnMap: allItems.length,
                withCoords: withCoords,
                needsGeocoding: needsGeocoding
            });
            
            if (allItems.length === 0) {
                setApiError('No items with location data found. Items need to have a location to appear on the map.');
            }
            
            generateMapHTML(allItems);
        } catch (error) {
            console.error('Error loading map items:', error);
            setApiError(error.response?.data?.message || error.message || 'Failed to load map items');
            Alert.alert('Error', apiError || 'Failed to load map items');
            setLoading(false);
        }
    };

    const getUserLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('Location permission denied');
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            setUserLocation({
                lat: location.coords.latitude,
                lng: location.coords.longitude,
            });
        } catch (error) {
            console.error('Error getting location:', error);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            approved: '#22c55e',
            claimed: '#3b82f6',
            returned: '#8b5cf6',
            found: '#eab308',
            recovered: '#10b981',
            disposed: '#6b7280',
            pending: '#f59e0b',
            rejected: '#ef4444'
        };
        return colors[status] || '#6b7280';
    };

    const getStatusLabel = (status) => {
        const labels = {
            approved: 'Approved',
            claimed: 'Claimed',
            returned: 'Returned',
            found: 'Found',
            recovered: 'Recovered',
            disposed: 'Disposed',
            pending: 'Pending',
            rejected: 'Rejected'
        };
        return labels[status] || status || 'Unknown';
    };

    const generateMapHTML = (allItems) => {
        // Filter items based on current filters
        const filteredItems = allItems.filter(item => {
            if (!showLost && item.type === 'lost') return false;
            if (!showFound && item.type === 'found') return false;
            if (selectedCategory && item.category !== selectedCategory) return false;
            return true;
        });
        
        console.log(`Filtered items: ${filteredItems.length} (Lost: ${showLost}, Found: ${showFound}, Category: ${selectedCategory || 'All'})`);
        
        // Separate items with coordinates vs items that need geocoding
        const itemsWithCoords = filteredItems.filter(item => item.latitude && item.longitude);
        const itemsToGeocode = filteredItems.filter(item => (!item.latitude || !item.longitude) && item.location_name);
        
        console.log(`Items with coordinates: ${itemsWithCoords.length}, Items to geocode: ${itemsToGeocode.length}`);
        
        // Build markers array for items with coordinates
        const markersArray = itemsWithCoords.map(item => ({
            id: item.id,
            type: item.type,
            lat: item.latitude,
            lng: item.longitude,
            name: escapeForJS(item.item_name),
            category: escapeForJS(item.category || 'Uncategorized'),
            description: escapeForJS(item.description?.substring(0, 100) || 'No description'),
            locationName: escapeForJS(item.location_name || ''),
            photo: item.photo || '',
            status: item.status || 'approved'
        }));
        
        // Build geocode array for items needing geocoding
        const geocodeArray = itemsToGeocode.map(item => ({
            id: item.id,
            type: item.type,
            name: escapeForJS(item.item_name),
            category: escapeForJS(item.category || 'Uncategorized'),
            description: escapeForJS(item.description?.substring(0, 100) || 'No description'),
            locationName: escapeForJS(item.location_name || ''),
            photo: item.photo || '',
            status: item.status || 'approved'
        }));

        // Center map on user location or default to Philippines
        const centerLat = userLocation?.lat || 9.8800;
        const centerLng = userLocation?.lng || 124.2000;
        const zoom = userLocation ? 13 : 10;

        const noItemsMessage = (markersArray.length === 0 && geocodeArray.length === 0) 
            ? '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;z-index:1000;background:#2a2a2a;padding:20px;border-radius:12px;color:white;"><i class="fas fa-map-marker-alt" style="font-size:48px;margin-bottom:16px;"></i><p>No items found</p><p style="font-size:12px;color:#888;">Items need to have a location</p></div>'
            : '';

        const html = `<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a1a; margin: 0; padding: 0; }
        #map { height: 100vh; width: 100vw; position: absolute; top: 0; left: 0; }
        .leaflet-popup-content-wrapper { border-radius: 12px; padding: 0; overflow: hidden; }
        .leaflet-popup-content { margin: 0; padding: 0; min-width: 260px; max-width: 310px; }
        .leaflet-popup-close-button { padding: 8px 12px !important; color: #666 !important; font-size: 20px !important; }
        .leaflet-popup-close-button:hover { color: #e50914 !important; background: transparent !important; }
        .leaflet-container { background: #1a1a1a !important; }
        .leaflet-control-attribution { background: rgba(26, 26, 26, 0.8) !important; color: #888 !important; font-size: 9px !important; }
        .leaflet-control-zoom { border: none !important; }
        .leaflet-control-zoom a { background: #2a2a2a !important; color: #fff !important; border-color: #444 !important; }
        .leaflet-control-zoom a:hover { background: #3a3a3a !important; }
        #loading {
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            text-align: center; z-index: 1000; background: #2a2a2a; padding: 20px;
            border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); color: white;
        }
        #loading .spinner {
            border: 3px solid #444; border-top: 3px solid #e50914; border-radius: 50%;
            width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;
        }
        #geocodeProgress {
            position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
            z-index: 1001; background: #2a2a2a; padding: 10px 16px; border-radius: 30px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: none; align-items: center; gap: 10px; color: white;
        }
        #geocodeProgressBar { width: 120px; height: 4px; background: #444; border-radius: 2px; overflow: hidden; }
        #geocodeProgressFill { height: 100%; background: #e50914; width: 0%; transition: width 0.3s ease; }
        #geocodeProgressText { font-size: 11px; color: #ccc; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .custom-marker { display: flex; align-items: center; justify-content: center; }
        .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 9px;
            font-weight: 700;
            margin-left: 8px;
        }
        .status-approved { background: rgba(34,197,94,0.2); color: #22c55e; }
        .status-claimed { background: rgba(59,130,246,0.2); color: #3b82f6; }
        .status-returned { background: rgba(139,92,246,0.2); color: #8b5cf6; }
        .status-found { background: rgba(234,179,8,0.2); color: #eab308; }
        .status-recovered { background: rgba(16,185,129,0.2); color: #10b981; }
        .status-disposed { background: rgba(107,114,128,0.2); color: #6b7280; }
    </style>
</head>
<body>
    <div id="map"></div>
    ${noItemsMessage}
    <div id="loading">
        <div class="spinner"></div>
        <p style="margin-top: 10px; color: #ccc;">Loading map...</p>
        <p style="margin-top: 5px; font-size: 11px; color: #888;" id="loadingDetail">${markersArray.length} with coords, ${geocodeArray.length} to geocode</p>
    </div>
    <div id="geocodeProgress">
        <div id="geocodeProgressBar"><div id="geocodeProgressFill"></div></div>
        <span id="geocodeProgressText">Resolving locations...</span>
    </div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        window.onerror = function(msg, url, line) {
            window.ReactNativeWebView.postMessage('error:' + msg + ' at line ' + line);
            return false;
        };
        
        let map;
        let markers = [];
        let userMarker = null;
        let geocodeCache = {};
        
        const markersData = ${JSON.stringify(markersArray)};
        const geocodeData = ${JSON.stringify(geocodeArray)};
        const userLocation = ${userLocation ? JSON.stringify(userLocation) : 'null'};
        
        async function geocodeAddress(address) {
            if (!address || typeof address !== 'string') return null;
            const trimmed = address.trim();
            if (!trimmed) return null;
            if (geocodeCache[trimmed]) return geocodeCache[trimmed];
            
            const queries = [trimmed];
            const lower = trimmed.toLowerCase();
            if (!lower.includes('philippines')) queries.push(trimmed + ', Philippines');
            if (!lower.includes('bohol')) queries.push(trimmed + ', Bohol, Philippines');
            if (!lower.includes('cebu')) queries.push(trimmed + ', Cebu, Philippines');
            
            for (const query of queries) {
                try {
                    await new Promise(r => setTimeout(r, 1000));
                    const url = 'https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(query) + '&limit=1';
                    const response = await fetch(url, { headers: { 'Accept-Language': 'en' } });
                    if (!response.ok) continue;
                    const data = await response.json();
                    if (data && data.length > 0) {
                        const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                        geocodeCache[trimmed] = result;
                        console.log('Geocoded: ' + trimmed + ' -> ' + result.lat + ', ' + result.lng);
                        return result;
                    }
                } catch (e) {
                    console.error('Geocode error for ' + query + ':', e);
                }
            }
            console.warn('Could not geocode: ' + trimmed);
            return null;
        }
        
        function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
        
        function getStatusBadgeHtml(status) {
            const statusClass = 'status-' + status;
            const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
            return '<span class="status-badge ' + statusClass + '">' + statusLabel + '</span>';
        }
        
        function createMarkerIcon(type) {
            const color = type === 'lost' ? '#ef4444' : '#10b981';
            const letter = type === 'lost' ? '!' : '✓';
            return L.divIcon({
                html: '<div style="background:' + color + ';width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"><span style="color:white;font-weight:bold;font-size:16px;">' + letter + '</span></div>',
                className: 'custom-marker',
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            });
        }
        
        function createPopupContent(item, type, lat, lng) {
            const color = type === 'lost' ? '#ef4444' : '#10b981';
            const locationText = item.locationName || lat.toFixed(5) + ', ' + lng.toFixed(5);
            const photoHtml = item.photo ? '<img src="' + item.photo + '" style="width:100%;border-radius:8px;margin-bottom:12px;max-height:120px;object-fit:cover;" onerror="this.style.display=\\'none\\'">' : '';
            const statusBadge = getStatusBadgeHtml(item.status);
            
            return '<div style="padding:16px;min-width:260px;max-width:310px;font-family:-apple-system,sans-serif;">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">' +
                '<h6 style="font-size:15px;font-weight:700;margin:0;color:#1a1a1a;">' + escapeHtml(item.name) + '</h6>' +
                statusBadge +
                '</div>' +
                '<span style="display:inline-block;margin-bottom:10px;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:800;background:' + color + '18;color:' + color + ';">' + type.toUpperCase() + '</span>' +
                '<p style="margin:0 0 6px;font-size:12px;color:#444;"><strong>Category:</strong> ' + escapeHtml(item.category) + '</p>' +
                '<p style="margin:0 0 10px;font-size:12px;color:#555;"><span>📍</span> ' + escapeHtml(locationText) + '</p>' +
                '<p style="margin:0 0 12px;line-height:1.5;font-size:12px;color:#555;">' + escapeHtml(item.description) + '</p>' +
                photoHtml +
                '<button onclick="window.ReactNativeWebView.postMessage(\\'item:' + item.id + ':' + type + '\\')" style="display:flex;align-items:center;justify-content:center;width:100%;padding:10px;border-radius:8px;border:none;font-size:12px;font-weight:700;background:#e50914;color:#fff;cursor:pointer;">View Details</button>' +
                '</div>';
        }
        
        function escapeHtml(text) {
            if (!text) return '';
            return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }
        
        function placeMarker(item, lat, lng) {
            const icon = createMarkerIcon(item.type);
            const marker = L.marker([lat, lng], { icon }).addTo(map);
            marker.bindPopup(createPopupContent(item, item.type, lat, lng));
            markers.push({ marker, type: item.type, category: item.category, id: item.id, lat, lng, status: item.status });
            return marker;
        }
        
        async function initMap() {
            try {
                map = L.map('map').setView([${centerLat}, ${centerLng}], ${zoom});
                
                L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap',
                    maxZoom: 19
                }).addTo(map);
                
                markersData.forEach(item => placeMarker(item, item.lat, item.lng));
                
                if (userLocation) {
                    const userIcon = L.divIcon({
                        html: '<div style="background:#e50914;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);"><span style="color:white;font-size:20px;">●</span></div>',
                        iconSize: [36, 36],
                        iconAnchor: [18, 18]
                    });
                    userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(map);
                    userMarker.bindPopup('<div style="padding:12px;font-weight:700;">📍 Your Location</div>');
                }
                
                if (geocodeData.length > 0) {
                    document.getElementById('geocodeProgress').style.display = 'flex';
                    let geocoded = 0;
                    for (let i = 0; i < geocodeData.length; i++) {
                        const item = geocodeData[i];
                        const progress = Math.round(((i + 1) / geocodeData.length) * 100);
                        document.getElementById('geocodeProgressFill').style.width = progress + '%';
                        document.getElementById('geocodeProgressText').textContent = 'Locating... (' + (i + 1) + '/' + geocodeData.length + ')';
                        
                        const pos = await geocodeAddress(item.locationName);
                        if (pos) {
                            placeMarker(item, pos.lat, pos.lng);
                            geocoded++;
                        }
                        if (i < geocodeData.length - 1) await sleep(1000);
                    }
                    document.getElementById('geocodeProgress').style.display = 'none';
                    console.log('Geocoded ' + geocoded + ' of ' + geocodeData.length + ' items');
                }
                
                document.getElementById('loading').style.display = 'none';
                
                if (markers.length > 0 || userMarker) {
                    const bounds = L.latLngBounds([]);
                    markers.forEach(m => bounds.extend([m.lat, m.lng]));
                    if (userMarker) bounds.extend([userLocation.lat, userLocation.lng]);
                    map.fitBounds(bounds, { padding: [30, 30] });
                } else {
                    map.setView([${centerLat}, ${centerLng}], ${zoom});
                }
                
                window.ReactNativeWebView.postMessage('map:ready');
            } catch (error) {
                console.error('Init map error:', error);
                document.getElementById('loading').innerHTML = '<p style="color: #ef4444;">Map failed to load: ' + error.message + '</p>';
                window.ReactNativeWebView.postMessage('error:Map init failed');
            }
        }
        
        if (typeof L !== 'undefined') {
            initMap();
        } else {
            document.getElementById('loading').innerHTML = '<p style="color: #ef4444;">Failed to load map library</p>';
            window.ReactNativeWebView.postMessage('error:Leaflet not loaded');
        }
        
        window.centerOnUser = function() {
            if (userMarker) {
                map.setView([userLocation.lat, userLocation.lng], 15);
                userMarker.openPopup();
            }
        };
        
        window.fitAllMarkers = function() {
            if (markers.length > 0) {
                const bounds = L.latLngBounds([]);
                markers.forEach(m => bounds.extend([m.lat, m.lng]));
                if (userMarker) bounds.extend([userLocation.lat, userLocation.lng]);
                map.fitBounds(bounds, { padding: [30, 30] });
            } else {
                map.setView([${centerLat}, ${centerLng}], ${zoom});
            }
        };
    </script>
</body>
</html>`;
        
        setHtmlContent(html);
        setLoading(false);
    };

    useEffect(() => {
        if (items.length > 0 && !loading) {
            generateMapHTML(items);
        }
    }, [selectedCategory, showLost, showFound]);

    const handleMessage = (event) => {
        const data = event.nativeEvent.data;
        console.log('WebView message:', data);
        
        if (data === 'map:ready') {
            setMapReady(true);
            setLoading(false);
        } else if (data && data.startsWith('error:')) {
            console.error('Map error:', data);
            setLoading(false);
        } else if (data && data.startsWith('item:')) {
            const parts = data.split(':');
            const itemId = parts[1];
            const itemType = parts[2];
            navigation.navigate('ItemDetail', { type: itemType, id: parseInt(itemId) });
        }
    };

    const centerOnUser = () => {
        if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`
                if (typeof window.centerOnUser === 'function') {
                    window.centerOnUser();
                }
                true;
            `);
        } else {
            Alert.alert('Location Unavailable', 'Unable to get your current location');
        }
    };

    const fitAllMarkers = () => {
        if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`
                if (typeof window.fitAllMarkers === 'function') {
                    window.fitAllMarkers();
                }
                true;
            `);
        }
    };

    const getFilteredItemsForList = () => {
        let filtered = [...items];
        if (!showLost) filtered = filtered.filter(item => item.type !== 'lost');
        if (!showFound) filtered = filtered.filter(item => item.type !== 'found');
        if (selectedCategory) filtered = filtered.filter(item => item.category === selectedCategory);
        return filtered;
    };

    const renderItemRow = ({ item }) => (
        <TouchableOpacity 
            style={styles.listItem}
            onPress={() => {
                setShowList(false);
                navigation.navigate('ItemDetail', { type: item.type, id: item.id });
            }}
        >
            <View style={styles.listItemHeader}>
                <View style={[styles.listItemBadge, item.type === 'lost' ? styles.lostBadge : styles.foundBadge]}>
                    <Text style={[styles.listItemBadgeText, item.type === 'lost' ? styles.lostBadgeText : styles.foundBadgeText]}>
                        {item.type === 'lost' ? 'LOST' : 'FOUND'}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]}>
                        {getStatusLabel(item.status).toUpperCase()}
                    </Text>
                </View>
            </View>
            <Text style={styles.listItemTitle}>{item.item_name}</Text>
            <Text style={styles.listItemCategory}>{item.category?.toUpperCase() || 'UNCATEGORIZED'}</Text>
            {item.location_name && (
                <View style={styles.listItemLocation}>
                    <Icon name="location-outline" size={12} color="#666" />
                    <Text style={styles.listItemLocationText} numberOfLines={1}>{item.location_name}</Text>
                </View>
            )}
            <Text style={styles.listItemDate}>
                {item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown date'}
            </Text>
        </TouchableOpacity>
    );

    const renderFilterModal = () => (
        <Modal
            visible={showFilters}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowFilters(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Filter Items</Text>
                        <TouchableOpacity onPress={() => setShowFilters(false)}>
                            <Icon name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Item Type</Text>
                            <View style={styles.checkboxGroup}>
                                <TouchableOpacity 
                                    style={styles.checkboxItem}
                                    onPress={() => setShowLost(!showLost)}
                                >
                                    <View style={[styles.checkbox, showLost && styles.checkboxChecked]}>
                                        {showLost && <Icon name="checkmark" size={14} color="white" />}
                                    </View>
                                    <Icon name="alert-circle" size={18} color="#ef4444" />
                                    <Text style={styles.checkboxLabel}>Show Lost Items</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={styles.checkboxItem}
                                    onPress={() => setShowFound(!showFound)}
                                >
                                    <View style={[styles.checkbox, showFound && styles.checkboxChecked]}>
                                        {showFound && <Icon name="checkmark" size={14} color="white" />}
                                    </View>
                                    <Icon name="checkmark-circle" size={18} color="#10b981" />
                                    <Text style={styles.checkboxLabel}>Show Found Items</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Category</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                                <TouchableOpacity 
                                    style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
                                    onPress={() => setSelectedCategory('')}
                                >
                                    <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>All</Text>
                                </TouchableOpacity>
                                {categories.map(cat => (
                                    <TouchableOpacity 
                                        key={cat}
                                        style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
                                        onPress={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                                    >
                                        <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>
                                            {cat}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                        
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Statistics</Text>
                            <View style={styles.statsContainer}>
                                <View style={styles.statCard}>
                                    <Icon name="alert-circle" size={24} color="#ef4444" />
                                    <Text style={styles.statNumber}>{stats.lostCount}</Text>
                                    <Text style={styles.statLabel}>Lost Items</Text>
                                </View>
                                <View style={styles.statCard}>
                                    <Icon name="checkmark-circle" size={24} color="#10b981" />
                                    <Text style={styles.statNumber}>{stats.foundCount}</Text>
                                    <Text style={styles.statLabel}>Found Items</Text>
                                </View>
                                <View style={styles.statCard}>
                                    <Icon name="map" size={24} color="#e50914" />
                                    <Text style={styles.statNumber}>{stats.totalOnMap}</Text>
                                    <Text style={styles.statLabel}>Total on Map</Text>
                                </View>
                            </View>
                            <View style={styles.statsDetail}>
                                <Text style={styles.statsDetailText}>
                                    📍 {stats.withCoords} items have coordinates
                                </Text>
                                <Text style={styles.statsDetailText}>
                                    🏠 {stats.needsGeocoding} items need geocoding
                                </Text>
                            </View>
                            <View style={styles.statsNote}>
                                <Icon name="checkmark-circle" size={12} color="#2e7d32" />
                                <Text style={styles.statsNoteText}>All items except pending/rejected are shown</Text>
                            </View>
                        </View>
                    </ScrollView>
                    
                    <View style={styles.modalFooter}>
                        <TouchableOpacity 
                            style={styles.resetButton}
                            onPress={() => {
                                setSelectedCategory('');
                                setShowLost(true);
                                setShowFound(true);
                            }}
                        >
                            <Text style={styles.resetButtonText}>Reset Filters</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.applyButton}
                            onPress={() => setShowFilters(false)}
                        >
                            <Text style={styles.applyButtonText}>Apply</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const renderListModal = () => {
        const filteredItems = getFilteredItemsForList();
        
        return (
            <Modal
                visible={showList}
                animationType="slide"
                onRequestClose={() => setShowList(false)}
            >
                <SafeAreaView style={styles.listModalContainer}>
                    <View style={styles.listModalHeader}>
                        <Text style={styles.listModalTitle}>
                            Items List ({filteredItems.length})
                        </Text>
                        <TouchableOpacity onPress={() => setShowList(false)}>
                            <Icon name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>
                    
                    {filteredItems.length === 0 ? (
                        <View style={styles.emptyListContainer}>
                            <Icon name="list-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyListTitle}>No items found</Text>
                            <Text style={styles.emptyListText}>
                                Try changing your filters
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredItems}
                            keyExtractor={(item) => `${item.type}-${item.id}`}
                            renderItem={renderItemRow}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.listContent}
                        />
                    )}
                </SafeAreaView>
            </Modal>
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#e50914" />
                <Text style={styles.loadingText}>Loading map...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <WebView
                ref={webViewRef}
                source={{ html: htmlContent }}
                style={styles.webview}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                onMessage={handleMessage}
                originWhitelist={['*']}
                startInLoadingState={false}
                onLoadEnd={() => console.log('WebView loaded')}
                onError={(e) => console.error('WebView error:', e.nativeEvent)}
            />
            
            <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
                <Icon name="options" size={22} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.listButton} onPress={() => setShowList(true)}>
                <Icon name="list" size={22} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.locationButton} onPress={centerOnUser}>
                <Icon name="locate" size={24} color="#e50914" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.fitButton} onPress={fitAllMarkers}>
                <Icon name="expand" size={22} color="#e50914" />
            </TouchableOpacity>
            
            {renderFilterModal()}
            {renderListModal()}
        </View>
    );
}

function escapeForJS(text) {
    if (!text) return '';
    return String(text)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#faf9fe',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#faf9fe',
        padding: 20,
    },
    loadingText: {
        marginTop: 12,
        color: '#5b5b7a',
        fontSize: 14,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e1b2f',
        marginTop: 16,
    },
    emptyText: {
        fontSize: 14,
        color: '#5b5b7a',
        marginTop: 8,
        textAlign: 'center',
    },
    reportButton: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#e50914',
        borderRadius: 25,
    },
    reportButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    webview: {
        flex: 1,
    },
    filterButton: {
        position: 'absolute',
        top: 60,
        left: 20,
        backgroundColor: '#e50914',
        padding: 12,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    listButton: {
        position: 'absolute',
        top: 60,
        left: 80,
        backgroundColor: '#e50914',
        padding: 12,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    locationButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#edeef5',
    },
    fitButton: {
        position: 'absolute',
        bottom: 90,
        right: 20,
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#edeef5',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: height * 0.8,
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e1b2f',
    },
    filterSection: {
        paddingHorizontal: 20,
        paddingTop: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    filterSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    checkboxGroup: {
        gap: 12,
    },
    checkboxItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#e50914',
        borderColor: '#e50914',
    },
    checkboxLabel: {
        fontSize: 14,
        color: '#444',
        fontWeight: '500',
    },
    categoryScroll: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        marginRight: 10,
    },
    categoryChipActive: {
        backgroundColor: '#e50914',
    },
    categoryChipText: {
        fontSize: 13,
        color: '#666',
    },
    categoryChipTextActive: {
        color: 'white',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
        padding: 12,
        borderRadius: 12,
        marginHorizontal: 4,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e1b2f',
        marginTop: 6,
    },
    statLabel: {
        fontSize: 11,
        color: '#666',
        marginTop: 2,
    },
    statsDetail: {
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    statsDetailText: {
        fontSize: 11,
        color: '#888',
        marginVertical: 2,
    },
    statsNote: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    statsNoteText: {
        fontSize: 11,
        color: '#666',
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    resetButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e50914',
        alignItems: 'center',
    },
    resetButtonText: {
        color: '#e50914',
        fontWeight: '600',
        fontSize: 14,
    },
    applyButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#e50914',
        alignItems: 'center',
    },
    applyButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    listModalContainer: {
        flex: 1,
        backgroundColor: '#f8f8f8',
    },
    listModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    listModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e1b2f',
    },
    listContent: {
        padding: 16,
    },
    listItem: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    listItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    listItemBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    lostBadge: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
    },
    foundBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
    },
    listItemBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    lostBadgeText: {
        color: '#ef4444',
    },
    foundBadgeText: {
        color: '#10b981',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusBadgeText: {
        fontSize: 9,
        fontWeight: '700',
    },
    listItemCategory: {
        fontSize: 10,
        fontWeight: '600',
        color: '#999',
        marginBottom: 6,
    },
    listItemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e1b2f',
        marginBottom: 6,
    },
    listItemLocation: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    listItemLocationText: {
        fontSize: 12,
        color: '#666',
        flex: 1,
    },
    listItemDate: {
        fontSize: 11,
        color: '#999',
    },
    emptyListContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyListTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginTop: 16,
    },
    emptyListText: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
        textAlign: 'center',
    },
});