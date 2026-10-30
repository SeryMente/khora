// Jules API v1alpha adapter

import { emitirEventoServicio } from "@/lib/server/service-observability";

const JULES_API_BASE_URL = "https://jules.googleapis.com/v1alpha";

export type AutomationMode = "AUTOMATION_MODE_UNSPECIFIED" | "AUTO_CREATE_PR";

export interface GitHubRepoContext {
  startingBranch: string;
}

export interface SourceContext {
  source: string; // Format: "sources/{source}"
  githubRepoContext?: GitHubRepoContext;
}

export interface Session {
  name: string;
  id: string;
  prompt: string;
  title?: string;
  state: string;
  url: string;
  sourceContext: SourceContext;
  requirePlanApproval?: boolean;
  automationMode?: AutomationMode;
  outputs?: any[];
  createTime: string;
  updateTime: string;
}

export interface GitHubBranch { displayName: string }

export interface GitHubRepo {
  owner: string;
  repo: string;
  isPrivate?: boolean;
  defaultBranch?: GitHubBranch;
  branches?: GitHubBranch[];
}

export interface Source {
  name: string;
  id: string;
  githubRepo?: GitHubRepo;
}

export interface Activity {
  name: string;
  id: string;
  originator: string;
  description?: string;
  createTime: string;
  artifacts?: any[];
  planGenerated?: any;
  planApproved?: any;
  userMessaged?: any;
  agentMessaged?: any;
  progressUpdated?: any;
  sessionCompleted?: any;
  sessionFailed?: any;
}

export interface ListSessionsResponse {
  sessions: Session[];
  nextPageToken?: string;
}

export interface ListSourcesResponse {
  sources: Source[];
  nextPageToken?: string;
}

export interface ListActivitiesResponse {
  activities: Activity[];
  nextPageToken?: string;
}

