/**
 * Leaderboard — ultra-simple, no backend of our own, no paid API.
 *
 * Two interchangeable providers behind one facade:
 *
 *   • LocalProvider   — default. Stores the board in localStorage. Zero setup,
 *                       zero cost, fully offline. Per-device only (not global).
 *
 *   • PlayFabProvider — opt-in global board. Activated by setting the public
 *                       Title ID in `VITE_PLAYFAB_TITLE_ID`. Uses PlayFab's
 *                       *client* REST API only (the Title ID is public — there
 *                       is NO secret key in the bundle and NO server of ours).
 *                       PlayFab's free tier covers anonymous device login +
 *                       leaderboards, so there is no paid API involved.
 *
 * Identity & anti-overwrite ("aby si ľudia neprepisovali skóre"):
 *   - Every device gets one stable UID (localStorage). All writes are keyed by
 *     that UID, so a device owns exactly one row — no duplicate entries.
 *   - Only a *higher* score is ever kept. Locally we max() on submit; on
 *     PlayFab the statistic must be configured with aggregation = Maximum so
 *     the server itself rejects any lower value. A client can therefore never
 *     lower (or, with Maximum, fake-overwrite downward) an existing score.
 *
 * NOTE: a fully cheat-proof board needs server-side validation (PlayFab
 * CloudScript / a real backend). That is out of scope by request — this is the
 * "aspoň trochu secure" tier: stable identity + server-side max aggregation.
 */

const STAT_NAME = 'HighScore';

const UID_KEY   = 'dual_uid';
const NAME_KEY  = 'dual_name';
const LOCAL_KEY = 'dual_lb';

const NAME_MAX = 14;
const NAME_MIN = 3;   // PlayFab display-name minimum

export interface LbRow {
  rank: number;
  name: string;
  score: number;
  you: boolean;
}

interface Provider {
  /** true if the board is shared across devices */
  readonly global: boolean;
  submit(uid: string, name: string, score: number, level: number): Promise<void>;
  setName(uid: string, name: string): Promise<void>;
  top(count: number, uid: string): Promise<LbRow[]>;
}

/* ------------------------------------------------------------------ */
/*  LOCAL PROVIDER                                                     */
/* ------------------------------------------------------------------ */

interface LocalEntry { uid: string; name: string; score: number; level: number; }

class LocalProvider implements Provider {
  readonly global = false;

  private load(): LocalEntry[] {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? JSON.parse(raw) as LocalEntry[] : [];
    } catch {
      return [];
    }
  }

  private save(entries: LocalEntry[]): void {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(entries));
  }

  async submit(uid: string, name: string, score: number, level: number): Promise<void> {
    const all = this.load();
    const existing = all.find(e => e.uid === uid);
    if (existing) {
      existing.name = name;
      /* keep only the best — never overwrite with a lower score */
      if (score > existing.score) {
        existing.score = score;
        existing.level = level;
      }
    } else {
      all.push({ uid, name, score, level });
    }
    this.save(all);
  }

  async setName(uid: string, name: string): Promise<void> {
    const all = this.load();
    const existing = all.find(e => e.uid === uid);
    if (existing) {
      existing.name = name;
      this.save(all);
    }
  }

  async top(count: number, uid: string): Promise<LbRow[]> {
    return this.load()
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map((e, i) => ({ rank: i + 1, name: e.name, score: e.score, you: e.uid === uid }));
  }
}

/* ------------------------------------------------------------------ */
/*  PLAYFAB PROVIDER (client REST only — public Title ID, no secrets)  */
/* ------------------------------------------------------------------ */

interface Session { ticket: string; id: string; }

class PlayFabProvider implements Provider {
  readonly global = true;
  private readonly base: string;
  private readonly titleId: string;
  private session: Promise<Session> | null = null;

  constructor(titleId: string) {
    this.titleId = titleId;
    this.base = `https://${titleId}.playfabapi.com`;
  }

