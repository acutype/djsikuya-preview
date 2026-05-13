# DJ Sikuya

Public site for `djsikuya.com`.

The private admin, quote and invoicing app remains at `https://app.djsikuya.com`.
This site is the public booking funnel and press surface.

## Local Development

```bash
npm install
npm run dev
```

## Booking Email

The booking form posts to `/api/book`.

Required production env vars:

```bash
RESEND_API_KEY=
BOOKING_TO_EMAIL=bookings@djsikuya.com
BOOKING_FROM_EMAIL=DJ Sikuya <bookings@djsikuya.com>
```

If `RESEND_API_KEY` is not configured, the form falls back to a prefilled email to
`bookings@djsikuya.com` so the public funnel still works during setup.
