# Live Trivia

A real-time trivia game where a host creates games, imports questions, and controls the flow — while players join on their phones via a short game code.

## Architecture

```
┌─────────────┐     WebSocket      ┌──────────────────┐     DynamoDB
│   Players   │◄──── Socket.IO ───►│  Express Server   │◄──────────►  LiveTrivia table
│  (phones)   │                    │  (Fargate)        │
└─────────────┘                    └──────────────────┘
                                          ▲
┌─────────────┐     WebSocket             │
│    Host      │◄──── Socket.IO ──────────┘
│  (browser)  │
└─────────────┘
```

**Stack**: React + Vite frontend, Express + Socket.IO backend, DynamoDB, Tailwind CSS. Deployed as a single Docker container on AWS ECS Fargate behind an ALB.

## Monorepo Structure

```
packages/
├── shared/          TypeScript types + question plugin registry
├── server/          Express + Socket.IO backend
├── client/          React SPA (Vite + Tailwind)
└── infra/           AWS CDK infrastructure (Python)
```

## Game Flow

1. **Host** creates a game by importing questions (JSON) at `/host`
2. **Host** sees a lobby at `/host/lobby` with a 4-character game code
3. **Players** join at `/` by entering the code and their name
4. **Host** approves or rejects each player
5. **Host** starts each question — players see it with a countdown timer
6. When time expires (or host ends early), the host sees all answers with auto-grade suggestions
7. **Host** reviews/adjusts scores and submits grades
8. Everyone sees the leaderboard, then the host advances to the next question
9. After the final question, the game ends with a final leaderboard

## Question Types

The system is built on an extensible plugin registry. Three types ship out of the box:

| Type | Player UI | Auto-grading |
|------|-----------|-------------|
| **Free text** | Text input | Case-insensitive match against correct + acceptable answers |
| **Multiple choice** | Option buttons (A/B/C/D) | Index equality |
| **Ranking** | Drag-and-drop sortable list | Proportional — points for each item in the correct position |

Adding a new question type requires changes in only 4-5 files — no modifications to game flow, socket events, or database schema.

## Development

### Prerequisites

- Node.js 22+
- pnpm (`npm install -g pnpm`)

### Setup

```bash
pnpm install
pnpm dev
```

This starts all three packages in parallel:
- **shared** — TypeScript compiler in watch mode
- **server** — Express on `http://localhost:3001` (in-memory store, no AWS needed)
- **client** — Vite dev server on `http://localhost:5173` (proxies `/api` and `/socket.io` to the server)

### Local Testing

1. Open `http://localhost:5173/host` — create a game with sample questions
2. Open `http://localhost:5173` in an incognito tab — join as a player
3. Approve the player in the host tab, then start the game

### Build

```bash
pnpm build
```

## Question Import Format

Paste JSON when creating a game:

```json
[
  {
    "type": "free_text",
    "text": "In what year did the Berlin Wall fall?",
    "correctAnswer": "1989",
    "acceptableAnswers": ["1989"],
    "timeLimit": 30,
    "points": 10
  },
  {
    "type": "multiple_choice",
    "text": "What is the capital of Australia?",
    "options": ["Sydney", "Canberra", "Melbourne", "Brisbane"],
    "correctOptionIndex": 1,
    "timeLimit": 20,
    "points": 10
  },
  {
    "type": "ranking",
    "text": "Rank these planets by distance from the Sun (closest first)",
    "items": ["Mars", "Venus", "Mercury", "Earth"],
    "correctOrder": ["Mercury", "Venus", "Earth", "Mars"],
    "timeLimit": 45,
    "points": 10
  }
]
```

## Deployment

See [packages/infra/README.md](packages/infra/README.md) for full infrastructure and deployment details.

### Quick Deploy

```bash
cd packages/infra
npx cdk bootstrap aws://<ACCOUNT_ID>/us-west-2   # one-time
./deploy.sh
```

### Tear Down

```bash
cd packages/infra
source .venv/bin/activate
npx cdk destroy
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `CORS_ORIGIN` | `*` | Allowed CORS origins |
| `USE_DYNAMODB` | (unset) | Set to `true` to use DynamoDB instead of in-memory store |
| `DYNAMODB_TABLE` | `LiveTrivia` | DynamoDB table name |
| `AWS_REGION` | `us-west-2` | AWS region for DynamoDB |
| `DYNAMODB_ENDPOINT` | (unset) | Custom DynamoDB endpoint (for local dev with DynamoDB Local) |
