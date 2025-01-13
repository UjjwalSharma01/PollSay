

document.getElementById('newsletterForm').addEventListener('submit', async function(e) {
    document.addEventListener("DOMContentLoaded", () => {
        const cards = document.querySelectorAll(".pricing-card");
        cards.forEach(card => {
            card.addEventListener("mouseenter", () => {
                card.style.transform = "translateY(-10px)";
            });
    
            card.addEventListener("mouseleave", () => {
                card.style.transform = "translateY(0)";
            });
        });
    });
    // Add this to your existing JavaScript file
document.querySelector('form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const emailInput = this.querySelector('input[type="email"]');
    const email = emailInput.value;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }

    // Show loading state
    const submitButton = this.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = 'Subscribing...';

    try {
        // Using the same template but only sending email
        const response = await emailjs.send(
            "service_p33oyab",
            "template_uxcprib",
            {
                from_name: "Newsletter Subscriber",
                from_email: email,
                company: "Newsletter Subscription",
                message: "New newsletter subscription request",
                to_name: "Ujjwal Sharma"
            }
        );

        if (response.status === 200) {
            showNotification('Thank you for subscribing to our newsletter!', 'success');
            this.reset();
        } else {
            throw new Error('Failed to subscribe');
        }

    } catch (error) {
        console.error('Error:', error);
        showNotification('Something went wrong. Please try again later.', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    }
});
    
});
