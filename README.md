# 3 Strands Cattle Co. - Premium Florida Beef

A modern, premium website for 3 Strands Cattle Co., a veteran-owned, faith-driven beef distribution company serving Florida.

## Features

- **Premium Design**: Clean, modern aesthetic focused on premium beef products
- **Products & Pricing**: A la carte cuts with transparent pricing
- **Bundle Deals**: Pre-configured bundles (Family Essentials, Grillmaster's Choice, Freezer Filler)
- **Build Your Bundle**: Custom bundle builder functionality
- **Subscriptions**: Monthly, quarterly, 6-month, and annual subscription options
- **Live Chat**: Tawk.to integration with business hours (M-Sat 7am-9pm, Sun 12-4pm ET)
- **Newsletter**: ConvertKit integration for email marketing
- **Square Payments**: Integration with Square Online for secure checkout
- **Mobile Responsive**: Fully responsive design for all devices

## Setup Instructions

### 1. Local Development

```bash
# Start a local server
python -m http.server 8081 --bind 127.0.0.1

# Visit http://127.0.0.1:8081
```

### 2. Configure Tawk.to Live Chat

1. Create a free account at [tawk.to](https://www.tawk.to/)
2. Get your Property ID and Widget ID from the dashboard
3. In `index.html`, replace the placeholder values:
   ```javascript
   s1.src='https://embed.tawk.to/YOUR_PROPERTY_ID/YOUR_WIDGET_ID';
   ```
4. Download the Tawk.to iPhone app for mobile chat management

**Business Hours**: The chat widget is configured for:
- Monday - Saturday: 7am - 9pm Eastern Time
- Sunday: 12pm - 4pm Eastern Time

### 3. Configure ConvertKit Newsletter

1. Create a free account at [convertkit.com](https://convertkit.com/)
2. Create a new form in ConvertKit
3. Get your Form ID from the form settings
4. In `index.html`, replace the form action:
   ```html
   <form action="https://app.convertkit.com/forms/YOUR_FORM_ID/subscriptions" ...>
   ```

### 4. Configure Square Payments

1. Create a Square account at [squareup.com](https://squareup.com/)
2. Set up Square Online for e-commerce
3. Create payment links or set up your online store
4. In `index.html`, replace the Square links:
   ```html
   <a href="https://square.link/u/YOUR_SQUARE_LINK" ...>Shop Now</a>
   <a href="https://square.link/u/YOUR_ACCOUNT_LINK" ...>Sign Up / Login</a>
   ```

Square Online provides:
- Secure payment processing (PCI compliant)
- Customer accounts with saved payment info
- Subscription management
- Order tracking

### 5. Add Your Logo

Place your logo file at `assets/img/logo.png`. The logo is used in:
- Header navigation
- Footer
- Browser favicon
- Social sharing

## File Structure

```
3strands-Site/
├── index.html              # Main HTML file
├── README.md               # This file
└── assets/
    ├── css/
    │   └── styles.css      # All styles
    ├── js/
    │   └── main.js         # JavaScript functionality
    └── img/
        └── logo.png        # Brand logo (add your own)
```

## Customization

### Updating Prices

Prices are located in the Products section (`index.html`). Search for `class="price"` to find all price elements.

### Updating Bundle Contents

Bundle contents are in the Bundles section. Each bundle card contains a `<ul class="bundle-contents">` list.

### Subscription Pricing

Subscription options are in the Subscriptions section. Update the `sub-price` and `sub-savings` spans as needed.

### Colors

CSS custom properties are defined at the top of `styles.css`:

```css
:root {
    --color-primary: #8B4513;      /* Saddle brown */
    --color-secondary: #2C5530;    /* Forest green */
    --color-accent: #D4AF37;       /* Gold */
    /* ... more colors */
}
```

## Contact Form

The contact form uses [FormSubmit](https://formsubmit.co/) for email delivery. On first deployment:
1. Submit a test message
2. Check `info@3strands.co` for a verification email
3. Click the verification link to activate

## Deployment

This is a static site and can be deployed to any static hosting:

- **GitHub Pages**: Push to a `gh-pages` branch
- **Netlify**: Drag and drop or connect to Git
- **Vercel**: Connect to Git repository
- **AWS S3**: Upload files and enable static hosting
- **Any web server**: Upload files via FTP/SFTP

## Support

- **Website**: [3strands.co](https://3strands.co)
- **Email**: info@3strands.co
- **Phone**: (561) 917-9047

---

*Veteran owned. Faith driven. Florida sourced.*
