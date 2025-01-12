// features.js

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Intersection Observer for feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    
    const featureObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate__fadeInUp');
                featureObserver.unobserve(entry.target); // Only animate once
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '50px'
    });

    // Observe all feature cards
    featureCards.forEach(card => {
        featureObserver.observe(card);
        // Initially hide the cards
        card.style.opacity = '0';
    });

    // Add hover effect for feature cards
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            const icon = card.querySelector('.w-12');
            icon.style.transform = 'scale(1.1)';
        });

        card.addEventListener('mouseleave', () => {
            const icon = card.querySelector('.w-12');
            icon.style.transform = 'scale(1)';
        });
    });
});