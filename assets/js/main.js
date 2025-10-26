document.addEventListener('DOMContentLoaded', () => {
    const yearEl = document.getElementById('year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

    const header = document.querySelector('.site-header');
    const observerTarget = document.querySelector('.hero');
    if (observerTarget) {
        document.body.classList.add('hero-visible');
    }

    if (header && observerTarget && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver(([entry]) => {
            const isIntersecting = entry.isIntersecting;

            header.classList.toggle('scrolled', !isIntersecting);
            document.body.classList.toggle('hero-visible', isIntersecting);
        }, { threshold: 0.1 });

        observer.observe(observerTarget);
    }

    const navToggle = document.querySelector('.nav-toggle');
    const primaryNav = document.querySelector('.primary-nav');

    if (navToggle && primaryNav) {
        const navLinks = primaryNav.querySelectorAll('a');

        const closeMenu = () => {
            navToggle.setAttribute('aria-expanded', 'false');
            primaryNav.classList.remove('is-open');
        };

        navToggle.addEventListener('click', () => {
            const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
            const nextState = !isExpanded;
            navToggle.setAttribute('aria-expanded', String(nextState));
            primaryNav.classList.toggle('is-open', nextState);
        });

        navLinks.forEach((link) => {
            link.addEventListener('click', () => {
                if (window.matchMedia('(max-width: 768px)').matches) {
                    closeMenu();
                }
            });
        });

        window.addEventListener('resize', () => {
            if (window.matchMedia('(min-width: 769px)').matches) {
                closeMenu();
            }
        });
    }

    const contactForm = document.querySelector('.contact-form');

    if (contactForm) {
        const statusEl = contactForm.querySelector('.form-status');
        const submitButton = contactForm.querySelector('button[type="submit"]');

        const setStatus = (message, type) => {
            if (!statusEl) {
                return;
            }

            statusEl.textContent = message;
            statusEl.classList.remove('is-success', 'is-error', 'is-pending');

            if (type) {
                statusEl.classList.add(type);
            }
        };

        contactForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (!contactForm.checkValidity()) {
                contactForm.reportValidity();
                return;
            }

            setStatus('Sending your message…', 'is-pending');

            if (submitButton) {
                submitButton.disabled = true;
            }

            const formData = new FormData(contactForm);
            const replyToEmail = formData.get('email');

            if (replyToEmail && !formData.get('_replyto')) {
                formData.set('_replyto', replyToEmail);
            }

            const dataEndpoint = contactForm.getAttribute('data-formsubmit-endpoint');
            let submitUrl = dataEndpoint && dataEndpoint.trim();

            if (!submitUrl) {
                submitUrl = contactForm.action.includes('/ajax/')
                    ? contactForm.action
                    : contactForm.action.replace('https://formsubmit.co/', 'https://formsubmit.co/ajax/');
            }

            const fetchOptions = {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                },
                body: formData,
            };

            let timeoutId;
            let abortController;

            if (typeof AbortController !== 'undefined') {
                abortController = new AbortController();
                timeoutId = window.setTimeout(() => {
                    abortController.abort();
                }, 15000);
                fetchOptions.signal = abortController.signal;
            }

            try {
                const response = await fetch(submitUrl, fetchOptions);

                const responseBody = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(responseBody.message || `Request failed with status ${response.status}`);
                }

                if (Object.prototype.hasOwnProperty.call(responseBody, 'success')) {
                    const successValue = responseBody.success;
                    const isSuccessful = successValue === true || successValue === 'true';

                    if (!isSuccessful) {
                        throw new Error(responseBody.message || 'Form submission was rejected by the email service.');
                    }
                }

                contactForm.reset();
                setStatus('Thank you! Your message has been sent. We will be in touch soon.', 'is-success');
            } catch (error) {
                console.error('Contact form submission failed:', error);
                if (error.name === 'AbortError') {
                    setStatus('The email service took too long to respond. Please try again or email info@3strands.co or call us at (561) 917-9047.', 'is-error');
                } else {
                    setStatus('We could not send your message. Please try again or email info@3strands.co or call us at (561) 917-9047.', 'is-error');
                }
            } finally {
                if (timeoutId) {
                    window.clearTimeout(timeoutId);
                }
                if (submitButton) {
                    submitButton.disabled = false;
                }
            }
        });
    }
});
