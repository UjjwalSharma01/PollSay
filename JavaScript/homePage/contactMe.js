// Initialize EmailJS
(function() {
    emailjs.init("-VXdXrUPXAlgGCIro");
})();

document.getElementById('contactForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form data
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const company = document.getElementById('company').value;
    const message = document.getElementById('message').value;

    // Basic validation
    if (!validateForm(name, email, company, message)) {
        return;
    }

    // Show loading state
    const submitButton = this.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = 'Sending...';

    try {
        // Send email using EmailJS
        const response = await emailjs.send(
            "service_p33oyab", // Replace with your service ID from EmailJS
            "template_uxcprib", // Replace with your template ID from EmailJS
            {
                from_name: name,
                from_email: email,
                company: company,
                message: message,
                to_name: "Ujjwal Sharma",
            }
        );

        if (response.status === 200) {
            showNotification('Thank you for your message. We will get back to you soon!', 'success');
            this.reset();
        } else {
            throw new Error('Failed to send message');
        }

    } catch (error) {
        console.error('Error:', error);
        showNotification('Something went wrong. Please try again later.', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    }
});

function validateForm(name, email, company, message) {
    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!name?.trim()) {
        showNotification('Please enter your name', 'error');
        return false;
    }

    if (!email?.trim()) {
        showNotification('Please enter your email', 'error');
        return false;
    }

    if (!emailRegex.test(email)) {
        showNotification('Please enter a valid email address', 'error');
        return false;
    }

    if (!company?.trim()) {
        showNotification('Please enter your company name', 'error');
        return false;
    }

    if (!message?.trim()) {
        showNotification('Please enter your message', 'error');
        return false;
    }

    return true;
}

function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 4px;
        z-index: 1000;
        animation: slideIn 0.5s ease-out;
        ${type === 'success' 
            ? 'background: #4CAF50; color: white;' 
            : 'background: #f44336; color: white;'}
    `;
    
    notification.textContent = message;

    // Add to document
    document.body.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.5s ease-out';
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

// Add these CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);