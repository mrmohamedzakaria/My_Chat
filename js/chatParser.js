/**
 * WhatsApp Chat Parser
 * Parses exported WhatsApp .txt file into structured data
 * Supports Arabic-Indic numerals and Arabic date/time formats
 */

const ChatParser = {
    // Arabic stop words to exclude from word frequency
    STOP_WORDS: new Set([
        'في', 'من', 'على', 'إلى', 'عن', 'مع', 'هذا', 'هذه', 'ذلك', 'تلك',
        'هو', 'هي', 'هم', 'هن', 'أنا', 'أنت', 'أنتِ', 'نحن', 'انت', 'انتي',
        'الذي', 'التي', 'الذين', 'ما', 'لا', 'لم', 'لن', 'قد', 'كان', 'كانت',
        'يكون', 'إن', 'أن', 'ان', 'إذا', 'حتى', 'بعد', 'قبل', 'ثم', 'أو',
        'و', 'أي', 'كل', 'بعض', 'غير', 'بين', 'عند', 'هل', 'كيف', 'لماذا',
        'أين', 'متى', 'ليس', 'ليست', 'يا', 'اللي', 'دي', 'دا', 'ده', 'مش',
        'انا', 'اللى', 'لو', 'بس', 'يعني', 'عشان', 'علي', 'فيه', 'فيها',
        'طب', 'اه', 'آه', 'ايه', 'ايوا', 'ماشي', 'حاضر', 'خلاص', 'كده',
        'ده', 'دي', 'دا', 'اللي', 'إللي', 'معايا', 'عليا', 'ليه', 'كمان',
        'تاني', 'برضو', 'اوي', 'آوي', 'نعم', 'لسه', 'ولا', 'بقي', 'بقا',
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
        'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
        'before', 'after', 'and', 'but', 'or', 'not', 'no', 'if', 'it', 'its',
        'this', 'that', 'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him',
        'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their',
        'media', 'omitted', 'تم', 'حذف', 'الوسائط', 'استبعاد',
        'الرسالة', 'رسالة', 'محذوفة'
    ]),

    /**
     * Convert Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩) to Latin (0123456789)
     */
    normalizeArabicNumerals(str) {
        return str.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    },

    /**
     * Clean a line: remove invisible Unicode characters and normalize numerals
     */
    cleanLine(line) {
        // Remove BOM, LTR/RTL marks, zero-width chars etc.
        let clean = line.replace(/[\u200e\u200f\u200b\u200c\u200d\u202a-\u202e\uFEFF\u00a0]/g, '');
        // Normalize Arabic-Indic numerals to Latin
        clean = this.normalizeArabicNumerals(clean);
        return clean.trim();
    },

    /**
     * Parse WhatsApp chat text into messages array
     */
    parse(text) {
        const lines = text.split('\n');
        const messages = [];
        
        // After normalization, dates look like: 18/6/2019, 6:58 م - Om Zakaria: message
        // Support both Arabic AM/PM (ص/م) and English (AM/PM)
        // Pattern: date, time AM/PM - sender: message
        const messageRegex = /^(\d{1,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,4})[\s,،]+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:[AaPp][Mm]|[صم])))\s*[-–]\s*([^:]+):\s(.+)/;

        let currentMessage = null;

        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i];
            if (!rawLine.trim()) continue;

            const cleanLine = this.cleanLine(rawLine);
            if (!cleanLine) continue;

            const match = cleanLine.match(messageRegex);
            
            if (match) {
                if (currentMessage) {
                    messages.push(currentMessage);
                }

                const [, dateStr, timeStr, sender, msgText] = match;
                const senderTrimmed = sender.trim();

                currentMessage = {
                    date: dateStr.trim(),
                    time: timeStr.trim(),
                    sender: senderTrimmed,
                    text: msgText.trim(),
                    isSystem: false
                };
            } else if (currentMessage) {
                // Check if this is a system line (like encryption notice)
                const isNewEntry = /^\d{1,4}[\/\-\.]\d{1,2}[\/\-\.]/.test(cleanLine);
                if (!isNewEntry) {
                    // Multi-line message continuation
                    currentMessage.text += '\n' + cleanLine;
                } else {
                    // System message (date line without sender), skip
                    messages.push(currentMessage);
                    currentMessage = null;
                }
            }
        }

        if (currentMessage) {
            messages.push(currentMessage);
        }

        // Determine the two main senders
        const senderCounts = {};
        messages.forEach(m => {
            senderCounts[m.sender] = (senderCounts[m.sender] || 0) + 1;
        });

        const sortedSenders = Object.entries(senderCounts)
            .sort((a, b) => b[1] - a[1])
            .map(entry => entry[0]);

        const sender1 = sortedSenders[0] || 'محمد';
        const sender2 = sortedSenders[1] || 'بطوط';

        // Assign sender class and detect system messages
        messages.forEach(m => {
            m.senderClass = m.sender === sender1 ? 'sender-1' : 'sender-2';
            // Check for media/system messages
            if (m.text.includes('<Media omitted>') || 
                m.text.includes('<تم استبعاد الوسائط>') ||
                m.text.includes('تم حذف هذه الرسالة') ||
                m.text.includes('This message was deleted') ||
                m.text.includes('الوسائط غير مضمّنة') ||
                m.text.includes('هذه الرسالة محذوفة')) {
                m.isSystem = true;
            }
        });

        console.log(`Parsed ${messages.length} messages from ${sortedSenders.length} senders: ${sortedSenders.join(', ')}`);

        return {
            messages,
            senders: { sender1, sender2 },
            senderCounts
        };
    },

    /**
     * Parse date string to Date object
     */
    parseDate(dateStr) {
        // Normalize Arabic numerals first
        const normalized = this.normalizeArabicNumerals(dateStr);
        const parts = normalized.split(/[\/\-\.]/);
        if (parts.length !== 3) return new Date();

        let day, month, year;
        
        // If first part is 4 digits, it's YYYY/M/D
        if (parts[0].length === 4) {
            year = parseInt(parts[0]);
            month = parseInt(parts[1]) - 1;
            day = parseInt(parts[2]);
        } else {
            // Assume D/M/YYYY (common in Arab region WhatsApp export)
            day = parseInt(parts[0]);
            month = parseInt(parts[1]) - 1;
            year = parseInt(parts[2]);
        }
        
        if (year < 100) year += 2000;
        
        return new Date(year, month, day);
    },

    /**
     * Calculate comprehensive statistics
     */
    calculateStats(messages, senders) {
        const { sender1, sender2 } = senders;
        
        const stats = {
            totalMessages: messages.length,
            sender1Count: 0,
            sender2Count: 0,
            sender1Name: sender1,
            sender2Name: sender2,
            totalWords: 0,
            sender1Words: 0,
            sender2Words: 0,
            wordFrequency: {},
            emojiFrequency: {},
            dailyMessages: {},
            monthlyMessages: {},
            busiestDay: { date: '', count: 0 },
            longestMessage: { text: '', sender: '', length: 0 },
            firstMessage: null,
            lastMessage: null,
            totalDays: 0,
            avgMessagesPerDay: 0,
            hourlyDistribution: new Array(24).fill(0),
        };

        if (messages.length === 0) return stats;

        stats.firstMessage = messages[0];
        stats.lastMessage = messages[messages.length - 1];

        const firstDate = this.parseDate(messages[0].date);
        const lastDate = this.parseDate(messages[messages.length - 1].date);
        stats.totalDays = Math.max(1, Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)));
        stats.avgMessagesPerDay = Math.round(messages.length / stats.totalDays);

        // Emoji regex
        const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{FE0F}]+/gu;

        messages.forEach(msg => {
            if (msg.isSystem) return;

            // Sender counts
            if (msg.sender === sender1) stats.sender1Count++;
            else stats.sender2Count++;

            // Word counting
            const words = msg.text.split(/\s+/).filter(w => w.length > 1);
            const wordCount = words.length;
            stats.totalWords += wordCount;

            if (msg.sender === sender1) stats.sender1Words += wordCount;
            else stats.sender2Words += wordCount;

            // Word frequency
            words.forEach(word => {
                const cleanWord = word.replace(/[^\w\u0600-\u06FF]/g, '').toLowerCase();
                if (cleanWord.length > 1 && !this.STOP_WORDS.has(cleanWord)) {
                    stats.wordFrequency[cleanWord] = (stats.wordFrequency[cleanWord] || 0) + 1;
                }
            });

            // Emoji frequency
            const emojis = msg.text.match(emojiRegex);
            if (emojis) {
                emojis.forEach(emoji => {
                    stats.emojiFrequency[emoji] = (stats.emojiFrequency[emoji] || 0) + 1;
                });
            }

            // Daily messages
            stats.dailyMessages[msg.date] = (stats.dailyMessages[msg.date] || 0) + 1;
            if (stats.dailyMessages[msg.date] > stats.busiestDay.count) {
                stats.busiestDay = { date: msg.date, count: stats.dailyMessages[msg.date] };
            }

            // Monthly
            const date = this.parseDate(msg.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!stats.monthlyMessages[monthKey]) {
                stats.monthlyMessages[monthKey] = { total: 0, sender1: 0, sender2: 0 };
            }
            stats.monthlyMessages[monthKey].total++;
            if (msg.sender === sender1) stats.monthlyMessages[monthKey].sender1++;
            else stats.monthlyMessages[monthKey].sender2++;

            // Hourly distribution — handle Arabic ص (AM) / م (PM)
            const timeNormalized = this.normalizeArabicNumerals(msg.time);
            const hourMatch = timeNormalized.match(/^(\d{1,2}):/);
            if (hourMatch) {
                let hour = parseInt(hourMatch[1]);
                const lowerTime = timeNormalized.toLowerCase();
                if ((lowerTime.includes('pm') || lowerTime.includes('م')) && hour !== 12) hour += 12;
                if ((lowerTime.includes('am') || lowerTime.includes('ص')) && hour === 12) hour = 0;
                if (hour >= 0 && hour < 24) {
                    stats.hourlyDistribution[hour]++;
                }
            }

            // Longest message
            if (msg.text.length > stats.longestMessage.length) {
                stats.longestMessage = {
                    text: msg.text.substring(0, 200) + (msg.text.length > 200 ? '...' : ''),
                    sender: msg.sender,
                    length: msg.text.length
                };
            }
        });

        return stats;
    },

    /**
     * Get top N words
     */
    getTopWords(wordFrequency, n = 20) {
        return Object.entries(wordFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, n)
            .map(([word, count]) => ({ word, count }));
    },

    /**
     * Get top N emojis
     */
    getTopEmojis(emojiFrequency, n = 15) {
        return Object.entries(emojiFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, n)
            .map(([emoji, count]) => ({ emoji, count }));
    },

    /**
     * Group messages by month for timeline
     */
    getTimeline(messages, senders) {
        const { sender1, sender2 } = senders;
        const months = {};

        messages.forEach(msg => {
            const date = this.parseDate(msg.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!months[key]) {
                months[key] = {
                    year: date.getFullYear(),
                    month: date.getMonth(),
                    total: 0,
                    sender1: 0,
                    sender2: 0,
                    firstMsg: msg,
                    lastMsg: msg,
                    days: new Set()
                };
            }

            months[key].total++;
            months[key].lastMsg = msg;
            months[key].days.add(msg.date);

            if (msg.sender === sender1) months[key].sender1++;
            else months[key].sender2++;
        });

        // Convert to sorted array
        return Object.entries(months)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([key, data]) => ({
                key,
                ...data,
                daysActive: data.days.size
            }));
    },

    /**
     * Format month name in Arabic
     */
    getArabicMonth(monthIndex) {
        const months = [
            'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];
        return months[monthIndex];
    },

    /**
     * Format number to Arabic-friendly display
     */
    formatNumber(num) {
        return num.toLocaleString('ar-EG');
    }
};
