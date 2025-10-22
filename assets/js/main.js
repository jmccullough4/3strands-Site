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
            statusEl.classList.remove('is-success', 'is-error');

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

            setStatus('Sending your message…', null);

            if (submitButton) {
                submitButton.disabled = true;
            }

            const formData = new FormData(contactForm);
            formData.append('_replyto', formData.get('email') || '');

            try {
                const response = await fetch(contactForm.action, {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                    },
                    body: formData,
                });

                const payload = await response.json().catch(() => ({}));

                if (!response.ok || payload.success !== 'true') {
                    throw new Error(payload.message || `Request failed with status ${response.status}`);
                }

                contactForm.reset();
                setStatus('Thank you! Your message has been sent. We will be in touch soon.', 'is-success');
            } catch (error) {
                console.error('Contact form submission failed:', error);
                setStatus('We could not send your message. Please try again or email info@3strands.co or call us at (561) 917-9047.', 'is-error');
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                }
            }
        });
    }

    const liveChatContainer = document.querySelector('.live-chat-content[data-chat-provider="crisp"]');

    if (liveChatContainer) {
        const chatId = (liveChatContainer.getAttribute('data-chat-id') || '').trim();
        const chatButton = liveChatContainer.querySelector('[data-chat-toggle]');
        const chatStatus = liveChatContainer.querySelector('[data-chat-status]');

        const setChatStatus = (message, modifier) => {
            if (!chatStatus) {
                return;
            }

            chatStatus.textContent = message;
            chatStatus.classList.remove('is-live');

            if (modifier) {
                chatStatus.classList.add(modifier);
            }
        };

        if (chatId) {
            window.$crisp = window.$crisp || [];
            window.CRISP_WEBSITE_ID = chatId;

            const script = document.createElement('script');
            script.src = 'https://client.crisp.chat/l.js';
            script.async = true;
            document.head.appendChild(script);

            if (chatButton) {
                chatButton.disabled = false;
                chatButton.addEventListener('click', () => {
                    window.$crisp.push(['do', 'chat:open']);
                });
            }

            setChatStatus('Live chat is online. Click below to start a conversation with our team.', 'is-live');
        } else {
            setChatStatus('Live chat is almost ready—add your Crisp website ID to enable the chat bubble.', null);

            if (chatButton) {
                chatButton.disabled = true;
            }
        }
    }
});
