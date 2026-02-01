require('dotenv').config();
var path = require('path');
var express = require('express');
var cors = require('cors');
var square = require('square');

var app = express();
var PORT = process.env.PORT || 3001;

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

// Cache catalog data for 5 minutes to reduce API calls
var catalogCache = null;
var cacheTimestamp = 0;
var CACHE_DURATION = 5 * 60 * 1000;

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

// GET /api/catalog - Returns all catalog items with prices
app.get('/api/catalog', function (req, res) {
    var now = Date.now();
    if (catalogCache && (now - cacheTimestamp) < CACHE_DURATION) {
        return res.json(catalogCache);
    }

    var items = [];
    var cursor;

    function fetchItems(cursor) {
        return squareClient.catalog.list({
            types: 'ITEM',
            cursor: cursor
        }).then(function (response) {
            if (response.objects) {
                response.objects.forEach(function (obj) {
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

                    items.push(item);
                });
            }

            if (response.cursor) {
                return fetchItems(response.cursor);
            }
        });
    }

    function fetchCategories() {
        var categories = {};
        function fetchPage(cursor) {
            return squareClient.catalog.list({
                types: 'CATEGORY',
                cursor: cursor
            }).then(function (catResponse) {
                if (catResponse.objects) {
                    catResponse.objects.forEach(function (cat) {
                        var catData = cat.categoryData || {};
                        categories[cat.id] = catData.name || '';
                    });
                }
                if (catResponse.cursor) {
                    return fetchPage(catResponse.cursor);
                }
                return categories;
            });
        }
        return fetchPage();
    }

    fetchItems()
        .then(function () { return fetchCategories(); })
        .then(function (categories) {
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
        if (!response.object) {
            return res.status(404).json({ error: 'Item not found' });
        }

        var obj = response.object;
        var itemData = obj.itemData || {};
        var item = {
            id: obj.id,
            name: get(itemData, 'name', ''),
            description: get(itemData, 'description', ''),
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

        res.json(item);
    }).catch(function (error) {
        console.error('Square API error:', error);
        res.status(500).json({
            error: 'Failed to fetch item',
            message: error.message
        });
    });
});

// Health check
app.get('/api/health', function (req, res) {
    res.json({ status: 'ok', environment: process.env.SQUARE_ENVIRONMENT });
});

// Fix BigInt serialization globally (Square SDK v44 returns BigInt for prices)
BigInt.prototype.toJSON = function () {
    return Number(this);
};

// Debug: raw Square response
app.get('/api/debug-catalog', function (req, res) {
    squareClient.catalog.list({ types: 'ITEM' }).then(function (response) {
        var raw = JSON.stringify(response).substring(0, 5000);
        res.setHeader('Content-Type', 'application/json');
        res.send(raw);
    }).catch(function (error) {
        res.status(500).json({ error: error.message });
    });
});

app.listen(PORT, function () {
    console.log('3 Strands running on http://localhost:' + PORT);
    console.log('Square environment: ' + process.env.SQUARE_ENVIRONMENT);
});
