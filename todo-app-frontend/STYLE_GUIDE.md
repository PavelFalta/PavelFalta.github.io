# Todo Canvas App Style Guide

This document outlines the design language and aesthetic principles used in the Todo Canvas app. The app follows a modern, dark-themed interface with neon accents, creating a sleek and futuristic user experience.

## Color Palette

### Base Colors

```css
/* Core backgrounds */
--color-bg-primary: #111827; /* gray-900 */
--color-bg-secondary: #1f2937; /* gray-800 */
--color-bg-tertiary: #374151; /* gray-700 */

/* Text colors */
--color-text-primary: #f9fafb; /* gray-50 */
--color-text-secondary: #e5e7eb; /* gray-200 */
--color-text-tertiary: #9ca3af; /* gray-400 */

/* Accent colors */
--color-blue-primary: #3b82f6; /* blue-500 */
--color-purple-primary: #8b5cf6; /* purple-500 */
--color-red-primary: #ef4444; /* red-500 */
--color-green-primary: #22c55e; /* green-500 */
```

### Gradients

Gradients are commonly used for interactive elements and header sections:

```css
/* Blue to purple gradient (primary) */
background: linear-gradient(to right, #3b82f6, #8b5cf6);

/* Red gradient (danger) */
background: linear-gradient(to right, #ef4444, #dc2626);

/* Green gradient (success) */
background: linear-gradient(to right, #22c55e, #16a34a);
```

## Typography

The app uses a clean, modern sans-serif font stack with careful attention to font weights:

```css
/* Font family */
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;

/* Font sizing */
--text-xs: 0.75rem; /* 12px */
--text-sm: 0.875rem; /* 14px */
--text-base: 1rem; /* 16px */
--text-lg: 1.125rem; /* 18px */
--text-xl: 1.25rem; /* 20px */
--text-2xl: 1.5rem; /* 24px */

/* Font weights */
--font-normal: 400;
--font-medium: 500; 
--font-bold: 700;
```

## Shadow Effects

Shadows are a critical part of the app's aesthetic, creating depth and emphasizing the neon effect:

```css
/* Basic element shadow */
box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);

/* Elevated element shadow */
box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);

/* Neon glow effect (blue) */
box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);

/* Neon glow effect (purple) */
box-shadow: 0 0 15px rgba(139, 92, 246, 0.5);

/* Neon glow effect (red) */
box-shadow: 0 0 15px rgba(239, 68, 68, 0.7);

/* Inner shadow for inset effects */
box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
```

## Borders and Outlines

Borders are used to create separation and emphasis:

```css
/* Standard border */
border: 1px solid #374151; /* gray-700 */

/* Accent border */
border: 2px solid #3b82f6; /* blue-500 */

/* Danger border */
border: 2px solid #ef4444; /* red-500 */

/* Rounded corners */
--radius-sm: 0.125rem; /* 2px */
--radius-md: 0.375rem; /* 6px */
--radius-lg: 0.5rem; /* 8px */
--radius-xl: 0.75rem; /* 12px */
--radius-full: 9999px; /* For circular elements */
```

## Animations and Transitions

Smooth animations are used throughout the app to provide feedback and create a fluid experience:

```css
/* Standard transition */
transition: all 0.2s ease-out;

/* Hover scale effect */
transform: scale(1.05);

/* Easing functions */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
```

### Motion Design

```jsx
// Hover animation example
<motion.div
  whileHover={{ 
    scale: 1.1, 
    boxShadow: "0 0 15px rgba(59, 130, 246, 0.7)"
  }}
  whileTap={{ scale: 0.95 }}
/>

// Fade in animation
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
/>

// Card appearance animation
<motion.div
  variants={{
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.4, ease: "easeOut" }
    }
  }}
  initial="hidden"
  animate="visible"
/>
```

## Components

### Buttons

