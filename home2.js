document.addEventListener('DOMContentLoaded', () => {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          const tempImage = new Image();
          tempImage.onload = () => {
            img.src = img.dataset.src;
            img.classList.remove('opacity-0');
            img.classList.add('opacity-100');
          };
          tempImage.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      }
    });
  }, {
    rootMargin: '50px 0px',
    threshold: 0.01
  });

  const loadImage = (img) => {
    if ('loading' in HTMLImageElement.prototype) {
      img.loading = 'lazy';
    }
    
    img.classList.add('transition-opacity', 'duration-300', 'opacity-0');
    
    img.onerror = () => {
      const width = img.getAttribute('width') || img.clientWidth || 300;
      const height = img.getAttribute('height') || img.clientHeight || 200;
      img.src = `https://placehold.co/${width}x${height}/DEDEDE/555555?text=Image+Unavailable`;
      img.alt = 'Image unavailable';
      img.classList.remove('opacity-0');
      img.classList.add('opacity-100', 'error-image');
    };

    if (img.dataset.src) {
      imageObserver.observe(img);
    } else {
      img.classList.remove('opacity-0');
      img.classList.add('opacity-100');
    }
  };

  document.querySelectorAll('img[data-src], img:not([data-src])').forEach(loadImage);

  // Watch for dynamically added images
  new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          if (node.tagName === 'IMG') {
            loadImage(node);
          }
          node.querySelectorAll('img').forEach(loadImage);
        }
      });
    });
  }).observe(document.body, {
    childList: true,
    subtree: true
  });
});

// Performance monitoring
if ('performance' in window && 'PerformanceObserver' in window) {
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      if (entry.entryType === 'largest-contentful-paint') {
        console.log(`LCP: ${entry.startTime}ms`);
      }
      if (entry.entryType === 'first-input') {
        console.log(`FID: ${entry.processingStart - entry.startTime}ms`);
      }
      if (entry.entryType === 'layout-shift') {
        console.log(`CLS: ${entry.value}`);
      }
    });
  });

  observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
}

// Handle offline/online status
window.addEventListener('online', () => {
  document.body.classList.remove('offline');
  console.log('Connection restored');
});

window.addEventListener('offline', () => {
  document.body.classList.add('offline');
  console.log('Connection lost');
});

// Mobile Menu Handler
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');

mobileMenuButton.addEventListener('click', () => {
  mobileMenu.classList.toggle('hidden');
});

// Close mobile menu when clicking on a link
const mobileLinks = mobileMenu.getElementsByTagName('a');
for(let link of mobileLinks) {
  link.addEventListener('click', () => {
    mobileMenu.classList.add('hidden');
  });
}

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
  if (!mobileMenu.contains(e.target) && !mobileMenuButton.contains(e.target)) {
    mobileMenu.classList.add('hidden');
  }
});

// Add scroll effect to navbar
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (window.scrollY > 0) {
    navbar.classList.add('shadow-lg');
  } else {
    navbar.classList.remove('shadow-lg');
  }
});

// Initialize Particles.js
particlesJS('particles-js', {
  particles: {
    number: { value: 80, density: { enable: true, value_area: 800 } },
    color: { value: ["#7C4DFF", "#B388FF", "#00B8D4"] },
    shape: { type: "circle" },
    opacity: { value: 0.5, random: false },
    size: { value: 3, random: true },
    line_linked: {
      enable: true,
      distance: 150,
      color: "#7C4DFF",
      opacity: 0.2,
      width: 1
    },
    move: {
      enable: true,
      speed: 2,
      direction: "none",
      random: false,
      straight: false,
      out_mode: "out",
      bounce: false
    }
  },
  interactivity: {
    detect_on: "canvas",
    events: {
      onhover: { enable: true, mode: "grab" },
      resize: true
    }
  },
  retina_detect: true
});

// Floating animation for interface
document.querySelector('.floating-interface').style.animation = 'float 6s ease-in-out infinite';

// Animation for chart bars
const bars = document.querySelectorAll('.animate-grow');
bars.forEach(bar => {
  bar.style.setProperty('--h', bar.style.height);
  bar.style.height = '0';
});

// Trigger animation when in viewport
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.height = entry.target.style.getPropertyValue('--h');
    }
  });
});

bars.forEach(bar => observer.observe(bar));

// Contact Form Handler
document.getElementById('contactForm')?.addEventListener('submit', function(e) {
  e.preventDefault();
  alert('Thank you for your message. We will get back to you soon!');
});

// Testimonials Slider
const swiper = new Swiper('.swiper-container', {
  slidesPerView: 1,
  spaceBetween: 30,
  loop: true,
  centeredSlides: true,
  autoplay: {
    delay: 5000,
    disableOnInteraction: false,
  },
  navigation: {
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev',
  },
  breakpoints: {
    640: {
      slidesPerView: 1,
    },
    768: {
      slidesPerView: 2,
    },
    1024: {
      slidesPerView: 3,
    },
  }
});