/** Validate a concrete Jules source resource name before sending it to the API. */
export function normalizeSourceName(value: string): string {
  const input = value.trim();
  const match = input.match(/^sources\/([A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*)$/);
  if (!match || match[1].split("/").some(part => part === "." || part === "..")) {
    throw new Error("JULES_SOURCE_ID_INVALID");
  }
  return `sources/${match[1]}`;
}

/** Accept a Jules session ID or sessions/{id}, never an arbitrary URL/path. */
function normalizeSessionId(id: string): string {
  const value = id.trim().replace(/^sessions\//, "");
  if (!value || value.includes("/") || value.includes("?") || value.includes("#") || value.includes("\\") || value === "." || value === "..") {
    throw new Error("JULES_SESSION_ID_INVALID");
  }
  return encodeURIComponent(value);
}

export class JulesApiError extends Error {
  public status: number;
  public data: any;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = "JulesApiError";
    this.status = status;
    this.data = data;
  }
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Backoff configuration
// base: 500ms, max retries: 3
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

/** Redact complete repository/source paths and session IDs before observability. */
export function sanitizeJulesRouteForLog(url: string): string {
  try {
    return new URL(url).pathname
      .replace(/\/sources\/[^/?#]+/g, "/sources/:id")
      .replace(/\/sessions\/[^/?#]+/g, "/sessions/:id")
      .slice(0, 240);
  } catch {
    return "unknown";
  }
}
async function fetchWithBackoff(url: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method || "GET").toUpperCase();
  const retrySafe = method === "GET" || method === "HEAD";
  let attempt = 0;
  const startedAt = Date.now();
  const pathname = sanitizeJulesRouteForLog(url);
  while (true) {
    let response: Response;
    try {
      response = await fetch(url, options);
    } catch (error) {
      if (!retrySafe) {
        emitirEventoServicio({ service: "jules", operation: "http.dependency", method, provider: "google-jules", dependency: "jules.googleapis.com", route: pathname, outcome: "FAILURE", severity: "ERROR", durationMs: Date.now() - startedAt, reasonCode: "WRITE_RESULT_AMBIGUOUS" });
        throw new JulesApiError("JULES_WRITE_RESULT_AMBIGUOUS", 0, null);
      }
      if (attempt >= MAX_RETRIES) {
        emitirEventoServicio({ service: "jules", operation: "http.dependency", method, provider: "google-jules", dependency: "jules.googleapis.com", route: pathname, outcome: "FAILURE", severity: "ERROR", durationMs: Date.now() - startedAt, reasonCode: error instanceof Error ? error.name.slice(0, 64) : "NETWORK_ERROR" });
        throw error;
      }
      attempt++;
      await delay(BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 200);
      continue;
    }
    if (response.ok) {
      emitirEventoServicio({ service: "jules", operation: "http.dependency", method, provider: "google-jules", dependency: "jules.googleapis.com", route: pathname, statusCode: response.status, outcome: "SUCCESS", durationMs: Date.now() - startedAt });
      return response;
    }
    if (retrySafe && response.status === 429 && attempt < MAX_RETRIES) {
      attempt++;
      await delay(BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 200);
      continue;
    }
    if (retrySafe && response.status >= 500 && response.status < 600 && attempt < 1) {
      attempt++;
      await delay(BASE_DELAY_MS + Math.random() * 200);
      continue;
    }
    emitirEventoServicio({ service: "jules", operation: "http.dependency", method, provider: "google-jules", dependency: "jules.googleapis.com", route: pathname, statusCode: response.status, outcome: "FAILURE", severity: response.status >= 500 ? "ERROR" : "WARN", durationMs: Date.now() - startedAt, reasonCode: !retrySafe && response.status >= 500 ? "WRITE_RESULT_AMBIGUOUS" : "HTTP_" + response.status });
    if (!retrySafe && response.status >= 500) throw new JulesApiError("JULES_WRITE_RESULT_AMBIGUOUS", response.status, null);
    let errorData: unknown = null;
    try {
      const body = await response.text();
      try { errorData = JSON.parse(body); } catch { errorData = body; }
    } catch { errorData = "Unable to parse error response"; }
    throw new JulesApiError(response.status === 429 ? "JULES_RATE_LIMITED" : "Jules API request failed with status " + response.status, response.status, errorData);
  }
}
function getHeaders(): HeadersInit {
  const apiKey = process.env.JULES_API_KEY;
  if (!apiKey) {
    throw new Error("Jules API key is not configured.");
  }
  return {
    "Content-Type": "application/json",
    "x-goog-api-key": apiKey,
  };
}

export async function listSessions(pageSize: number = 30, pageToken?: string): Promise<ListSessionsResponse> {
  const boundedPageSize = Math.min(100, Math.max(1, Math.trunc(pageSize)));
  const url = new URL(`${JULES_API_BASE_URL}/sessions`);
  url.searchParams.set("pageSize", String(boundedPageSize));
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  const response = await fetchWithBackoff(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });
  return response.json();
}

export async function listSources(pageSize: number = 50, pageToken?: string): Promise<ListSourcesResponse> {
  const boundedPageSize = Math.min(100, Math.max(1, Math.trunc(pageSize)));
  const url = new URL(`${JULES_API_BASE_URL}/sources`);
  url.searchParams.set("pageSize", String(boundedPageSize));
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  const response = await fetchWithBackoff(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });
  return response.json();
}

/** Read an exact source resource using the documented Jules sources.get endpoint. */
export async function getSource(name: string): Promise<Source> {
  const sourceName = normalizeSourceName(name);
  const encodedPath = sourceName.split("/").map(encodeURIComponent).join("/");
  const response = await fetchWithBackoff(JULES_API_BASE_URL + "/" + encodedPath, { method: "GET", headers: getHeaders() });
  return response.json();
}
export async function createSession(params: {
  prompt: string;
  sourceContext: SourceContext;
  title?: string;
  automationMode?: AutomationMode;
  requirePlanApproval: boolean;
}): Promise<Session> {
  const response = await fetchWithBackoff(`${JULES_API_BASE_URL}/sessions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(params),
  });
  return response.json();
}

export async function getSession(id: string): Promise<Session> {
  const sessionId = normalizeSessionId(id);
  const response = await fetchWithBackoff(`${JULES_API_BASE_URL}/sessions/${sessionId}`, {
    method: "GET",
    headers: getHeaders(),
  });
  return response.json();
}

// Official Jules API contract: pageSize (1..100) and pageToken.
export async function listActivitiesPage(
  id: string,
  pageSize: number = 50,
  pageToken?: string,
): Promise<ListActivitiesResponse> {
  const sessionId = normalizeSessionId(id);
  const boundedPageSize = Math.min(100, Math.max(1, Math.trunc(pageSize)));
  const url = new URL(`${JULES_API_BASE_URL}/sessions/${sessionId}/activities`);
  url.searchParams.set("pageSize", String(boundedPageSize));
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  const response = await fetchWithBackoff(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });
  return response.json();
}

/** Backwards-compatible time-filtered reader for existing internal Jules jobs. */
export async function listActivities(id: string, createTimeCursor?: string): Promise<ListActivitiesResponse> {
  const sessionId = normalizeSessionId(id);
  const url = new URL(`${JULES_API_BASE_URL}/sessions/${sessionId}/activities`);
  if (createTimeCursor) url.searchParams.set("createTime", createTimeCursor);
  const response = await fetchWithBackoff(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });
  return response.json();
}

export async function sendMessage(id: string, prompt: string): Promise<void> {
  const sessionId = normalizeSessionId(id);
  await fetchWithBackoff(`${JULES_API_BASE_URL}/sessions/${sessionId}:sendMessage`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ prompt }),
  });
}

export async function approvePlan(id: string): Promise<void> {
  const sessionId = normalizeSessionId(id);
  await fetchWithBackoff(`${JULES_API_BASE_URL}/sessions/${sessionId}:approvePlan`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({}),
  });
}
