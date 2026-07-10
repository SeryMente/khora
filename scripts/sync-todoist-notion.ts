import { TodoistAdapter, TodoistTask } from "../khora-web/lib/todoist-adapter";

// Mapping function for priority
function mapPriority(todoistPriority: number): string {
    switch (todoistPriority) {
        case 4: return "Urgente"; // Todoist p1 -> priority 4
        case 3: return "Pronto";  // Todoist p2 -> priority 3
        case 2: return "Cuando se pueda"; // Todoist p3 -> priority 2
        case 1: return "Backlog"; // Todoist p4 -> priority 1
        default: return "Backlog";
    }
}

// Ensure the token variables exist
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

async function queryNotionByTodoistId(todoistId: string) {
    if (!NOTION_API_KEY || !NOTION_DATABASE_ID) return null;

    const url = `https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${NOTION_API_KEY}`,
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

async function upsertNotionPage(task: TodoistTask, existingPageId: string | null) {
    if (!NOTION_API_KEY || !NOTION_DATABASE_ID) return null;

    const url = existingPageId
        ? `https://api.notion.com/v1/pages/${existingPageId}`
        : `https://api.notion.com/v1/pages`;

    const method = existingPageId ? 'PATCH' : 'POST';

    let notas = task.description || "";
    const notionUrlRegex = /\[notion:.*?\]/g;
    notas = notas.replace(notionUrlRegex, "").trim();

    const importanceLabel = task.labels.find(l => l.startsWith("imp:"));
    const areaLabel = task.labels.find(l => l.startsWith("area:"));
    const modoLabel = task.labels.find(l => l.startsWith("modo:"));

    const properties: any = {
        "Tarea": {
            title: [{ text: { content: task.content } }]
        },
        "Todoist ID": {
            rich_text: [{ text: { content: task.id } }]
        },
        "Urgencia": {
            select: { name: mapPriority(task.priority) }
        },
        "Estado": {
            status: { name: task.is_completed ? "Hecho" : "No empezado" }
        }
    };

    if (notas) {
        properties["Notas"] = {
            rich_text: [{ text: { content: notas } }]
        };
    }

    if (importanceLabel) {
        properties["Importancia"] = {
            select: { name: importanceLabel.substring(4) }
        };
    }

    if (areaLabel) {
        properties["Área/Proyecto"] = {
            select: { name: areaLabel.substring(5) }
        };
    }

    if (modoLabel) {
        properties["Modo"] = {
            select: { name: modoLabel.substring(5) }
        };
    }

    if (task.due && task.due.date) {
        properties["Fecha/Vencimiento"] = {
            date: { start: task.due.date }
        };
    }

    const body: any = { properties };
    if (!existingPageId) {
        body.parent = { database_id: NOTION_DATABASE_ID };
    }

    const response = await fetch(url, {
        method,
        headers: {
            "Authorization": `Bearer ${NOTION_API_KEY}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        console.error(`[Notion] Error upserting task ${task.id}:`, await response.text());
        return null;
    }

    return await response.json();
}

async function getNewNotionTasksWithoutTodoistId() {
     if (!NOTION_API_KEY || !NOTION_DATABASE_ID) return [];

    const url = `https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${NOTION_API_KEY}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            filter: {
                and: [
                    {
                        property: "Todoist ID",
                        rich_text: {
                            is_empty: true
                        }
                    },
                    {
                        property: "Tarea",
                        title: {
                            is_not_empty: true
                        }
                    }
                ]
            }
        })
    });

    if (!response.ok) return [];
    const data = await response.json();
    return data.results || [];
}

async function getNotionTasksCompletedRecently() {
    if (!NOTION_API_KEY || !NOTION_DATABASE_ID) return [];

    const url = `https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`;

    // Solo tareas que han sido modificadas recientemente
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${NOTION_API_KEY}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            filter: {
                and: [
                    {
                        property: "Estado",
                        status: {
                            equals: "Hecho"
                        }
                    },
                    {
                        property: "Todoist ID",
                        rich_text: {
                            is_not_empty: true
                        }
                    },
                    {
                         timestamp: "last_edited_time",
                         last_edited_time: {
                             on_or_after: fiveMinutesAgo
                         }
                    }
                ]
            }
        })
    });

    if (!response.ok) return [];
    const data = await response.json();
    return data.results || [];
}

async function sync() {
    console.log("Iniciando sincronización Todoist <-> Notion...");
    const todoist = new TodoistAdapter();

    let syncedCount = 0;
    let conflicts = 0;
    let failures = 0;

    try {
        // 1. Todoist -> Notion
        console.log("Obteniendo tareas de Todoist...");
        const todoistTasks = await todoist.getTasks();

        for (const task of todoistTasks) {
            try {
                const existingNotionPage = await queryNotionByTodoistId(task.id);

                if (existingNotionPage) {
                     const status = existingNotionPage.properties?.Estado?.status?.name;
                     if (status === "Hecho" && !task.is_completed) {
                         // Notion says done, Todoist says not done. Notion wins. Skip update.
                         continue;
                     }
                }

                await upsertNotionPage(task, existingNotionPage ? existingNotionPage.id : null);
                syncedCount++;
            } catch (err) {
                console.error(`Error sync Todoist -> Notion task ${task.id}:`, err);
                failures++;
            }
        }

        // 2. Notion -> Todoist (Nuevas)
        console.log("Obteniendo tareas nuevas en Notion...");
        const newNotionTasks = await getNewNotionTasksWithoutTodoistId();
        for (const page of newNotionTasks) {
            try {
                const title = page.properties?.Tarea?.title?.[0]?.plain_text;
                if (!title) continue;

                const newTask = await todoist.createTask({
                    content: title,
                    description: `[notion:${page.url}]`
                });

                if (newTask) {
                     // Update Todoist ID in Notion
                     await fetch(`https://api.notion.com/v1/pages/${page.id}`, {
                         method: 'PATCH',
                         headers: {
                            "Authorization": `Bearer ${NOTION_API_KEY}`,
                            "Notion-Version": "2022-06-28",
                            "Content-Type": "application/json"
                         },
                         body: JSON.stringify({
                             properties: {
                                 "Todoist ID": {
                                     rich_text: [{ text: { content: newTask.id } }]
                                 }
                             }
                         })
                     });
                     syncedCount++;
                }
            } catch (err) {
                 console.error(`Error sync Notion -> Todoist (New) page ${page.id}:`, err);
                 failures++;
            }
        }

        // 3. Notion -> Todoist (Completadas recientemente)
        console.log("Obteniendo tareas completadas en Notion...");
        const completedNotionTasks = await getNotionTasksCompletedRecently();
        for (const page of completedNotionTasks) {
            try {
                 const todoistId = page.properties?.["Todoist ID"]?.rich_text?.[0]?.plain_text;
                 if (todoistId) {
                     await todoist.closeTask(todoistId);
                 }
            } catch (err) {
                 console.error(`Error sync Notion -> Todoist (Close) page ${page.id}:`, err);
                 failures++;
            }
        }

        // Emit telemetry
        console.log(`[Telemetry] sync_todoist_notion { synced: ${syncedCount}, conflicts: ${conflicts}, failures: ${failures} }`);

    } catch (error) {
        console.error("Error global en la sincronización:", error);
    }
}

sync();

// Exportar para pruebas
export { mapPriority, upsertNotionPage };
