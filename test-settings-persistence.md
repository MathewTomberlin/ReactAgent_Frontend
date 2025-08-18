# Settings Persistence Test Guide

## Overview
This guide tests whether the chat settings persist correctly between page reloads.

## Test Steps

### 1. Initial Setup
- [ ] Open browser developer tools (F12)
- [ ] Go to Console tab
- [ ] Clear the console

### 2. Test Settings Persistence
1. **Change Settings:**
   - [ ] Open the sidebar (desktop view)
   - [ ] Go to "Chat Settings" group
   - [ ] Uncheck "Display Message Model"
   - [ ] Uncheck "Display Message Tokens"
   - [ ] Keep "Display Timestamp" checked
   - [ ] Click "Debug Settings" button
   - [ ] Check console for saved settings

2. **Verify localStorage:**
   - [ ] In developer tools, go to Application tab
   - [ ] Expand "Local Storage" → your domain
   - [ ] Look for `chatSettings` key
   - [ ] Verify the value shows the updated settings

3. **Test Page Reload:**
   - [ ] Refresh the page (F5 or Ctrl+R)
   - [ ] Check console for "Loaded settings from localStorage" message
   - [ ] Verify settings are restored correctly
   - [ ] Send a message to verify display behavior

### 3. Debug Information
When you click "Debug Settings", you should see in the console:
```
Current settings: {displayMessageModel: false, displayMessageTokens: false, displayTimestamp: true}
localStorage value: {"displayMessageModel":false,"displayMessageTokens":false,"displayTimestamp":true}
Is initialized: true
```

### 4. Expected Behavior

#### ✅ Working Correctly
- Settings are saved immediately when changed
- Settings persist after page refresh
- Console shows proper loading/saving messages
- Message display respects saved settings

#### ❌ Issues to Report
- Settings reset to defaults after refresh
- Console shows errors about localStorage
- Settings don't save when changed
- Debug button shows incorrect values

## Troubleshooting

### If settings don't persist:
1. Check if localStorage is available:
   ```javascript
   // Run in console
   console.log('localStorage available:', typeof localStorage !== 'undefined');
   ```

2. Check if localStorage is being blocked:
   ```javascript
   // Run in console
   try {
     localStorage.setItem('test', 'test');
     localStorage.removeItem('test');
     console.log('localStorage working');
   } catch (e) {
     console.error('localStorage blocked:', e);
   }
   ```

3. Check for browser privacy settings:
   - Incognito/private mode may block localStorage
   - Browser extensions may interfere
   - Privacy settings may block storage

### If you see console errors:
- Check for CORS issues
- Verify the domain is correct
- Check for browser console errors

## Technical Details

### localStorage Key
- Key: `chatSettings`
- Format: JSON string
- Example: `{"displayMessageModel":false,"displayMessageTokens":false,"displayTimestamp":true}`

### Initialization Flow
1. Component mounts with default settings
2. `useEffect` loads saved settings from localStorage
3. Settings are merged with defaults
4. `isInitialized` flag prevents overwriting during load
5. Future changes are saved to localStorage

### Debug Functions
- `debugSettings()`: Logs current state to console
- Console messages show loading/saving operations
- localStorage inspection available in Application tab
