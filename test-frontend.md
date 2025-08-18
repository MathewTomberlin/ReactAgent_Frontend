# Frontend Migration Test Guide

## Overview
The frontend has been migrated from the deprecated `/message` endpoint to the new `/chat` endpoint with enhanced features including:
- Rate limiting indicators
- Caching feedback
- Mobile responsiveness
- Enhanced error handling
- Connection status monitoring

## Test Checklist

### ✅ Basic Functionality
- [ ] Frontend loads without errors
- [ ] Messages can be sent and received
- [ ] Auto-scroll works when new messages arrive
- [ ] Input field focuses correctly on page load

### ✅ New Chat Endpoint
- [ ] Messages are sent to `/chat` endpoint (check network tab)
- [ ] Response format includes message, model, and usage data
- [ ] Message metadata displays correctly (timestamp, model, tokens)

### ✅ Rate Limiting Features
- [ ] Rate limit indicator appears when rate limited
- [ ] Countdown timer shows remaining seconds
- [ ] Input is disabled during rate limiting
- [ ] Placeholder text shows rate limit status
- [ ] Rate limit warning appears at bottom

### ✅ Mobile Responsiveness
- [ ] Layout adapts to mobile screen sizes
- [ ] Mobile menu opens/closes correctly
- [ ] Textarea input works on mobile
- [ ] Touch targets are appropriately sized (44px minimum)
- [ ] No horizontal scrolling on mobile

### ✅ Connection Status
- [ ] Connection status indicator shows correct state
- [ ] Status changes when connection is lost/restored
- [ ] Offline state shows appropriate error message

### ✅ Enhanced UX Features
- [ ] Clear chat button works
- [ ] Retry last message button works
- [ ] Loading indicators display correctly
- [ ] Error messages are user-friendly
- [ ] Message timestamps display correctly

### ✅ Accessibility
- [ ] Focus states are visible
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility
- [ ] High contrast mode support

## Test Scenarios

### Scenario 1: Normal Usage
1. Send a message
2. Verify response appears
3. Check message metadata (timestamp, model, tokens)
4. Send another message
5. Verify conversation flow

### Scenario 2: Rate Limiting
1. Send a message
2. Immediately send another different message
3. Verify rate limit indicator appears
4. Check countdown timer
5. Wait for rate limit to expire
6. Verify normal functionality resumes

### Scenario 3: Mobile Testing
1. Open in mobile browser or resize to mobile width
2. Test mobile menu functionality
3. Test textarea input
4. Verify touch targets are appropriate size
5. Test responsive layout

### Scenario 4: Error Handling
1. Disconnect internet
2. Try to send a message
3. Verify offline status appears
4. Reconnect internet
5. Verify online status returns

### Scenario 5: Caching (if backend supports)
1. Send the same message twice
2. Check if response time is faster on second request
3. Look for any caching indicators

## Browser Testing
Test in the following browsers:
- [ ] Chrome (desktop & mobile)
- [ ] Firefox (desktop & mobile)
- [ ] Safari (desktop & mobile)
- [ ] Edge (desktop)

## Performance Testing
- [ ] Page load time is acceptable
- [ ] Message sending is responsive
- [ ] No memory leaks during extended use
- [ ] Smooth animations and transitions

## Issues to Report
If any of the above tests fail, please report:
1. Browser and version
2. Device type (desktop/mobile)
3. Steps to reproduce
4. Expected vs actual behavior
5. Console errors (if any)
