# 3 Strands Cattle Co. Website

Static marketing website for 3 Strands Cattle Co.—a Florida distribution company owned by two veteran families—highlighting mission, premium livestock offerings, and contact options.

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

## Live chat

The previous Matrix-powered live chat experiment has been removed while the team evaluates long-term support tooling. When you are ready to explore a new chat provider, add the necessary markup, styles, and JavaScript alongside the contact form so customers can still reach the team by phone or email in the meantime.
