import {
  OBSERVATION_BATCH_BRANCH,
  OBSERVATION_BATCH_HISTORY_DIR,
  OBSERVATION_BATCH_LATEST_NDJSON_PATH,
  OBSERVATION_BATCH_LATEST_PATH,
  ObservationBatch,
  buildNdjson,
} from "@/lib/contracts/observation-batch";

const REPO = "SeryMente/khora";
const API = "https://api.github.com";

function headers(token:string) {
  return {
    Authorization: "Bearer " + token,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

async function gh(token:string,path:string,init?:RequestInit) {
  const res = await fetch(API + path,{...init,headers:{...headers(token),...(init?.headers||{})},cache:"no-store"});
  const raw = await res.text();
  let data:any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch {}
  if (!res.ok) throw new Error("GitHub HTTP " + res.status + ": " + String(data?.message || raw || "unknown").slice(0,300));
  return data;
}

async function getMainSha(token:string) {
  const data = await gh(token,"/repos/"+REPO+"/commits/main");
  return String(data.sha);
}

async function getRef(token:string,branch:string) {
  return gh(token,"/repos/"+REPO+"/git/ref/heads/"+branch.split("/").map(encodeURIComponent).join("/"));
}

async function ensureBranch(token:string) {
  try {
    const ref = await getRef(token,OBSERVATION_BATCH_BRANCH);
    return {sha:String(ref.object.sha),exists:true};
  } catch (error:any) {
    if (!String(error?.message||"").startsWith("GitHub HTTP 404")) throw error;
    const base = await getMainSha(token);
    await gh(token,"/repos/"+REPO+"/git/refs",{method:"POST",body:JSON.stringify({ref:"refs/heads/"+OBSERVATION_BATCH_BRANCH,sha:base})});
    return {sha:base,exists:false};
  }
}

async function createBlob(token:string,content:string) {
  const data = await gh(token,"/repos/"+REPO+"/git/blobs",{method:"POST",body:JSON.stringify({encoding:"base64",content:Buffer.from(content,"utf8").toString("base64")})});
  return String(data.sha);
}

async function getExistingBatch(token:string, branch:string, batchId:string) {
  const historyPath = OBSERVATION_BATCH_HISTORY_DIR + "/" + batchId + ".json";
  try {
    await gh(token,"/repos/"+REPO+"/contents/"+historyPath.split("/").map(encodeURIComponent).join("/")+"?ref="+encodeURIComponent(branch));
    const ref = await getRef(token,branch);
    return { exists: true, historyPath, commitSha: String(ref.object.sha) };
  } catch (error:any) {
    if (String(error?.message || "").startsWith("GitHub HTTP 404")) {
      return { exists: false, historyPath, commitSha: null };
    }
    throw error;
  }
}

export async function publishObservationBatch(batch:ObservationBatch) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN no está configurado en el entorno de producción");

  const branch = await ensureBranch(token);
  const historyPath = OBSERVATION_BATCH_HISTORY_DIR + "/" + batch.batch_id + ".json";
  const existing = await getExistingBatch(token, OBSERVATION_BATCH_BRANCH, batch.batch_id);
  if (existing.exists) {
    return {
      branch: OBSERVATION_BATCH_BRANCH,
      batch_id: batch.batch_id,
      commit_sha: existing.commitSha,
      commit_url: null,
      latest_path: OBSERVATION_BATCH_LATEST_PATH,
      history_path: historyPath,
      event_count: batch.events.length,
      deduplicated: true
    };
  }

  const parent = await gh(token,"/repos/"+REPO+"/git/commits/"+branch.sha);
  const json = JSON.stringify(batch);
  const ndjson = buildNdjson(batch.events);

  const [latestBlob,ndjsonBlob,historyBlob] = await Promise.all([
    createBlob(token,json),createBlob(token,ndjson),createBlob(token,json)
  ]);

  const tree = await gh(token,"/repos/"+REPO+"/git/trees",{
    method:"POST",
    body:JSON.stringify({
      base_tree:parent.tree.sha,
      tree:[
        {path:OBSERVATION_BATCH_LATEST_PATH,mode:"100644",type:"blob",sha:latestBlob},
        {path:OBSERVATION_BATCH_LATEST_NDJSON_PATH,mode:"100644",type:"blob",sha:ndjsonBlob},
        {path:historyPath,mode:"100644",type:"blob",sha:historyBlob}
      ]
    })
  });

  const commit = await gh(token,"/repos/"+REPO+"/git/commits",{
    method:"POST",
    body:JSON.stringify({
      message:"obs: extension batch "+batch.batch_id,
      tree:String(tree.sha),
      parents:[branch.sha]
    })
  });

  await gh(token,"/repos/"+REPO+"/git/refs/heads/"+OBSERVATION_BATCH_BRANCH,{
    method:"PATCH",
    body:JSON.stringify({sha:String(commit.sha),force:false})
  });

  return {
    branch:OBSERVATION_BATCH_BRANCH,
    batch_id:batch.batch_id,
    commit_sha:String(commit.sha),
    commit_url:commit.html_url ? String(commit.html_url) : null,
    latest_path:OBSERVATION_BATCH_LATEST_PATH,
    history_path:historyPath,
    event_count:batch.events.length
  };
}