```jsx
// Primary Button
<button className="px-5 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-md hover:brightness-110 shadow-[0_0_10px_rgba(59,130,246,0.4)] hover:shadow-[0_0_15px_rgba(59,130,246,0.6)] transition-all duration-200">
  Button Text
</button>

// Secondary Button
<button className="px-5 py-2 rounded-md transition-all duration-200 text-white bg-gray-800 hover:bg-gray-700 hover:shadow-[0_0_10px_rgba(59,130,246,0.5)]">
  Button Text
</button>

// Danger Button
<button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow-[0_0_10px_rgba(239,68,68,0.4)] hover:shadow-[0_0_15px_rgba(239,68,68,0.6)] transition-all duration-200">
  Delete
</button>
```

### Cards and Panels

```jsx
// Standard Card
<div className="bg-gray-900 border border-blue-500 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(59,130,246,0.5)]">
  {/* Card Content */}
</div>

// Card Header
<div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white shadow-[0_0_10px_rgba(59,130,246,0.7)]">
  <h2 className="text-xl font-bold">Header Title</h2>
</div>

// Card Content
<div className="p-6 bg-gray-900 text-gray-100">
  {/* Content */}
</div>
```

### Todo Items

Todo items are circular elements that expand on hover:

```jsx
// Basic Todo Node
<motion.div
  className="rounded-full shadow-md flex items-center justify-center w-12 h-12"
  style={{ 
    backgroundColor: nodeColor,
    boxShadow: `0 0 12px 3px ${nodeColor}`
  }}
  whileHover={{ 
    width: expandedWidth,
    height: "48px"
  }}
  transition={{ duration: 0.2 }}
/>

// Completed Todo (Black Hole)
<motion.div
  className="rounded-full shadow-md flex items-center justify-center w-12 h-12"
  style={{ 
    backgroundColor: "#000000",
    boxShadow: `0 0 25px 10px rgba(138, 43, 226, 0.8)`,
    border: `2px solid rgba(138, 43, 226, 0.5)`
  }}
/>
```

## Layout Principles

### Spacing

```css
/* Spacing scale */
--space-1: 0.25rem; /* 4px */
--space-2: 0.5rem; /* 8px */
--space-3: 0.75rem; /* 12px */
--space-4: 1rem; /* 16px */
--space-5: 1.25rem; /* 20px */
--space-6: 1.5rem; /* 24px */
--space-8: 2rem; /* 32px */
--space-10: 2.5rem; /* 40px */
--space-12: 3rem; /* 48px */
```

### Z-Index Layers

```css
/* Z-index scale */
--z-backdrop: 40;
--z-modal: 50;
--z-popover: 60;
--z-tooltip: 70;
```

## Interactive Elements

### Hover States

```css
/* Interactive element hover */
.interactive:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

/* Button hover */
.button:hover {
  box-shadow: 0 0 15px rgba(59, 130, 246, 0.6);
}
```

### Focus States

```css
/* Focus state */
.interactive:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.6);
}
```

## Responsive Design

The app uses a mobile-first approach with common breakpoints:

```css
/* Breakpoints */
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
--breakpoint-2xl: 1536px;
```

Example of responsive styling with Tailwind-style classes:

```jsx
<div className="p-4 md:p-6 lg:p-8">
  <h2 className="text-lg md:text-xl lg:text-2xl">
    Responsive Heading
  </h2>
</div>
```

## Best Practices

1. **Consistent Neon Effects**: Maintain the neon aesthetic by using the shadow effects consistently.

2. **Dark Background**: Always place content on dark backgrounds to maximize the neon effect contrast.

3. **Limited Color Palette**: Stick to the defined color palette to maintain visual harmony.

4. **Animation Restraint**: Use animations purposefully to provide feedback, not merely for decoration.

5. **Responsive Considerations**: Ensure all elements work well on both desktop and mobile devices.

6. **Accessibility**: Maintain sufficient contrast despite the dark theme and neon effects.

7. **Container Isolation**: Use `position: relative` and appropriate z-index values to manage stacking contexts.

## Implementation Tips

- Use Framer Motion for animations to maintain consistency
- Leverage Tailwind CSS utility classes for quick implementation
- Ensure touch targets are at least 44x44px for mobile users
- Test animations on lower-end devices to ensure smooth performance

By following these guidelines, you can maintain the sleek, modern, and neon-inspired aesthetic of the Todo Canvas application across future development. 