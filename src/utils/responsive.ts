import { Dimensions, PixelRatio } from 'react-native';

let SCREEN_WIDTH = Dimensions.get('window').width;
let SCREEN_HEIGHT = Dimensions.get('window').height;

const subscription = Dimensions.addEventListener('change', ({ window }) => {
  SCREEN_WIDTH = window.width;
  SCREEN_HEIGHT = window.height;
});

// Export cleanup function if needed
export const cleanup = () => {
  subscription?.remove();
};

// Breakpoints based on common device sizes
export const BREAKPOINTS = {
  xs: 0,     // Small phones
  sm: 576,   // Large phones
  md: 768,   // Small tablets
  lg: 992,   // Large tablets
  xl: 1200,  // Desktop
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

// Get current breakpoint
export const getCurrentBreakpoint = (): Breakpoint => {
  if (SCREEN_WIDTH >= BREAKPOINTS.xl) return 'xl';
  if (SCREEN_WIDTH >= BREAKPOINTS.lg) return 'lg';
  if (SCREEN_WIDTH >= BREAKPOINTS.md) return 'md';
  if (SCREEN_WIDTH >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
};

// Check if screen is at least a certain breakpoint
export const isScreenAtLeast = (breakpoint: Breakpoint): boolean => {
  return SCREEN_WIDTH >= BREAKPOINTS[breakpoint];
};

// Device type detection
export const isPhone = () => SCREEN_WIDTH < BREAKPOINTS.md;
export const isTablet = () => SCREEN_WIDTH >= BREAKPOINTS.md && SCREEN_WIDTH < BREAKPOINTS.xl;
export const isDesktop = () => SCREEN_WIDTH >= BREAKPOINTS.xl;

// Responsive dimensions
export const wp = (percentage: number): number => {
  const value = (percentage * SCREEN_WIDTH) / 100;
  return Math.round(PixelRatio.roundToNearestPixel(value));
};

export const hp = (percentage: number): number => {
  const value = (percentage * SCREEN_HEIGHT) / 100;
  return Math.round(PixelRatio.roundToNearestPixel(value));
};

// Responsive font sizes
export const responsiveFontSize = (size: number): number => {
  const scale = SCREEN_WIDTH / 375; // Base on iPhone X width
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Responsive spacing
export const getResponsiveSpacing = () => {
  const breakpoint = getCurrentBreakpoint();
  
  switch (breakpoint) {
    case 'xs':
    case 'sm':
      return {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        xxl: 24,
      };
    case 'md':
      return {
        xs: 6,
        sm: 12,
        md: 18,
        lg: 24,
        xl: 30,
        xxl: 36,
      };
    case 'lg':
    case 'xl':
      return {
        xs: 8,
        sm: 16,
        md: 24,
        lg: 32,
        xl: 40,
        xxl: 48,
      };
    default:
      return {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        xxl: 24,
      };
  }
};

// Responsive layout helpers
export const getResponsiveLayout = () => {
  const breakpoint = getCurrentBreakpoint();
  
  return {
    // Container padding
    containerPadding: isPhone() ? 16 : isTablet() ? 24 : 32,
    
    // Card margins
    cardMargin: isPhone() ? 8 : 12,
    
    // Grid columns
    gridColumns: isPhone() ? 1 : isTablet() ? 2 : 3,
    
    // Header height
    headerHeight: isPhone() ? 56 : 64,
    
    // Button sizes
    buttonHeight: isPhone() ? 44 : 48,
    buttonPadding: isPhone() ? 16 : 20,
    
    // Icon sizes
    iconSize: {
      small: isPhone() ? 16 : 20,
      medium: isPhone() ? 24 : 28,
      large: isPhone() ? 32 : 40,
    },
    
    // Form elements
    inputHeight: isPhone() ? 48 : 56,
    
    // Modal/Dialog
    modalPadding: isPhone() ? 16 : 24,
    modalMaxWidth: isTablet() ? wp(80) : wp(90),
  };
};

// Responsive text variants for React Native Paper
export const getResponsiveTextVariants = () => {
  const breakpoint = getCurrentBreakpoint();
  
  const baseVariants = {
    displayLarge: isPhone() ? 'displayMedium' : 'displayLarge',
    displayMedium: isPhone() ? 'displaySmall' : 'displayMedium',
    headlineLarge: isPhone() ? 'headlineMedium' : 'headlineLarge',
    headlineMedium: isPhone() ? 'headlineSmall' : 'headlineMedium',
    titleLarge: isPhone() ? 'titleMedium' : 'titleLarge',
  } as const;
  
  return baseVariants;
};

// Hook for responsive values
export const useResponsiveValue = <T>(values: Partial<Record<Breakpoint, T>>): T | undefined => {
  const breakpoint = getCurrentBreakpoint();
  
  // Find the largest breakpoint that has a value and is <= current breakpoint
  const sortedBreakpoints = Object.keys(BREAKPOINTS).sort(
    (a, b) => BREAKPOINTS[b as Breakpoint] - BREAKPOINTS[a as Breakpoint]
  ) as Breakpoint[];
  
  for (const bp of sortedBreakpoints) {
    if (BREAKPOINTS[bp] <= SCREEN_WIDTH && values[bp] !== undefined) {
      return values[bp];
    }
  }
  
  return undefined;
};

// Screen dimension getters
export const getScreenDimensions = () => ({
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  breakpoint: getCurrentBreakpoint(),
  isPhone: isPhone(),
  isTablet: isTablet(),
  isDesktop: isDesktop(),
});