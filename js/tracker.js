/**
 * Visitor Tracker
 * Sends real-time notifications when someone visits the site
 * Uses ntfy.sh — free, no signup required
 */

(function () {
    'use strict';

    // === CONFIG ===
    // Change this to your own secret topic name (keep it private!)
    const NTFY_TOPIC = 'mychat-batoot-mz2024';
    const NTFY_URL = `https://ntfy.sh/${NTFY_TOPIC}`;

    // Don't track if running on localhost (developer mode)
    const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (isLocal) return;

    // Track visit start time
    const visitStart = Date.now();
    let pageViews = ['الصفحة الرئيسية'];

    // Detect device info
    function getDeviceInfo() {
        const ua = navigator.userAgent;
        let device = 'متصفح غير معروف';
        if (/iPhone|iPad/.test(ua)) device = '📱 آيفون';
        else if (/Android/.test(ua)) device = '📱 أندرويد';
        else if (/Windows/.test(ua)) device = '💻 ويندوز';
        else if (/Mac/.test(ua)) device = '💻 ماك';
        return device;
    }

    // Format duration
    function formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds} ثانية`;
        const minutes = Math.floor(seconds / 60);
        const remainSec = seconds % 60;
        if (minutes < 60) return `${minutes} دقيقة و ${remainSec} ثانية`;
        const hours = Math.floor(minutes / 60);
        const remainMin = minutes % 60;
        return `${hours} ساعة و ${remainMin} دقيقة`;
    }

    // Get current time in Arabic
    function getArabicTime() {
        return new Date().toLocaleString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Send notification
    function sendNotification(title, message, priority = 3) {
        try {
            fetch(NTFY_URL, {
                method: 'POST',
                headers: {
                    'Title': title,
                    'Priority': priority.toString(),
                    'Tags': 'heart,eyes'
                },
                body: message
            }).catch(() => { /* silent fail */ });
        } catch (e) { /* silent fail */ }
    }

    // === VISIT START ===
    sendNotification(
        '💕 حد فتح الموقع!',
        `🕐 الوقت: ${getArabicTime()}\n${getDeviceInfo()}`,
        4
    );

    // === TRACK PAGE NAVIGATION ===
    // Listen for page changes (our SPA uses class toggling)
    const pageNames = {
        'dedication': '💌 صفحة الإهداء',
        'welcome': '🏠 صفحة الترحيب',
        'chat': '💬 المحادثة',
        'favorites': '❤️ المفضلة',
        'stats': '📊 الإحصائيات',
        'onthisday': '🗓️ ذكريات اليوم',
        'timeline': '📅 الخط الزمني'
    };

    const observer = new MutationObserver(() => {
        const activePage = document.querySelector('.page.active');
        if (activePage) {
            const pageId = activePage.id.replace('page-', '');
            const pageName = pageNames[pageId] || pageId;
            if (pageViews[pageViews.length - 1] !== pageName) {
                pageViews.push(pageName);
            }
        }
    });

    // Start observing after DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => {
            observer.observe(page, { attributes: true, attributeFilter: ['class'] });
        });
    });

    // === VISIT END ===
    function onVisitEnd() {
        const duration = Date.now() - visitStart;
        const durationText = formatDuration(duration);
        const pagesVisited = [...new Set(pageViews)].join(' ← ');

        sendNotification(
            '👋 الزائر طلع من الموقع',
            `⏱️ مدة الزيارة: ${durationText}\n📄 الصفحات: ${pagesVisited}\n${getDeviceInfo()}`,
            3
        );
    }

    // Use multiple events to ensure we catch the exit
    window.addEventListener('beforeunload', onVisitEnd);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            onVisitEnd();
        }
    });

})();
