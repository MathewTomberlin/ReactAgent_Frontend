# Chat Settings Test Guide

## Overview
This guide tests the new collapsible sidebar groups and user settings functionality.

## Test Steps

### 1. Sidebar Organization
- [ ] Open the desktop sidebar (click hamburger menu)
- [ ] Verify three collapsible groups are present:
  - **Chat Controls** (expanded by default)
  - **Chat Settings** (expanded by default)  
  - **Cache Statistics** (collapsed by default, admin only)

### 2. Chat Controls Group
- [ ] Verify "Clear Chat" button is present and functional
- [ ] Verify "Retry Last Message" button is present and functional
- [ ] Test that buttons are disabled when appropriate (loading, rate limited)

### 3. Chat Settings Group
- [ ] Verify three checkboxes are present:
  - [ ] Display Message Model (checked by default)
  - [ ] Display Message Tokens (checked by default)
  - [ ] Display Timestamp (checked by default)
- [ ] Test each checkbox:
  - [ ] Uncheck "Display Message Model" → model info should disappear from messages
  - [ ] Uncheck "Display Message Tokens" → token info should disappear from messages
  - [ ] Uncheck "Display Timestamp" → timestamps should disappear from messages
  - [ ] Re-check each setting → corresponding info should reappear

### 4. Settings Persistence
- [ ] Change one or more settings
- [ ] Refresh the page
- [ ] Verify settings are restored from localStorage
- [ ] Test in different browser tabs/windows

### 5. Cache Statistics Group (Admin Only)
- [ ] If you have admin access (backend running locally):
  - [ ] Verify "Cache Statistics" group is visible
  - [ ] Click to expand the group
  - [ ] Verify cache stats display (hits, misses, hit rate)
- [ ] If you don't have admin access:
  - [ ] Verify "Cache Statistics" group is NOT visible

### 6. Message Display with Settings
- [ ] Send a message with all settings enabled
- [ ] Verify message shows: timestamp, model, and tokens
- [ ] Disable "Display Message Model" setting
- [ ] Send another message
- [ ] Verify model info is hidden but timestamp and tokens still show
- [ ] Test all combinations of enabled/disabled settings

### 7. Mobile Responsiveness
- [ ] Test on mobile device or resize browser to mobile width
- [ ] Verify mobile menu works correctly
- [ ] Verify settings are accessible on mobile

## Expected Behavior

### ✅ Working Correctly
- Sidebar groups collapse/expand smoothly
- Settings persist across page refreshes
- Message display respects settings immediately
- Admin-only content is properly hidden/shown
- Mobile layout works correctly

### ❌ Issues to Report
- Settings don't persist after refresh
- Message display doesn't update when settings change
- Sidebar groups don't collapse/expand
- Cache statistics visible to non-admin users
- Mobile layout broken

## Technical Notes

### Settings Storage
- Settings are stored in `localStorage` under key `'chatSettings'`
- Default values are applied if no settings exist
- Settings are automatically saved when changed

### Admin Detection
- Admin status is checked by attempting to access `/admin/cache/stats`
- Uses basic auth with username: 'admin', password: 'admin'
- Admin status is checked once on page load

### Collapsible Groups
- Each group maintains its own expanded/collapsed state
- Groups can be expanded/collapsed independently
- Smooth animations for expand/collapse transitions
