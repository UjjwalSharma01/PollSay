# Event Handling Best Practices in PollSay

This document outlines best practices for implementing reliable event handling across the PollSay application, especially for interactive elements like navigation, dropdowns, and buttons.

## Common Event Handling Issues

### 1. Missing Click Handlers

**Problem**: Elements appear clickable but don't respond to user input because event handlers aren't properly attached.

**Symptoms**:
- Buttons don't respond when clicked
- Dropdowns don't toggle
- Navigation links don't redirect

**Solutions**:
- Verify event listeners are attached in the browser console: `getEventListeners(document.getElementById('element-id'))`
- Implement a centralized navigation module that ensures consistent behavior
- Add debug modes that visualize clickable areas

### 2. Event Propagation Issues

**Problem**: Events are being stopped from reaching their intended targets due to propagation issues.

**Solutions**:
```javascript
// Proper event handler with propagation control
element.addEventListener('click', function(e) {
  // Stop propagation when needed (use carefully!)
  e.stopPropagation();
  
  // Prevent default behavior when appropriate
  e.preventDefault();
  
  // Your handler code...
});
```

### 3. Z-Index and Overlay Problems

**Problem**: Elements with higher z-index values can block interaction with elements beneath them.

**Solutions**:
- Implement a consistent z-index strategy:
  ```css
  :root {
    --z-dropdown: 50;
    --z-modal: 100;
    --z-tooltip: 150;
  }
  
  .dropdown { z-index: var(--z-dropdown); }
  ```
- Ensure interactive elements have appropriate positioning and z-index
- Test overlapping elements carefully

## PollSay's Navigation Implementation

PollSay uses a centralized navigation module to ensure consistency:

1. **Shared Navigation Logic**:
   ```javascript
   import { setupNavigationHandlers } from '/public/js/navigation.js';
   setupNavigationHandlers();
   ```

2. **Event Delegation**:
   Where appropriate, PollSay uses event delegation to handle events for multiple elements:
   ```javascript
   document.querySelector('nav').addEventListener('click', function(e) {
     if (e.target.matches('a')) {
       // Handle navigation link clicks
     }
   });
   ```

3. **Defensive Coding**:
   All event handlers include proper null checks:
   ```javascript
   const element = document.getElementById('some-element');
   if (element) {
     element.addEventListener('click', handleClick);
   }
   ```

## Testing Event Handlers

When implementing interactive elements:

1. **Verify with Console Logging**:
   ```javascript
   element.addEventListener('click', function() {
     console.log('Element clicked!');
   });
   ```

2. **Use Browser DevTools**: 
   - Elements panel → Event Listeners tab
   - Console → `getEventListeners(element)`
   - Performance tab → Record interactions

3. **Add Debug Modes**:
   ```javascript
   // Add ?debug=true to URL to enable visual debugging
   if (window.location.search.includes('debug=true')) {
     document.body.classList.add('debug-mode');
   }
   ```

## Troubleshooting Checklist

When interactive elements aren't working:

1. **Verify Element Existence**: `console.log(document.getElementById('element-id'))`
2. **Check Element Visibility**: Ensure elements aren't hidden with CSS
3. **Verify Event Handlers**: Check if handlers are attached
4. **Inspect Z-index**: Look for elements that might be overlapping
5. **Test with Different Browsers**: Confirm if the issue is browser-specific
6. **Check for JS Errors**: Look for errors in the console that might prevent handler execution
7. **Implement Forced Clickability**: As a last resort, use the `enforceClickability()` function

By following these practices, PollSay maintains consistent and reliable interactive behavior across all pages.
