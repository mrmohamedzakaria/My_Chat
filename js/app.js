/**
 * My Chat — Main Application
 * Romantic WhatsApp Chat Viewer
 */

(function () {
    'use strict';

    // ===== Name Mapping =====
    // Replace WhatsApp contact names with display names
    const NAME_MAP = {
        'Mm': 'محمد',
        'Om Zakaria': 'بطوط'
    };

    // ===== State =====
    let chatData = null;
    let stats = null;
    let currentPage = 'welcome';
    let searchResults = [];
    let searchIndex = -1;
    let renderedCount = 0;
    const BATCH_SIZE = 80;
    const SEARCH_DEBOUNCE = 300;

    // ===== DOM Elements =====
    const $ = id => document.getElementById(id);
    const pages = {
        welcome: $('page-welcome'),
        chat: $('page-chat'),
        stats: $('page-stats'),
        timeline: $('page-timeline')
    };

    // ===== Initialization =====
    function init() {
        createStars();
        createFloatingHearts();
        setupNavigation();
        setupSearch();
        setupScrollButton();
        setupBookmark();
        loadChat();
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
    }

    function navigateTo(pageName) {
        // Hide current
        Object.values(pages).forEach(p => p.classList.remove('active'));

        // Update navbar
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const navLink = document.querySelector(`[data-page="${pageName}"]`);
        if (navLink) navLink.classList.add('active');

        // Show target
        pages[pageName].classList.add('active');
        currentPage = pageName;

        // Show/hide navbar
        const navbar = $('navbar');
        if (pageName === 'welcome') {
            navbar.classList.add('hidden');
        } else {
            navbar.classList.remove('hidden');
        }

        // Render page content if needed
        if (pageName === 'chat' && renderedCount === 0 && chatData) {
            renderChatMessages();
            checkForBookmark();
        }
        if (pageName === 'stats' && chatData) {
            renderStats();
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
            // Remap senders
            chatData.senders.sender1 = NAME_MAP[chatData.senders.sender1] || chatData.senders.sender1;
            chatData.senders.sender2 = NAME_MAP[chatData.senders.sender2] || chatData.senders.sender2;

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
    }

    // ===== Chat Messages =====
    function renderChatMessages() {
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
        if (!chatData || renderedCount >= chatData.messages.length) return;

        const container = $('chat-messages');
        const fragment = document.createDocumentFragment();
        const end = Math.min(renderedCount + BATCH_SIZE, chatData.messages.length);
        let lastDate = renderedCount > 0 ? chatData.messages[renderedCount - 1].date : null;

        for (let i = renderedCount; i < end; i++) {
            const msg = chatData.messages[i];

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
            bubble.dataset.index = i;

            if (msg.isSystem) {
                bubble.textContent = msg.text;
            } else {
                bubble.innerHTML = `
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

    // ===== Search =====
    function setupSearch() {
        const input = $('search-input');
        const clearBtn = $('search-clear');
        const countEl = $('search-count');
        const navEl = $('search-nav');
        let debounceTimer;

        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => performSearch(input.value), SEARCH_DEBOUNCE);
            clearBtn.classList.toggle('visible', input.value.length > 0);
        });

        clearBtn.addEventListener('click', () => {
            input.value = '';
            clearBtn.classList.remove('visible');
            clearSearch();
        });

        $('search-prev').addEventListener('click', () => navigateSearch(-1));
        $('search-next').addEventListener('click', () => navigateSearch(1));
    }

    function performSearch(query) {
        clearSearchHighlights();
        const countEl = $('search-count');
        const navEl = $('search-nav');

        if (!query || query.length < 2 || !chatData) {
            countEl.textContent = '';
            navEl.classList.remove('visible');
            searchResults = [];
            searchIndex = -1;
            return;
        }

        // Make sure all messages are rendered for search
        while (renderedCount < chatData.messages.length) {
            renderBatch();
        }

        searchResults = [];
        searchIndex = -1;

        const bubbles = document.querySelectorAll('.message-bubble .message-text');
        const lowerQuery = query.toLowerCase();

        bubbles.forEach((el, idx) => {
            const text = el.textContent.toLowerCase();
            if (text.includes(lowerQuery)) {
                searchResults.push(el);
                highlightText(el, query);
            }
        });

        if (searchResults.length > 0) {
            countEl.textContent = `${searchResults.length} نتيجة`;
            navEl.classList.add('visible');
            navigateSearch(1); // jump to first result
        } else {
            countEl.textContent = 'لا توجد نتائج';
            navEl.classList.remove('visible');
        }
    }

    function highlightText(el, query) {
        const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
        el.innerHTML = el.textContent.replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    function clearSearchHighlights() {
        document.querySelectorAll('.search-highlight').forEach(mark => {
            const parent = mark.parentNode;
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
        });
    }

    function clearSearch() {
        clearSearchHighlights();
        $('search-count').textContent = '';
        $('search-nav').classList.remove('visible');
        searchResults = [];
        searchIndex = -1;
    }

    function navigateSearch(direction) {
        if (searchResults.length === 0) return;

        // Remove previous active
        document.querySelectorAll('.active-highlight').forEach(el => {
            el.classList.remove('active-highlight');
        });

        searchIndex += direction;
        if (searchIndex >= searchResults.length) searchIndex = 0;
        if (searchIndex < 0) searchIndex = searchResults.length - 1;

        const target = searchResults[searchIndex];
        const mark = target.querySelector('.search-highlight');
        if (mark) {
            mark.classList.add('active-highlight');
            mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        $('search-count').textContent = `${searchIndex + 1} / ${searchResults.length}`;
    }

    // ===== Scroll Button =====
    function setupScrollButton() {
        const btn = $('scroll-bottom');
        const container = $('chat-messages');

        container.addEventListener('scroll', () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            btn.classList.toggle('visible', scrollTop < scrollHeight - clientHeight - 300);
        });

        btn.addEventListener('click', () => {
            // Render all messages first
            while (renderedCount < chatData.messages.length) {
                renderBatch();
            }
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        });
    }

    // ===== Bookmark =====
    function setupBookmark() {
        const bookmarkBtn = $('bookmark-btn');
        const banner = $('bookmark-banner');
        const goBtn = $('bookmark-go');
        const dismissBtn = $('bookmark-dismiss');
        const toast = $('bookmark-toast');

        // Save bookmark
        bookmarkBtn.addEventListener('click', () => {
            const container = $('chat-messages');
            // Find the message currently visible in the center of the viewport
            const bubbles = container.querySelectorAll('.message-bubble');
            let closestIndex = 0;
            const containerRect = container.getBoundingClientRect();
            const centerY = containerRect.top + containerRect.height / 2;

            for (const bubble of bubbles) {
                const rect = bubble.getBoundingClientRect();
                if (rect.top <= centerY && rect.bottom >= centerY - 50) {
                    closestIndex = parseInt(bubble.dataset.index) || 0;
                }
            }

            localStorage.setItem('chat_bookmark', closestIndex.toString());

            // Show toast
            toast.classList.remove('hidden');
            setTimeout(() => toast.classList.add('hidden'), 2500);

            // Insert visual marker
            insertBookmarkMarker(closestIndex);
        });

        // Go to bookmark
        goBtn.addEventListener('click', () => {
            goToBookmark();
            banner.classList.add('hidden');
        });

        // Dismiss banner
        dismissBtn.addEventListener('click', () => {
            banner.classList.add('hidden');
        });
    }

    function checkForBookmark() {
        const saved = localStorage.getItem('chat_bookmark');
        if (saved !== null && chatData) {
            const banner = $('bookmark-banner');
            banner.classList.remove('hidden');
        }
    }

    function goToBookmark() {
        const saved = localStorage.getItem('chat_bookmark');
        if (saved === null || !chatData) return;

        const msgIndex = parseInt(saved);
        
        // Ensure messages up to that point are rendered
        while (renderedCount <= msgIndex + 10 && renderedCount < chatData.messages.length) {
            renderBatch();
        }

        // Insert marker if not already there
        insertBookmarkMarker(msgIndex);

        setTimeout(() => {
            const marker = document.querySelector('.bookmark-marker');
            if (marker) {
                marker.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                const bubble = document.querySelector(`[data-index="${msgIndex}"]`);
                if (bubble) {
                    bubble.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }, 100);
    }

    function insertBookmarkMarker(msgIndex) {
        // Remove old markers
        document.querySelectorAll('.bookmark-marker').forEach(m => m.remove());

        const bubble = document.querySelector(`[data-index="${msgIndex}"]`);
        if (bubble) {
            const marker = document.createElement('div');
            marker.className = 'bookmark-marker';
            marker.innerHTML = '<span class="bookmark-marker-text">📌 وقفنا هنا</span>';
            bubble.parentNode.insertBefore(marker, bubble);
        }
    }

    // ===== Stats Page =====
    function renderStats() {
        if (!stats) return;
        const container = $('stats-content');
        if (container.children.length > 0) return; // Already rendered

        const s = stats;
        const topWords = ChatParser.getTopWords(s.wordFrequency, 20);
        const topEmojis = ChatParser.getTopEmojis(s.emojiFrequency, 12);
        
        // Find peak hour
        const peakHour = s.hourlyDistribution.indexOf(Math.max(...s.hourlyDistribution));
        const peakHourFormatted = peakHour > 12 ? `${peakHour - 12} مساءً` : peakHour === 0 ? '12 صباحاً' : `${peakHour} صباحاً`;

        const sender1Pct = Math.round((s.sender1Count / s.totalMessages) * 100);
        const sender2Pct = 100 - sender1Pct;

        let html = '';

        // Row 1: Total Messages + Days Together
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

        // Busiest Day
        html += createStatCard('🔥', 'أكثر يوم نشاطاً', formatDateArabic(s.busiestDay.date), `${ChatParser.formatNumber(s.busiestDay.count)} رسالة`, 4);
        
        // Peak Hour
        html += createStatCard('⏰', 'ساعة الذروة', peakHourFormatted, `${ChatParser.formatNumber(s.hourlyDistribution[peakHour])} رسالة`, 5);

        // Longest Message
        html += createStatCard('📜', 'أطول رسالة', `${ChatParser.formatNumber(s.longestMessage.length)} حرف`, `بواسطة ${escapeHtml(s.longestMessage.sender)}`, 6);

        // Hourly Distribution Chart
        const maxHourly = Math.max(...s.hourlyDistribution);
        let hourlyBarsHtml = '<div class="stat-bar-chart">';
        // Show selective hours for readability
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
            <div class="stat-card stat-card-full" style="animation-delay: 0.7s;">
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
                <div class="stat-card stat-card-full" style="animation-delay: 0.8s;">
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
                <div class="stat-card stat-card-full" style="animation-delay: 0.9s;">
                    <span class="stat-card-icon">💬</span>
                    <span class="stat-card-label">أكثر الكلمات استخداماً</span>
                    ${wordsHtml}
                </div>
            `;
        }

        // Words comparison
        html += `
            <div class="stat-card stat-card-full" style="animation-delay: 1s;">
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

        // Animate bars after render
        requestAnimationFrame(() => {
            container.querySelectorAll('.stat-bar-fill').forEach(bar => {
                const width = bar.style.width;
                bar.style.width = '0%';
                requestAnimationFrame(() => {
                    bar.style.width = width;
                });
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
        if (container.children.length > 0) return; // Already rendered

        const timeline = ChatParser.getTimeline(chatData.messages, chatData.senders);
        let html = '';
        let lastYear = null;

        timeline.forEach((period, index) => {
            // Year label
            if (period.year !== lastYear) {
                html += `
                    <div class="timeline-year-label">
                        <span>${period.year}</span>
                    </div>
                `;
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

        // Animate mini bars
        requestAnimationFrame(() => {
            container.querySelectorAll('.timeline-mini-fill-1, .timeline-mini-fill-2').forEach(bar => {
                const width = bar.style.width;
                bar.style.width = '0%';
                requestAnimationFrame(() => {
                    bar.style.width = width;
                });
            });
        });
    }

    // Global function for timeline click
    window.goToMonth = function (monthKey) {
        if (!chatData) return;
        navigateTo('chat');

        // Ensure all messages are rendered
        while (renderedCount < chatData.messages.length) {
            renderBatch();
        }

        // Find first message of that month
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
                    setTimeout(() => {
                        bubble.style.boxShadow = '';
                    }, 2000);
                }
            }, 100);
        }
    };

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
