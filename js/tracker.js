/**
 * Visitor Tracker — Enhanced Edition
 * Sends real-time notifications with detailed visitor info
 * Includes: location, device, reading progress, pages visited
 * Uses ntfy.sh — free, no signup required
 */

(function () {
    'use strict';

    // === CONFIG ===
    const NTFY_TOPIC = 'mychat-batoot-mz2024';
    const NTFY_URL = 'https://ntfy.sh';

    // Track visit state
    const visitStart = Date.now();
    let pageViews = [];
    let exitSent = false;
    let visitorLocation = null;
    let lastReadDate = null;
    let lastReadMsgIndex = 0;
    let lastReadSender = '';
    let lastReadText = '';
    let passwordPassed = false;

    // === DEVICE INFO ===
    function getDeviceInfo() {
        const ua = navigator.userAgent;
        let device = 'Unknown';
        let browser = 'Unknown';

        // Device
        if (/iPhone/.test(ua)) device = 'iPhone';
        else if (/iPad/.test(ua)) device = 'iPad';
        else if (/Android.*Mobile/.test(ua)) device = 'Android Phone';
        else if (/Android/.test(ua)) device = 'Android Tablet';
        else if (/Windows/.test(ua)) device = 'Windows PC';
        else if (/Macintosh/.test(ua)) device = 'Mac';
        else if (/Linux/.test(ua)) device = 'Linux';

        // Browser
        if (/Chrome/.test(ua) && !/Edg/.test(ua)) browser = 'Chrome';
        else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
        else if (/Firefox/.test(ua)) browser = 'Firefox';
        else if (/Edg/.test(ua)) browser = 'Edge';

        // Screen
        const screen = window.screen;
        const screenInfo = screen ? screen.width + 'x' + screen.height : '?';

        return {
            device: device,
            browser: browser,
            screen: screenInfo,
            language: navigator.language || '?',
            summary: device + ' / ' + browser + ' / ' + screenInfo
        };
    }

    // === LOCATION ===
    function fetchLocation() {
        // Use free IP geolocation API
        fetch('https://ipapi.co/json/')
            .then(function(r) { return r.json(); })
            .then(function(data) {
                visitorLocation = {
                    city: data.city || '?',
                    region: data.region || '?',
                    country: data.country_name || '?',
                    ip: data.ip || '?',
                    isp: data.org || '?',
                    timezone: data.timezone || '?'
                };
            })
            .catch(function() {
                visitorLocation = { city: '?', country: '?', ip: '?', isp: '?', region: '?', timezone: '?' };
            });
    }

    // === FORMAT HELPERS ===
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

    function getTimeStr() {
        var now = new Date();
        return now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear() +
            ' ' + now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
    }

    // === SEND NOTIFICATION ===
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

    // === TRACK READING PROGRESS ===
    function trackReadingProgress() {
        setInterval(function() {
            try {
                var container = document.getElementById('chat-messages');
                if (!container) return;

                var bubbles = container.querySelectorAll('.message-bubble');
                if (bubbles.length === 0) return;

                var containerRect = container.getBoundingClientRect();
                var centerY = containerRect.top + containerRect.height / 2;

                for (var i = 0; i < bubbles.length; i++) {
                    var rect = bubbles[i].getBoundingClientRect();
                    if (rect.top <= centerY && rect.bottom >= centerY - 50) {
                        var idx = parseInt(bubbles[i].dataset.index) || 0;
                        if (idx > lastReadMsgIndex) {
                            lastReadMsgIndex = idx;

                            // Get message date from the date separator above
                            var dateSep = bubbles[i].previousElementSibling;
                            while (dateSep && !dateSep.classList.contains('date-separator')) {
                                dateSep = dateSep.previousElementSibling;
                            }
                            if (dateSep) {
                                var dateText = dateSep.querySelector('.date-separator-text');
                                if (dateText) lastReadDate = dateText.textContent;
                            }

                            // Get sender and text
                            var senderEl = bubbles[i].querySelector('.message-sender');
                            var textEl = bubbles[i].querySelector('.message-text');
                            if (senderEl) lastReadSender = senderEl.textContent;
                            if (textEl) lastReadText = textEl.textContent.substring(0, 50);
                        }
                    }
                }
            } catch (e) {}
        }, 3000); // Check every 3 seconds
    }

    // === TRACK PASSWORD ===
    function trackPassword() {
        var lockScreen = document.getElementById('lock-screen');
        if (lockScreen) {
            var observer = new MutationObserver(function() {
                if (lockScreen.classList.contains('unlocked') && !passwordPassed) {
                    passwordPassed = true;
                    var loc = visitorLocation || {};
                    var info = getDeviceInfo();

                    var msg = '---- Device ----\n' +
                        'Device: ' + info.device + '\n' +
                        'Browser: ' + info.browser + '\n' +
                        'Screen: ' + info.screen + '\n' +
                        'Language: ' + info.language + '\n' +
                        '---- Location ----\n' +
                        'City: ' + (loc.city || '?') + ', ' + (loc.region || '') + '\n' +
                        'Country: ' + (loc.country || '?') + '\n' +
                        'IP: ' + (loc.ip || '?') + '\n' +
                        'ISP: ' + (loc.isp || '?') + '\n' +
                        'Timezone: ' + (loc.timezone || '?');

                    sendNotification(
                        'Password entered correctly!',
                        msg,
                        ['unlock', 'heart'],
                        5
                    );
                }
            });
            observer.observe(lockScreen, { attributes: true, attributeFilter: ['class'] });
        }
    }

    // === VISIT START ===
    fetchLocation(); // Get location immediately

    var deviceInfo = getDeviceInfo();
    sendNotification(
        'Someone opened the site!',
        'Time: ' + getTimeStr() + '\nDevice: ' + deviceInfo.summary,
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

        trackPassword();
        trackReadingProgress();

        // Send periodic update every 60 seconds (so you always get data even if exit fails)
        setInterval(function() {
            var duration = Date.now() - visitStart;
            var durationText = formatDuration(duration);
            var pagesText = pageViews.length > 0 ? pageViews.join(' > ') : 'None';
            var loc = visitorLocation || {};
            var info = getDeviceInfo();

            var readingInfo = '';
            if (lastReadMsgIndex > 0) {
                readingInfo = '\nReading: msg #' + lastReadMsgIndex +
                    ' | ' + (lastReadDate || '?') +
                    '\n' + lastReadSender + ': ' + lastReadText;
            }

            sendNotification(
                'Still browsing — ' + durationText,
                'Pages: ' + pagesText +
                '\nDevice: ' + info.device + ' / ' + info.browser +
                '\nLocation: ' + (loc.city || '?') + ', ' + (loc.country || '?') +
                readingInfo,
                ['hourglass'],
                2
            );
        }, 60000); // Every 60 seconds
    });

    // === VISIT END ===
    function buildExitMsg() {
        var duration = Date.now() - visitStart;
        var durationText = formatDuration(duration);
        var pagesText = pageViews.length > 0 ? pageViews.join(' > ') : 'None';
        var loc = visitorLocation || {};
        var info = getDeviceInfo();

        var readingInfo = '';
        if (lastReadMsgIndex > 0) {
            readingInfo = '\n---- Reading Progress ----\n' +
                'Message #' + lastReadMsgIndex + '\n' +
                'Date reached: ' + (lastReadDate || '?') + '\n' +
                'Last seen: ' + lastReadSender + ': ' + lastReadText;
        }

        return {
            duration: durationText,
            msg: '---- Visit ----\n' +
                'Duration: ' + durationText + '\n' +
                'Pages: ' + pagesText + '\n' +
                'Password: ' + (passwordPassed ? 'Yes' : 'No') +
                '\n---- Device ----\n' +
                'Device: ' + info.device + '\n' +
                'Browser: ' + info.browser + '\n' +
                'Screen: ' + info.screen +
                '\n---- Location ----\n' +
                'City: ' + (loc.city || '?') + ', ' + (loc.region || '') + '\n' +
                'Country: ' + (loc.country || '?') + '\n' +
                'IP: ' + (loc.ip || '?') +
                readingInfo
        };
    }

    function onVisitEnd() {
        if (exitSent) return;
        exitSent = true;

        var data = buildExitMsg();
        var payload = JSON.stringify({
            topic: NTFY_TOPIC,
            title: 'Visitor left — ' + data.duration,
            message: data.msg,
            tags: ['wave'],
            priority: 3
        });

        // Try BOTH methods for maximum reliability
        try {
            if (navigator.sendBeacon) {
                var blob = new Blob([payload], { type: 'application/json' });
                navigator.sendBeacon(NTFY_URL, blob);
            }
        } catch(e) {}

        try {
            fetch(NTFY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
                keepalive: true
            }).catch(function() {});
        } catch(e) {}
    }

    window.addEventListener('pagehide', onVisitEnd);
    window.addEventListener('beforeunload', onVisitEnd);
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') {
            onVisitEnd();
        }
    });

})();
