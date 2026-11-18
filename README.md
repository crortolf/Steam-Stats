# Nexus: Steam Stats

Nexus is a social hub for Steam. Sign in, link your Steam account, and see your friends, the games they play, your achievements and game recommendations in one place.

## Features

### Friend Network
- Shows you in the middle with your Steam friends on rings around you, online friends nearest, and lines for the friendships between them.
- Hover over or select a player to highlight their connections.
- Selecting a player opens their card: status, country, current game, how long you've been friends, when they joined Steam, and when they were last online.

### Games & News
- Lists the games your friends played recently and which friends played each one, sortable by name or by number of friends.
- Select a game to see its news feed and open full articles. Steam's BBCode markup is rendered as formatted text, images and video.

### Achievements
- Pick a game to see every achievement, which ones you've unlocked, your rarest unlock, and each achievement's unlock rate among all players and among your friends.
- Compare your completion against your friends' and the global average, and sort the achievement list.

### Recommendations
- Recommend a game with a score, a written review, screenshots, and the achievements worth chasing, each with your own comment.
- Switch the feed between **Global** (everyone's posts) and **Friends** (only your Steam friends' posts), or view just your own.
- Filter the feed by game. Uploaded images are resized and stored in MongoDB.

### Accounts and privacy
- Email and password accounts with cookie sessions. Each user stores their own Steam ID and Steam Web API key on the profile page.
- Steam data that depends on privacy settings (friends lists, profiles, owned games) is cached per API key, so you only ever see what your own key is allowed to see. Shared data, such as achievement schemas and news, is cached for everyone.
- Players flagged for inappropriate usernames are censored wherever they appear.

## Tech stack

| Part | Stack |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/Base UI components |
| Backend | Node.js, Express 5, MongoDB, axios (Steam Web API), multer and sharp (image uploads) |
| Tests | Jest (backend), Vitest with React Testing Library (frontend) |

## Project layout

```
Backend/
  index.js          Express app, listens on port 5011
  routes/           auth, friendWeb, circleNews, achievements, recommendations
  controllers/      request handling for each route
  services/         Steam requests, MongoDB caching, users, recommendations, images
  scripts/          seed scripts for mock recommendations
  tests/            Jest tests
Frontend/
  app/              pages: home, network, games, achievements, recommendations, profile, sign in/up
  components/       feature components, plus components/ui building blocks
  lib/              API helpers, auth context, BBCode parser, utilities
  tests/            Vitest tests
```

## Getting started

### Requirements
- Node.js and [pnpm](https://pnpm.io/) (the frontend uses pnpm, the backend npm)
- MongoDB running locally on `mongodb://localhost:27017`. The app uses the `Steam-Stats` database.
- A [Steam Web API key](https://steamcommunity.com/dev/apikey). Each user enters their own after signing up.

### Backend

```bash
cd Backend
```

```bash
npm install
```

```bash
node index.js
```

The API runs at `http://localhost:5011`. It only accepts requests from `http://localhost:3000`. Set the `FRONTEND_ORIGIN` environment variable to change that.

### Frontend

```bash
cd Frontend
```

```bash
pnpm install
```

```bash
pnpm dev
```

Open `http://localhost:3000`, create an account, then add your Steam ID and API key on the profile page.

### Mock data (optional)

Both scripts run from `Backend/`, need the backend running, and mark everything they write so it can be removed cleanly.

```bash
node scripts/seedRecommendations.js
```

Fills the Global feed with posts from 10 fake users, using games already cached in the database.

```bash
node scripts/seedFriendRecommendations.js --name "Your Steam name"
```

Adds posts from a user's real Steam friends, so the Friends feed has content. That user must have visited the site once so their friends list is cached.

Pass `--remove` to either script to delete what it added.

## Tests

Neither test suite calls Steam or touches a real database: Steam requests and MongoDB are mocked.

```bash
cd Backend && npm test
```

```bash
cd Frontend && pnpm test:run
```

## Notes

- Nexus is not affiliated with Valve or Steam.
- This is set up for local development. Before deploying, serve over HTTPS, set `FRONTEND_ORIGIN` and `NODE_ENV=production`, and add a password to MongoDB. Steam API keys are stored in plain text. See `TODO.txt` for other open issues.
