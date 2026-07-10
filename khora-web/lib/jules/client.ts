// Jules API v1alpha adapter

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

  while (true) {
    let response: Response;

    try {
      response = await fetch(url, options);
    } catch (error) {
      if (attempt >= MAX_RETRIES) {
        throw error;
      }
      attempt++;
      const sleepTime = BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 200;
      await delay(sleepTime);
      continue;
    }

    if (response.ok) {
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

export async function listSources(): Promise<ListSourcesResponse> {
  const response = await fetchWithBackoff(`${JULES_API_BASE_URL}/sources`, {
    method: "GET",
    headers: getHeaders(),
  });
  return response.json();
}

export async function createSession(params: {
  sourceContext: SourceContext;
  automationMode: AutomationMode;
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
  const response = await fetchWithBackoff(`${JULES_API_BASE_URL}/sessions/${id}`, {
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

export async function sendMessage(id: string, prompt: string): Promise<void> {
  await fetchWithBackoff(`${JULES_API_BASE_URL}/sessions/${id}:sendMessage`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ prompt }),
  });
}

export async function approvePlan(id: string): Promise<void> {
  await fetchWithBackoff(`${JULES_API_BASE_URL}/sessions/${id}:approvePlan`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({}),
  });
}
