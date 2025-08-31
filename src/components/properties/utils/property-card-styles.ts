/**
 * Property Card Styling Utilities
 * Provides consistent border-based styling for all property card components
 */

// Property Card Styling Constants
export const PROPERTY_CARD_STYLES = {
  // Base styles using Tailwind classes for compatibility
  base: "bg-white rounded-xl border-2 border-gray-200 p-6 transition-all duration-200",
  hover: "hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5",
  active: "border-blue-300 bg-blue-50 shadow-sm",
  completed: "border-green-300 bg-green-50",
  warning: "border-yellow-300 bg-yellow-50", 
  error: "border-red-300 bg-red-50",
  interactive: "cursor-pointer",
  
  // Mobile responsive adjustments
  mobile: "md:border-2 border md:p-6 p-4 md:rounded-xl rounded-lg"
} as const;

// Property Card Variants
export type PropertyCardVariant = 'default' | 'active' | 'completed' | 'warning' | 'error';

// Tab-specific color themes
export type PropertyCardTheme = 'default' | 'direct-addition' | 'purchase-pipeline' | 'subdivision' | 'handover' | 'rental';

// Property Card Status Colors
export const PROPERTY_CARD_STATUS_COLORS = {
  default: {
    border: "border-gray-200",
    background: "bg-white",
    hover: "hover:border-gray-300"
  },
  active: {
    border: "border-blue-300",
    background: "bg-blue-50",
    hover: "hover:border-blue-400"
  },
  completed: {
    border: "border-green-300", 
    background: "bg-green-50",
    hover: "hover:border-green-400"
  },
  warning: {
    border: "border-yellow-300",
    background: "bg-yellow-50", 
    hover: "hover:border-yellow-400"
  },
  error: {
    border: "border-red-300",
    background: "bg-red-50",
    hover: "hover:border-red-400"
  }
} as const;

// Tab-specific color themes for property cards
export const PROPERTY_CARD_THEMES = {
  default: {
    background: "bg-white",
    border: "border-gray-200",
    hover: "hover:border-gray-300"
  },
  'direct-addition': {
    background: "bg-green-25",
    border: "border-green-200",
    hover: "hover:border-green-300"
  },
  'purchase-pipeline': {
    background: "bg-blue-25",
    border: "border-blue-200",
    hover: "hover:border-blue-300"
  },
  subdivision: {
    background: "bg-orange-25",
    border: "border-orange-200",
    hover: "hover:border-orange-300"
  },
  handover: {
    background: "bg-purple-25",
    border: "border-purple-200",
    hover: "hover:border-purple-300"
  },
  rental: {
    background: "bg-indigo-25",
    border: "border-indigo-200",
    hover: "hover:border-indigo-300"
  }
} as const;

/**
 * Get property card CSS classes based on variant and options
 */
export const getPropertyCardClasses = (
  variant: PropertyCardVariant = 'default',
  options: {
    interactive?: boolean;
    mobile?: boolean;
    customClasses?: string;
    theme?: PropertyCardTheme;
  } = {}
): string => {
  const { interactive = true, mobile = true, customClasses = '', theme = 'default' } = options;

  // Get theme colors (theme overrides variant colors for background/border)
  const themeColors = PROPERTY_CARD_THEMES[theme];
  const variantColors = PROPERTY_CARD_STATUS_COLORS[variant];

  const classes = [
    // Base responsive styles (without background/border from base)
    mobile ? "md:border-2 border md:p-6 p-4 md:rounded-xl rounded-lg" : "rounded-xl border-2 p-6",

    // Theme-specific background and border (light shade of tab color)
    themeColors.background,
    themeColors.border,

    // Status-specific styling (for active/completed/warning/error states)
    variant !== 'default' ? variantColors.background : '',
    variant !== 'default' ? variantColors.border : '',

    // Interactive styles
    interactive ? PROPERTY_CARD_STYLES.interactive : '',
    interactive ? (variant !== 'default' ? variantColors.hover : themeColors.hover) : '',
    interactive ? "hover:shadow-md hover:-translate-y-0.5" : '',

    // Transition and shadow
    "transition-all duration-200",

    // Custom classes
    customClasses
  ];

  return classes.filter(Boolean).join(' ');
};

/**
 * Get property card variant based on property status
 */
export const getPropertyCardVariant = (
  status?: string,
  lifecycle?: string,
  hasErrors?: boolean
): PropertyCardVariant => {
  if (hasErrors) return 'error';
  
  // Handle lifecycle status
  if (lifecycle) {
    switch (lifecycle.toLowerCase()) {
      case 'completed':
      case 'sold':
      case 'transferred':
        return 'completed';
      case 'active':
      case 'in_progress':
      case 'current':
        return 'active';
      case 'pending':
      case 'review':
        return 'warning';
      default:
        return 'default';
    }
  }
  
  // Handle general status
  if (status) {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
      case 'approved':
        return 'completed';
      case 'active':
      case 'in_progress':
      case 'processing':
        return 'active';
      case 'pending':
      case 'review':
      case 'warning':
        return 'warning';
      case 'error':
      case 'failed':
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  }
  
  return 'default';
};

/**
 * Property card CSS class combinations for common use cases
 */
export const PROPERTY_CARD_PRESETS = {
  // Standard property listing card
  listing: getPropertyCardClasses('default', { interactive: true, mobile: true }),
  
  // Active/selected property card
  selected: getPropertyCardClasses('active', { interactive: true, mobile: true }),
  
  // Completed property card
  completed: getPropertyCardClasses('completed', { interactive: true, mobile: true }),
  
  // Warning state card
  warning: getPropertyCardClasses('warning', { interactive: true, mobile: true }),
  
  // Error state card
  error: getPropertyCardClasses('error', { interactive: true, mobile: true }),
  
  // Non-interactive display card
  display: getPropertyCardClasses('default', { interactive: false, mobile: true }),
} as const;

/**
 * Helper function to combine property card classes with additional classes
 */
export const combinePropertyCardClasses = (
  baseVariant: PropertyCardVariant,
  additionalClasses: string = '',
  options: Parameters<typeof getPropertyCardClasses>[1] = {}
): string => {
  const baseClasses = getPropertyCardClasses(baseVariant, options);
  return `${baseClasses} ${additionalClasses}`.trim();
};
