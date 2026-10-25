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

export interface Source {
  name: string;
  id: string;
  githubRepo?: any;
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

async function fetchWithBackoff(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  let attempt = 0;
  const startedAt = Date.now();
  let pathname = "unknown";
  try {
    pathname = new URL(url).pathname
      .replace(/\/(sessions|sources)\/[^/]+/g, "/$1/:id")
      .slice(0, 240);
  } catch {
    // Safe placeholder.
  }

  while (true) {
    let response: Response;

    try {
      response = await fetch(url, options);
    } catch (error) {
      if (attempt >= MAX_RETRIES) {
        emitirEventoServicio({
          service: "jules",
          operation: "http.dependency",
          method: options.method || "GET",
          provider: "google-jules",
          dependency: "jules.googleapis.com",
          route: pathname,
          outcome: "FAILURE",
          severity: "ERROR",
          durationMs: Date.now() - startedAt,
          reasonCode: error instanceof Error ? error.name.slice(0, 64) : "NETWORK_ERROR",
        });
        throw error;
      }
      attempt++;
      const sleepTime = BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 200;
      await delay(sleepTime);
      continue;
    }

    if (response.ok) {
      emitirEventoServicio({
        service: "jules",
        operation: "http.dependency",
        method: options.method || "GET",
        provider: "google-jules",
        dependency: "jules.googleapis.com",
        route: pathname,
        statusCode: response.status,
        outcome: "SUCCESS",
        durationMs: Date.now() - startedAt,
      });
      return response;
    }

    if (response.status === 429 && attempt < MAX_RETRIES) {
      attempt++;
      const sleepTime = BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 200;
      await delay(sleepTime);
      continue;
    }

    if (response.status >= 500 && response.status < 600 && attempt < 1) { // 1 retry on 5xx
      attempt++;
      const sleepTime = BASE_DELAY_MS + Math.random() * 200;
      await delay(sleepTime);
      continue;
    }

    emitirEventoServicio({
      service: "jules",
      operation: "http.dependency",
      method: options.method || "GET",
      provider: "google-jules",
      dependency: "jules.googleapis.com",
      route: pathname,
      statusCode: response.status,
      outcome: "FAILURE",
      severity: response.status >= 500 ? "ERROR" : "WARN",
      durationMs: Date.now() - startedAt,
      reasonCode: "HTTP_" + response.status,
    });

    // Unrecoverable error or max retries reached
    let errorData = null;
    try {
      const text = await response.text();
      try {
        errorData = JSON.parse(text);
      } catch (e) {
        errorData = text;
      }
    } catch (e) {
      errorData = "Unable to parse error response";
    }
    throw new JulesApiError(`Jules API request failed with status ${response.status}`, response.status, errorData);
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
  const url = new URL(`${JULES_API_BASE_URL}/sessions`);
  url.searchParams.append("pageSize", pageSize.toString());
  if (pageToken) {
    url.searchParams.append("pageToken", pageToken);
  }
  const response = await fetchWithBackoff(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });
  return response.json();
}

export async function listSources(pageSize: number = 50, pageToken?: string): Promise<ListSourcesResponse> {
  const url = new URL(`${JULES_API_BASE_URL}/sources`);
  url.searchParams.set("pageSize", String(Math.min(100, Math.max(1, Math.trunc(pageSize)))));
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  const response = await fetchWithBackoff(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });
  return response.json();
}

export async function createSession(params: {
  prompt: string;
  sourceContext: SourceContext;
  automationMode?: AutomationMode;
  requirePlanApproval: boolean;
  title?: string;
}): Promise<Session> {
  const response = await fetchWithBackoff(`${JULES_API_BASE_URL}/sessions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(params),
  });
  return response.json();
}

function normalizeSessionId(id: string): string {
  const value = id.trim().replace(/^sessions\//, "");
  if (!value || value.includes("/") || value.includes("?") || value.includes("#") || value.includes("\\\\") || value === "." || value === "..") {
    throw new Error("JULES_SESSION_ID_INVALID");
  }
  return encodeURIComponent(value);
}

export async function getSession(id: string): Promise<Session> {
  const sessionId = normalizeSessionId(id);
  const response = await fetchWithBackoff(`${JULES_API_BASE_URL}/sessions/${sessionId}`, {
    method: "GET",
    headers: getHeaders(),
  });
  return response.json();
}

export async function listActivities(id: string, createTimeCursor?: string): Promise<ListActivitiesResponse> {
  const url = new URL(`${JULES_API_BASE_URL}/sessions/${id}/activities`);
  if (createTimeCursor) {
    url.searchParams.append("createTime", createTimeCursor);
  }
  const response = await fetchWithBackoff(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });
  return response.json();
}

// Official list contract: pageSize (1..100) and pageToken.
// Kept separate from the legacy createTimeCursor helper used by existing Khora polling flows.
export async function listActivitiesPage(
  id: string,
  pageSize: number = 50,
  pageToken?: string,
): Promise<ListActivitiesResponse> {
  const sessionId = normalizeSessionId(id);
  const url = new URL(`${JULES_API_BASE_URL}/sessions/${sessionId}/activities`);
  url.searchParams.set("pageSize", String(Math.min(100, Math.max(1, Math.trunc(pageSize)))));
  if (pageToken) url.searchParams.set("pageToken", pageToken);
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
  // Jules documents an empty request body for approvePlan.
  await fetchWithBackoff(`${JULES_API_BASE_URL}/sessions/${sessionId}:approvePlan`, {
    method: "POST",
    headers: getHeaders(),
  });
}
