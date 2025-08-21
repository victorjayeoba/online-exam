## Online Exam Portal

A Next.js (App Router) demo with a student exam flow, anti-cheat measures, webcam face detection, and an admin dashboard for viewing scores and suspicious activity logs.

### Key features
- **Student login and exam**: Simple login at `/` (demo-only), timed MCQ exam at `/exam` with progress tracking.
- **Anti-cheat signals**:
  - Fullscreen enforcement and exit detection
  - Context menu disabled during exam
  - Keyboard shortcuts blocked (Ctrl+C/V/X/P/A/S/U, PrintScreen, F11, Escape in fullscreen)
  - Tab switching and window blur detection
  - Page close/refresh confirmation
- **Webcam with face detection**: `components/exam/WebcamMonitor.tsx`
  - Uses `face-api.js` via CDN for lightweight face detection
  - Detects 0/1/multiple faces; overlays boxes and facial landmarks on a canvas
  - Reports status upward for warnings and logs
- **Admin dashboard**: `/admin` (after `/admin/login`)
  - Lists submissions with score, warnings, fullscreen exits
  - Logs are shown in a popup dialog to avoid long rows
- **Storage**: Submissions are appended to `data/exams.json` on the server (Node fs)

### Tech stack
- Next.js 15 (App Router) + React 19
- Tailwind CSS + shadcn/ui
- `face-api.js` (via CDN) for face detection/landmarks

## Local development
1. Install dependencies:
```
npm install
```
2. Run the dev server:
```
npm run dev
```
3. Open `http://localhost:3000`

- Demo login at `/`: username `testing`, password `testing` → routes to `/exam`.
- Admin login at `/admin/login`: default `admin` / `admin123`. Configure via env vars (below).

## Admin credentials (env)
Set environment variables to override defaults:
- `ADMIN_USERNAME` (default `admin`)
- `ADMIN_PASSWORD` (default `admin123`)

In Windows PowerShell:
```
$env:ADMIN_USERNAME = "myadmin"
$env:ADMIN_PASSWORD = "strongpass"
npm run dev
```

## Admin dashboard
- Visit `/admin/login`, sign in, then go to `/admin`.
- Click "View logs (N)" on a submission to open the popup with suspicious activity entries.
- Use the Logout button to clear the admin session.

## Data persistence and deployment notes
- Submissions are stored as JSON in `data/exams.json` using Node fs (`lib/storage.ts`).
- This works on localhost or any Node server/VM/container with a writable disk.
- It will NOT persist on serverless platforms (e.g., Vercel/Netlify) due to ephemeral/readonly filesystems.
- Admin sessions are in-memory (`lib/adminSession.ts`), so they reset on server restarts and do not work across multiple instances.

For production, replace with:
- A database (SQLite/Postgres/Mongo) to store submissions and sessions
- Real authentication/authorization (NextAuth/Auth.js/JWT/DB-backed sessions)

## API routes
- `POST /api/exams`
  - Body: `{ studentName, score, totalQuestions, cheatingLogs, warningCount, answers, fullscreenExits }`
  - Appends a submission to `data/exams.json`
- `GET /api/exams`
  - Admin-only (cookie `admin_session`)
  - Returns all submissions
- `POST /api/admin/login`
  - Body: `{ username, password }`
  - On success, sets `admin_session` cookie
- `POST /api/admin/logout`
  - Clears `admin_session` cookie

### Submission schema (server)
```json
{
  "id": "string",
  "timestampIso": "2025-01-01T12:34:56.000Z",
  "studentName": "Jane Doe",
  "score": 4,
  "totalQuestions": 5,
  "cheatingLogs": ["[12:00:10] Attempted to use right-click menu"],
  "warningCount": 1,
  "answers": {"0": "Paris", "1": "Mars"},
  "fullscreenExits": 0
}
```

## Webcam face detection details
`components/exam/WebcamMonitor.tsx` loads and uses `face-api.js` in the browser:
- Script: `https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js`
- Models: `https://justadudewhohacks.github.io/face-api.js/models`

### Models and options
- **Tiny Face Detector** (`nets.tinyFaceDetector`) is used for efficiency with:
  - `inputSize: 320`
  - `scoreThreshold: 0.5`
- **Landmarks** (`nets.faceLandmark68Net`) and **Expressions** (`nets.faceExpressionNet`) are also loaded.
- Detection call (every ~2s):
  - `faceapi.detectAllFaces(video, options).withFaceLandmarks().withFaceExpressions()`

### What we draw
- A 2D canvas is layered over the `<video>` element.
- For each detected face:
  - A colored rectangle is drawn around the face
  - A label like `Face #1` is rendered
  - 68-point face landmarks are drawn (eyes, nose, mouth, jawline)
- A counter overlay shows the total number of faces in frame

### Status communication
- Emits `onFaceDetectionReady(ready: boolean)` once models are loaded and an initial detection runs
- Emits `onFaceDetectionStatus(faceDetected: boolean, multipleFaces: boolean, faceCount: number)` every cycle
- Parent page shows warnings when no face or multiple faces are found

### Notes and limitations
- Relying on CDNs: if blocked or offline, model loading fails. Consider self-hosting models locally (e.g., copy `models` into `public/face-models` and load from `/face-models`).
- Performance: TinyFaceDetector is lightweight, but detection frequency and resolution impact CPU. Tuning `inputSize` or using a Web Worker can help under load.
- Lighting and camera quality affect detection reliability.

## Anti-cheat disclaimers
Client-side anti-cheat is best-effort and not tamper-proof. Determined users can bypass browser restrictions. For graded/secure exams, combine with proctoring solutions, server-side validations, and human review of logs.

## Scripts
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm start` — run production server (after build)

## License and credits
- Face detection powered by `face-api.js` (MIT)
- UI components based on shadcn/ui 