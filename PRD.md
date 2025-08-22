# StoryLift — Build Plan

This is the project board in a single markdown file. Everything is TypeScript and deploys on Vercel. Check items off as you go.

---

## Milestone 0 project bootstrap ✅

- [x] Create Vercel project and Next.js 15 app with TypeScript and Turbopack
- [x] Add Tailwind CSS and set up base theme tokens
- [x] Install dependencies react, zustand, zod, class-variance-authority, lucide-react
- [x] Add shadcn ui and generate Button, Card, Input, Slider, Dialog
- [x] Set up absolute imports and `@` alias
- [x] Configure ESLint, Prettier, Husky pre-commit
- [x] ~~Add Vitest and React Testing Library~~ (removed)
- [x] ~~Add Playwright for E2E smoke tests~~ (removed)
- [x] Add a basic `/health` route returning app version and build time
- [x] Create a minimal README with run scripts and decisions log

---

## Milestone 1 core UX and routing ✅

- [x] Pages `/` for input, `/editor` for trimming and layout, `/export` for downloads
- [x] Global layout with responsive container and a 9 by 16 preview frame
- [x] App header with name and GitHub link (https://github.com/MarcusHSmith/StoryLift)
- [x] Empty state illustration for first load
- [x] Add theme toggle and system preference support

---

## Milestone 2 metadata from YouTube URL ✅

- [x] Component `YouTubeUrlForm` with validation using zod
- [x] Extract video id from common URL patterns
- [x] Fetch metadata via oEmbed for title and thumbnail
- [x] Fetch channel name and avatar and subscriber count via no-auth public endpoints where available, otherwise ask user to enter channel handle
- [x] Store metadata in global state
- [x] Show title, channel avatar, and channel name preview, channel subscriber count
- [x] Handle private video or invalid URL errors with friendly messages

---

## Milestone 3 local file ingest

- [ ] Component `SourcePicker` with drag and drop and file input
- [ ] Accept MP4 and MOV only client side
- [ ] Probe duration and streams using mediainfo wasm or ffmpeg.wasm `ffprobe` build
- [ ] Show file details resolution, fps, duration
- [ ] Persist a file handle using OPFS or File System Access API when supported
- [ ] Guardrails file size limit setting with warning prompts

---

## Milestone 5 canvas and preview

- [ ] Create an OffscreenCanvas backed preview running in a Web Worker
- [ ] 9 by 16 canvas at preview scale fit to viewport
- [ ] Draw background blur layer from source frame
- [ ] Draw fit video layer centered
- [ ] Toggle between blurred edge mode and smart crop mode
- [ ] Safe zone overlay guides top clear and bottom clear
- [ ] Render title and channel strip as separate transparent layer
- [ ] Font loading with fallback stack and text overflow ellipsis

---

## Milestone 6 subject aware crop optional

- [ ] Lightweight face detection via MediaPipe Face Detection
- [ ] Compute a tracking window and smooth with a simple Kalman or exponential filter
- [ ] Clamp crop bounds to avoid jitter
- [ ] Fallback to center crop when no face is found

---

## Milestone 7 encoding path WebCodecs fast path

- [ ] Feature detect `VideoEncoder` and `AudioEncoder`
- [ ] Configure H 264 `avc1` baseline or main profile 1080 by 1920 30 fps
- [ ] Target bitrate 6 Mbps
- [ ] Encode frames from the worker preview pipeline without duplicate work
- [ ] Package into MP4 container using mp4 muxer library or fallback to ffmpeg.wasm for mux
- [ ] AAC audio encode or copy from source when compatible

---

## Milestone 8 encoding path ffmpeg.wasm universal

- [ ] Integrate ffmpeg.wasm in a dedicated worker with lazy loading
- [ ] Filter graph for background blur, fit layer, and overlay layer
- [ ] Encode H 264 AAC MP4 with `+faststart`
- [ ] Progress callback tied to a UI progress bar
- [ ] Memory tuning reuse buffers and clean FS after export

---

## Milestone 9 export and downloads

- [ ] Export MP4 to user downloads with friendly filename
- [ ] Export a JPEG cover image at one second after start
- [ ] Show file size and duration summary
- [ ] Copy caption button with YouTube link and hashtags
- [ ] Post export checklist with “Open in Instagram” instructions

---

## Milestone 10 layout presets and style

- [ ] Preset A YouTube chrome bar on top of video
- [ ] Preset B Chrome bar below video
- [ ] Preset C Minimal only title and channel on translucent glass
- [ ] Color scheme picker light, dark, and brand color accent
- [ ] Avatar shape toggle circle or rounded square
- [ ] Optional faux progress bar element

---

## Milestone 11 safe zones for Instagram

- [ ] Top safe area guide approximately 150 to 220 pixels on a 1080 by 1920 canvas
- [ ] Bottom reserved area guide approximately 300 to 380 pixels for the link sticker
- [ ] Toggle to show hide guides
- [ ] Prevent placing title or channel UI inside the reserved zones

---

## Milestone 12 state and persistence

- [ ] Global state with zustand for project data
- [ ] Persist last project to localStorage excluding binary data
- [ ] Project export import as JSON for collaboration
- [ ] Versioning of project schema with migrations

---

## Milestone 13 error states and resilience

- [ ] Graceful handling of unsupported codecs
- [ ] Timeout and cancel controls for long renders
- [ ] Retry pipeline button that reuses decoded frames when possible
- [ ] Analytics events for failures with anonymous telemetry toggle

---

## Milestone 14 branding and compliance

- [ ] Pull official YouTube logo assets and follow spacing and color rules
- [ ] Add attribution text when showing YouTube marks
- [ ] Attestation checkbox user confirms rights to uploaded file
- [ ] Legal copy in footer linking to terms and privacy
- [ ] Document that the app does not download from YouTube and processes user provided files locally

---

## Milestone 15 performance polish

- [ ] Workerize all heavy modules
- [ ] Defer ffmpeg.wasm load until editor mount
- [ ] Use OPFS for temp files to avoid memory copies
- [ ] Frame pooling in WebCodecs path
- [ ] FPS throttle on preview for low end devices
- [ ] Lighthouse pass for main thread blocking time

---

## Milestone 16 documentation and examples

- [ ] Update README with feature list and screenshots
- [ ] Add “How it works” page describing the client side pipeline
- [ ] Publish example presets JSON and a couple of demo outputs
- [ ] Short Loom demo linked in the repo

---

## Milestone 18 CI and deployment

- [ ] Vercel deployment with preview URLs on PRs
- [ ] GitHub Actions for type check, lint, unit tests, and Playwright smoke on each PR
- [ ] Environment banner showing commit hash and build time
- [ ] Error reporting wired to console and optional Sentry

---

## Acceptance criteria v1

- [ ] User pastes a YouTube URL and sees title and channel avatar within two seconds
- [ ] User selects a local file, trims a segment up to 60 seconds, and previews it vertically with safe zones
- [ ] Export completes entirely client side and downloads an MP4 that plays on iPhone and Android
- [ ] Output shows video, title, and channel info with reserved bottom area for link sticker
- [ ] Cover JPEG exports correctly

---

## Technical targets Instagram Stories

- [ ] Aspect ratio 9 by 16
- [ ] Resolution 1080 by 1920 preferred
- [ ] Frame rate 30 fps
- [ ] Video codec H 264 in MP4
- [ ] Bitrate target 5 to 7.5 Mbps
- [ ] Audio AAC 44.1 kHz at 128 kbps
