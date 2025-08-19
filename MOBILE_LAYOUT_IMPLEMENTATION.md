# Mobile Layout Implementation

## Overview

This document describes the mobile layout implementation that ensures the header and input remain fixed while allowing the chat area to scroll independently, even when the on-screen keyboard is visible.

## Key Components

### 1. Mobile Viewport Utility (`src/utils/mobileViewport.ts`)

**Purpose**: Detects when the on-screen keyboard appears/disappears and manages viewport behavior.

**Features**:
- **Dual Detection**: Uses both focus events and Visual Viewport API
- **Viewport Locking**: Prevents document scrolling when keyboard is visible
- **Cross-browser Compatibility**: Works with both focus events and Visual Viewport API

**Key Methods**:
```typescript
// Detects keyboard using Visual Viewport API (primary method)
if (window.visualViewport) {
  const handleVisualViewportChange = () => {
    const currentHeight = window.visualViewport!.height;
    const heightDifference = initialViewportHeight - currentHeight;
    const keyboardDetected = heightDifference > 150;
    setKeyboardVisible(keyboardDetected);
  };
}
```

### 2. CSS Mobile Layout (`src/App.css`)

**Fixed Positioning Strategy**:
- **Header**: `position: fixed` at top with `env(safe-area-inset-top)`
- **Input**: `position: fixed` at bottom with `env(safe-area-inset-bottom)`
- **Messages**: Scrollable area between header and input
- **Keyboard Adjustments**: Input moves up when keyboard appears

**Key CSS Classes**:
```css
.mobile-layout {
  position: fixed !important;
  height: 100vh !important;
  overflow: hidden !important;
}

.mobile-header {
  position: fixed !important;
  top: env(safe-area-inset-top) !important;
  z-index: 50 !important;
}

.mobile-input {
  position: fixed !important;
  bottom: env(safe-area-inset-bottom) !important;
  z-index: 50 !important;
}

.keyboard-visible .mobile-input {
  bottom: 250px !important; /* Position above keyboard */
}
```

### 3. Viewport Meta Tag (`index.html`)

**Critical Properties**:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no, minimal-ui, height=device-height" />
```

- **`minimal-ui`**: Minimizes browser UI when possible
- **`height=device-height`**: Forces viewport to maintain device height
- **`viewport-fit=cover`**: Handles safe areas properly

## Layout Behavior

### Normal State (No Keyboard)
```
┌─────────────────┐
│   Fixed Header  │ ← Always visible at top
├─────────────────┤
│                 │
│  Scrollable     │ ← Chat messages area
│  Chat Area      │
│                 │
├─────────────────┤
│  Fixed Input    │ ← Always visible at bottom
└─────────────────┘
```

### Keyboard Visible State
```
┌─────────────────┐
│   Fixed Header  │ ← Still fixed at top
├─────────────────┤
│                 │
│  Scrollable     │ ← Reduced height, still scrollable
│  Chat Area      │
│                 │
├─────────────────┤
│  Fixed Input    │ ← Moved up above keyboard
├─────────────────┤
│  On-screen      │ ← Keyboard (browser controlled)
│  Keyboard       │
└─────────────────┘
```

## Testing

### Test Script
Run `scripts/test-mobile-layout.bat` to start the frontend with network access.

### Test Cases
1. **Header Visibility**: Header should remain visible when keyboard appears
2. **Input Accessibility**: Input should remain accessible above keyboard
3. **Chat Scrolling**: Chat area should scroll independently
4. **Keyboard Transitions**: Smooth transitions when keyboard appears/disappears
5. **Safe Areas**: Proper handling of device safe areas (notches, home indicators)

### Browser Compatibility
- **iOS Safari**: Full support with Visual Viewport API
- **Android Chrome**: Full support with Visual Viewport API
- **Edge Mobile**: Full support with Visual Viewport API
- **Fallback**: Focus events for older browsers

## Technical Details

### Safe Area Handling
Uses CSS `env()` function for safe areas:
- `env(safe-area-inset-top)`: Top safe area (notch)
- `env(safe-area-inset-bottom)`: Bottom safe area (home indicator)
- `env(safe-area-inset-left/right)`: Side safe areas

### Z-Index Strategy
- **Header**: `z-index: 50`
- **Input**: `z-index: 50`
- **Mobile Menu**: `z-index: 40`
- **Messages**: Default (scrollable content)

### Performance Optimizations
- **Hardware Acceleration**: Uses `transform: translate3d` for smooth animations
- **Touch Scrolling**: `-webkit-overflow-scrolling: touch` for iOS
- **Transition Timing**: `transition: bottom 0.3s ease-out` for smooth keyboard transitions

## Troubleshooting

### Common Issues
1. **Header Still Moving**: Check if Visual Viewport API is supported
2. **Input Not Visible**: Verify safe area calculations
3. **Scrolling Issues**: Ensure `overflow: hidden` on mobile layout container

### Debug Steps
1. Check browser console for Visual Viewport API support
2. Verify CSS classes are applied correctly
3. Test with different mobile browsers
4. Check device safe area calculations

## Future Enhancements

1. **Semantic Similarity Caching**: Expand caching system
2. **Offline Support**: Service worker implementation
3. **Push Notifications**: Real-time message notifications
4. **Voice Input**: Speech-to-text integration
