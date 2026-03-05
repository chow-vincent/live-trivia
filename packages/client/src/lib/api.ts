// Typed API client for host dashboard endpoints.
// Automatically injects Clerk auth token into all requests.

type GameSummary = {
  gameCode: string;
  name: string;
  status: string;
  playerCount: number;
  createdAt: number;
};

type GamesListResponse = {
  games: GameSummary[];
  nextCursor?: string;
};

type GameDetailResponse = {
  game: import('@live-trivia/shared').Game;
  players: import('@live-trivia/shared').Player[];
  leaderboard: import('@live-trivia/shared').LeaderboardEntry[];
};

type QuestionStat = {
  questionIdx: number;
  text: string;
  type: string;
  totalAnswers: number;
  correctCount: number;
  correctPercent: number;
};

type GameResultsResponse = {
  leaderboard: import('@live-trivia/shared').LeaderboardEntry[];
  questionStats: QuestionStat[];
};

type CreateGameResponse = {
  gameCode: string;
  name: string;
  status: string;
  questionCount: number;
};

let getToken: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(fn: () => Promise<string | null>) {
  getToken = fn;
}

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken ? await getToken() : null;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return res;
}

export const api = {
  async listGames(cursor?: string, limit = 20): Promise<GamesListResponse> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    const res = await authFetch(`/api/host/games?${params}`);
    return res.json();
  },

  async getGame(code: string): Promise<GameDetailResponse> {
    const res = await authFetch(`/api/host/games/${code}`);
    return res.json();
  },

  async createGame(data: { name: string; questions: unknown[]; launch?: boolean }): Promise<CreateGameResponse> {
    const res = await authFetch('/api/host/games', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateGame(code: string, data: { name?: string; questions?: unknown[] }): Promise<void> {
    await authFetch(`/api/host/games/${code}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteGame(code: string): Promise<void> {
    await authFetch(`/api/host/games/${code}`, { method: 'DELETE' });
  },

  async launchGame(code: string): Promise<{ gameCode: string; status: string }> {
    const res = await authFetch(`/api/host/games/${code}/launch`, { method: 'POST' });
    return res.json();
  },

  async duplicateGame(code: string): Promise<CreateGameResponse> {
    const res = await authFetch(`/api/host/games/${code}/duplicate`, { method: 'POST' });
    return res.json();
  },

  async getResults(code: string): Promise<GameResultsResponse> {
    const res = await authFetch(`/api/host/games/${code}/results`);
    return res.json();
  },

  getExportUrl(code: string): string {
    return `/api/host/games/${code}/export`;
  },
};

export type { GameSummary, GamesListResponse, GameDetailResponse, GameResultsResponse, CreateGameResponse };
