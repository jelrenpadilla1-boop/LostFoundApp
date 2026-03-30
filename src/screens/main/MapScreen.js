// src/screens/main/MapScreen.js
import Icon from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { WebView } from 'react-native-webview';
import { mapAPI } from '../../api/map';

// Replace with your Google Maps API Key
const GOOGLE_MAPS_API_KEY = 'AIzaSyCmsqQe5LHRKvOUVNdXgyVNoNkk6NlSXYQ';

export default function MapScreen({ navigation }) {
    const webViewRef = useRef(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [htmlContent, setHtmlContent] = useState('');
    const [userLocation, setUserLocation] = useState(null);

    useEffect(() => {
        loadItems();
        getUserLocation();
    }, []);

    const loadItems = async () => {
        try {
            const response = await mapAPI.getItems();
            console.log('Map items loaded:', response.data);
            const allItems = [
                ...(response.data.lost || []).map(item => ({ ...item, type: 'lost' })),
                ...(response.data.found || []).map(item => ({ ...item, type: 'found' }))
            ];
            setItems(allItems);
            generateMapHTML(allItems);
        } catch (error) {
            console.error('Error loading map items:', error);
            Alert.alert('Error', 'Failed to load map items');
        } finally {
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

    const generateMapHTML = (items) => {
        // Create markers for all items with coordinates
        const markers = items.filter(item => item.latitude && item.longitude).map(item => `
            new google.maps.Marker({
                position: { lat: ${item.latitude}, lng: ${item.longitude} },
                map: map,
                icon: {
                    url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Ccircle cx="16" cy="16" r="14" fill="${item.type === 'lost' ? '%23ef4444' : '%2310b981'}" stroke="white" stroke-width="2"/%3E%3Ctext x="16" y="22" text-anchor="middle" fill="white" font-size="14" font-weight="bold"%3E${item.type === 'lost' ? '!' : '✓'}%3C/text%3E%3C/svg%3E',
                    scaledSize: new google.maps.Size(32, 32),
                    anchor: new google.maps.Point(16, 32)
                },
                title: '${escapeHtml(item.item_name)}'
            }).addListener('click', () => {
                const infoWindow = new google.maps.InfoWindow({
                    content: \`
                        <div style="padding: 12px; min-width: 200px; max-width: 280px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <span style="background-color: ${item.type === 'lost' ? '#ef4444' : '#10b981'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold;">${item.type === 'lost' ? 'LOST' : 'FOUND'}</span>
                                <span style="font-size: 11px; color: #666;">${escapeHtml(item.category || 'Uncategorized')}</span>
                            </div>
                            <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #1e1b2f;">${escapeHtml(item.item_name)}</h4>
                            <p style="margin: 0 0 8px 0; font-size: 12px; color: #666; line-height: 1.4;">${escapeHtml(item.description?.substring(0, 100) || 'No description')}${item.description?.length > 100 ? '...' : ''}</p>
                            ${item.lost_location || item.found_location ? `<p style="margin: 0 0 8px 0; font-size: 11px; color: #999;"><i class="fas fa-map-marker-alt" style="margin-right: 4px;"></i> ${escapeHtml(item.lost_location || item.found_location)}</p>` : ''}
                            <button onclick="window.ReactNativeWebView.postMessage('item:${item.id}:${item.type}')" style="width: 100%; padding: 8px; background-color: ${item.type === 'lost' ? '#ef4444' : '#10b981'}; color: white; border: none; border-radius: 20px; font-size: 12px; font-weight: bold; cursor: pointer; margin-top: 8px;">
                                View Details
                            </button>
                        </div>
                    \`
                });
                infoWindow.open(map, this);
            });
        `).join('\n');

        // Center map on user location if available
        const centerLat = userLocation?.lat || 14.5995;
        const centerLng = userLocation?.lng || 120.9842;
        const zoom = userLocation ? 13 : 11;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        background: #f5f5f5;
                    }
                    #map {
                        height: 100vh;
                        width: 100vw;
                    }
                    .gm-style-iw {
                        border-radius: 12px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    }
                    .gm-style-iw button {
                        display: none;
                    }
                    .custom-control {
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                        padding: 8px 12px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .custom-control:hover {
                        background: #f0f0f0;
                    }
                </style>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
                <script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places"></script>
            </head>
            <body>
                <div id="map"></div>
                <div id="loading" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; z-index: 1000; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                    <div style="border: 3px solid #f3f3f3; border-top: 3px solid #7c3aed; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;"></div>
                    <p style="margin-top: 10px; color: #666;">Loading map...</p>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
                <script>
                    let map;
                    let markers = [];
                    let userMarker;

                    function initMap() {
                        const center = { lat: ${centerLat}, lng: ${centerLng} };
                        
                        map = new google.maps.Map(document.getElementById('map'), {
                            center: center,
                            zoom: ${zoom},
                            styles: [
                                {
                                    featureType: 'poi',
                                    elementType: 'labels',
                                    stylers: [{ visibility: 'off' }]
                                }
                            ],
                            zoomControl: true,
                            mapTypeControl: false,
                            streetViewControl: false,
                            fullscreenControl: true,
                        });
                        
                        // Add markers for items
                        ${markers}
                        
                        // Add user location marker
                        ${userLocation ? `
                        userMarker = new google.maps.Marker({
                            position: { lat: ${userLocation.lat}, lng: ${userLocation.lng} },
                            map: map,
                            icon: {
                                url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Ccircle cx="16" cy="16" r="14" fill="%237c3aed" stroke="white" stroke-width="2"/%3E%3Ctext x="16" y="22" text-anchor="middle" fill="white" font-size="14" font-weight="bold"%3E●%3C/text%3E%3C/svg%3E',
                                scaledSize: new google.maps.Size(32, 32),
                                anchor: new google.maps.Point(16, 16)
                            },
                            title: 'Your Location'
                        });
                        
                        userMarker.addListener('click', () => {
                            const infoWindow = new google.maps.InfoWindow({
                                content: '<strong style="color: #7c3aed;">Your Current Location</strong>'
                            });
                            infoWindow.open(map, userMarker);
                        });
                        ` : ''}
                        
                        // Hide loading when map is ready
                        setTimeout(function() {
                            document.getElementById('loading').style.display = 'none';
                        }, 1000);
                        
                        // Fit bounds to show all markers
                        const bounds = new google.maps.LatLngBounds();
                        let hasBounds = false;
                        
                        ${items.filter(item => item.latitude && item.longitude).map(item => `
                        bounds.extend({ lat: ${item.latitude}, lng: ${item.longitude} });
                        hasBounds = true;
                        `).join('\n')}
                        
                        ${userLocation ? `
                        bounds.extend({ lat: ${userLocation.lat}, lng: ${userLocation.lng} });
                        hasBounds = true;
                        ` : ''}
                        
                        if (hasBounds) {
                            map.fitBounds(bounds, 50);
                        }
                    }
                    
                    // Wait for Google Maps to load
                    window.addEventListener('load', initMap);
                    
                    // Function to center on user location
                    function centerOnUser() {
                        if (userMarker) {
                            map.setCenter(userMarker.getPosition());
                            map.setZoom(15);
                            new google.maps.InfoWindow({
                                content: '<strong style="color: #7c3aed;">Your Location</strong>'
                            }).open(map, userMarker);
                        }
                    }
                </script>
            </body>
            </html>
        `;
        
        setHtmlContent(html);
    };

    const handleMessage = (event) => {
        const data = event.nativeEvent.data;
        if (data && data.startsWith('item:')) {
            const parts = data.split(':');
            const itemId = parts[1];
            const itemType = parts[2];
            navigation.navigate('ItemDetail', { type: itemType, id: parseInt(itemId) });
        }
    };

    const centerOnUser = () => {
        if (userLocation && webViewRef.current) {
            webViewRef.current.injectJavaScript(`
                if (typeof centerOnUser === 'function') {
                    centerOnUser();
                }
                true;
            `);
        } else {
            Alert.alert('Location Unavailable', 'Unable to get your current location');
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#7c3aed" />
                <Text style={styles.loadingText}>Loading map...</Text>
            </View>
        );
    }

    const hasItems = items.some(item => item.latitude && item.longitude);

    if (!hasItems) {
        return (
            <View style={styles.center}>
                <Icon name="map-outline" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>No items on map</Text>
                <Text style={styles.emptyText}>
                    Items with location data will appear here
                </Text>
                <TouchableOpacity 
                    style={styles.reportButton}
                    onPress={() => navigation?.navigate('CreateItem', { type: 'lost' })}
                >
                    <Text style={styles.reportButtonText}>Report an Item</Text>
                </TouchableOpacity>
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
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#7c3aed" />
                    </View>
                )}
            />
            <TouchableOpacity style={styles.locationButton} onPress={centerOnUser}>
                <Icon name="locate" size={24} color="#7c3aed" />
            </TouchableOpacity>
        </View>
    );
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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
        backgroundColor: '#7c3aed',
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
});