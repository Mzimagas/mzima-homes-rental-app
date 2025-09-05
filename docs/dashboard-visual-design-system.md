# Dashboard Visual Design System

## Executive Summary

This document establishes the comprehensive visual design system for the new dashboard, extending existing design patterns from the properties module while introducing dashboard-specific components. The system ensures visual consistency, accessibility, and scalability across all dashboard interfaces.

## Design Tokens and Variables

### 1. **Color System (Extended from Properties Module)**

#### Primary Color Palette
```css
:root {
  /* Primary Brand Colors */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-200: #bfdbfe;
  --color-primary-300: #93c5fd;
  --color-primary-400: #60a5fa;
  --color-primary-500: #3b82f6;  /* Primary Blue */
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  --color-primary-800: #1e40af;
  --color-primary-900: #1e3a8a;

  /* Secondary Colors */
  --color-secondary-50: #f8fafc;
  --color-secondary-100: #f1f5f9;
  --color-secondary-200: #e2e8f0;
  --color-secondary-300: #cbd5e1;
  --color-secondary-400: #94a3b8;
  --color-secondary-500: #64748b;  /* Secondary Gray */
  --color-secondary-600: #475569;
  --color-secondary-700: #334155;
  --color-secondary-800: #1e293b;
  --color-secondary-900: #0f172a;
}
```

#### Dashboard-Specific Color Extensions
```css
:root {
  /* Dashboard Widget Colors */
  --color-widget-bg: #ffffff;
  --color-widget-border: #e2e8f0;
  --color-widget-border-hover: #cbd5e1;
  --color-widget-shadow: rgba(0, 0, 0, 0.05);
  --color-widget-shadow-hover: rgba(0, 0, 0, 0.1);

  /* Metric Status Colors */
  --color-success-50: #f0fdf4;
  --color-success-100: #dcfce7;
  --color-success-500: #22c55e;
  --color-success-600: #16a34a;
  --color-success-700: #15803d;

  --color-warning-50: #fffbeb;
  --color-warning-100: #fef3c7;
  --color-warning-500: #f59e0b;
  --color-warning-600: #d97706;
  --color-warning-700: #b45309;

  --color-danger-50: #fef2f2;
  --color-danger-100: #fee2e2;
  --color-danger-500: #ef4444;
  --color-danger-600: #dc2626;
  --color-danger-700: #b91c1c;

  --color-info-50: #f0f9ff;
  --color-info-100: #e0f2fe;
  --color-info-500: #0ea5e9;
  --color-info-600: #0284c7;
  --color-info-700: #0369a1;
}
```

#### Tab-Specific Theme Colors (Following Properties Module Patterns)
```css
:root {
  /* Overview Tab */
  --color-overview-bg: #ffffff;
  --color-overview-border: #e2e8f0;
  --color-overview-accent: #3b82f6;

  /* Properties Tab */
  --color-properties-bg: #eff6ff;
  --color-properties-border: #bfdbfe;
  --color-properties-accent: #2563eb;

  /* Financial Tab */
  --color-financial-bg: #f0fdf4;
  --color-financial-border: #bbf7d0;
  --color-financial-accent: #16a34a;

  /* Tenants Tab */
  --color-tenants-bg: #fef3c7;
  --color-tenants-border: #fde68a;
  --color-tenants-accent: #d97706;

  /* Operations Tab */
  --color-operations-bg: #fdf4ff;
  --color-operations-border: #e9d5ff;
  --color-operations-accent: #9333ea;

  /* Analytics Tab */
  --color-analytics-bg: #f0fdfa;
  --color-analytics-border: #a7f3d0;
  --color-analytics-accent: #059669;
}
```

### 2. **Typography System**

#### Font Families
```css
:root {
  /* Primary Font Stack */
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-secondary: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;

  /* Font Weights */
  --font-weight-light: 300;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-extrabold: 800;
}
```

#### Typography Scale
```css
:root {
  /* Font Sizes */
  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5rem;     /* 24px */
  --text-3xl: 1.875rem;   /* 30px */
  --text-4xl: 2.25rem;    /* 36px */
  --text-5xl: 3rem;       /* 48px */

  /* Line Heights */
  --leading-tight: 1.25;
  --leading-snug: 1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  --leading-loose: 2;
}
```

