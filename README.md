# Show Time

Show Time is a Next.js platform for discovering and booking movies, events,
and local experiences.

## Local development

1. Copy `.env.example` to `.env.local` and fill in the required service
   credentials.
2. Install dependencies with `npm install`.
3. Start the app with `npm run dev`.

The app is available at [http://localhost:3000](http://localhost:3000).

## Checks

```bash
npm run format:check
npm run lint
npm run build
```

## Project structure

- `app/`: App Router pages and route handlers.
- `components/`: shared site, provider, and motion components.
- `lib/`: Firebase and MongoDB integrations.
- `models/`: Mongoose schemas for the booking domain.
- `stores/`: client-side Zustand state.
