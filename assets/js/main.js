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

    const liveChatContainer = document.querySelector('.live-chat-content[data-chat-provider="matrix"]');

    if (liveChatContainer) {
        const embedUrl = (liveChatContainer.getAttribute('data-matrix-embed-url') || '').trim();
        const roomName = (liveChatContainer.getAttribute('data-matrix-room-name') || '3 Strands Cattle Co. Live Chat').trim();
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

        const openOverlay = () => {
            const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            const overlay = document.createElement('div');
            overlay.classList.add('live-chat-overlay');

            const frame = document.createElement('div');
            frame.classList.add('live-chat-frame');
            frame.setAttribute('role', 'dialog');
            frame.setAttribute('aria-modal', 'true');

            if (roomName) {
                frame.setAttribute('aria-label', roomName);
            }

            const closeButton = document.createElement('button');
            closeButton.type = 'button';
            closeButton.classList.add('live-chat-close');
            closeButton.setAttribute('aria-label', 'Close live chat');
            closeButton.textContent = '×';

            const iframe = document.createElement('iframe');
            iframe.src = embedUrl;
            iframe.title = roomName || 'Live chat';
            iframe.loading = 'lazy';
            iframe.setAttribute('allow', 'microphone; camera; clipboard-read; clipboard-write');

            const teardown = () => {
                document.removeEventListener('keydown', handleKeydown);
                overlay.remove();

                if (previousFocus) {
                    previousFocus.focus({ preventScroll: true });
                }
            };

            const handleKeydown = (event) => {
                if (event.key === 'Escape') {
                    teardown();
                }
            };

            closeButton.addEventListener('click', teardown);

            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) {
                    teardown();
                }
            });

            document.addEventListener('keydown', handleKeydown);

            frame.appendChild(closeButton);
            frame.appendChild(iframe);
            overlay.appendChild(frame);
            document.body.appendChild(overlay);

            requestAnimationFrame(() => {
                overlay.classList.add('is-open');
                closeButton.focus({ preventScroll: true });
            });
        };

        if (embedUrl) {
            if (chatButton) {
                chatButton.disabled = false;
                chatButton.addEventListener('click', openOverlay);
            }

            setChatStatus('Live chat is online. Launch the window to connect with our team instantly.', 'is-live');
        } else {
            setChatStatus('Live chat is almost ready—host Element on your server and paste its embed URL into the data attribute.', null);

            if (chatButton) {
                chatButton.disabled = true;
            }
        }
    }
});