  private async post(path: string, body: unknown, auth?: string): Promise<any> {
    const res = await fetch(this.base + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { 'X-Authorization': auth } : {})
      },
      body: JSON.stringify(body)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.errorMessage || `PlayFab ${path} ${res.status}`);
    return json.data;
  }

  /** Anonymous, device-based login — cached for the session. */
  private login(uid: string): Promise<Session> {
    if (!this.session) {
      this.session = this.post('/Client/LoginWithCustomID', {
        TitleId: this.titleId,
        CustomId: uid,
        CreateAccount: true
      })
        .then(d => ({ ticket: d.SessionTicket as string, id: d.PlayFabId as string }))
        .catch(e => { this.session = null; throw e; });
    }
    return this.session;
  }

  private async pushName(name: string, ticket: string): Promise<void> {
    if (!name || name.length < NAME_MIN) return;
    try {
      await this.post('/Client/UpdateUserTitleDisplayName', { DisplayName: name }, ticket);
    } catch {
      /* name may be rejected (taken / invalid) — keep the score regardless */
    }
  }

  async submit(uid: string, name: string, score: number, _level: number): Promise<void> {
    const s = await this.login(uid);
    await this.pushName(name, s.ticket);
    /* Server keeps the max when the statistic's aggregation = Maximum. */
    await this.post('/Client/UpdatePlayerStatistics', {
      Statistics: [{ StatisticName: STAT_NAME, Value: score }]
    }, s.ticket);
  }

  async setName(uid: string, name: string): Promise<void> {
    const s = await this.login(uid);
    await this.pushName(name, s.ticket);
  }

  async top(count: number, uid: string): Promise<LbRow[]> {
    const s = await this.login(uid);
    const d = await this.post('/Client/GetLeaderboard', {
      StatisticName: STAT_NAME,
      StartPosition: 0,
      MaxResultsCount: Math.min(count, 100)
    }, s.ticket);
    const rows = (d?.Leaderboard ?? []) as any[];
    return rows.map(e => ({
      rank: (e.Position ?? 0) + 1,
      name: e.DisplayName || 'Anonymous',
      score: e.StatValue ?? 0,
      you: e.PlayFabId === s.id
    }));
  }
}

/* ------------------------------------------------------------------ */
/*  FACADE                                                             */
/* ------------------------------------------------------------------ */

class Leaderboard {
  private uid = '';
  private name = '';
  private provider!: Provider;
  private inited = false;

  init(): void {
    if (this.inited) return;
    this.inited = true;

    this.uid = localStorage.getItem(UID_KEY) || this.genUid();
    localStorage.setItem(UID_KEY, this.uid);
    this.name = localStorage.getItem(NAME_KEY) || '';

    const titleId = (import.meta.env.VITE_PLAYFAB_TITLE_ID as string | undefined)?.trim();
    this.provider = titleId ? new PlayFabProvider(titleId) : new LocalProvider();
  }

  private genUid(): string {
    const c = globalThis.crypto as Crypto | undefined;
    if (c?.randomUUID) return c.randomUUID();
    return 'uid-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  /** Sanitize a user-entered name (trim, length cap). */
  private clean(name: string): string {
    return name.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  }

  isGlobal(): boolean { return this.provider.global; }
  getName(): string { return this.name; }

  /** Name actually shown on the board — falls back to a UID-derived handle. */
  displayName(): string {
    return this.name || ('Player-' + this.uid.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase());
  }

  /** Persist a new name and propagate it to the current entry (if any). */
  async setName(name: string): Promise<void> {
    this.name = this.clean(name);
    localStorage.setItem(NAME_KEY, this.name);
    try {
      await this.provider.setName(this.uid, this.displayName());
    } catch (e) {
      console.warn('[leaderboard] setName failed', e);
    }
  }

  async submit(score: number, level: number): Promise<void> {
    if (score <= 0) return;
    try {
      await this.provider.submit(this.uid, this.displayName(), score, level);
    } catch (e) {
      console.warn('[leaderboard] submit failed', e);
    }
  }

  top(count = 20): Promise<LbRow[]> {
    return this.provider.top(count, this.uid);
  }
}

export const leaderboard = new Leaderboard();
