import { Buffer } from 'buffer';
global.Buffer = Buffer;

import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from './src/contexts/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <Slot />
      <StatusBar />
    </ThemeProvider>
  );
}
