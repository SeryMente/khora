import { TodoistAdapter, TodoistTask } from "../khora-web/lib/todoist-adapter";

export async function fetchNotionTasksByTodoistId(todoistId: string) {
    // We will query Notion directly using the REST API to look up pages in NOTION_DATABASE_ID
    const apiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!apiKey || !databaseId) return null;

    const url = `https://api.notion.com/v1/databases/${databaseId}/query`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            filter: {
                property: "Todoist ID",
                rich_text: {
                    equals: todoistId
                }
            }
        })
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.results && data.results.length > 0 ? data.results[0] : null;
}