#### Dashboard Typography Classes
```css
/* Dashboard Headings */
.dashboard-title {
  font-family: var(--font-primary);
  font-size: var(--text-3xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--leading-tight);
  color: var(--color-secondary-900);
}

.widget-title {
  font-family: var(--font-primary);
  font-size: var(--text-lg);
  font-weight: var(--font-weight-semibold);
  line-height: var(--leading-snug);
  color: var(--color-secondary-800);
}

.metric-value {
  font-family: var(--font-secondary);
  font-size: var(--text-4xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--leading-tight);
  color: var(--color-secondary-900);
}

.metric-label {
  font-family: var(--font-primary);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  line-height: var(--leading-normal);
  color: var(--color-secondary-600);
}

.dashboard-body {
  font-family: var(--font-primary);
  font-size: var(--text-base);
  font-weight: var(--font-weight-normal);
  line-height: var(--leading-normal);
  color: var(--color-secondary-700);
}
```

### 3. **Spacing and Layout System**

#### Spacing Scale
```css
:root {
  /* Spacing Scale (rem units) */
  --space-0: 0;
  --space-1: 0.25rem;    /* 4px */
  --space-2: 0.5rem;     /* 8px */
  --space-3: 0.75rem;    /* 12px */
  --space-4: 1rem;       /* 16px */
  --space-5: 1.25rem;    /* 20px */
  --space-6: 1.5rem;     /* 24px */
  --space-8: 2rem;       /* 32px */
  --space-10: 2.5rem;    /* 40px */
  --space-12: 3rem;      /* 48px */
  --space-16: 4rem;      /* 64px */
  --space-20: 5rem;      /* 80px */
  --space-24: 6rem;      /* 96px */
  --space-32: 8rem;      /* 128px */
}
```

#### Dashboard Layout Variables
```css
:root {
  /* Dashboard Layout */
  --dashboard-header-height: 4rem;
  --dashboard-nav-height: 3rem;
  --dashboard-footer-height: 2.5rem;
  --dashboard-sidebar-width: 16rem;
  --dashboard-sidebar-collapsed: 4rem;

  /* Widget Spacing */
  --widget-gap: var(--space-6);
  --widget-padding: var(--space-6);
  --widget-border-radius: 0.75rem;
  --widget-border-width: 2px;

  /* Grid System */
  --grid-columns: 12;
  --grid-gap: var(--space-6);
  --grid-margin: var(--space-4);
}
```

#### Responsive Breakpoints
```css
:root {
  /* Breakpoints */
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
}

/* Responsive Spacing */
@media (max-width: 768px) {
  :root {
    --widget-gap: var(--space-4);
    --widget-padding: var(--space-4);
    --grid-gap: var(--space-4);
    --grid-margin: var(--space-2);
  }
}
```

### 4. **Shadow and Elevation System**

#### Shadow Definitions
```css
:root {
  /* Shadow System */
  --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

  /* Dashboard-Specific Shadows */
  --shadow-widget: var(--shadow-sm);
  --shadow-widget-hover: var(--shadow-md);
  --shadow-widget-active: var(--shadow-lg);
  --shadow-modal: var(--shadow-2xl);
  --shadow-dropdown: var(--shadow-lg);
}
```

## Component Design System

### 1. **Widget Component Styles**

#### Base Widget Component
```css
.dashboard-widget {
  background: var(--color-widget-bg);
  border: var(--widget-border-width) solid var(--color-widget-border);
  border-radius: var(--widget-border-radius);
  padding: var(--widget-padding);
  box-shadow: var(--shadow-widget);
  transition: all 0.2s ease-in-out;
  position: relative;
  overflow: hidden;
}

.dashboard-widget:hover {
  border-color: var(--color-widget-border-hover);
  box-shadow: var(--shadow-widget-hover);
  transform: translateY(-1px);
}

.dashboard-widget.widget-interactive {
  cursor: pointer;
}

.dashboard-widget.widget-loading {
  opacity: 0.7;
  pointer-events: none;
}

.dashboard-widget.widget-error {
  border-color: var(--color-danger-300);
  background: var(--color-danger-50);
}
```

