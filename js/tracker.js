/**
 * Visitor Tracker
 * Sends real-time notifications when someone visits the site
 * Uses ntfy.sh — free, no signup required
 */

(function () {
    'use strict';

    // === CONFIG ===
    const NTFY_TOPIC = 'mychat-batoot-mz2024';
    const NTFY_URL = 'https://ntfy.sh';

    // Track visit start time
    const visitStart = Date.now();
    let pageViews = [];
    let exitSent = false;

    // Detect device info
    function getDeviceInfo() {
        const ua = navigator.userAgent;
        if (/iPhone|iPad/.test(ua)) return 'iPhone/iPad';
        if (/Android/.test(ua)) return 'Android';
        if (/Windows/.test(ua)) return 'Windows PC';
        if (/Mac/.test(ua)) return 'Mac';
        return 'Unknown';
    }

    // Format duration
    function formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return seconds + ' sec';
        const minutes = Math.floor(seconds / 60);
        const remainSec = seconds % 60;
        if (minutes < 60) return minutes + 'm ' + remainSec + 's';
        const hours = Math.floor(minutes / 60);
        const remainMin = minutes % 60;
        return hours + 'h ' + remainMin + 'm';
    }

    // Send notification using JSON (handles Unicode properly)
    function sendNotification(title, message, tags, priority) {
        try {
            fetch(NTFY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: NTFY_TOPIC,
                    title: title,
                    message: message,
                    tags: tags || ['heart'],
                    priority: priority || 3
                })
            }).catch(function() {});
        } catch (e) {}
    }

    // === VISIT START ===
    var now = new Date();
    var timeStr = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
    var dateStr = now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();

    sendNotification(
        'Someone opened the site!',
        'Time: ' + dateStr + ' ' + timeStr + '\nDevice: ' + getDeviceInfo() + '\nURL: ' + location.href,
        ['eyes', 'heart'],
        4
    );

    // === TRACK PAGE NAVIGATION ===
    var pageNames = {
        'dedication': 'Dedication',
        'welcome': 'Welcome',
        'chat': 'Chat',
        'favorites': 'Favorites',
        'stats': 'Stats',
        'onthisday': 'Memories',
        'timeline': 'Timeline'
    };

    var observer = new MutationObserver(function() {
        var activePage = document.querySelector('.page.active');
        if (activePage) {
            var pageId = activePage.id.replace('page-', '');
            var pageName = pageNames[pageId] || pageId;
            if (pageViews.length === 0 || pageViews[pageViews.length - 1] !== pageName) {
                pageViews.push(pageName);
            }
        }
    });

    document.addEventListener('DOMContentLoaded', function() {
        var pages = document.querySelectorAll('.page');
        pages.forEach(function(page) {
            observer.observe(page, { attributes: true, attributeFilter: ['class'] });
        });
    });

    // === VISIT END ===
    function onVisitEnd() {
        if (exitSent) return;
        exitSent = true;

        var duration = Date.now() - visitStart;
        var durationText = formatDuration(duration);
        var pagesText = pageViews.length > 0 ? pageViews.join(' > ') : 'None';

        // Use sendBeacon for reliability on page close
        var payload = JSON.stringify({
            topic: NTFY_TOPIC,
            title: 'Visitor left the site',
            message: 'Duration: ' + durationText + '\nPages: ' + pagesText + '\nDevice: ' + getDeviceInfo(),
            tags: ['wave'],
            priority: 3
        });

        if (navigator.sendBeacon) {
            var blob = new Blob([payload], { type: 'application/json' });
            navigator.sendBeacon(NTFY_URL, blob);
        } else {
            fetch(NTFY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
                keepalive: true
            }).catch(function() {});
        }
    }

    window.addEventListener('pagehide', onVisitEnd);
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') {
            onVisitEnd();
        }
    });
    window.addEventListener('beforeunload', onVisitEnd);

})();
