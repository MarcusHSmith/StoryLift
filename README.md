# StoryLift

A web application that helps users create Instagram Stories from YouTube videos. Users can paste a YouTube URL to get metadata, download the video locally, and then process it to create a 9:16 vertical video optimized for Instagram Stories.

**Note: This app focuses exclusively on YouTube video processing. Users must download YouTube videos manually before processing due to YouTube's terms of service.**

## Features

- YouTube URL metadata extraction (title, channel info)
- YouTube video processing for Instagram Stories format
- Video trimming with timeline scrubber
- 9:16 aspect ratio preview and export
- YouTube branding overlay options
- Client-side video processing
- Instagram Stories optimization

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Validation**: Zod
- **Testing**: Vitest + React Testing Library + Playwright
- **Video Processing**: WebCodecs + alternative encoding solutions
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd storylift

# Install dependencies
npm install

# Set up Git hooks
npm run prepare
```

### Development

```bash
# Start development server with Turbopack
npm run dev

# Open http://localhost:3000
```

### Testing

```bash
# Unit tests
npm run test          # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:ui       # Run tests with UI

# E2E tests
npm run test:e2e      # Run Playwright tests
npm run test:e2e:ui   # Run Playwright tests with UI
```

### Code Quality

```bash
# Linting
npm run lint          # Check for issues
npm run lint:fix      # Fix auto-fixable issues

# Formatting
npm run format        # Format code with Prettier
```

### Build & Deploy

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── health/         # Health check endpoint
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/          # Reusable components
│   └── ui/             # shadcn/ui components
├── lib/                 # Utility functions
└── test/                # Test setup
```

## Decisions Log

### Milestone 0 - Project Bootstrap ✅

- **Next.js 15**: Chosen for latest features, App Router, and Turbopack
- **TypeScript**: For type safety and better developer experience
- **Tailwind CSS v4**: Latest version with improved performance
- **shadcn/ui**: Component library built on Radix UI primitives
- **Zustand**: Lightweight state management alternative to Redux
- **Vitest**: Fast test runner with Vite integration
- **Playwright**: Modern E2E testing framework
- **Husky + lint-staged**: Git hooks for code quality
- **ESLint + Prettier**: Code linting and formatting

### Architecture Decisions

- **Client-side processing**: All video processing happens in the browser for privacy
- **WebCodecs first**: Use modern Web APIs when available, fallback to alternative encoding solutions
- **9:16 aspect ratio**: Optimized for Instagram Stories format
- **Progressive enhancement**: Core functionality works without advanced features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details
