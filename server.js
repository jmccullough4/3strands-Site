require('dotenv').config();
var path = require('path');
var fs = require('fs');
var express = require('express');
var cors = require('cors');
var square = require('square');

// Events persistence file
var EVENTS_FILE = path.join(__dirname, 'data', 'events.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// Initialize events file if it doesn't exist
if (!fs.existsSync(EVENTS_FILE)) {
    fs.writeFileSync(EVENTS_FILE, '[]');
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

// POST /api/subscribe - Subscribe email to Kit newsletter via v4 API
app.post('/api/subscribe', function (req, res) {
    var email = (req.body.email_address || '').trim().toLowerCase();
    if (!email) {
        return res.status(400).json({ error: 'Email address is required' });
    }

    var kitApiKey = process.env.KIT_API_KEY;
    var kitFormId = process.env.KIT_FORM_ID || '8977420';

    if (!kitApiKey) {
        console.error('KIT_API_KEY not set in environment');
        return res.status(500).json({ error: 'Newsletter service not configured' });
    }

    // Kit v4 API: add subscriber to form by email
    fetch('https://api.kit.com/v4/forms/' + kitFormId + '/subscribers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Kit-Api-Key': kitApiKey
        },
        body: JSON.stringify({ email_address: email })
    })
    .then(function (kitRes) {
        return kitRes.json().then(function (data) {
            if (!kitRes.ok) {
                console.error('Kit API error:', kitRes.status, data);
                return res.status(kitRes.status).json({ error: 'Subscription failed', details: data });
            }
            res.json({ success: true, subscriber: data.subscriber || data });
        });
    })
    .catch(function (error) {
        console.error('Kit API request failed:', error);
        res.status(500).json({ error: 'Failed to reach newsletter service' });
    });
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
