document.addEventListener('DOMContentLoaded', () => {
    const yearEl = document.getElementById('year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

    const header = document.querySelector('.site-header');
    const observerTarget = document.querySelector('.hero');

    if (header && observerTarget && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }, { threshold: 0.1 });

        observer.observe(observerTarget);
    }
});
