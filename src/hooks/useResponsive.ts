import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';
import {
  getCurrentBreakpoint,
  isPhone,
  isTablet,
  isDesktop,
  getResponsiveLayout,
  getResponsiveSpacing,
  getScreenDimensions,
  Breakpoint,
  useResponsiveValue as getResponsiveValue,
} from '../utils/responsive';

interface ResponsiveState {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  layout: ReturnType<typeof getResponsiveLayout>;
  spacing: ReturnType<typeof getResponsiveSpacing>;
}

export const useResponsive = (): ResponsiveState => {
  const [dimensions, setDimensions] = useState<ScaledSize>(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  return {
    width: dimensions.width,
    height: dimensions.height,
    breakpoint: getCurrentBreakpoint(),
    isPhone: isPhone(),
    isTablet: isTablet(),
    isDesktop: isDesktop(),
    layout: getResponsiveLayout(),
    spacing: getResponsiveSpacing(),
  };
};

// Hook for responsive values that updates on dimension changes
export const useResponsiveValue = <T>(values: Partial<Record<Breakpoint, T>>): T | undefined => {
  const { breakpoint } = useResponsive();
  return getResponsiveValue(values);
};

// Hook for responsive styles
export const useResponsiveStyles = () => {
  const responsive = useResponsive();
  
  return {
    ...responsive,
    
    // Common responsive style patterns
    containerStyle: {
      paddingHorizontal: responsive.layout.containerPadding,
      paddingVertical: responsive.spacing.md,
    },
    
    cardStyle: {
      marginBottom: responsive.layout.cardMargin,
      marginHorizontal: responsive.isPhone ? 0 : responsive.spacing.sm,
    },
    
    headerStyle: {
      paddingHorizontal: responsive.layout.containerPadding,
    },
    
    buttonStyle: {
      height: responsive.layout.buttonHeight,
      paddingHorizontal: responsive.layout.buttonPadding,
    },
    
    modalStyle: {
      padding: responsive.layout.modalPadding,
      maxWidth: responsive.layout.modalMaxWidth,
      alignSelf: 'center' as const,
    },
    
    gridStyle: {
      numColumns: responsive.layout.gridColumns,
      columnWrapperStyle: responsive.layout.gridColumns > 1 ? {
        justifyContent: 'space-between' as const,
      } : undefined,
    },
    
    // Text size adjustments
    getTextVariant: (baseVariant: string) => {
      if (responsive.isPhone) {
        const phoneVariants: Record<string, string> = {
          'displayLarge': 'displayMedium',
          'displayMedium': 'displaySmall',
          'headlineLarge': 'headlineMedium',
          'headlineMedium': 'headlineSmall',
          'titleLarge': 'titleMedium',
        };
        return phoneVariants[baseVariant] || baseVariant;
      }
      return baseVariant;
    },
    
    // Icon size helper
    getIconSize: (size: 'small' | 'medium' | 'large') => {
      return responsive.layout.iconSize[size];
    },
  };
};

// Hook for responsive layout calculations
export const useResponsiveLayout = () => {
  const responsive = useResponsive();
  
  return {
    // Calculate item width for grids
    getItemWidth: (columns?: number) => {
      const cols = columns || responsive.layout.gridColumns;
      const padding = responsive.layout.containerPadding;
      const spacing = responsive.spacing.sm;
      return (responsive.width - (padding * 2) - (spacing * (cols - 1))) / cols;
    },
    
    // Calculate if content should stack vertically
    shouldStack: (minWidth: number = 300) => {
      return responsive.width < minWidth;
    },
    
    // Get appropriate flex direction
    getFlexDirection: (stackOnPhone: boolean = true) => {
      return (stackOnPhone && responsive.isPhone) ? 'column' : 'row';
    },
    
    // Get responsive margin/padding
    getSpacing: (size: keyof ReturnType<typeof getResponsiveSpacing>) => {
      return responsive.spacing[size];
    },
  };
};