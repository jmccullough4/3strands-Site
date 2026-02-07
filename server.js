require('dotenv').config();
var path = require('path');
var fs = require('fs');
var crypto = require('crypto');
var express = require('express');
var cors = require('cors');
var square = require('square');
var nodemailer = require('nodemailer');

// Data persistence files
var DATA_DIR = path.join(__dirname, 'data');
var EVENTS_FILE = path.join(DATA_DIR, 'events.json');
var SUBSCRIBERS_FILE = path.join(DATA_DIR, 'subscribers.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// Initialize data files if they don't exist
if (!fs.existsSync(EVENTS_FILE)) {
    fs.writeFileSync(EVENTS_FILE, '[]');
}
if (!fs.existsSync(SUBSCRIBERS_FILE)) {
    fs.writeFileSync(SUBSCRIBERS_FILE, '[]');
}

// =========================================================================
// Subscriber helpers
// =========================================================================
function readSubscribers() {
    try {
        return JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, 'utf8'));
    } catch (e) {
        return [];
    }
}

function writeSubscribers(subs) {
    fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subs, null, 2));
}

// =========================================================================
// Email transporter (configured via .env)
// =========================================================================
var mailTransporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    mailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
    console.log('Mail configured: ' + process.env.SMTP_HOST);
} else {
    console.log('Mail not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
}

// Convert plain text (from textarea) to HTML paragraphs
function textToHtml(text) {
    // If it already contains HTML tags, return as-is
    if (/<[a-z][\s\S]*>/i.test(text)) return text;
    // Split on double newlines for paragraphs, single newlines become <br>
    return text.split(/\n\s*\n/).map(function (para) {
        return '<p style="margin:0 0 16px;">' + para.trim().replace(/\n/g, '<br>') + '</p>';
    }).join('');
}

// Branded HTML email template
function buildEmailHtml(subject, bodyHtml, unsubscribeUrl) {
    var logoUrl = (process.env.SITE_URL || '') + '/assets/img/logo.png';
    return '<!DOCTYPE html>' +
    '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background-color:#F5F0E1;font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F0E1;padding:40px 20px;">' +
    '<tr><td align="center">' +
    '<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">' +
    // Header with logo
    '<tr><td style="background:linear-gradient(145deg,#1F1810,#3D2B22,#2E241A);padding:32px 40px;border-radius:12px 12px 0 0;text-align:center;">' +
    '<img src="' + logoUrl + '" alt="3 Strands Cattle Co." width="64" height="64" style="display:block;margin:0 auto 16px;" />' +
    '<p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:3px;color:#C9A227;margin:0 0 8px;">3 Strands Cattle Co.</p>' +
    '<h1 style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#F5F0E1;margin:0;line-height:1.2;">' + subject + '</h1>' +
    '</td></tr>' +
    // Body
    '<tr><td style="background-color:#FFFEF9;padding:40px;border-left:1px solid #D9CDBF;border-right:1px solid #D9CDBF;">' +
    '<div style="font-size:16px;line-height:1.8;color:#433929;">' + bodyHtml + '</div>' +
    '</td></tr>' +
    // Footer
    '<tr><td style="background-color:#5C4033;padding:24px 40px;border-radius:0 0 12px 12px;text-align:center;">' +
    '<p style="font-size:13px;color:#D9CDBF;margin:0 0 4px;">Veteran Owned &amp; Faith Driven</p>' +
    '<p style="font-size:12px;color:#9C8E7C;margin:0;">3 Strands Cattle Co. &bull; Florida</p>' +
    (unsubscribeUrl ? '<p style="margin:12px 0 0;"><a href="' + unsubscribeUrl + '" style="font-size:11px;color:#9C8E7C;">Unsubscribe</a></p>' : '') +
    '</td></tr>' +
    '</table></td></tr></table></body></html>';
}

// Fix BigInt serialization globally (Square SDK v44 returns BigInt for prices)
BigInt.prototype.toJSON = function () {
    return Number(this);
};

var app = express();
var PORT = process.env.PORT || 8083;

app.use(cors());
app.use(express.json());

// Serve static site files from the same directory
app.use(express.static(path.join(__dirname), {
    extensions: ['html']
}));

// Initialize Square client
var squareClient = new square.SquareClient({
    token: process.env.SQUARE_ACCESS_TOKEN,
    environment: process.env.SQUARE_ENVIRONMENT === 'sandbox'
        ? square.SquareEnvironment.Sandbox
        : square.SquareEnvironment.Production
});

// Cache catalog data for 60 seconds — keeps polling near-real-time while limiting API calls
var catalogCache = null;
var cacheTimestamp = 0;
var CACHE_DURATION = 60 * 1000;

// Helper to safely access nested properties
function get(obj, path, fallback) {
    var keys = path.split('.');
    var current = obj;
    for (var i = 0; i < keys.length; i++) {
        if (current == null) return fallback;
        current = current[keys[i]];
    }
    return current != null ? current : fallback;
}

// Helper to parse a catalog object into our item format
function parseItem(obj) {
    var itemData = obj.itemData || {};
    var item = {
        id: obj.id,
        name: get(itemData, 'name', ''),
        description: get(itemData, 'description', ''),
        category: get(itemData, 'categoryId', null),
        variations: []
    };

    var variations = itemData.variations || [];
    variations.forEach(function (v) {
        var varData = v.itemVariationData || {};
        var priceMoney = varData.priceMoney;
        item.variations.push({
            id: v.id,
            name: get(varData, 'name', ''),
            priceMoney: priceMoney ? {
                amount: Number(priceMoney.amount),
                currency: priceMoney.currency
            } : null,
            pricingType: get(varData, 'pricingType', 'FIXED_PRICING')
        });
    });

    return item;
}

// Fetch all pages from a Square catalog.list call
function fetchAllPages(params) {
    var allObjects = [];

    function fetchPage(response) {
        var objects = response.data || [];
        allObjects = allObjects.concat(objects);

        if (response._hasNextPage && typeof response.loadNextPage === 'function') {
            return response.loadNextPage().then(fetchPage);
        }
        return allObjects;
    }

    return squareClient.catalog.list(params).then(fetchPage);
}

// GET /api/catalog - Returns all catalog items with prices
app.get('/api/catalog', function (req, res) {
    var now = Date.now();
    if (catalogCache && (now - cacheTimestamp) < CACHE_DURATION) {
        return res.json(catalogCache);
    }

    var itemsPromise = fetchAllPages({ types: 'ITEM' });
    var categoriesPromise = fetchAllPages({ types: 'CATEGORY' });

    Promise.all([itemsPromise, categoriesPromise])
        .then(function (results) {
            var rawItems = results[0];
            var rawCategories = results[1];

            // Build categories map
            var categories = {};
            rawCategories.forEach(function (cat) {
                var catData = cat.categoryData || {};
                categories[cat.id] = catData.name || '';
            });

            // Parse items
            var items = rawItems.map(parseItem);

            // Attach category names
            items.forEach(function (item) {
                if (item.category && categories[item.category]) {
                    item.categoryName = categories[item.category];
                }
            });

            var result = { items: items, categories: categories, updatedAt: new Date().toISOString() };
            catalogCache = result;
            cacheTimestamp = now;

            res.json(result);
        })
        .catch(function (error) {
            console.error('Square API error:', error);
            res.status(500).json({
                error: 'Failed to fetch catalog',
                message: error.message
            });
        });
});

// GET /api/catalog/:itemId - Returns a single catalog item
app.get('/api/catalog/:itemId', function (req, res) {
    squareClient.catalog.object.get({
        objectId: req.params.itemId
    }).then(function (response) {
        var obj = response.data || response.object;
        if (!obj) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.json(parseItem(obj));
    }).catch(function (error) {
        console.error('Square API error:', error);
        res.status(500).json({
            error: 'Failed to fetch item',
            message: error.message
        });
    });
});

// =========================================================================
// Newsletter API (self-hosted)
// =========================================================================

// POST /api/subscribe - Add subscriber
app.post('/api/subscribe', function (req, res) {
    var email = (req.body.email_address || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Valid email address is required' });
    }

    var subs = readSubscribers();
    var existing = subs.find(function (s) { return s.email === email; });

    if (existing) {
        if (existing.status === 'unsubscribed') {
            existing.status = 'active';
            existing.resubscribedAt = new Date().toISOString();
            writeSubscribers(subs);
            return res.json({ success: true, message: 'Welcome back!' });
        }
        return res.json({ success: true, message: 'Already subscribed' });
    }

    subs.push({
        id: crypto.randomUUID(),
        email: email,
        status: 'active',
        subscribedAt: new Date().toISOString()
    });
    writeSubscribers(subs);
    res.json({ success: true, message: 'Subscribed!' });

    // Notify admin of new subscriber
    if (mailTransporter) {
        var notifyTo = process.env.SMTP_FROM || process.env.SMTP_USER;
        var activeCount = subs.filter(function (s) { return s.status === 'active'; }).length;
        mailTransporter.sendMail({
            from: '"3 Strands Cattle Co." <' + notifyTo + '>',
            to: notifyTo,
            subject: 'New Subscriber: ' + email,
            html: buildEmailHtml('New Subscriber', '<p style="font-size:18px;font-weight:600;color:#5C4033;">' + email + '</p>' +
                '<p>Just signed up for the 3 Strands Cattle Co. newsletter.</p>' +
                '<p style="margin-top:16px;padding:12px 16px;background:#F5F0E1;border-radius:8px;font-size:14px;color:#6F6355;">' +
                'Total active subscribers: <strong style="color:#5C4033;">' + activeCount + '</strong></p>', null)
        }).catch(function (err) {
            console.error('Failed to send new-subscriber notification:', err.message);
        });
    }
});

// GET /api/unsubscribe?id=xxx - Unsubscribe link handler
app.get('/api/unsubscribe', function (req, res) {
    var id = req.query.id;
    if (!id) return res.status(400).send('Missing subscriber ID');

    var subs = readSubscribers();
    var sub = subs.find(function (s) { return s.id === id; });
    if (sub) {
        sub.status = 'unsubscribed';
        sub.unsubscribedAt = new Date().toISOString();
        writeSubscribers(subs);
    }

    res.send('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Unsubscribed</title>' +
        '<style>body{font-family:Georgia,serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#F5F0E1;color:#433929;text-align:center;}' +
        '.box{max-width:400px;padding:40px;background:#FFFEF9;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.1);}h1{color:#5C4033;margin-bottom:8px;}p{color:#6F6355;}</style></head>' +
        '<body><div class="box"><h1>Unsubscribed</h1><p>You have been removed from the 3 Strands Cattle Co. mailing list.</p>' +
        '<p style="margin-top:20px;"><a href="/" style="color:#5C4033;font-weight:600;">Back to site</a></p></div></body></html>');
});

// GET /api/subscribers - Admin: list subscribers
app.get('/api/subscribers', function (req, res) {
    var subs = readSubscribers();
    res.json(subs);
});

// DELETE /api/subscribers/:id - Admin: remove subscriber
app.delete('/api/subscribers/:id', function (req, res) {
    var subs = readSubscribers();
    var filtered = subs.filter(function (s) { return s.id !== req.params.id; });
    writeSubscribers(filtered);
    res.json({ success: true, remaining: filtered.length });
});

// POST /api/newsletter/send - Admin: send newsletter to all active subscribers
app.post('/api/newsletter/send', function (req, res) {
    if (!mailTransporter) {
        return res.status(500).json({ error: 'SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env and restart the server.' });
    }

    var subject = (req.body.subject || '').trim();
    var rawBody = (req.body.body || '').trim();
    var siteUrl = process.env.SITE_URL || ('http://localhost:' + PORT);

    if (!subject || !rawBody) {
        return res.status(400).json({ error: 'Subject and body are required' });
    }

    var bodyHtml = textToHtml(rawBody);

    var subs = readSubscribers().filter(function (s) { return s.status === 'active'; });
    if (subs.length === 0) {
        return res.status(400).json({ error: 'No active subscribers' });
    }

    var fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
    var sent = 0;
    var failed = 0;
    var errors = [];
    var total = subs.length;

    // Verify SMTP connection before attempting to send
    mailTransporter.verify(function (verifyErr) {
        if (verifyErr) {
            console.error('SMTP verification failed:', verifyErr.message);
            return res.status(500).json({
                error: 'SMTP connection failed: ' + verifyErr.message,
                hint: verifyErr.code === 'EAUTH'
                    ? 'Check SMTP_USER and SMTP_PASS. For Google Workspace, use an App Password (not your regular password).'
                    : 'Check SMTP settings in .env and restart the server.'
            });
        }

        sendNext(0);
    });

    function sendNext(index) {
        if (index >= subs.length) {
            var result = { success: sent > 0, sent: sent, failed: failed, total: total };
            if (errors.length > 0) {
                result.errors = errors;
            }
            return res.json(result);
        }

        var sub = subs[index];
        var unsubUrl = siteUrl + '/api/unsubscribe?id=' + sub.id;
        var html = buildEmailHtml(subject, bodyHtml, unsubUrl);

        mailTransporter.sendMail({
            from: '"3 Strands Cattle Co." <' + fromAddress + '>',
            to: sub.email,
            subject: subject,
            html: html
        }).then(function () {
            sent++;
            setTimeout(function () { sendNext(index + 1); }, 200);
        }).catch(function (err) {
            console.error('Failed to send to ' + sub.email + ':', err.message);
            failed++;
            errors.push(sub.email + ': ' + err.message);
            setTimeout(function () { sendNext(index + 1); }, 200);
        });
    }
});

// POST /api/newsletter/preview - Admin: preview email HTML
app.post('/api/newsletter/preview', function (req, res) {
    var subject = (req.body.subject || 'Preview').trim();
    var rawBody = (req.body.body || 'Preview content').trim();
    var bodyHtml = textToHtml(rawBody);
    var html = buildEmailHtml(subject, bodyHtml, '#');
    res.send(html);
});

// Health check
app.get('/api/health', function (req, res) {
    res.json({ status: 'ok', environment: process.env.SQUARE_ENVIRONMENT });
});

// =========================================================================
// Calendar Events API
// =========================================================================

// GET /api/events - Returns all calendar events
app.get('/api/events', function (req, res) {
    try {
        var events = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
        res.json(events);
    } catch (error) {
        console.error('Error reading events:', error);
        res.json([]);
    }
});

// POST /api/events - Save all events (replaces entire list)
app.post('/api/events', function (req, res) {
    try {
        var events = req.body;
        if (!Array.isArray(events)) {
            return res.status(400).json({ error: 'Events must be an array' });
        }
        fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
        res.json({ success: true, count: events.length });
    } catch (error) {
        console.error('Error saving events:', error);
        res.status(500).json({ error: 'Failed to save events' });
    }
});

app.listen(PORT, function () {
    console.log('3 Strands running on http://localhost:' + PORT);
    console.log('Square environment: ' + process.env.SQUARE_ENVIRONMENT);
});
