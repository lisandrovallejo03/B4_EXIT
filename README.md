# B4_EXIT

Real-time dashboard: weather, CABA transport, Argentine news (RSS), crypto ticker, dollar rates, and a contact module so visitors can send you meeting links (Gmail/mailto).

**Tech stack:** React 19, Vite 6, TypeScript 5.8, Tailwind CSS v4. UI: matrix/neon aesthetic. All external APIs are proxied through Vite to avoid CORS.

## Run locally

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`. Copy `.env.example` to `.env` and set `VITE_CONTACT_EMAIL` (and optionally CABA credentials) as needed.

## Contact

The **[REUNIONES_CONTACTO]** module lets visitors send you a meeting link (Calendly, Meet, Zoom, etc.); they open Gmail or another client with the link and your email pre-filled. Configure `VITE_CONTACT_EMAIL` in `.env` to receive those emails.

## Scripts

| Command         | Description                |
|----------------|----------------------------|
| `npm run dev`  | Dev server (port 3000)     |
| `npm run build`| Production build to `dist/`|
| `npm run preview` | Preview production build |
| `npm run lint` | Type-check (`tsc --noEmit`) |
