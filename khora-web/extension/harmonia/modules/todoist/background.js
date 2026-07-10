// Todoist - Capa Background (v1.0.0)
// Captura tareas desde el content script y las envía a Notion vía el adaptador compartido.

if (typeof importScripts !== "undefined") {
  try { importScripts("../shared/notion-adapter.js"); } catch(e) {}
}

const notionFetch = self.NotionAdapter ? self.NotionAdapter.fetch : async () => null;
const NOTION_API = "https://api.notion.com/v1/pages";

async function createNotionTask(taskTitle, dbId) {
  if (!dbId) return { ok: false, error: "No DB_ID configured for Todoist" };

  const body = {
    parent: { database_id: dbId },
    properties: {
      "Name": { title: [{ text: { content: taskTitle } }] },
      "source": { rich_text: [{ text: { content: "todoist" } }] } // marca obligatoria
    }
  };

  const res = await notionFetch(NOTION_API, {
    method: "POST",
    body: JSON.stringify(body)
  });

  if (!res) return { ok: false, error: "NotionFetch failed/exhausted retries" };
  if (res.ok) {
    const j = await res.json();
    return { ok: true, id: j.id };
  }

  let errText = "";
  try { errText = await res.text(); } catch(e) {}
  return { ok: false, status: res.status, error: errText };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "TODOIST_NEW_TASK" && msg.title) {
    chrome.storage.local.get(["TODOIST_NOTION_DB_ID"], async (st) => {
      const dbId = st.TODOIST_NOTION_DB_ID;
      if (!dbId) {
        sendResponse({ ok: false, error: "Falta configurar TODOIST_NOTION_DB_ID en el storage de la sombrilla" });
        return;
      }
      const result = await createNotionTask(msg.title, dbId);
      sendResponse(result);
    });
    return true; // async
  }
});
