# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

3 Strands Cattle Co. is a static website with a Node.js backend for a veteran-owned beef distribution company. The site integrates with Square for catalog/inventory management and includes a self-hosted newsletter system.

## Development Commands

```bash
# Start the server (serves static files + API)
npm start
# or directly:
node server.js

# Local development without backend
python -m http.server 8081 --bind 127.0.0.1
```

The server runs on port 8083 by default (configurable via `PORT` env var).

## Architecture

### Backend (server.js)
- **Express server** serving static files and REST API endpoints
- **Square SDK v44** integration for catalog and inventory management
- **Self-hosted newsletter system** with JSON file storage (`data/subscribers.json`, `data/events.json`)
- **Nodemailer** for SMTP email delivery

Key API endpoints:
- `GET /api/catalog` - Fetches Square catalog with inventory (60s cache)
- `GET /api/flash-sales` - Proxied from dashboard_trailer (30s cache)
- `POST /api/subscribe` - Newsletter subscription
- `POST /api/newsletter/send` - Send newsletter to all subscribers
- `GET /api/events` - Calendar events
- `POST /api/events` - Save calendar events

### Frontend (assets/js/main.js)
- Vanilla JavaScript, no framework
- Polls `/api/catalog` every 60 seconds for price/inventory updates
- Updates elements with `data-square-item` attribute to match Square catalog
- Event calendar with admin CRUD (secret login: 7 clicks on logo)
- Newsletter admin interface

### Square Integration
- Catalog items on the site use `data-square-item="Item Name"` to link to Square catalog
- Prices auto-sync from Square; sold out/low stock indicators displayed
- BigInt serialization is patched globally for Square SDK v44 compatibility

### Flash Sales & Product Sorting
- Flash sales are fetched from the dashboard_trailer backend (`/api/public/flash-sales`)
- Flash sales are managed via the iOS app and pushed to the dashboard
- Products sorted like Dashboard: flash sales first → premium order → sold out last
- Flash sales match products by fuzzy matching `cut_type` against product names
- Product categories mirror the Dashboard: Premium Steaks, Everyday Steaks, Roasts, Ground & Stew, Specialty Cuts, Bones & Offal, Farm Fresh

## Environment Variables

Required in `.env`:
- `SQUARE_ACCESS_TOKEN` - Square API token
- `SQUARE_ENVIRONMENT` - `sandbox` or `production`
- `DASHBOARD_URL` - URL to dashboard_trailer backend (default: `http://localhost:8081`)

Optional for email:
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE`
- `SITE_URL` - Base URL for unsubscribe links

## Data Storage

The `data/` directory contains:
- `events.json` - Calendar events
- `subscribers.json` - Newsletter subscribers

These are auto-created on first run if missing.

Flash sales are sourced from the dashboard_trailer backend (managed via iOS app).
