/**
 * 3 Strands Cattle Co. - Main JavaScript
 * Premium Beef Website
 */

document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // Scroll Reveal Animations
    // =========================================================================
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion) {
        const revealObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-revealed');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll('.scroll-reveal').forEach(function(el) {
            revealObserver.observe(el);
        });
    }

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
    // Newsletter Form Handling (Kit v4 via server)
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
                const response = await fetch('/api/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email_address: emailInput.value })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    emailInput.value = '';
                    if (formNote) {
                        formNote.textContent = 'Thanks for subscribing!';
                        formNote.style.color = '#22C55E';
                    }
                    if (submitButton) {
                        submitButton.textContent = 'Subscribed!';
                    }
                } else {
                    throw new Error(data.error || 'Subscription failed');
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
    // Intersection Observer for Staggered Card Animations
    // =========================================================================
    if (!prefersReducedMotion) {
        const cardObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    // Find all sibling cards in the same grid and stagger them
                    const parent = entry.target.parentElement;
                    if (parent && !parent.dataset.revealed) {
                        parent.dataset.revealed = 'true';
                        const children = parent.querySelectorAll('.bundle-card, .category-card, .mystery-cooler-card, .value-card, .order-option');
                        children.forEach(function(child, i) {
                            child.style.transitionDelay = (i * 0.12) + 's';
                            child.classList.add('is-visible');
                        });
                    } else {
                        entry.target.classList.add('is-visible');
                    }
                    cardObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        const cardStyle = document.createElement('style');
        cardStyle.textContent = [
            '.bundle-card, .category-card, .mystery-cooler-card, .value-card, .order-option {',
            '  opacity: 0; transform: translateY(24px);',
            '  transition: opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1);',
            '}',
            '.bundle-card.is-visible, .category-card.is-visible, .mystery-cooler-card.is-visible, .value-card.is-visible, .order-option.is-visible {',
            '  opacity: 1; transform: translateY(0);',
            '}'
        ].join('\n');
        document.head.appendChild(cardStyle);

        document.querySelectorAll('.bundle-card, .category-card, .mystery-cooler-card, .value-card, .order-option').forEach(function(el) {
            cardObserver.observe(el);
        });
    }

    // =========================================================================
    // Event Calendar
    // =========================================================================
    const EVENTS_KEY = '3strands_events';
    const EVENTS_API_URL = '/api/events';
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let selectedDate = null;
    let isAdmin = false;
    let eventsCache = [];

    function getEvents() {
        return eventsCache;
    }

    function saveEvents(events) {
        eventsCache = events;
        // Save to localStorage as backup
        localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
        // Save to server for persistence
        fetch(EVENTS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(events)
        }).catch(function(err) {
            console.error('Failed to save events to server:', err);
        });
    }

    // Load events from server on startup
    function loadEventsFromServer() {
        fetch(EVENTS_API_URL)
            .then(function(res) { return res.json(); })
            .then(function(serverEvents) {
                if (serverEvents && serverEvents.length > 0) {
                    eventsCache = serverEvents;
                    localStorage.setItem(EVENTS_KEY, JSON.stringify(serverEvents));
                } else {
                    // Fall back to localStorage if server has no events
                    eventsCache = JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]');
                }
                renderCalendar();
            })
            .catch(function(err) {
                console.error('Failed to load events from server:', err);
                eventsCache = JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]');
                renderCalendar();
            });
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2);
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }

    function formatTime(timeStr) {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return displayHour + ':' + m + ' ' + ampm;
    }

    function renderCalendar() {
        const monthLabel = document.querySelector('.calendar-month-label');
        const daysContainer = document.getElementById('calendar-days');
        if (!monthLabel || !daysContainer) return;

        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        monthLabel.textContent = monthNames[currentMonth] + ' ' + currentYear;

        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

        const today = new Date();
        const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

        const events = getEvents();
        const eventDates = new Set(events.map(function(e) { return e.date; }));

        daysContainer.innerHTML = '';

        // Previous month trailing days
        for (var i = firstDay - 1; i >= 0; i--) {
            var dayEl = document.createElement('div');
            dayEl.className = 'calendar-day other-month';
            dayEl.textContent = daysInPrevMonth - i;
            daysContainer.appendChild(dayEl);
        }

        // Current month days
        for (var d = 1; d <= daysInMonth; d++) {
            var dateStr = currentYear + '-' + String(currentMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
            var dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.textContent = d;
            dayEl.dataset.date = dateStr;

            if (dateStr === todayStr) dayEl.classList.add('today');
            if (eventDates.has(dateStr)) dayEl.classList.add('has-event');
            if (dateStr === selectedDate) dayEl.classList.add('selected');

            dayEl.addEventListener('click', function() {
                var date = this.dataset.date;
                if (selectedDate === date) {
                    selectedDate = null;
                } else {
                    selectedDate = date;
                }
                renderCalendar();
            });

            daysContainer.appendChild(dayEl);
        }

        // Next month leading days
        var totalCells = firstDay + daysInMonth;
        var remaining = (7 - (totalCells % 7)) % 7;
        for (var n = 1; n <= remaining; n++) {
            var dayEl = document.createElement('div');
            dayEl.className = 'calendar-day other-month';
            dayEl.textContent = n;
            daysContainer.appendChild(dayEl);
        }

        renderEventsList();
    }

    function renderEventsList() {
        var container = document.getElementById('events-list');
        var emptyMsg = document.getElementById('events-empty');
        if (!container) return;

        var events = getEvents();
        var filtered;

        if (selectedDate) {
            filtered = events.filter(function(e) { return e.date === selectedDate; });
        } else {
            // Show upcoming events (next 90 days)
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            var futureDate = new Date(today);
            futureDate.setDate(futureDate.getDate() + 90);
            filtered = events.filter(function(e) {
                var d = new Date(e.date + 'T00:00:00');
                return d >= today && d <= futureDate;
            });
            filtered.sort(function(a, b) { return a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''); });
        }

        // Clear previous cards but keep empty message
        var cards = container.querySelectorAll('.event-card');
        cards.forEach(function(c) { c.remove(); });

        if (filtered.length === 0) {
            if (emptyMsg) {
                emptyMsg.style.display = 'block';
                emptyMsg.textContent = selectedDate ? 'No events on this date.' : 'No upcoming events scheduled. Check back soon!';
            }
            return;
        }

        if (emptyMsg) emptyMsg.style.display = 'none';

        filtered.forEach(function(evt) {
            var card = document.createElement('div');
            card.className = 'event-card';

            var timeStr = '';
            if (evt.time) {
                timeStr = formatTime(evt.time);
                if (evt.endTime) timeStr += ' – ' + formatTime(evt.endTime);
            }

            var metaParts = '<span>📅 ' + formatDate(evt.date) + '</span>';
            if (timeStr) metaParts += '<span>🕐 ' + timeStr + '</span>';
            if (evt.location) metaParts += '<span>📍 ' + evt.location + '</span>';

            var adminBtns = '';
            if (isAdmin) {
                adminBtns = '<button class="event-admin-btn edit" data-event-id="' + evt.id + '">Edit</button>' +
                    '<button class="event-admin-btn delete" data-event-id="' + evt.id + '">Delete</button>';
            }

            card.innerHTML =
                '<div class="event-card-info">' +
                    '<h4>' + evt.name + '</h4>' +
                    '<div class="event-card-meta">' + metaParts + '</div>' +
                    (evt.description ? '<p class="event-card-description">' + evt.description + '</p>' : '') +
                '</div>' +
                '<div class="event-card-actions">' +
                    '<button class="event-export-btn google" data-event-id="' + evt.id + '">+ Google</button>' +
                    '<button class="event-export-btn ics" data-event-id="' + evt.id + '">+ Apple/iCal</button>' +
                    adminBtns +
                '</div>';

            container.appendChild(card);
        });
    }

    // Calendar navigation
    var calPrev = document.querySelector('.calendar-prev');
    var calNext = document.querySelector('.calendar-next');
    if (calPrev) {
        calPrev.addEventListener('click', function() {
            currentMonth--;
            if (currentMonth < 0) { currentMonth = 11; currentYear--; }
            selectedDate = null;
            renderCalendar();
        });
    }
    if (calNext) {
        calNext.addEventListener('click', function() {
            currentMonth++;
            if (currentMonth > 11) { currentMonth = 0; currentYear++; }
            selectedDate = null;
            renderCalendar();
        });
    }

    // =========================================================================
    // Calendar Export Functions
    // =========================================================================
    function exportToGoogleCalendar(evt) {
        var startDate = evt.date.replace(/-/g, '');
        var startTime = (evt.time || '00:00').replace(':', '') + '00';
        var endTime = (evt.endTime || evt.time || '01:00').replace(':', '') + '00';
        var url = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
            '&text=' + encodeURIComponent(evt.name) +
            '&dates=' + startDate + 'T' + startTime + '/' + startDate + 'T' + endTime +
            '&location=' + encodeURIComponent(evt.location || '') +
            '&details=' + encodeURIComponent(evt.description || '');
        window.open(url, '_blank');
    }

    function exportToICS(evt) {
        var startDate = evt.date.replace(/-/g, '');
        var startTime = (evt.time || '00:00').replace(':', '') + '00';
        var endTime = (evt.endTime || evt.time || '01:00').replace(':', '') + '00';
        var ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//3 Strands Cattle Co.//Events//EN',
            'BEGIN:VEVENT',
            'DTSTART:' + startDate + 'T' + startTime,
            'DTEND:' + startDate + 'T' + endTime,
            'SUMMARY:' + evt.name,
            'DESCRIPTION:' + (evt.description || ''),
            'LOCATION:' + (evt.location || ''),
            'UID:' + evt.id + '@3strands.co',
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');
        var blob = new Blob([ics], { type: 'text/calendar' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = evt.name.replace(/\s+/g, '_') + '.ics';
        a.click();
        URL.revokeObjectURL(a.href);
    }

    // Export button delegation
    var eventsListEl = document.getElementById('events-list');
    if (eventsListEl) {
        eventsListEl.addEventListener('click', function(e) {
            var btn = e.target.closest('.event-export-btn');
            if (btn) {
                var evt = getEvents().find(function(ev) { return ev.id === btn.dataset.eventId; });
                if (!evt) return;
                if (btn.classList.contains('google')) exportToGoogleCalendar(evt);
                if (btn.classList.contains('ics')) exportToICS(evt);
                return;
            }

            var adminBtn = e.target.closest('.event-admin-btn');
            if (adminBtn && isAdmin) {
                var eventId = adminBtn.dataset.eventId;
                if (adminBtn.classList.contains('edit')) {
                    var ev = getEvents().find(function(e) { return e.id === eventId; });
                    if (!ev) return;
                    document.getElementById('event-id').value = ev.id;
                    document.getElementById('event-name').value = ev.name;
                    document.getElementById('event-date').value = ev.date;
                    document.getElementById('event-time').value = ev.time || '';
                    document.getElementById('event-end-time').value = ev.endTime || '';
                    document.getElementById('event-location').value = ev.location || '';
                    document.getElementById('event-description').value = ev.description || '';
                    document.getElementById('event-recurrence').value = 'none';
                    if (recurrenceEndField) recurrenceEndField.style.display = 'none';
                    document.getElementById('event-form-title').textContent = 'Edit Event';
                    document.getElementById('event-form-modal').style.display = 'flex';
                }
                if (adminBtn.classList.contains('delete')) {
                    var ev = getEvents().find(function(e) { return e.id === eventId; });
                    var msg = (ev && ev.seriesId) ? 'Delete this event or the entire series?' : 'Delete this event?';
                    if (ev && ev.seriesId) {
                        var choice = prompt('This is a recurring event. Type "all" to delete the entire series, or "one" to delete just this one.');
                        if (choice === 'all') {
                            var sid = ev.seriesId;
                            var events = getEvents().filter(function(e) { return e.seriesId !== sid; });
                            saveEvents(events);
                            renderCalendar();
                        } else if (choice === 'one') {
                            var events = getEvents().filter(function(e) { return e.id !== eventId; });
                            saveEvents(events);
                            renderCalendar();
                        }
                    } else {
                        if (confirm('Delete this event?')) {
                            var events = getEvents().filter(function(e) { return e.id !== eventId; });
                            saveEvents(events);
                            renderCalendar();
                        }
                    }
                }
            }
        });
    }

    // =========================================================================
    // Open Calendar Modal
    // =========================================================================
    var openCalendarBtn = document.getElementById('open-calendar-btn');
    if (openCalendarBtn) {
        openCalendarBtn.addEventListener('click', function() {
            document.getElementById('calendar-modal').style.display = 'flex';
            document.body.style.overflow = 'hidden';
            renderCalendar();
        });
    }

    // =========================================================================
    // Secret Admin Login (7 clicks on logo)
    // =========================================================================
    var logoClickCount = 0;
    var logoClickTimer = null;
    var brandLink = document.querySelector('.brand-link');

    if (brandLink) {
        brandLink.addEventListener('click', function(e) {
            logoClickCount++;
            clearTimeout(logoClickTimer);

            if (logoClickCount >= 2) {
                e.preventDefault();
            }

            logoClickTimer = setTimeout(function() { logoClickCount = 0; }, 3000);

            if (logoClickCount >= 7) {
                logoClickCount = 0;
                document.getElementById('admin-login-modal').style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
        });
    }

    // Admin login form
    var adminLoginForm = document.getElementById('admin-login-form');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var user = document.getElementById('admin-username').value;
            var pass = document.getElementById('admin-password').value;
            if (user === 'admin' && pass === 'Tucker1234!') {
                isAdmin = true;
                document.getElementById('admin-login-modal').style.display = 'none';
                document.getElementById('admin-controls').style.display = 'block';
                document.getElementById('calendar-modal').style.display = 'flex';
                document.body.style.overflow = 'hidden';
                renderCalendar();
                loadProducts();
            } else {
                document.getElementById('admin-login-status').textContent = 'Invalid credentials.';
            }
        });
    }

    // =========================================================================
    // Admin Event CRUD
    // =========================================================================
    // Show/hide recurrence end date field
    var recurrenceSelect = document.getElementById('event-recurrence');
    var recurrenceEndField = document.getElementById('recurrence-end-field');
    if (recurrenceSelect) {
        recurrenceSelect.addEventListener('change', function() {
            if (recurrenceEndField) {
                recurrenceEndField.style.display = this.value === 'none' ? 'none' : 'block';
            }
        });
    }

    var addEventBtn = document.getElementById('add-event-btn');
    if (addEventBtn) {
        addEventBtn.addEventListener('click', function() {
            document.getElementById('event-form').reset();
            document.getElementById('event-id').value = '';
            document.getElementById('event-form-title').textContent = 'Add Event';
            if (recurrenceEndField) recurrenceEndField.style.display = 'none';
            document.getElementById('event-form-modal').style.display = 'flex';
            document.body.style.overflow = 'hidden';
        });
    }

    function addDays(dateStr, days) {
        var d = new Date(dateStr + 'T00:00:00');
        d.setDate(d.getDate() + days);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function generateRecurringDates(startDate, recurrence, endDate) {
        var dates = [startDate];
        if (recurrence === 'none' || !endDate) return dates;

        var dayInterval = recurrence === 'weekly' ? 7 : recurrence === 'biweekly' ? 14 : 0;
        var current = startDate;

        if (dayInterval > 0) {
            while (true) {
                current = addDays(current, dayInterval);
                if (current > endDate) break;
                dates.push(current);
            }
        } else if (recurrence === 'monthly') {
            var start = new Date(startDate + 'T00:00:00');
            var dayOfMonth = start.getDate();
            var m = start.getMonth() + 1;
            var y = start.getFullYear();
            while (true) {
                m++;
                if (m > 12) { m = 1; y++; }
                var daysInMonth = new Date(y, m, 0).getDate();
                var day = Math.min(dayOfMonth, daysInMonth);
                var next = y + '-' + String(m).padStart(2, '0') + '-' + String(day).padStart(2, '0');
                if (next > endDate) break;
                dates.push(next);
            }
        }

        return dates;
    }

    var eventForm = document.getElementById('event-form');
    if (eventForm) {
        eventForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var events = getEvents();
            var id = document.getElementById('event-id').value;
            var recurrence = document.getElementById('event-recurrence').value;
            var recurrenceEnd = document.getElementById('event-recurrence-end').value;
            var name = document.getElementById('event-name').value;
            var date = document.getElementById('event-date').value;
            var time = document.getElementById('event-time').value;
            var endTime = document.getElementById('event-end-time').value;
            var location = document.getElementById('event-location').value;
            var description = document.getElementById('event-description').value;

            if (id) {
                // Editing a single existing event
                var idx = events.findIndex(function(ev) { return ev.id === id; });
                if (idx !== -1) {
                    events[idx].name = name;
                    events[idx].date = date;
                    events[idx].time = time;
                    events[idx].endTime = endTime;
                    events[idx].location = location;
                    events[idx].description = description;
                }
            } else {
                // New event — generate recurring instances if needed
                var dates = generateRecurringDates(date, recurrence, recurrenceEnd);
                var seriesId = dates.length > 1 ? generateId() : null;

                dates.forEach(function(d) {
                    events.push({
                        id: generateId(),
                        seriesId: seriesId,
                        name: name,
                        date: d,
                        time: time,
                        endTime: endTime,
                        location: location,
                        description: description
                    });
                });
            }

            saveEvents(events);
            document.getElementById('event-form-modal').style.display = 'none';
            document.body.style.overflow = '';
            renderCalendar();
        });
    }

    // =========================================================================
    // Modal Close Handlers
    // =========================================================================
    document.querySelectorAll('.modal-overlay, .modal-close').forEach(function(el) {
        el.addEventListener('click', function() {
            var modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }
        });
    });

    // Initialize calendar - load events from server first
    loadEventsFromServer();

    // =========================================================================
    // Newsletter Admin
    // =========================================================================
    var nlModal = document.getElementById('newsletter-modal');
    var nlOpenBtn = document.getElementById('open-newsletter-btn');
    var nlTabs = document.querySelectorAll('.nl-tab');
    var nlCompose = document.getElementById('nl-compose');
    var nlSubscribers = document.getElementById('nl-subscribers');
    var nlForm = document.getElementById('newsletter-form');
    var nlStatus = document.getElementById('nl-status');
    var nlPreviewBtn = document.getElementById('nl-preview-btn');

    // Open newsletter modal
    if (nlOpenBtn) {
        nlOpenBtn.addEventListener('click', function () {
            nlModal.style.display = 'flex';
            loadSubscriberList();
        });
    }

    // Close newsletter modal
    if (nlModal) {
        nlModal.querySelectorAll('.modal-close, .modal-overlay').forEach(function (el) {
            el.addEventListener('click', function () {
                nlModal.style.display = 'none';
            });
        });
    }

    // Tab switching
    nlTabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            var target = this.dataset.tab;
            nlTabs.forEach(function (t) { t.classList.remove('nl-tab--active'); });
            this.classList.add('nl-tab--active');
            nlCompose.style.display = target === 'compose' ? 'block' : 'none';
            nlSubscribers.style.display = target === 'subscribers' ? 'block' : 'none';
            if (target === 'subscribers') loadSubscriberList();
        });
    });

    // Load subscriber list
    function loadSubscriberList() {
        fetch('/api/subscribers').then(function (r) { return r.json(); }).then(function (subs) {
            var countEl = document.getElementById('nl-subscriber-count');
            var listEl = document.getElementById('nl-subscriber-list');
            var active = subs.filter(function (s) { return s.status === 'active'; }).length;
            countEl.textContent = active + ' active subscriber' + (active !== 1 ? 's' : '') + ' / ' + subs.length + ' total';

            listEl.innerHTML = subs.map(function (s) {
                var date = new Date(s.subscribedAt).toLocaleDateString();
                return '<div class="nl-sub-row">' +
                    '<span class="nl-sub-email">' + s.email + '</span>' +
                    '<span class="nl-sub-meta">' +
                    '<span class="nl-sub-status ' + s.status + '">' + s.status + '</span>' +
                    '<span>' + date + '</span>' +
                    '<button class="nl-sub-delete" data-id="' + s.id + '" title="Remove">&times;</button>' +
                    '</span></div>';
            }).join('');

            // Delete buttons
            listEl.querySelectorAll('.nl-sub-delete').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var id = this.dataset.id;
                    fetch('/api/subscribers/' + id, { method: 'DELETE' })
                        .then(function () { loadSubscriberList(); });
                });
            });
        });
    }

    // Preview email
    if (nlPreviewBtn) {
        nlPreviewBtn.addEventListener('click', function () {
            var subject = document.getElementById('nl-subject').value || 'Preview';
            var body = document.getElementById('nl-body').value || '<p>Preview content</p>';
            fetch('/api/newsletter/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject: subject, body: body })
            }).then(function (r) { return r.text(); }).then(function (html) {
                var win = window.open('', '_blank', 'width=700,height=800');
                win.document.write(html);
                win.document.close();
            });
        });
    }

    // Send newsletter
    if (nlForm) {
        nlForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var subject = document.getElementById('nl-subject').value;
            var body = document.getElementById('nl-body').value;
            var sendBtn = document.getElementById('nl-send-btn');

            if (!confirm('Send this newsletter to all active subscribers?')) return;

            sendBtn.disabled = true;
            sendBtn.textContent = 'Sending...';
            nlStatus.textContent = '';
            nlStatus.style.color = '';

            fetch('/api/newsletter/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject: subject, body: body })
            }).then(function (r) { return r.json(); }).then(function (data) {
                if (data.success) {
                    nlStatus.textContent = 'Sent to ' + data.sent + '/' + data.total + ' subscribers.';
                    nlStatus.style.color = '#22C55E';
                    if (data.failed > 0 && data.errors) {
                        nlStatus.textContent += ' (' + data.failed + ' failed: ' + data.errors.join('; ') + ')';
                        nlStatus.style.color = '#F59E0B';
                    }
                } else {
                    var msg = data.error || 'Send failed.';
                    if (data.hint) msg += ' ' + data.hint;
                    if (data.errors) msg += ' Details: ' + data.errors.join('; ');
                    nlStatus.textContent = msg;
                    nlStatus.style.color = '#EF4444';
                }
                sendBtn.disabled = false;
                sendBtn.textContent = 'Send to All Subscribers';
            }).catch(function () {
                nlStatus.textContent = 'Network error. Try again.';
                nlStatus.style.color = '#EF4444';
                sendBtn.disabled = false;
                sendBtn.textContent = 'Send to All Subscribers';
            });
        });
    }

    // =========================================================================
    // Product Categories - Menu Board Organization (matches Dashboard)
    // =========================================================================
    var productCategories = {
        'Premium Steaks': {
            keywords: ['filet mignon', 'ribeye', 'ny strip', 'porterhouse', 'sirloin cap', 'picanha']
        },
        'Everyday Steaks': {
            keywords: ['flank steak', 'skirt steak', 'denver steak', 'chuck eye', 'flat iron', 'hanger', 'london broil', 'petite sirloin', 'sirloin tip steak', 'sirloin flap', 'teres major']
        },
        'Roasts': {
            keywords: ['roast', 'brisket', 'tri tip']
        },
        'Ground & Stew': {
            keywords: ['ground beef', 'stew meat']
        },
        'Specialty Cuts': {
            keywords: ['oxtail', 'short rib', 'osso bucco', 'beef belly']
        },
        'Bones & Offal': {
            keywords: ['bone', 'liver', 'heart', 'tongue']
        },
        'Farm Fresh': {
            keywords: ['egg', 'duck']
        }
    };

    // Category display order (matches Dashboard)
    var categoryOrder = [
        'Premium Steaks',
        'Everyday Steaks',
        'Roasts',
        'Ground & Stew',
        'Specialty Cuts',
        'Bones & Offal',
        'Farm Fresh'
    ];

    // Items to exclude from display
    var excludeItems = ['beef home delivery', 'beef pickup', 'shipping', 'market appearance'];

    function categorizeProduct(productName) {
        var nameLower = productName.toLowerCase();
        if (excludeItems.some(function(ex) { return nameLower.includes(ex); })) {
            return null;
        }
        for (var category in productCategories) {
            if (productCategories[category].keywords.some(function(kw) { return nameLower.includes(kw); })) {
                return category;
            }
        }
        return null; // Don't show uncategorized items
    }

    // Sort order within categories (premium items first)
    function getProductSortOrder(name) {
        var nameLower = name.toLowerCase();
        var premiumOrder = [
            'filet mignon', 'ribeye', 'porterhouse', 'ny strip', 'sirloin cap', 'picanha',
            'brisket', 'tri tip', 'chuck roast'
        ];
        for (var i = 0; i < premiumOrder.length; i++) {
            if (nameLower.includes(premiumOrder[i])) return i;
        }
        return 999;
    }

    // =========================================================================
    // Square Catalog & Flash Sales - Dynamic Rendering
    // =========================================================================
    var SQUARE_API_URL = window.SQUARE_API_URL || '/api/catalog';
    // Fetch flash sales via server proxy (avoids CORS issues)
    var FLASH_SALES_API_URL = window.FLASH_SALES_API_URL || '/api/flash-sales';

    function formatCents(amount) {
        return '$' + (amount / 100).toFixed(2);
    }

    function formatPrice(amount) {
        return '$' + amount.toFixed(2);
    }

    function escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    var lastSquareData = null;
    var lastFlashSales = [];

    function updateSquareStatus(status, message, details) {
        var dot = document.getElementById('square-status-dot');
        var label = document.getElementById('square-status-label');
        var detailsEl = document.getElementById('square-status-details');
        if (!dot || !label) return;

        dot.className = 'square-status-dot ' + status;
        label.textContent = message;
        if (detailsEl) {
            detailsEl.innerHTML = details || '';
        }
    }

    function loadProducts() {
        var container = document.getElementById('products-container');
        if (!container) return;

        // Fetch both catalog and flash sales in parallel
        console.log('Fetching catalog from:', SQUARE_API_URL);
        console.log('Fetching flash sales from:', FLASH_SALES_API_URL);
        Promise.all([
            fetch(SQUARE_API_URL).then(function(r) { return r.json(); }),
            fetch(FLASH_SALES_API_URL).then(function(r) {
                console.log('Flash sales response status:', r.status);
                return r.json();
            }).catch(function(err) {
                console.error('Flash sales fetch error:', err);
                return [];
            })
        ])
            .then(function(results) {
                var data = results[0];
                var flashSales = results[1] || [];
                lastSquareData = data;
                lastFlashSales = flashSales;

                console.log('Catalog items:', data.items ? data.items.length : 0);
                console.log('Flash sales received:', flashSales.length, flashSales);

                var catalog = data.items || [];

                if (!catalog || catalog.length === 0) {
                    container.innerHTML = '<div class="products-loading"><p>No products available. Check back soon!</p></div>';
                    updateSquareStatus('warning', 'Connected — No Items', 'The API responded but returned no catalog items.');
                    return;
                }

                // Build flash sale lookup map (by cut_type)
                var flashSaleMap = {};
                flashSales.forEach(function(sale) {
                    if (sale.is_active !== false) {
                        var key = sale.cut_type.toLowerCase().replace(/\s+/g, '');
                        flashSaleMap[key] = sale;
                        console.log('Flash sale map key:', key, '-> sale:', sale.cut_type);
                    }
                });

                // Categorize and organize products
                var categorizedProducts = {};

                catalog.forEach(function(item) {
                    var name = item.name.trim();
                    var category = categorizeProduct(name);
                    if (category === null) return; // Skip excluded/uncategorized items

                    if (!categorizedProducts[category]) {
                        categorizedProducts[category] = [];
                    }

                    // Get price from first variation
                    var priceCents = 0;
                    if (item.variations && item.variations.length > 0) {
                        var v = item.variations[0];
                        if (v.priceMoney && v.priceMoney.amount) {
                            priceCents = v.priceMoney.amount;
                        }
                    }

                    // Check for flash sale match
                    var nameLower = name.toLowerCase();
                    var productKey = nameLower.replace(/\s+/g, '');
                    var matchedSale = null;
                    for (var key in flashSaleMap) {
                        if (productKey.includes(key) || key.includes(productKey)) {
                            matchedSale = flashSaleMap[key];
                            console.log('Flash sale MATCH:', name, '-> key:', key);
                            break;
                        }
                    }

                    categorizedProducts[category].push({
                        name: name,
                        priceCents: priceCents,
                        isSoldOut: item.isSoldOut || false,
                        isLowStock: item.isLowStock || false,
                        flashSale: matchedSale
                    });
                });

                // Sort products within each category
                for (var cat in categorizedProducts) {
                    categorizedProducts[cat].sort(function(a, b) {
                        // Sold out items go to the bottom
                        if (a.isSoldOut && !b.isSoldOut) return 1;
                        if (!a.isSoldOut && b.isSoldOut) return -1;
                        // Low stock items go just above sold out
                        if (a.isLowStock && !b.isLowStock && !b.isSoldOut) return 1;
                        if (!a.isLowStock && b.isLowStock && !a.isSoldOut) return -1;
                        // Flash sales first (among in-stock items)
                        if (a.flashSale && !b.flashSale) return -1;
                        if (!a.flashSale && b.flashSale) return 1;
                        // Then by premium order
                        var orderA = getProductSortOrder(a.name);
                        var orderB = getProductSortOrder(b.name);
                        if (orderA !== orderB) return orderA - orderB;
                        // Then alphabetically
                        return a.name.localeCompare(b.name);
                    });
                }

                // Render the product categories
                var html = '';

                categoryOrder.forEach(function(category) {
                    var products = categorizedProducts[category];
                    if (!products || products.length === 0) return;

                    html += '<div class="category-card">';
                    html += '<h3>' + escapeHtml(category) + '</h3>';
                    html += '<ul class="price-list">';

                    products.forEach(function(product) {
                        var itemClasses = [];
                        var priceHtml = '';

                        if (product.isSoldOut) {
                            itemClasses.push('sold-out-item');
                            priceHtml = '<span class="price sold-out">Sold Out</span>';
                        } else if (product.flashSale) {
                            var sale = product.flashSale;
                            var savings = Math.round(((sale.original_price - sale.sale_price) / sale.original_price) * 100);
                            itemClasses.push('on-sale');
                            priceHtml = '<span class="price-original">' + formatPrice(sale.original_price) + '</span>';
                            priceHtml += '<span class="price sale-price">' + formatPrice(sale.sale_price) + '</span>';
                            priceHtml += '<span class="price-savings">' + savings + '% OFF</span>';
                        } else {
                            if (product.priceCents > 0) {
                                priceHtml = '<span class="price">' + formatCents(product.priceCents) + '</span>';
                                priceHtml += '<span class="price-unit">/lb</span>';
                            } else {
                                priceHtml = '<span class="price">Market Price</span>';
                            }
                        }

                        // Add stock badge (after name)
                        var stockBadgeHtml = '';
                        if (product.isLowStock && !product.isSoldOut) {
                            itemClasses.push('low-stock-item');
                            stockBadgeHtml = ' <span class="stock-badge low-stock">Low Stock</span>';
                        }

                        // Flash sale badge (before item name)
                        var flashBadgeHtml = '';
                        if (product.flashSale && !product.isSoldOut) {
                            flashBadgeHtml = '<span class="flash-badge">⚡ FLASH SALE</span>';
                        }

                        html += '<li class="' + itemClasses.join(' ') + '">';
                        html += flashBadgeHtml;
                        html += '<span class="item-name">' + escapeHtml(product.name) + stockBadgeHtml + '</span>';
                        html += '<span class="item-pricing">' + priceHtml + '</span>';
                        html += '</li>';
                    });

                    html += '</ul>';
                    html += '</div>';
                });

                container.innerHTML = html;

                // Observe newly created category cards for reveal animation
                if (!prefersReducedMotion) {
                    container.querySelectorAll('.category-card').forEach(function(card) {
                        card.classList.add('is-visible');
                    });
                }

                // Update flash sales banner
                updateFlashSalesBanner(flashSales);

                // Update status
                var flashSaleCount = flashSales.length;
                var details = '<span>' + catalog.length + ' catalog items</span>';
                if (flashSaleCount > 0) {
                    details += '<span class="square-status-sale">⚡ ' + flashSaleCount + ' flash sale' + (flashSaleCount > 1 ? 's' : '') + '</span>';
                }
                if (data.updatedAt) {
                    var d = new Date(data.updatedAt);
                    details += '<span>Last sync: ' + d.toLocaleTimeString() + '</span>';
                }

                updateSquareStatus('connected', 'Connected', details);
                console.log('Products loaded from catalog (' + catalog.length + ' items, ' + flashSaleCount + ' flash sales)');
            })
            .catch(function(err) {
                container.innerHTML = '<div class="products-loading"><p>Unable to load products. Please try again later.</p></div>';
                updateSquareStatus('error', 'Offline', '<span>Error: ' + err.message + '</span>');
                console.error('Catalog fetch failed:', err.message);
            });
    }

    // =========================================================================
    // Flash Sales Banner
    // =========================================================================
    function updateFlashSalesBanner(flashSales) {
        var banner = document.getElementById('flash-sales-banner');
        if (!banner) return;

        if (!flashSales || flashSales.length === 0) {
            banner.style.display = 'none';
            return;
        }

        var html = '<div class="flash-banner-content">';
        html += '<span class="flash-banner-icon">⚡</span>';
        html += '<span class="flash-banner-label">FLASH SALE</span>';
        html += '<div class="flash-banner-items">';
        flashSales.forEach(function(sale) {
            var savings = Math.round(((sale.original_price - sale.sale_price) / sale.original_price) * 100);
            html += '<span class="flash-banner-item">';
            html += '<strong>' + escapeHtml(sale.cut_type) + '</strong> ';
            html += '<span class="flash-original">' + formatPrice(sale.original_price) + '</span> ';
            html += '<span class="flash-sale-price">' + formatPrice(sale.sale_price) + '</span> ';
            html += '<span class="flash-savings">' + savings + '% OFF</span>';
            html += '</span>';
        });
        html += '</div></div>';
        banner.innerHTML = html;
        banner.style.display = 'block';
    }

    // Refresh button
    var refreshBtn = document.getElementById('square-refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadProducts();
        });
    }

    // Load products on page load
    loadProducts();

    // Smart polling — refresh every 60s while tab is visible, pause when hidden
    var POLL_INTERVAL = 60 * 1000;
    var pollTimer = null;

    function startPolling() {
        if (pollTimer) return;
        pollTimer = setInterval(loadProducts, POLL_INTERVAL);
    }

    function stopPolling() {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
    }

    startPolling();

    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            stopPolling();
        } else {
            loadProducts();
            startPolling();
        }
    });
});
