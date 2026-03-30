// src/utils/tokenStorage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'foundify_token';
const USER_KEY = 'foundify_user';

export const storeToken = async (token) => {
    try {
        await AsyncStorage.setItem(TOKEN_KEY, token);
        console.log('Token stored successfully');
        return true;
    } catch (error) {
        console.error('Error storing token:', error);
        return false;
    }
};

export const getToken = async () => {
    try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        console.log('Token retrieved:', token ? 'Yes (length: ' + token.length + ')' : 'No');
        return token;
    } catch (error) {
        console.error('Error getting token:', error);
        return null;
    }
};

export const removeToken = async () => {
    try {
        await AsyncStorage.removeItem(TOKEN_KEY);
        console.log('Token removed');
        return true;
    } catch (error) {
        console.error('Error removing token:', error);
        return false;
    }
};

export const storeUser = async (user) => {
    try {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
        console.log('User stored:', user.name);
        return true;
    } catch (error) {
        console.error('Error storing user:', error);
        return false;
    }
};

export const getUser = async () => {
    try {
        const user = await AsyncStorage.getItem(USER_KEY);
        return user ? JSON.parse(user) : null;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
};

export const removeUser = async () => {
    try {
        await AsyncStorage.removeItem(USER_KEY);
        console.log('User removed');
        return true;
    } catch (error) {
        console.error('Error removing user:', error);
        return false;
    }
};

export const clearAuth = async () => {
    await removeToken();
    await removeUser();
    console.log('Auth data cleared');
};

// For backward compatibility with named exports
export default {
    storeToken,
    getToken,
    removeToken,
    storeUser,
    getUser,
    removeUser,
    clearAuth
};