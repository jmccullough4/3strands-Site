# 3 Strands Cattle Co. Website

Static marketing website for 3 Strands Cattle Co. highlighting mission, premium livestock offerings, and contact options.

## Local development

Open `index.html` directly in a browser or run a static file server bound to the expected host and port:

```bash
python -m http.server 8081 --bind 127.0.0.1
```

Then visit [http://127.0.0.1:8081](http://127.0.0.1:8081).

## Branding assets

The production deployment should include `assets/img/logo.png`, which contains the 3 Strands Cattle Co. logo referenced throughout the site. The file is omitted from version control and must be supplied during deployment.

## Contact form delivery

The "Contact Us" form posts to [FormSubmit](https://formsubmit.co), which relays submissions to `info@3strands.co` without opening a local mail client. The first submission from a new deployment will trigger a confirmation email from FormSubmit—approve it once to activate delivery. The delivered message includes a "3 Strands Cattle Co. Website Inquiry" header along with the submitted fields so the team can quickly recognize website leads. Consider adding FormSubmit's confirmation address to your allowlist to ensure reliable notifications.

## Live chat configuration

The live chat section now favors a fully self-hosted Matrix stack so conversations stay under your control and free of recurring subscription costs. A typical setup looks like this:

1. Deploy a [Matrix homeserver](https://matrix.org/docs/projects/server/synapse/) (Synapse works well for small teams) on your infrastructure.
2. Host the [Element web client](https://github.com/vector-im/element-web) on the same web server as this site (for example at `https://chat.3strands.co`).
3. Create a dedicated support room (public or knock-only) and invite your team so they receive notifications through Element on desktop and mobile.
4. Update the `.live-chat-content` wrapper in `index.html` with your Element embed URL:

   ```html
   <div
       class="live-chat-content"
       data-chat-provider="matrix"
       data-matrix-embed-url="https://chat.3strands.co/#/room/#support:3strands.co?via=3strands.co"
       data-matrix-room-name="3 Strands Support"
   >
   ```

   The `data-matrix-room-name` attribute controls the accessible label and window title.

With the embed URL in place, the "Launch Live Chat" button renders an on-site overlay that loads your self-hosted Element client. Guests can converse from the website, and your employees can respond (with alerts) via their Element apps. Leave the `data-matrix-embed-url` empty during staging to keep the button disabled while infrastructure is prepared.
