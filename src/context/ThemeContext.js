// src/context/ThemeContext.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

const THEME_KEY = 'foundify-theme';

export const lightColors = {
    background: '#faf9fe',
    card: '#ffffff',
    cardAlt: '#f3e8ff',
    text: '#1e1b2f',
    textSecondary: '#5b5b7a',
    textMuted: '#7e7b9a',
    border: '#edeef5',
    inputBg: '#ffffff',
    inputBorder: '#edeef5',
    primary: '#7c3aed',
    primaryLight: '#ede9fe',
    tabBar: '#ffffff',
    tabBarBorder: '#edeef5',
    headerBg: '#ffffff',
    divider: '#edeef5',
    placeholder: '#7e7b9a',
    danger: '#ef4444',
    dangerLight: '#fee2e2',
    success: '#10b981',
    successLight: '#d1fae5',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    statusBar: 'dark',
    shadow: '#000',
    overlay: 'rgba(0,0,0,0.5)',
    skeletonBase: '#e8e8f0',
    tagBg: '#f3e8ff',
};

export const darkColors = {
    background: '#12101c',
    card: '#1e1a2f',
    cardAlt: '#2d2648',
    text: '#f0edfc',
    textSecondary: '#b4adcf',
    textMuted: '#938bb0',
    border: '#2a2438',
    inputBg: '#191624',
    inputBorder: '#2a2438',
    primary: '#9f5aff',
    primaryLight: '#2d2648',
    tabBar: '#1a1730',
    tabBarBorder: '#2a2438',
    headerBg: '#1a1730',
    divider: '#2a2438',
    placeholder: '#938bb0',
    danger: '#f87171',
    dangerLight: '#3b1a1a',
    success: '#34d399',
    successLight: '#1a3b2e',
    warning: '#fbbf24',
    warningLight: '#3b2e0a',
    statusBar: 'light',
    shadow: '#000',
    overlay: 'rgba(0,0,0,0.7)',
    skeletonBase: '#2a2438',
    tagBg: '#2d2648',
};

const ThemeContext = createContext({
    isDark: false,
    colors: lightColors,
    toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
    const systemColorScheme = useColorScheme();
    const [isDark, setIsDark] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(THEME_KEY)
            .then(saved => {
                if (saved === 'dark') setIsDark(true);
                else if (saved === 'light') setIsDark(false);
                else setIsDark(systemColorScheme === 'dark');
                setLoaded(true);
            })
            .catch(() => {
                setIsDark(systemColorScheme === 'dark');
                setLoaded(true);
            });
    }, []);

    const toggleTheme = useCallback(async () => {
        const next = !isDark;
        setIsDark(next);
        try {
            await AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
        } catch (e) {
            console.log('Theme save error:', e);
        }
    }, [isDark]);

    if (!loaded) return null;

    return (
        <ThemeContext.Provider value={{ isDark, colors: isDark ? darkColors : lightColors, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
