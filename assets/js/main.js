/**
 * 3 Strands Cattle Co. - Main JavaScript
 * Premium Beef Website
 */

document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // Dynamic Year in Footer
    // =========================================================================
    const yearEl = document.getElementById('year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

    // =========================================================================
    // Header Scroll Effect
    // =========================================================================
    const header = document.querySelector('.site-header');

    if (header) {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Check initial state
    }

    // =========================================================================
    // Mobile Navigation Toggle
    // =========================================================================
    const navToggle = document.querySelector('.nav-toggle');
    const primaryNav = document.querySelector('.primary-nav');

    if (navToggle && primaryNav) {
        const navLinks = primaryNav.querySelectorAll('a');

        const closeMenu = () => {
            navToggle.setAttribute('aria-expanded', 'false');
            primaryNav.classList.remove('is-open');
        };

        const openMenu = () => {
            navToggle.setAttribute('aria-expanded', 'true');
            primaryNav.classList.add('is-open');
        };

        navToggle.addEventListener('click', () => {
            const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
            if (isExpanded) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        // Close menu when clicking a nav link (mobile)
        navLinks.forEach((link) => {
            link.addEventListener('click', () => {
                if (window.matchMedia('(max-width: 768px)').matches) {
                    closeMenu();
                }
            });
        });

        // Close menu when resizing to desktop
        window.addEventListener('resize', () => {
            if (window.matchMedia('(min-width: 769px)').matches) {
                closeMenu();
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navToggle.contains(e.target) && !primaryNav.contains(e.target)) {
                closeMenu();
            }
        });
    }

    // =========================================================================
    // Smooth Scroll for Anchor Links
    // =========================================================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#' || targetId === '#top') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            const targetEl = document.querySelector(targetId);
            if (targetEl) {
                e.preventDefault();
                const headerHeight = header ? header.offsetHeight : 0;
                const targetPosition = targetEl.getBoundingClientRect().top + window.scrollY - headerHeight - 20;
                window.scrollTo({ top: targetPosition, behavior: 'smooth' });
            }
        });
    });

    // =========================================================================
    // Contact Form Handling
    // =========================================================================
    const contactForm = document.querySelector('.contact-form');

    if (contactForm) {
        const statusEl = contactForm.querySelector('.form-status');
        const submitButton = contactForm.querySelector('button[type="submit"]');

        const setStatus = (message, type) => {
            if (!statusEl) return;

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

            setStatus('Sending your message...', 'is-pending');

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
                        throw new Error(responseBody.message || 'Form submission was rejected.');
                    }
                }

                contactForm.reset();
                setStatus('Thank you! Your message has been sent. We\'ll be in touch soon.', 'is-success');
            } catch (error) {
                console.error('Contact form submission failed:', error);
                if (error.name === 'AbortError') {
                    setStatus('The request timed out. Please try again or email info@3strands.co.', 'is-error');
                } else {
                    setStatus('Unable to send message. Please try again or email info@3strands.co.', 'is-error');
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

    // =========================================================================
    // Newsletter Form Handling (Kit)
    // =========================================================================
    const newsletterForm = document.querySelector('.kit-form');

    if (newsletterForm) {
        newsletterForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const submitButton = newsletterForm.querySelector('button[type="submit"]');
            const emailInput = newsletterForm.querySelector('input[type="email"]');
            const formNote = newsletterForm.querySelector('.form-note');
            const originalNoteText = formNote ? formNote.textContent : '';

            if (!emailInput || !emailInput.value) {
                return;
            }

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Subscribing...';
            }

            try {
                const formData = new FormData(newsletterForm);
                const response = await fetch(newsletterForm.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        Accept: 'application/json',
                    },
                });

                if (response.ok) {
                    emailInput.value = '';
                    if (formNote) {
                        formNote.textContent = 'Thanks for subscribing!';
                        formNote.style.color = '#22C55E';
                    }
                    if (submitButton) {
                        submitButton.textContent = 'Subscribed!';
                    }
                } else {
                    throw new Error('Subscription failed');
                }
            } catch (error) {
                console.error('Newsletter subscription failed:', error);
                if (formNote) {
                    formNote.textContent = 'Something went wrong. Please try again.';
                    formNote.style.color = '#EF4444';
                }
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Subscribe';
                }
            }

            // Reset after 5 seconds
            setTimeout(() => {
                if (formNote) {
                    formNote.textContent = originalNoteText;
                    formNote.style.color = '';
                }
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Subscribe';
                }
            }, 5000);
        });
    }

    // =========================================================================
    // Intersection Observer for Fade-in Animations
    // =========================================================================
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const fadeInObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                fadeInObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe elements for fade-in effect
    const fadeElements = document.querySelectorAll('.bundle-card, .category-card, .subscription-card, .value-card, .order-option');
    fadeElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        fadeInObserver.observe(el);
    });

    // Add visible styles
    const style = document.createElement('style');
    style.textContent = '.is-visible { opacity: 1 !important; transform: translateY(0) !important; }';
    document.head.appendChild(style);

    // =========================================================================
    // Chat Widget Helper
    // =========================================================================
    // Function to open Tawk.to chat widget
    window.openChat = function() {
        if (typeof Tawk_API !== 'undefined' && Tawk_API.maximize) {
            Tawk_API.maximize();
        }
    };

    // =========================================================================
    // Business Hours Check for Chat
    // =========================================================================
    function updateChatAvailability() {
        const chatBanner = document.querySelector('.chat-banner');
        if (!chatBanner) return;

        const now = new Date();
        const etOptions = { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hour12: false };
        const etTime = new Intl.DateTimeFormat('en-US', etOptions).format(now);
        const [hours, minutes] = etTime.split(':').map(Number);
        const currentMinutes = hours * 60 + minutes;

        const dayOptions = { timeZone: 'America/New_York', weekday: 'short' };
        const day = new Intl.DateTimeFormat('en-US', dayOptions).format(now);

        let isOpen = false;

        // M-Sat: 7am-9pm (420-1260 minutes), Sun: 12pm-4pm (720-960 minutes)
        if (day === 'Sun') {
            isOpen = currentMinutes >= 720 && currentMinutes < 960;
        } else {
            isOpen = currentMinutes >= 420 && currentMinutes < 1260;
        }

        const chatButton = chatBanner.querySelector('.btn-chat');
        if (chatButton) {
            if (isOpen) {
                chatButton.textContent = 'Start Chat';
                chatButton.style.opacity = '1';
            } else {
                chatButton.textContent = 'Leave a Message';
                chatButton.style.opacity = '0.8';
            }
        }
    }

    updateChatAvailability();
    // Update every minute
    setInterval(updateChatAvailability, 60000);
});
