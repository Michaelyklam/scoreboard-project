# Sports Network Scoreboard

A sleek, real-time sports scoreboard application built with **Svelte 5** and **Convex**. Designed with a premium "Modern Sports Network" aesthetic, it supports instant live scoring, set tracking, and real-time spectator synchronization.

## Features

- **Live Scoring**: Track points and sets in real-time.
- **Spectator Mode**: Instant, websocket-driven synchronization for anyone with the game link. No refresh required.
- **Sports Network UI**: An immersive, dark-themed interface built natively with pure CSS, avoiding generic component libraries for a highly custom feel.
- **Match Archive**: Automatically stores finished games. Features robust fuzzy search (e.g. "Red vs Blue") and Date Picker filtering.
- **Custom Modals**: Fully custom-built UI modals instead of jarring browser prompts.

## Tech Stack

- Frontend: [SvelteKit](https://kit.svelte.dev/) (Svelte 5 Runes)
- Backend & Database: [Convex](https://convex.dev/)
- Styling: Pure CSS

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm / yarn / pnpm

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/Michaelyklam/scoreboard-sports-network.git
   cd scoreboard-sports-network
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Initialize Convex Backend:
   ```sh
   npx convex dev
   ```
   *Follow the prompts to log in and create a project on Convex. This will automatically scaffold your backend and generate the required `.env.local` files.*

4. Run the Development Server:
   Open a separate terminal window and run:
   ```sh
   npm run dev -- --open
   ```

## Development Commands

- `npm run dev`: Starts the SvelteKit development server.
- `npm run build`: Builds the app for production.
- `npx convex dev`: Syncs your Convex schema and functions, and runs the local backend server.

## License

MIT
