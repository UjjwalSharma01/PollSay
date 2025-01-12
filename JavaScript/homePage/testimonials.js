document.addEventListener('DOMContentLoaded', () => {
    try {
        const swiper = new Swiper('.swiper-container', {
            slidesPerView: 2,
            spaceBetween: 30,
            loop: true,
            watchSlidesProgress: true,
            slidesPerGroup: 1,
            centeredSlides: false,
            effect: 'slide',
            speed: 600,
            grabCursor: true,
            touchRatio: 1,
            preventClicks: true,
            preventClicksPropagation: true,
            autoplay: {
                delay: 5000,
                disableOnInteraction: false,
                pauseOnMouseEnter: true
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
                dynamicBullets: true
            },
            navigation: {
                nextEl: '.nav-button.next',
                prevEl: '.nav-button.prev'
            },
            breakpoints: {
                320: {
                    slidesPerView: 1,
                    spaceBetween: 20
                },
                1024: {
                    slidesPerView: 2,
                    spaceBetween: 30
                }
            }
        });
    } catch (error) {
        console.error('Swiper initialization failed:', error);
    }
});