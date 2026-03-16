/**
 * My Chat — Main Application
 * Romantic WhatsApp Chat Viewer
 */

(function () {
    'use strict';

    // ===== Name Mapping =====
    const NAME_MAP = {
        'Mm': 'محمد',
        'Om Zakaria': 'بطوط'
    };

    // ===== Display Cutoff =====
    // Messages after this date will NOT be shown (set to null to show all)
    const CUTOFF_DATE = new Date(2020, 1, 20); // 20 February 2020

    // ===== State =====
    let chatData = null;
    let stats = null;
    let currentPage = 'dedication';
    let searchResults = [];
    let searchIndex = -1;
    let renderedCount = 0;
    let filteredMessages = []; // messages after year filter
    let activeYearFilter = 'all';
    let favorites = JSON.parse(localStorage.getItem('chat_favorites') || '[]');
    const BATCH_SIZE = 80;
    const SEARCH_DEBOUNCE = 300;

    // ===== DOM Elements =====
    const $ = id => document.getElementById(id);
    const pages = {
        dedication: $('page-dedication'),
        welcome: $('page-welcome'),
        chat: $('page-chat'),
        favorites: $('page-favorites'),
        stats: $('page-stats'),
        onthisday: $('page-onthisday'),
        timeline: $('page-timeline')
    };

    // ===== Initialization =====
    function init() {
        createStars();
        createFloatingHearts();
        setupNavigation();
        setupBookmark();
        setupThemePicker();
        setupLockScreen();
        setupRandomMemory();
        setupGoToMessage();
    }

    // ===== Lock Screen =====
    function setupLockScreen() {
        const PASSWORD = '1997';
        const lockScreen = $('lock-screen');
        const lockInput = $('lock-input');
        const lockBtn = $('lock-btn');
        const lockError = $('lock-error');

        function tryUnlock() {
            if (lockInput.value === PASSWORD) {
                lockError.classList.add('hidden');
                lockScreen.classList.add('unlocked');
                setTimeout(() => {
                    lockScreen.classList.add('hidden');
                    runIntro();
                    loadChat();
                }, 800);
            } else {
                lockError.classList.remove('hidden');
                lockInput.classList.add('shake');
                lockInput.value = '';
                setTimeout(() => lockInput.classList.remove('shake'), 400);
            }
        }

        lockBtn.addEventListener('click', tryUnlock);
        lockInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') tryUnlock();
        });

        // Auto-focus
        setTimeout(() => lockInput.focus(), 500);
    }

    // ===== Cinematic Intro =====
    function runIntro() {
        const overlay = $('intro-overlay');
        const particlesContainer = $('intro-particles');

        // Create floating particles
        const emojis = ['💕', '💗', '💖', '❤️', '✨', '💫', '🌹', '💐', '🦋', '🌸'];
        for (let i = 0; i < 25; i++) {
            const p = document.createElement('span');
            p.className = 'intro-particle';
            p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            p.style.left = Math.random() * 100 + '%';
            p.style.animationDelay = (Math.random() * 3) + 's';
            p.style.animationDuration = (3 + Math.random() * 3) + 's';
            particlesContainer.appendChild(p);
        }

        // After 4 seconds, fade out intro and show dedication
        setTimeout(() => {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                overlay.classList.add('hidden');
                navigateTo('dedication');
            }, 1000);
        }, 4000);
    }

    // ===== Stars Background =====
    function createStars() {
        const container = $('stars-bg');
        const count = window.innerWidth < 768 ? 60 : 120;

        for (let i = 0; i < count; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.setProperty('--duration', (3 + Math.random() * 5) + 's');
            star.style.setProperty('--max-opacity', (0.3 + Math.random() * 0.7).toString());
            star.style.animationDelay = Math.random() * 5 + 's';
            if (Math.random() > 0.8) {
                star.style.width = '3px';
                star.style.height = '3px';
                star.style.boxShadow = '0 0 6px rgba(255,255,255,0.3)';
            }
            container.appendChild(star);
        }
    }

    // ===== Floating Hearts =====
    function createFloatingHearts() {
        const container = $('floating-hearts');
        const hearts = ['💕', '💗', '💖', '💝', '✨', '💫', '🌸', '💐', '🦋'];
        const count = window.innerWidth < 768 ? 10 : 18;

        for (let i = 0; i < count; i++) {
            const heart = document.createElement('span');
            heart.className = 'floating-heart';
            heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
            heart.style.setProperty('--x', Math.random() * 100 + '%');
            heart.style.setProperty('--size', (0.8 + Math.random() * 1.5) + 'rem');
            heart.style.setProperty('--duration', (8 + Math.random() * 15) + 's');
            heart.style.setProperty('--delay', Math.random() * 10 + 's');
            container.appendChild(heart);
        }
    }

    // ===== Navigation =====
    function setupNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                navigateTo(page);
            });
        });

        $('btn-start').addEventListener('click', () => {
            navigateTo('chat');
        });

        $('btn-dedication-next').addEventListener('click', () => {
            navigateTo('welcome');
        });
    }

    function navigateTo(pageName) {
        // Hide current
        Object.values(pages).forEach(p => { if (p) p.classList.remove('active'); });

        // Update navbar
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const navLink = document.querySelector(`[data-page="${pageName}"]`);
        if (navLink) navLink.classList.add('active');

        // Show target
        if (pages[pageName]) pages[pageName].classList.add('active');
        currentPage = pageName;

        // Show/hide navbar & theme picker
        const navbar = $('navbar');
        const themePicker = $('theme-picker');
        if (pageName === 'welcome' || pageName === 'dedication') {
            navbar.classList.add('hidden');
            themePicker.style.display = 'none';
        } else {
            navbar.classList.remove('hidden');
            themePicker.style.display = 'flex';
        }

        // Render page content if needed
        if (pageName === 'chat' && renderedCount === 0 && chatData) {
            renderChatMessages();
            checkForBookmark();
        }
        if (pageName === 'favorites' && chatData) {
            renderFavorites();
        }
        if (pageName === 'stats' && chatData) {
            renderStats();
        }
        if (pageName === 'onthisday' && chatData) {
            renderOnThisDay();
        }
        if (pageName === 'timeline' && chatData) {
            renderTimeline();
        }

        // Scroll to top
        window.scrollTo(0, 0);
        if (pageName === 'chat') {
            $('chat-messages').scrollTop = 0;
        }
    }

    // ===== Load Chat =====
    async function loadChat() {
        try {
            const response = await fetch('chat.txt');
            if (!response.ok) {
                showNoChatFile();
                return;
            }
            const text = await response.text();
            if (!text.trim()) {
                showNoChatFile();
                return;
            }

            chatData = ChatParser.parse(text);

            // Apply name mapping
            chatData.messages.forEach(m => {
                if (NAME_MAP[m.sender]) {
                    m.sender = NAME_MAP[m.sender];
                }
            });
            chatData.senders.sender1 = NAME_MAP[chatData.senders.sender1] || chatData.senders.sender1;
            chatData.senders.sender2 = NAME_MAP[chatData.senders.sender2] || chatData.senders.sender2;

            // Apply cutoff date filter
            if (CUTOFF_DATE) {
                chatData.messages = chatData.messages.filter(m => {
                    try {
                        const d = ChatParser.parseDate(m.date);
                        return d <= CUTOFF_DATE;
                    } catch (e) { return true; }
                });
            }

            stats = ChatParser.calculateStats(chatData.messages, chatData.senders);

            // Update welcome stats preview
            renderWelcomePreview();

        } catch (e) {
            console.error('Error loading chat:', e);
            showNoChatFile();
        }
    }

    function showNoChatFile() {
        const preview = $('welcome-stats-preview');
        preview.innerHTML = `
            <div style="text-align:center; color: var(--text-muted); padding: 20px;">
                <p style="font-size: 1.2rem; margin-bottom: 10px;">📂 لم يتم العثور على ملف المحادثة</p>
                <p style="font-size: 0.9rem;">ضع ملف <code style="background:var(--glass-bg);padding:2px 8px;border-radius:5px;">chat.txt</code> في مجلد المشروع</p>
            </div>
        `;
    }

    // ===== Welcome Preview =====
    function renderWelcomePreview() {
        if (!stats) return;
        const preview = $('welcome-stats-preview');
        preview.innerHTML = `
            <div class="stat-preview-item">
                <span class="stat-preview-number">${ChatParser.formatNumber(stats.totalMessages)}</span>
                <span class="stat-preview-label">رسالة</span>
            </div>
            <div class="stat-preview-item">
                <span class="stat-preview-number">${ChatParser.formatNumber(stats.totalDays)}</span>
                <span class="stat-preview-label">يوم معاً</span>
            </div>
            <div class="stat-preview-item">
                <span class="stat-preview-number">${ChatParser.formatNumber(stats.totalWords)}</span>
                <span class="stat-preview-label">كلمة</span>
            </div>
        `;

        // Render love counter
        renderLoveCounter();

        // Render first message
        renderFirstMessage();
    }

    // ===== Love Counter =====
    function renderLoveCounter() {
        if (!chatData || chatData.messages.length === 0) return;
        const container = $('love-counter');

        // Get first message date
        const firstMsg = chatData.messages[0];
        let firstDate;
        try { firstDate = ChatParser.parseDate(firstMsg.date); }
        catch (e) { return; }

        const now = new Date();
        let years = now.getFullYear() - firstDate.getFullYear();
        let months = now.getMonth() - firstDate.getMonth();
        let days = now.getDate() - firstDate.getDate();

        if (days < 0) { months--; days += 30; }
        if (months < 0) { years--; months += 12; }

        let parts = [];
        if (years > 0) parts.push(`<span>${years}</span> سنة`);
        if (months > 0) parts.push(`<span>${months}</span> شهر`);
        if (days > 0) parts.push(`<span>${days}</span> يوم`);

        container.innerHTML = `
            <div class="love-counter-label">💕 معاً منذ</div>
            <div class="love-counter-value">${parts.join(' و ')}</div>
        `;
    }

    // ===== First Message =====
    function renderFirstMessage() {
        if (!chatData || chatData.messages.length === 0) return;
        const container = $('first-message-box');

        // Find first non-system message
        const firstMsg = chatData.messages.find(m => !m.isSystem && m.text.trim().length > 0);
        if (!firstMsg) return;

        container.innerHTML = `
            <div class="first-msg-label">💬 أول رسالة بينكم</div>
            <div class="first-msg-text">"${escapeHtml(firstMsg.text)}"</div>
            <div class="first-msg-meta">${escapeHtml(firstMsg.sender)} — ${formatDateArabic(firstMsg.date)} ${firstMsg.time}</div>
        `;
    }

    // ===== Random Memory =====
    function setupRandomMemory() {
        $('btn-random-memory').addEventListener('click', showRandomMemory);
    }

    function showRandomMemory() {
        if (!chatData || chatData.messages.length === 0) return;

        // Filter non-system messages with actual text
        const validMessages = chatData.messages.filter(m => !m.isSystem && m.text.trim().length > 3);
        if (validMessages.length === 0) return;

        const msg = validMessages[Math.floor(Math.random() * validMessages.length)];
        const senderClass = msg.sender === chatData.senders.sender1 ? 's1' : 's2';
        const icons = ['💕', '✨', '🌹', '💫', '🦋', '💗', '🌸'];
        const icon = icons[Math.floor(Math.random() * icons.length)];

        // Remove existing modal if any
        const existing = document.querySelector('.random-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.className = 'random-modal';
        modal.innerHTML = `
            <div class="random-modal-card">
                <div class="random-modal-icon">${icon}</div>
                <div class="random-modal-sender ${senderClass}">${escapeHtml(msg.sender)}</div>
                <div class="random-modal-text">"${escapeHtml(msg.text)}"</div>
                <div class="random-modal-date">${formatDateArabic(msg.date)} — ${msg.time}</div>
                <div class="random-modal-actions">
                    <button class="random-modal-btn primary" id="random-another">🎲 ذكرى ثانية</button>
                    <button class="random-modal-btn secondary" id="random-close">إغلاق</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#random-another').addEventListener('click', () => {
            modal.remove();
            showRandomMemory();
        });
        modal.querySelector('#random-close').addEventListener('click', () => {
            modal.remove();
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    // ===== Chat Messages =====
    function getAvailableYears() {
        if (!chatData) return [];
        const years = new Set();
        chatData.messages.forEach(m => {
            try {
                const d = ChatParser.parseDate(m.date);
                years.add(d.getFullYear());
            } catch (e) {}
        });
        return [...years].sort();
    }

    function applyYearFilter(year) {
        activeYearFilter = year;
        if (year === 'all') {
            filteredMessages = chatData.messages.map((msg, idx) => ({ msg, originalIndex: idx }));
        } else {
            filteredMessages = [];
            chatData.messages.forEach((msg, idx) => {
                try {
                    const d = ChatParser.parseDate(msg.date);
                    if (d.getFullYear() === year) {
                        filteredMessages.push({ msg, originalIndex: idx });
                    }
                } catch (e) {}
            });
        }
    }

    function renderYearFilter() {
        let filterEl = $('year-filter');
        if (!filterEl) {
            filterEl = document.createElement('div');
            filterEl.id = 'year-filter';
            filterEl.className = 'year-filter';
            const chatHeader = document.querySelector('.chat-header');
            chatHeader.appendChild(filterEl);
        }

        const years = getAvailableYears();
        let html = `<button class="year-btn ${activeYearFilter === 'all' ? 'active' : ''}" data-year="all">الكل</button>`;
        years.forEach(y => {
            html += `<button class="year-btn ${activeYearFilter === y ? 'active' : ''}" data-year="${y}">${y}</button>`;
        });
        filterEl.innerHTML = html;

        filterEl.querySelectorAll('.year-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const year = btn.dataset.year === 'all' ? 'all' : parseInt(btn.dataset.year);
                applyYearFilter(year);
                // Update active button
                filterEl.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                // Re-render chat
                const container = $('chat-messages');
                container.innerHTML = '';
                renderedCount = 0;
                renderBatch();
                container.scrollTop = 0;
            });
        });
    }

    function renderChatMessages() {
        applyYearFilter('all');
        // Year filter buttons hidden — cutoff date controls display

        const container = $('chat-messages');
        container.innerHTML = '';
        renderedCount = 0;
        renderBatch();
        
        // Infinite scroll
        container.addEventListener('scroll', () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            if (scrollTop + clientHeight >= scrollHeight - 200) {
                renderBatch();
            }
        });
    }

    function renderBatch() {
        if (!filteredMessages || renderedCount >= filteredMessages.length) return;

        const container = $('chat-messages');
        const fragment = document.createDocumentFragment();
        const end = Math.min(renderedCount + BATCH_SIZE, filteredMessages.length);
        let lastDate = renderedCount > 0 ? filteredMessages[renderedCount - 1].msg.date : null;

        for (let i = renderedCount; i < end; i++) {
            const { msg, originalIndex } = filteredMessages[i];

            // Date separator
            if (msg.date !== lastDate) {
                const sep = document.createElement('div');
                sep.className = 'date-separator';
                const formattedDate = formatDateArabic(msg.date);
                sep.innerHTML = `<span class="date-separator-text">${formattedDate}</span>`;
                fragment.appendChild(sep);
                lastDate = msg.date;
            }

            // Message bubble
            const bubble = document.createElement('div');
            bubble.className = `message-bubble ${msg.isSystem ? 'system-msg' : msg.senderClass}`;
            bubble.dataset.index = originalIndex;

            if (msg.isSystem) {
                bubble.textContent = msg.text;
            } else {
                const isFav = favorites.includes(originalIndex);
                bubble.innerHTML = `
                    <button class="fav-btn ${isFav ? 'active' : ''}" data-fav-index="${originalIndex}" title="أضف للمفضلة">❤️</button>
                    <span class="message-sender">${escapeHtml(msg.sender)}</span>
                    <span class="message-text">${escapeHtml(msg.text)}</span>
                    <span class="message-time">${msg.time}</span>
                `;
            }

            // Staggered animation delay
            const delayIndex = i - renderedCount;
            if (delayIndex < 15) {
                bubble.style.animationDelay = (delayIndex * 0.03) + 's';
            } else {
                bubble.style.animationDelay = '0s';
            }

            fragment.appendChild(bubble);
        }

        container.appendChild(fragment);
        renderedCount = end;

        // Attach favorite listeners for new batch
        container.querySelectorAll('.fav-btn:not([data-bound])').forEach(btn => {
            btn.dataset.bound = '1';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.favIndex);
                toggleFavorite(idx, btn);
            });
        });
    }

    function formatDateArabic(dateStr) {
        try {
            const date = ChatParser.parseDate(dateStr);
            const day = date.getDate();
            const month = ChatParser.getArabicMonth(date.getMonth());
            const year = date.getFullYear();
            return `${day} ${month} ${year}`;
        } catch {
            return dateStr;
        }
    }

    // ===== Favorites =====
    function toggleFavorite(msgIndex, btn) {
        const idx = favorites.indexOf(msgIndex);
        if (idx > -1) {
            favorites.splice(idx, 1);
            btn.classList.remove('active');
        } else {
            favorites.push(msgIndex);
            btn.classList.add('active');
        }
        localStorage.setItem('chat_favorites', JSON.stringify(favorites));
    }

    function renderFavorites() {
        const container = $('fav-content');
        if (!chatData || favorites.length === 0) {
            container.innerHTML = `
                <div class="fav-empty">
                    <span class="fav-empty-icon">💔</span>
                    لم تضف أي رسائل للمفضلة بعد<br>
                    <small style="color:var(--text-muted)">اضغط ❤️ على أي رسالة في المحادثة لإضافتها</small>
                </div>
            `;
            return;
        }

        let html = '';
        const sortedFavs = [...favorites].sort((a, b) => a - b);
        
        sortedFavs.forEach(idx => {
            if (idx >= chatData.messages.length) return;
            const msg = chatData.messages[idx];
            if (msg.isSystem) return;
            
            const senderClass = msg.sender === chatData.senders.sender1 ? 's1' : 's2';
            html += `
                <div class="otd-message" style="animation-delay: ${Math.random() * 0.3}s">
                    <div class="otd-message-sender ${senderClass}">${escapeHtml(msg.sender)}</div>
                    <div class="otd-message-text">${escapeHtml(msg.text)}</div>
                    <div class="otd-message-time">${formatDateArabic(msg.date)} — ${msg.time}</div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // ===== On This Day =====
    function renderOnThisDay() {
        const container = $('otd-content');
        if (!chatData) return;

        const today = new Date();
        const todayDay = today.getDate();
        const todayMonth = today.getMonth();

        // Find messages from the same day and month in previous years
        const yearGroups = {};

        chatData.messages.forEach((msg, idx) => {
            const d = ChatParser.parseDate(msg.date);
            if (d.getDate() === todayDay && d.getMonth() === todayMonth) {
                const year = d.getFullYear();
                if (!yearGroups[year]) yearGroups[year] = [];
                yearGroups[year].push({ msg, idx });
            }
        });

        const years = Object.keys(yearGroups).sort((a, b) => b - a);

        if (years.length === 0) {
            container.innerHTML = `
                <div class="otd-empty">
                    <span class="otd-empty-icon">📭</span>
                    لا توجد رسائل في مثل هذا اليوم (${todayDay} ${ChatParser.getArabicMonth(todayMonth)})<br>
                    <small style="color:var(--text-muted)">جرب العودة في يوم آخر لاكتشاف ذكريات جديدة</small>
                </div>
            `;
            return;
        }

        let html = '';
        years.forEach(year => {
            const msgs = yearGroups[year];
            html += `<div class="otd-year-section">`;
            html += `<div class="otd-year-label">📅 ${year}</div>`;
            
            // Show up to 20 messages per year
            msgs.slice(0, 20).forEach(({ msg }) => {
                const senderClass = msg.sender === chatData.senders.sender1 ? 's1' : 's2';
                if (!msg.isSystem) {
                    html += `
                        <div class="otd-message">
                            <div class="otd-message-sender ${senderClass}">${escapeHtml(msg.sender)}</div>
                            <div class="otd-message-text">${escapeHtml(msg.text)}</div>
                            <div class="otd-message-time">${msg.time}</div>
                        </div>
                    `;
                }
            });

            if (msgs.length > 20) {
                html += `<div style="text-align:center;color:var(--text-muted);padding:10px;">... و ${msgs.length - 20} رسالة أخرى</div>`;
            }
            html += `</div>`;
        });

        container.innerHTML = html;
    }


    // ===== Auto-Save Bookmark =====
    function setupBookmark() {
        const banner = $('bookmark-banner');
        const goBtn = $('bookmark-go');
        const dismissBtn = $('bookmark-dismiss');

        goBtn.addEventListener('click', () => {
            goToBookmark();
            banner.classList.add('hidden');
        });

        dismissBtn.addEventListener('click', () => {
            banner.classList.add('hidden');
        });

        // Auto-save position on scroll (debounced)
        let saveTimer;
        const container = $('chat-messages');
        container.addEventListener('scroll', () => {
            clearTimeout(saveTimer);
            saveTimer = setTimeout(() => {
                autoSavePosition();
            }, 500);
        });

        // Auto-save on page leave
        window.addEventListener('beforeunload', autoSavePosition);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                autoSavePosition();
            }
        });
    }

    function autoSavePosition() {
        const container = $('chat-messages');
        if (!container || !filteredMessages || filteredMessages.length === 0) return;

        const bubbles = container.querySelectorAll('.message-bubble');
        if (bubbles.length === 0) return;

        let closestIndex = 0;
        const containerRect = container.getBoundingClientRect();
        const centerY = containerRect.top + containerRect.height / 2;

        for (const bubble of bubbles) {
            const rect = bubble.getBoundingClientRect();
            if (rect.top <= centerY && rect.bottom >= centerY - 50) {
                closestIndex = parseInt(bubble.dataset.index) || 0;
            }
        }

        if (closestIndex > 0) {
            localStorage.setItem('chat_bookmark', closestIndex.toString());
        }
    }

    function checkForBookmark() {
        const saved = localStorage.getItem('chat_bookmark');
        if (saved !== null && parseInt(saved) > 0 && chatData) {
            $('bookmark-banner').classList.remove('hidden');
        }
    }

    function goToBookmark() {
        const saved = localStorage.getItem('chat_bookmark');
        if (saved === null || !chatData) return;
        const msgIndex = parseInt(saved);
        while (renderedCount <= msgIndex + 10 && renderedCount < chatData.messages.length) {
            renderBatch();
        }
        insertBookmarkMarker(msgIndex);
        setTimeout(() => {
            const marker = document.querySelector('.bookmark-marker');
            if (marker) marker.scrollIntoView({ behavior: 'smooth', block: 'center' });
            else {
                const bubble = document.querySelector(`[data-index="${msgIndex}"]`);
                if (bubble) bubble.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }

    function insertBookmarkMarker(msgIndex) {
        document.querySelectorAll('.bookmark-marker').forEach(m => m.remove());
        const bubble = document.querySelector(`[data-index="${msgIndex}"]`);
        if (bubble) {
            const marker = document.createElement('div');
            marker.className = 'bookmark-marker';
            marker.innerHTML = '<span class="bookmark-marker-text">📌 وقفت هنا</span>';
            bubble.parentNode.insertBefore(marker, bubble);
        }
    }

    // ===== Theme Picker =====
    function setupThemePicker() {
        const savedTheme = localStorage.getItem('chat_theme') || 'pink';
        applyTheme(savedTheme);

        document.querySelectorAll('.theme-dot').forEach(dot => {
            if (dot.dataset.theme === savedTheme) dot.classList.add('active');
            else dot.classList.remove('active');

            dot.addEventListener('click', () => {
                document.querySelectorAll('.theme-dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
                const theme = dot.dataset.theme;
                applyTheme(theme);
                localStorage.setItem('chat_theme', theme);
            });
        });
    }

    function applyTheme(theme) {
        document.body.classList.remove('theme-ocean', 'theme-gold', 'theme-rose');
        if (theme !== 'pink') {
            document.body.classList.add(`theme-${theme}`);
        }
    }

    // ===== Stats Page =====
    function renderStats() {
        if (!stats) return;
        const container = $('stats-content');
        if (container.children.length > 0) return;

        const s = stats;
        const topWords = ChatParser.getTopWords(s.wordFrequency, 20);
        const topEmojis = ChatParser.getTopEmojis(s.emojiFrequency, 12);
        
        const peakHour = s.hourlyDistribution.indexOf(Math.max(...s.hourlyDistribution));
        const peakHourFormatted = peakHour > 12 ? `${peakHour - 12} مساءً` : peakHour === 0 ? '12 صباحاً' : `${peakHour} صباحاً`;

        const sender1Pct = Math.round((s.sender1Count / s.totalMessages) * 100);
        const sender2Pct = 100 - sender1Pct;

        // Find most active month
        let mostActiveMonth = { key: '', total: 0 };
        Object.entries(s.monthlyMessages).forEach(([key, data]) => {
            if (data.total > mostActiveMonth.total) {
                mostActiveMonth = { key, total: data.total };
            }
        });
        let mostActiveMonthLabel = '';
        if (mostActiveMonth.key) {
            const [y, m] = mostActiveMonth.key.split('-');
            mostActiveMonthLabel = `${ChatParser.getArabicMonth(parseInt(m) - 1)} ${y}`;
        }

        // Happy/love emoji count
        const loveEmojis = ['❤️', '💕', '💗', '💖', '💝', '😍', '🥰', '😘', '💋', '💕'];
        let loveCount = 0;
        loveEmojis.forEach(e => { loveCount += (s.emojiFrequency[e] || 0); });

        let html = '';

        html += createStatCard('💬', 'إجمالي الرسائل', ChatParser.formatNumber(s.totalMessages), '', 0);
        html += createStatCard('📅', 'أيام معاً', ChatParser.formatNumber(s.totalDays), `${ChatParser.formatNumber(s.avgMessagesPerDay)} رسالة/يوم`, 1);
        html += createStatCard('📝', 'إجمالي الكلمات', ChatParser.formatNumber(s.totalWords), '', 2);

        // Messages Distribution
        html += `
            <div class="stat-card stat-card-full" style="animation-delay: 0.3s;">
                <span class="stat-card-icon">📊</span>
                <span class="stat-card-label">توزيع الرسائل</span>
                <div class="stat-bar-chart">
                    <div class="stat-bar-row">
                        <span class="stat-bar-label">${escapeHtml(s.sender1Name)}</span>
                        <div class="stat-bar-track">
                            <div class="stat-bar-fill pink" style="width: ${sender1Pct}%">
                                <span class="stat-bar-value">${ChatParser.formatNumber(s.sender1Count)} (${sender1Pct}%)</span>
                            </div>
                        </div>
                    </div>
                    <div class="stat-bar-row">
                        <span class="stat-bar-label">${escapeHtml(s.sender2Name)}</span>
                        <div class="stat-bar-track">
                            <div class="stat-bar-fill purple" style="width: ${sender2Pct}%">
                                <span class="stat-bar-value">${ChatParser.formatNumber(s.sender2Count)} (${sender2Pct}%)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // New deeper stats
        html += createStatCard('🔥', 'أكثر يوم نشاطاً', formatDateArabic(s.busiestDay.date), `${ChatParser.formatNumber(s.busiestDay.count)} رسالة`, 4);
        html += createStatCard('⏰', 'ساعة الذروة', peakHourFormatted, `${ChatParser.formatNumber(s.hourlyDistribution[peakHour])} رسالة`, 5);
        html += createStatCard('📜', 'أطول رسالة', `${ChatParser.formatNumber(s.longestMessage.length)} حرف`, `بواسطة ${escapeHtml(s.longestMessage.sender)}`, 6);
        
        // Most active month
        if (mostActiveMonthLabel) {
            html += createStatCard('📆', 'أكثر شهر نشاطاً', mostActiveMonthLabel, `${ChatParser.formatNumber(mostActiveMonth.total)} رسالة`, 7);
        }
        
        // Love emojis count
        html += createStatCard('💕', 'إيموجي الحب', ChatParser.formatNumber(loveCount), 'قلب وحبّ أرسلتموهم', 8);

        // Hourly Distribution
        const maxHourly = Math.max(...s.hourlyDistribution);
        let hourlyBarsHtml = '<div class="stat-bar-chart">';
        [0, 3, 6, 9, 12, 15, 18, 21].forEach(h => {
            const pct = maxHourly > 0 ? (s.hourlyDistribution[h] / maxHourly) * 100 : 0;
            const label = h > 12 ? `${h - 12} م` : h === 0 ? '12 ص' : `${h} ص`;
            hourlyBarsHtml += `
                <div class="stat-bar-row">
                    <span class="stat-bar-label">${label}</span>
                    <div class="stat-bar-track">
                        <div class="stat-bar-fill gold" style="width: ${pct}%">
                            <span class="stat-bar-value">${ChatParser.formatNumber(s.hourlyDistribution[h])}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        hourlyBarsHtml += '</div>';

        html += `
            <div class="stat-card stat-card-full" style="animation-delay: 0.9s;">
                <span class="stat-card-icon">🕐</span>
                <span class="stat-card-label">التوزيع على مدار اليوم</span>
                ${hourlyBarsHtml}
            </div>
        `;

        // Top Emojis
        if (topEmojis.length > 0) {
            let emojisHtml = '<div class="emoji-grid">';
            topEmojis.forEach(({ emoji, count }) => {
                emojisHtml += `
                    <div class="emoji-item">
                        <span class="emoji-char">${emoji}</span>
                        <span class="emoji-count">${ChatParser.formatNumber(count)}</span>
                    </div>
                `;
            });
            emojisHtml += '</div>';

            html += `
                <div class="stat-card stat-card-full" style="animation-delay: 1s;">
                    <span class="stat-card-icon">😍</span>
                    <span class="stat-card-label">أكثر الإيموجي استخداماً</span>
                    ${emojisHtml}
                </div>
            `;
        }

        // Top Words
        if (topWords.length > 0) {
            let wordsHtml = '<div class="word-cloud">';
            const maxWordCount = topWords[0].count;
            topWords.forEach(({ word, count }) => {
                const sizeRatio = 0.7 + (count / maxWordCount) * 0.8;
                wordsHtml += `<span class="word-tag" style="--word-size: ${sizeRatio}rem">${escapeHtml(word)} <small style="opacity:0.5">(${count})</small></span>`;
            });
            wordsHtml += '</div>';

            html += `
                <div class="stat-card stat-card-full" style="animation-delay: 1.1s;">
                    <span class="stat-card-icon">💬</span>
                    <span class="stat-card-label">أكثر الكلمات استخداماً</span>
                    ${wordsHtml}
                </div>
            `;
        }

        // Words comparison
        html += `
            <div class="stat-card stat-card-full" style="animation-delay: 1.2s;">
                <span class="stat-card-icon">✍️</span>
                <span class="stat-card-label">مقارنة الكلمات</span>
                <div class="comparison-row">
                    <div class="comparison-person">
                        <div class="comparison-name">${escapeHtml(s.sender1Name)}</div>
                        <div class="comparison-value">${ChatParser.formatNumber(s.sender1Words)}</div>
                    </div>
                    <div class="comparison-vs">VS</div>
                    <div class="comparison-person">
                        <div class="comparison-name">${escapeHtml(s.sender2Name)}</div>
                        <div class="comparison-value">${ChatParser.formatNumber(s.sender2Words)}</div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Animate bars
        requestAnimationFrame(() => {
            container.querySelectorAll('.stat-bar-fill').forEach(bar => {
                const width = bar.style.width;
                bar.style.width = '0%';
                requestAnimationFrame(() => { bar.style.width = width; });
            });
        });
    }

    function createStatCard(icon, label, value, sub, delay) {
        return `
            <div class="stat-card" style="animation-delay: ${delay * 0.1}s;">
                <span class="stat-card-icon">${icon}</span>
                <span class="stat-card-label">${label}</span>
                <span class="stat-card-value">${value}</span>
                ${sub ? `<span class="stat-card-sub">${sub}</span>` : ''}
            </div>
        `;
    }

    // ===== Timeline Page =====
    function renderTimeline() {
        if (!chatData) return;
        const container = $('timeline-content');
        if (container.children.length > 0) return;

        const timeline = ChatParser.getTimeline(chatData.messages, chatData.senders);
        let html = '';
        let lastYear = null;

        timeline.forEach((period, index) => {
            if (period.year !== lastYear) {
                html += `<div class="timeline-year-label"><span>${period.year}</span></div>`;
                lastYear = period.year;
            }

            const monthName = ChatParser.getArabicMonth(period.month);
            const sender1Pct = period.total > 0 ? Math.round((period.sender1 / period.total) * 100) : 0;
            const sender2Pct = 100 - sender1Pct;

            html += `
                <div class="timeline-item" style="animation-delay: ${index * 0.08}s;" data-month-key="${period.key}">
                    <div class="timeline-dot"></div>
                    <div class="timeline-card" onclick="window.goToMonth('${period.key}')">
                        <div class="timeline-period">${monthName} ${period.year}</div>
                        <div class="timeline-info">
                            <div class="timeline-stat">
                                <span class="timeline-stat-icon">💬</span>
                                <span class="timeline-stat-value">${ChatParser.formatNumber(period.total)}</span>
                                <span>رسالة</span>
                            </div>
                            <div class="timeline-stat">
                                <span class="timeline-stat-icon">📅</span>
                                <span class="timeline-stat-value">${period.daysActive}</span>
                                <span>يوم نشط</span>
                            </div>
                        </div>
                        <div class="timeline-mini-bar">
                            <div class="timeline-mini-fill-1" style="width: ${sender1Pct}%"></div>
                            <div class="timeline-mini-fill-2" style="width: ${sender2Pct}%"></div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        requestAnimationFrame(() => {
            container.querySelectorAll('.timeline-mini-fill-1, .timeline-mini-fill-2').forEach(bar => {
                const width = bar.style.width;
                bar.style.width = '0%';
                requestAnimationFrame(() => { bar.style.width = width; });
            });
        });
    }

    window.goToMonth = function (monthKey) {
        if (!chatData) return;
        navigateTo('chat');

        while (renderedCount < chatData.messages.length) {
            renderBatch();
        }

        const [year, month] = monthKey.split('-').map(Number);
        const msgIndex = chatData.messages.findIndex(m => {
            const d = ChatParser.parseDate(m.date);
            return d.getFullYear() === year && d.getMonth() === month - 1;
        });

        if (msgIndex >= 0) {
            setTimeout(() => {
                const bubble = document.querySelector(`[data-index="${msgIndex}"]`);
                if (bubble) {
                    bubble.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    bubble.style.boxShadow = '0 0 30px rgba(255, 107, 157, 0.5)';
                    setTimeout(() => { bubble.style.boxShadow = ''; }, 2000);
                }
            }, 100);
        }
    };

    // ===== Go To Message by # =====
    function setupGoToMessage() {
        const input = $('goto-msg-input');
        const btn = $('goto-msg-btn');
        const errorEl = $('goto-msg-error');
        let isJumping = false;

        function goToMessage() {
            if (!chatData || chatData.messages.length === 0 || isJumping) return;

            const val = parseInt(input.value);
            if (!val || val < 1) {
                showGoToError('ادخل رقم رسالة صحيح');
                return;
            }

            const msgIndex = val - 1;
            if (msgIndex >= chatData.messages.length) {
                showGoToError(`أقصى رقم هو ${chatData.messages.length}`);
                return;
            }

            errorEl.classList.add('hidden');
            isJumping = true;
            btn.textContent = '⏳';

            // Make sure we're on chat page
            if (currentPage !== 'chat') {
                navigateTo('chat');
            }

            // If year filter is active, reset to 'all'
            if (activeYearFilter !== 'all') {
                applyYearFilter('all');
                const container = $('chat-messages');
                container.innerHTML = '';
                renderedCount = 0;
            }

            const container = $('chat-messages');

            // Render in async chunks to avoid freezing the browser
            function renderChunked() {
                const alreadyRendered = container.querySelector(`[data-index="${msgIndex}"]`);
                if (alreadyRendered) {
                    finishJump(alreadyRendered);
                    return;
                }

                if (renderedCount < filteredMessages.length) {
                    // Render a few batches per frame
                    for (let i = 0; i < 3 && renderedCount <= msgIndex + BATCH_SIZE && renderedCount < filteredMessages.length; i++) {
                        renderBatch();
                    }
                    requestAnimationFrame(renderChunked);
                } else {
                    showGoToError('الرسالة مش موجودة');
                    isJumping = false;
                    btn.textContent = '🚀';
                }
            }

            function finishJump(bubble) {
                // Add temporary number badge only on this message
                const badge = document.createElement('span');
                badge.className = 'msg-number-badge';
                badge.textContent = '#' + (msgIndex + 1);
                bubble.prepend(badge);

                bubble.scrollIntoView({ behavior: 'smooth', block: 'center' });
                bubble.classList.add('goto-highlight');
                setTimeout(() => {
                    bubble.classList.remove('goto-highlight');
                    badge.remove();
                }, 3000);
                isJumping = false;
                btn.textContent = '🚀';
            }

            requestAnimationFrame(renderChunked);
            input.value = '';
        }

        function showGoToError(msg) {
            errorEl.textContent = msg;
            errorEl.classList.remove('hidden');
            input.classList.add('shake');
            setTimeout(() => {
                input.classList.remove('shake');
            }, 400);
            setTimeout(() => {
                errorEl.classList.add('hidden');
            }, 3000);
        }

        btn.addEventListener('click', goToMessage);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') goToMessage();
        });
    }

    // ===== Utilities =====
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // ===== Start =====
    document.addEventListener('DOMContentLoaded', init);
})();
