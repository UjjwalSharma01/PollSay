# Image Handling Best Practices for PollSay

## Common Issues and Solutions

### 1. ERR_NAME_NOT_RESOLVED for External Image URLs

**Problem**: When using external image URLs like `https://via.placeholder.com/40`, users may encounter DNS resolution failures, particularly in environments with network restrictions or connectivity issues.

**Symptoms**:
- Console errors: `GET https://via.placeholder.com/40 net::ERR_NAME_NOT_RESOLVED`
- Missing images in UI
- Degraded user experience

**Solutions**:

1. **Embed SVGs as Data URIs**:
```html
<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'...">
```

2. **Use Local Assets**:
```html
<img src="/public/assets/images/avatar-placeholder.svg">
```

3. **CSS Background Fallbacks**:
```css
.avatar {
  background-image: url('/assets/images/avatar.png');
  background-fallback: #ccc;
}
```

### 2. Implementation in PollSay

PollSay uses a centralized image error handling approach:

1. **Shared Utility**:
   - `imageErrorHandler.js` provides automatic fallbacks
   - Import and use with: `setupImageErrorHandlers()`

2. **Default Avatars**:
   - Used for user profiles
   - SVG embedded as data URI
   - No external dependencies

3. **Image Loading Pattern**:
```javascript
// In JavaScript initialization
import { setupImageErrorHandlers } from '../js/imageErrorHandler.js';
document.addEventListener('DOMContentLoaded', setupImageErrorHandlers);

// In HTML
<img src="/path/to/image.jpg" onerror="this.src='fallback-path'" alt="Description">
```

## Best Practices

1. **Always provide fallbacks** for all images
2. **Use SVG for icons and simple graphics** - they're scalable and can be embedded
3. **Include proper alt text** for accessibility
4. **Lazy load non-critical images** to improve page load performance
5. **Use appropriate image formats**:
   - JPEG: Photos and complex images
   - PNG: Images requiring transparency
   - SVG: Icons, logos, and simple graphics
   - WebP: Modern alternative with better compression

6. **Preload critical images**:
```html
<link rel="preload" as="image" href="critical-image.jpg">
```

7. **Consider responsive images**:
```html
<picture>
  <source media="(max-width: 799px)" srcset="image-480w.jpg">
  <source media="(min-width: 800px)" srcset="image-800w.jpg">
  <img src="image-800w.jpg" alt="Description">
</picture>
```

## Testing Image Handling

When implementing changes to image handling, test:

1. With network enabled and disabled
2. With various connection speeds (using browser throttling)
3. With image blocking enabled
4. Across different browsers and devices
