// Define our internal logo database
const fortuneLogos = [
    {
        name: "Microsoft",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_(2012).svg",
    },
    {
        name: "Apple",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
    },
    {
        name: "Amazon",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
    },
    {
        name: "Google",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
    },
    {
        name: "Meta",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg",
    },
    {
        name: "Samsung",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg",
    },
    {
        name: "Intel",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/85/Intel_logo_2023.svg",
    },
    {
        name: "IBM",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/5/51/IBM_logo.svg",
    },
    // Additional 10 logos
    {
        name: "Oracle",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/5/50/Oracle_logo.svg",
    },
    {
        name: "Salesforce",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg",
    },
    {
        name: "Adobe",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/8d/Adobe_Corporate_Logo.svg",
    },
    {
        name: "Cisco",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/6/64/Cisco_logo.svg",
    },
    {
        name: "Netflix",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg",
    },
    {
        name: "PayPal",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/3/39/PayPal_logo.svg",
    },
    {
        name: "NVIDIA",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/2/21/Nvidia_logo.svg",
    },
    {
        name: "Dell",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/18/Dell_logo_2016.svg",
    },
    {
        name: "HP",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/2/29/HP_New_Logo_2D.svg",
    },
    {
        name: "Toyota",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9d/Toyota_carlogo.svg",
    }
];

// Logo service class
class LogoService {
    constructor() {
        this.logos = fortuneLogos;
    }

    getRandomLogos(count = 5) {
        return [...this.logos]
            .sort(() => 0.5 - Math.random())
            .slice(0, count);
    }
}

// Main implementation
document.addEventListener('DOMContentLoaded', () => {
    const logoService = new LogoService();
    const container = document.querySelector('.flex.justify-center.items-center.flex-wrap.gap-8');
    
    if (container) {
        // Clear existing placeholder divs
        container.innerHTML = '';
        
        // Get random logos
        const logos = logoService.getRandomLogos(5);
        
        // Create and append logo elements
        logos.forEach(logo => {
            const logoDiv = document.createElement('div');
            logoDiv.className = 'w-32 h-12 bg-neutral-800/60 rounded-lg hover:shadow-[0_0_15px_rgba(124,77,255,0.3)] transition-all duration-300 flex items-center justify-center';
            
            const img = document.createElement('img');
            img.src = logo.imageUrl;
            img.alt = logo.name;
            img.className = 'w-24 h-8 object-contain filter brightness-0 invert opacity-50 hover:opacity-75 transition-opacity duration-300';
            
            // Add error handling for failed image loads
            img.onerror = () => {
                console.warn(`Failed to load logo for ${logo.name}`);
                logoDiv.remove(); // Remove the logo container if image fails to load
            };
            
            logoDiv.appendChild(img);
            container.appendChild(logoDiv);
        });
    }
});