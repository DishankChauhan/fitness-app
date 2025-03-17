/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#000',
    textDim: '#757575',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
    border: '#E0E0E0',
    error: '#FF6B6B',
    success: '#4CAF50',
    warning: '#ED6C02',
    info: '#0288D1',
    icon: '#757575',
    card: '#F5F5F5',
  },
  dark: {
    text: '#fff',
    textDim: '#9E9E9E',
    background: '#000',
    tint: tintColorDark,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
    border: '#333',
    error: '#FF6B6B',
    success: '#4CAF50',
    warning: '#FFA726',
    info: '#29B6F6',
    icon: '#9E9E9E',
    card: '#1A1A1A',
  },
} as const;