#### Widget Size Variants
```css
.widget-size-small {
  grid-column: span 1;
  grid-row: span 1;
  min-height: 8rem;
}

.widget-size-medium {
  grid-column: span 2;
  grid-row: span 1;
  min-height: 8rem;
}

.widget-size-large {
  grid-column: span 2;
  grid-row: span 2;
  min-height: 16rem;
}

.widget-size-full {
  grid-column: span 4;
  grid-row: span 1;
  min-height: 8rem;
}

/* Responsive Widget Sizes */
@media (max-width: 768px) {
  .widget-size-small,
  .widget-size-medium,
  .widget-size-large,
  .widget-size-full {
    grid-column: span 1;
    min-height: 6rem;
  }
}
```

### 2. **Metric Widget Styles**

#### Metric Display Components
```css
.metric-widget {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}

.metric-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.metric-icon {
  width: 2rem;
  height: 2rem;
  color: var(--color-primary-500);
  margin-right: var(--space-3);
}

.metric-value-container {
  display: flex;
  align-items: baseline;
  margin-bottom: var(--space-2);
}

.metric-value {
  font-size: var(--text-4xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-secondary-900);
  line-height: 1;
}

.metric-unit {
  font-size: var(--text-lg);
  font-weight: var(--font-weight-medium);
  color: var(--color-secondary-600);
  margin-left: var(--space-2);
}

.metric-trend {
  display: flex;
  align-items: center;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--space-4);
}

.metric-trend.trend-up {
  color: var(--color-success-600);
}

.metric-trend.trend-down {
  color: var(--color-danger-600);
}

.metric-trend.trend-stable {
  color: var(--color-secondary-600);
}

.metric-progress {
  width: 100%;
  height: 0.5rem;
  background: var(--color-secondary-200);
  border-radius: 0.25rem;
  overflow: hidden;
  margin-bottom: var(--space-3);
}

.metric-progress-bar {
  height: 100%;
  background: var(--color-primary-500);
  border-radius: 0.25rem;
  transition: width 0.3s ease-in-out;
}
```

### 3. **Chart Widget Styles**

#### Chart Container Styles
```css
.chart-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-secondary-200);
}

.chart-container {
  flex: 1;
  position: relative;
  min-height: 200px;
  margin-bottom: var(--space-4);
}

.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  justify-content: center;
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-secondary-200);
}

.chart-legend-item {
  display: flex;
  align-items: center;
  font-size: var(--text-sm);
  color: var(--color-secondary-600);
}

.chart-legend-color {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  margin-right: var(--space-2);
}
```

### 4. **Navigation and Tab Styles**

#### Dashboard Navigation
```css
.dashboard-navigation {
  display: flex;
  align-items: center;
  background: var(--color-widget-bg);
  border-bottom: 1px solid var(--color-widget-border);
  padding: 0 var(--space-6);
  height: var(--dashboard-nav-height);
  position: sticky;
  top: var(--dashboard-header-height);
  z-index: 10;
}

.dashboard-nav-tabs {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
}

.dashboard-nav-tab {
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  border-radius: 0.5rem;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-secondary-600);
  text-decoration: none;
  transition: all 0.2s ease-in-out;
  border: 1px solid transparent;
}

.dashboard-nav-tab:hover {
  color: var(--color-secondary-800);
  background: var(--color-secondary-50);
}

.dashboard-nav-tab.active {
  color: var(--color-primary-700);
  background: var(--color-primary-50);
  border-color: var(--color-primary-200);
}

.dashboard-nav-tab-icon {
  width: 1.25rem;
  height: 1.25rem;
  margin-right: var(--space-2);
}

/* Mobile Navigation */
@media (max-width: 768px) {
  .dashboard-navigation {
    padding: 0 var(--space-4);
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .dashboard-navigation::-webkit-scrollbar {
    display: none;
  }

  .dashboard-nav-tabs {
    gap: var(--space-1);
    min-width: max-content;
  }

  .dashboard-nav-tab {
    padding: var(--space-2) var(--space-3);
    white-space: nowrap;
  }
}
```

### 5. **Button and Interactive Element Styles**

