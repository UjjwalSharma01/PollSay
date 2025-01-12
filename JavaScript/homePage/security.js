const bars = document.querySelectorAll('.animate-grow');
bars.forEach(bar => {
    bar.style.setProperty('--h', bar.style.height);
    bar.style.height = '0';
});

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.height = entry.target.style.getPropertyValue('--h');
        }
    });
});

bars.forEach(bar => observer.observe(bar));