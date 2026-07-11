import { randomUUID } from "crypto";

export interface TodoistTask {
    id: string;
    content: string;
    description: string;
    priority: number;
    labels: string[];
    is_completed: boolean;
    due?: {
        date: string;
    };
}

export class TodoistAdapter {
    private token: string;
    private baseUrl = "https://api.todoist.com/rest/v2";

    constructor(token?: string) {
        this.token = token || process.env.TODOIST_TOKEN || "";
    }

    private async fetchApi(endpoint: string, options: RequestInit = {}): Promise<any> {
        if (!this.token) {
            console.warn("[Todoist] Integración no configurada. Agrega TODOIST_TOKEN.");
            return null;
        }

        const headers = {
            "Authorization": `Bearer ${this.token}`,
            "Content-Type": "application/json",
            ...options.headers
        };

        const res = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers
        });

        if (!res.ok) {
            if (res.status === 204) return null; // No content for updates/closes
            let errorText = await res.text();
            throw new Error(`Todoist API Error: ${res.status} ${res.statusText} - ${errorText}`);
        }

        const text = await res.text();
        return text ? JSON.parse(text) : null;
    }

    async getTasks(filter?: string): Promise<TodoistTask[]> {
        let endpoint = "/tasks";
        if (filter) {
            endpoint += `?filter=${encodeURIComponent(filter)}`;
        }
        const tasks = await this.fetchApi(endpoint);
        return tasks || [];
    }

    async createTask(task: Partial<TodoistTask>): Promise<TodoistTask | null> {
        return this.fetchApi("/tasks", {
            method: "POST",
            body: JSON.stringify(task)
        });
    }

    async updateTask(id: string, task: Partial<TodoistTask>): Promise<TodoistTask | null> {
        return this.fetchApi(`/tasks/${id}`, {
            method: "POST", // Todoist API uses POST for updates in v2
            body: JSON.stringify(task)
        });
    }

    async closeTask(id: string): Promise<boolean> {
        try {
            await this.fetchApi(`/tasks/${id}/close`, {
                method: "POST"
            });
            return true;
        } catch (e) {
            console.error(`[Todoist] Error closing task ${id}:`, e);
            return false;
        }
    }
}