#### Dashboard Button System
```css
.dashboard-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2) var(--space-4);
  border-radius: 0.5rem;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  text-decoration: none;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  border: 1px solid transparent;
  min-height: 2.5rem;
  gap: var(--space-2);
}

.dashboard-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Button Variants */
.dashboard-button.primary {
  background: var(--color-primary-500);
  color: white;
  border-color: var(--color-primary-500);
}

.dashboard-button.primary:hover:not(:disabled) {
  background: var(--color-primary-600);
  border-color: var(--color-primary-600);
}

.dashboard-button.secondary {
  background: var(--color-secondary-100);
  color: var(--color-secondary-700);
  border-color: var(--color-secondary-300);
}

.dashboard-button.secondary:hover:not(:disabled) {
  background: var(--color-secondary-200);
  border-color: var(--color-secondary-400);
}

.dashboard-button.outline {
  background: transparent;
  color: var(--color-primary-600);
  border-color: var(--color-primary-300);
}

.dashboard-button.outline:hover:not(:disabled) {
  background: var(--color-primary-50);
  border-color: var(--color-primary-400);
}

.dashboard-button.ghost {
  background: transparent;
  color: var(--color-secondary-600);
  border-color: transparent;
}

.dashboard-button.ghost:hover:not(:disabled) {
  background: var(--color-secondary-100);
  color: var(--color-secondary-800);
}

/* Button Sizes */
.dashboard-button.small {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-xs);
  min-height: 2rem;
}

.dashboard-button.large {
  padding: var(--space-3) var(--space-6);
  font-size: var(--text-base);
  min-height: 3rem;
}
```

#### Quick Action Buttons
```css
.quick-action-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: var(--color-widget-bg);
  border: 2px solid var(--color-widget-border);
  border-radius: var(--widget-border-radius);
  text-decoration: none;
  transition: all 0.2s ease-in-out;
  min-height: 5rem;
  gap: var(--space-2);
}

.quick-action-button:hover {
  border-color: var(--color-primary-300);
  background: var(--color-primary-50);
  transform: translateY(-1px);
  box-shadow: var(--shadow-widget-hover);
}

.quick-action-icon {
  width: 1.5rem;
  height: 1.5rem;
  color: var(--color-primary-500);
}

.quick-action-label {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-secondary-700);
  text-align: center;
}
```

### 6. **Alert and Notification Styles**

#### Alert Component System
```css
.dashboard-alert {
  display: flex;
  align-items: flex-start;
  padding: var(--space-4);
  border-radius: 0.5rem;
  border-left: 4px solid;
  margin-bottom: var(--space-4);
  gap: var(--space-3);
}

.dashboard-alert.success {
  background: var(--color-success-50);
  border-left-color: var(--color-success-500);
  color: var(--color-success-800);
}

.dashboard-alert.warning {
  background: var(--color-warning-50);
  border-left-color: var(--color-warning-500);
  color: var(--color-warning-800);
}

.dashboard-alert.danger {
  background: var(--color-danger-50);
  border-left-color: var(--color-danger-500);
  color: var(--color-danger-800);
}

.dashboard-alert.info {
  background: var(--color-info-50);
  border-left-color: var(--color-info-500);
  color: var(--color-info-800);
}

.alert-icon {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-1);
}

.alert-message {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
}
```

#### Notification Badge System
```css
.notification-badge {
  position: relative;
  display: inline-block;
}

.notification-badge::after {
  content: attr(data-count);
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  background: var(--color-danger-500);
  color: white;
  font-size: var(--text-xs);
  font-weight: var(--font-weight-bold);
  padding: 0.125rem 0.375rem;
  border-radius: 0.75rem;
  min-width: 1.25rem;
  text-align: center;
  line-height: 1;
}

.notification-badge.no-count::after {
  content: '';
  width: 0.5rem;
  height: 0.5rem;
  padding: 0;
  min-width: 0;
}
```

## Responsive Design Patterns

### 1. **Grid System**

#### Dashboard Grid Layout
```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(var(--grid-columns), 1fr);
  gap: var(--grid-gap);
  padding: var(--grid-margin);
  width: 100%;
}

/* Responsive Grid Adjustments */
@media (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
```

### 2. **Mobile-First Responsive Utilities**

#### Responsive Visibility Classes
```css
/* Show/Hide at different breakpoints */
.show-mobile {
  display: block;
}

.hide-mobile {
  display: none;
}

@media (min-width: 768px) {
  .show-mobile {
    display: none;
  }

  .hide-mobile {
    display: block;
  }

  .show-tablet {
    display: block;
  }

  .hide-tablet {
    display: none;
  }
}

@media (min-width: 1024px) {
  .show-tablet {
    display: none;
  }

  .hide-tablet {
    display: block;
  }

  .show-desktop {
    display: block;
  }

  .hide-desktop {
    display: none;
  }
}
```

