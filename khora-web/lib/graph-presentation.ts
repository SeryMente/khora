// @l0 L0-002 · @req VIZ-01/REQ-1 · Presentation only; never computes or changes memberships.
import dagre from "dagre";
export type LayoutEntity = { id: string; communityId?: string | null };
export type LayoutRelation = { id: string; source: string; target: string };
export const CARD_WIDTH = 248;
export const CARD_HEIGHT = 116;
export function layoutPublishedCommunities(nodes: LayoutEntity[], edges: LayoutRelation[]) {
  const sorted = [...nodes].sort((a,b) => a.id.localeCompare(b.id));
  const keys = [...new Set(sorted.map(n => n.communityId).filter((id): id is string => Boolean(id)))].sort();
  const labels = new Map(keys.map((id,i) => [id, `Grupo ${i+1}`]));
  const groups = [...keys, ...(sorted.some(n => !n.communityId) ? [null] : [])];
  const positions = new Map<string,{x:number;y:number}>();
  const presentation = new Map<string,{label:string;colorIndex:number}>();
  // Vertical bands avoid group overlap; dagre orders entities by actual intra-group edges.
  // Missing membership stays missing. Display labels are local to this projection.
  let top = 0;
  for (const key of groups) {
    const members = sorted.filter(n => (n.communityId || null) === key);
    const ids = new Set(members.map(n => n.id));
    const g = new dagre.graphlib.Graph({multigraph:true}).setGraph({rankdir:"LR",nodesep:48,ranksep:104,marginx:24,marginy:24}).setDefaultEdgeLabel(() => ({}));
    for (const n of members) g.setNode(n.id,{width:CARD_WIDTH,height:CARD_HEIGHT});
    for (const e of [...edges].sort((a,b) => a.id.localeCompare(b.id))) {
      if (e.source !== e.target && ids.has(e.source) && ids.has(e.target)) g.setEdge(e.source,e.target,{},e.id);
    }
    dagre.layout(g);
    let bottom = top;
    for (const n of members) {
      const p = g.node(n.id);
      const position = {x:p.x-CARD_WIDTH/2,y:top+p.y-CARD_HEIGHT/2};
      positions.set(n.id,position);
      presentation.set(n.id,{label:key ? labels.get(key)! : "Sin comunidad publicada",colorIndex:key ? keys.indexOf(key)+1 : 0});
      bottom = Math.max(bottom,position.y+CARD_HEIGHT);
    }
    top = bottom+144;
  }
  return {positions,presentation,communityCount:keys.length};
}
