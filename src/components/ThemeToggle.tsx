import React from 'react';
import { View } from 'react-native';
import { IconButton, Menu, Text, useTheme as usePaperTheme } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { themeMode, setThemeMode } = useTheme();
  const paperTheme = usePaperTheme();
  const [visible, setVisible] = React.useState(false);

  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  const getThemeIcon = () => {
    switch (themeMode) {
      case 'light':
        return 'white-balance-sunny';
      case 'dark':
        return 'moon-waning-crescent';
      case 'system':
        return 'theme-light-dark';
      default:
        return 'theme-light-dark';
    }
  };

  const handleThemeChange = (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode);
    closeMenu();
  };

  return (
    <View>
      <Menu
        visible={visible}
        onDismiss={closeMenu}
        anchor={
          <IconButton
            icon={getThemeIcon()}
            size={24}
            onPress={openMenu}
            iconColor={paperTheme.colors.onSurface}
          />
        }
        contentStyle={{
          backgroundColor: paperTheme.colors.surface,
        }}
      >
        <Menu.Item
          onPress={() => handleThemeChange('light')}
          title="Light"
          leadingIcon="white-balance-sunny"
          titleStyle={{
            color: themeMode === 'light' ? paperTheme.colors.primary : paperTheme.colors.onSurface,
          }}
        />
        <Menu.Item
          onPress={() => handleThemeChange('dark')}
          title="Dark"
          leadingIcon="moon-waning-crescent"
          titleStyle={{
            color: themeMode === 'dark' ? paperTheme.colors.primary : paperTheme.colors.onSurface,
          }}
        />
        <Menu.Item
          onPress={() => handleThemeChange('system')}
          title="System"
          leadingIcon="theme-light-dark"
          titleStyle={{
            color: themeMode === 'system' ? paperTheme.colors.primary : paperTheme.colors.onSurface,
          }}
        />
      </Menu>
    </View>
  );
};