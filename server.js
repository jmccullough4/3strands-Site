require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { SquareClient, SquareEnvironment } = require('square');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static site files from the same directory
app.use(express.static(path.join(__dirname), {
    extensions: ['html']
}));

// Initialize Square client
const squareClient = new SquareClient({
    token: process.env.SQUARE_ACCESS_TOKEN,
    environment: process.env.SQUARE_ENVIRONMENT === 'sandbox'
        ? SquareEnvironment.Sandbox
        : SquareEnvironment.Production
});

// Cache catalog data for 5 minutes to reduce API calls
let catalogCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// GET /api/catalog - Returns all catalog items with prices
app.get('/api/catalog', async (req, res) => {
    try {
        const now = Date.now();
        if (catalogCache && (now - cacheTimestamp) < CACHE_DURATION) {
            return res.json(catalogCache);
        }

        const items = [];
        let cursor = undefined;

        do {
            const response = await squareClient.catalog.list({
                types: 'ITEM',
                cursor: cursor
            });

            if (response.objects) {
                for (const obj of response.objects) {
                    const item = {
                        id: obj.id,
                        name: obj.itemData?.name || '',
                        description: obj.itemData?.description || '',
                        category: obj.itemData?.categoryId || null,
                        variations: []
                    };

                    if (obj.itemData?.variations) {
                        for (const v of obj.itemData.variations) {
                            item.variations.push({
                                id: v.id,
                                name: v.itemVariationData?.name || '',
                                priceMoney: v.itemVariationData?.priceMoney ? {
                                    amount: Number(v.itemVariationData.priceMoney.amount),
                                    currency: v.itemVariationData.priceMoney.currency
                                } : null,
                                pricingType: v.itemVariationData?.pricingType || 'FIXED_PRICING'
                            });
                        }
                    }

                    items.push(item);
                }
            }

            cursor = response.cursor;
        } while (cursor);

        // Fetch categories to include names
        const categories = {};
        let catCursor = undefined;
        do {
            const catResponse = await squareClient.catalog.list({
                types: 'CATEGORY',
                cursor: catCursor
            });

            if (catResponse.objects) {
                for (const cat of catResponse.objects) {
                    categories[cat.id] = cat.categoryData?.name || '';
                }
            }

            catCursor = catResponse.cursor;
        } while (catCursor);

        // Attach category names to items
        items.forEach(item => {
            if (item.category && categories[item.category]) {
                item.categoryName = categories[item.category];
            }
        });

        const result = { items, categories, updatedAt: new Date().toISOString() };
        catalogCache = result;
        cacheTimestamp = now;

        res.json(result);
    } catch (error) {
        console.error('Square API error:', error);
        res.status(500).json({
            error: 'Failed to fetch catalog',
            message: error.message
        });
    }
});

// GET /api/catalog/:itemId - Returns a single catalog item
app.get('/api/catalog/:itemId', async (req, res) => {
    try {
        const response = await squareClient.catalog.object.get({
            objectId: req.params.itemId
        });

        if (!response.object) {
            return res.status(404).json({ error: 'Item not found' });
        }

        const obj = response.object;
        const item = {
            id: obj.id,
            name: obj.itemData?.name || '',
            description: obj.itemData?.description || '',
            variations: []
        };

        if (obj.itemData?.variations) {
            for (const v of obj.itemData.variations) {
                item.variations.push({
                    id: v.id,
                    name: v.itemVariationData?.name || '',
                    priceMoney: v.itemVariationData?.priceMoney ? {
                        amount: Number(v.itemVariationData.priceMoney.amount),
                        currency: v.itemVariationData.priceMoney.currency
                    } : null,
                    pricingType: v.itemVariationData?.pricingType || 'FIXED_PRICING'
                });
            }
        }

        res.json(item);
    } catch (error) {
        console.error('Square API error:', error);
        res.status(500).json({
            error: 'Failed to fetch item',
            message: error.message
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', environment: process.env.SQUARE_ENVIRONMENT });
});

app.listen(PORT, () => {
    console.log(`3 Strands running on http://localhost:${PORT}`);
    console.log(`Square environment: ${process.env.SQUARE_ENVIRONMENT}`);
});