#### Touch-Optimized Styles
```css
/* Touch target optimization */
.touch-target {
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Touch feedback */
.touch-feedback {
  position: relative;
  overflow: hidden;
}

.touch-feedback::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width 0.3s, height 0.3s;
}

.touch-feedback:active::before {
  width: 200px;
  height: 200px;
}
```

## Accessibility and Inclusive Design

### 1. **Focus Management**

#### Focus Styles
```css
/* Custom focus styles */
.dashboard-focusable {
  outline: none;
  position: relative;
}

.dashboard-focusable:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}

/* High contrast focus for better accessibility */
@media (prefers-contrast: high) {
  .dashboard-focusable:focus-visible {
    outline: 3px solid var(--color-primary-700);
    outline-offset: 3px;
  }
}
```

### 2. **Motion and Animation Preferences**

#### Reduced Motion Support
```css
/* Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  .dashboard-widget,
  .dashboard-button,
  .quick-action-button,
  .chart-container,
  .metric-progress-bar {
    transition: none;
    animation: none;
  }

  .dashboard-widget:hover {
    transform: none;
  }
}

/* Default animations for users who don't prefer reduced motion */
@media (prefers-reduced-motion: no-preference) {
  .fade-in {
    animation: fadeIn 0.3s ease-in-out;
  }

  .slide-up {
    animation: slideUp 0.3s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(1rem);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
```

### 3. **High Contrast and Color Blind Support**

#### High Contrast Mode
```css
@media (prefers-contrast: high) {
  :root {
    --color-widget-border: #000000;
    --color-widget-bg: #ffffff;
    --color-secondary-600: #000000;
    --color-secondary-700: #000000;
    --color-secondary-800: #000000;
    --color-secondary-900: #000000;
  }

  .dashboard-widget {
    border-width: 3px;
  }

  .dashboard-button {
    border-width: 2px;
  }
}
```

## Implementation Guidelines

### 1. **CSS Custom Properties Usage**

#### Best Practices
```css
/* Use semantic naming for component-specific variables */
.metric-widget {
  --metric-bg: var(--color-widget-bg);
  --metric-border: var(--color-widget-border);
  --metric-text: var(--color-secondary-900);

  background: var(--metric-bg);
  border-color: var(--metric-border);
  color: var(--metric-text);
}

/* Allow for easy theming overrides */
.metric-widget[data-theme="success"] {
  --metric-bg: var(--color-success-50);
  --metric-border: var(--color-success-200);
  --metric-text: var(--color-success-800);
}
```

### 2. **Component Composition Patterns**

#### Utility Classes
```css
/* Spacing utilities */
.p-0 { padding: var(--space-0); }
.p-1 { padding: var(--space-1); }
.p-2 { padding: var(--space-2); }
.p-3 { padding: var(--space-3); }
.p-4 { padding: var(--space-4); }
.p-6 { padding: var(--space-6); }

.m-0 { margin: var(--space-0); }
.m-1 { margin: var(--space-1); }
.m-2 { margin: var(--space-2); }
.m-3 { margin: var(--space-3); }
.m-4 { margin: var(--space-4); }
.m-6 { margin: var(--space-6); }

/* Text utilities */
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

.font-normal { font-weight: var(--font-weight-normal); }
.font-medium { font-weight: var(--font-weight-medium); }
.font-semibold { font-weight: var(--font-weight-semibold); }
.font-bold { font-weight: var(--font-weight-bold); }

/* Color utilities */
.text-primary { color: var(--color-primary-600); }
.text-secondary { color: var(--color-secondary-600); }
.text-success { color: var(--color-success-600); }
.text-warning { color: var(--color-warning-600); }
.text-danger { color: var(--color-danger-600); }
```

### 3. **Dark Mode Preparation**

#### Dark Mode Variables (Future Implementation)
```css
[data-theme="dark"] {
  --color-widget-bg: #1f2937;
  --color-widget-border: #374151;
  --color-widget-border-hover: #4b5563;
  --color-secondary-900: #f9fafb;
  --color-secondary-800: #f3f4f6;
  --color-secondary-700: #e5e7eb;
  --color-secondary-600: #d1d5db;
  --color-secondary-500: #9ca3af;

  /* Adjust shadows for dark mode */
  --shadow-widget: 0 1px 3px 0 rgba(0, 0, 0, 0.3);
  --shadow-widget-hover: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
}
```

---

**Document Version**: 1.0
**Last Updated**: December 2024
**Review Date**: January 2025
```