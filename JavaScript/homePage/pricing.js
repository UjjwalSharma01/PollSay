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
