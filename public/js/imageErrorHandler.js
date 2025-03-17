/**
 * Image error handler utility
 * Provides fallbacks for broken images across PollSay
 */

export default function setupImageErrorHandlers() {
  // Default avatar SVG as data URI
  const defaultAvatarSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='40' height='40'%3E%3Cpath fill='%23ccc' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";
  
  // Default placeholder SVG for other images
  const defaultPlaceholderSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23cccccc'/%3E%3Cpath d='M30,40 L70,40 L70,60 L30,60 Z' fill='none' stroke='%23ffffff' stroke-width='2'/%3E%3Ctext x='50' y='50' font-family='sans-serif' font-size='12' text-anchor='middle' alignment-baseline='middle' fill='%23ffffff'%3ENo Image%3C/text%3E%3C/svg%3E";

  // Apply to all images on the page
  document.querySelectorAll('img').forEach(img => {
    // Set default image src for avatars
    if (img.id === 'user-avatar' && (!img.src || img.src.includes('placeholder.com'))) {
      img.src = defaultAvatarSvg;
    }
    
    // Set error handler for all images
    img.onerror = function() {
      // Skip if already using a data URI
      if (this.src.startsWith('data:')) return;
      
      // Use appropriate fallback based on image type
      if (this.id === 'user-avatar' || this.classList.contains('avatar')) {
        this.src = defaultAvatarSvg;
      } else {
        this.src = defaultPlaceholderSvg;
      }
      
      console.log(`Image load error handled: ${this.id || 'unnamed image'}`);
    };
  });
}

// Also provide the SVG strings as exports
export const DefaultAvatarSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='40' height='40'%3E%3Cpath fill='%23ccc' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";
