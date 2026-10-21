(()=> {
  if (globalThis.__harmoniaObserver?.version==='0.4.0') return;
  const H = globalThis.__harmoniaObserver = { version:'0.4.0', active:false, lastFingerprint:null, lastSentAt:0, droppedScans:0, lastMessages:new Map(), regionKey:null };
  let observer=null, timer=null, messageTimer=null, sessionId=null;

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
  const visible = el => {
    if (!el?.isConnected) return false;
    const s=getComputedStyle(el), r=el.getBoundingClientRect();
    return s.display!=='none' && s.visibility!=='hidden' && Number(s.opacity)!==0 && r.width>0 && r.height>0;
  };
  const excluded = el => !!el?.closest('nav,aside,[role="menu"],[role="dialog"],[role="listbox"],[aria-modal="true"],[data-radix-popper-content-wrapper]');
  const safe = (value, max=90) => String(value||'').replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi,'[id]').replace(/\b\d{5,}\b/g,'[n]').trim().slice(0,max);
  const classes = el => [...(el.classList||[])].filter(x=>x.length<50).slice(0,5);
  const attr = (el,name,max=90) => safe(el.getAttribute(name),max);
  const composer = () => $('#prompt-textarea,[contenteditable="true"][data-lexical-editor="true"],textarea');
  const mainRegion = () => $('main,[role="main"]');
  function controlsIn(root) {
    if (!root) return [];
    return $$('button,[role="button"],input,textarea,[contenteditable="true"],[role="combobox"],select,a,[role="switch"]',root)
      .filter(el=>visible(el)&&!excluded(el)).slice(0,100).map(el=>{
        const tag=el.tagName.toLowerCase(), role=attr(el,'role',40);
        const label=attr(el,'aria-label',90), testId=attr(el,'data-testid',70);
        const placeholder=['INPUT','TEXTAREA'].includes(el.tagName)?safe(el.getAttribute('placeholder'),80):'';
        const type=attr(el,'type',24);
        return {tag,role,label,testId,placeholder,type,disabled:!!el.disabled,expanded:attr(el,'aria-expanded',10),signature:[tag,role,testId,label,placeholder,type].join('|')};
      });
  }
  function featureIds(root, composerEl, controls) {
    const ids=new Set(), hay=controls.map(c=>[c.label,c.testId,c.placeholder,c.type,c.role].join(' ').toLowerCase()).join(' ');
    if (root) ids.add('surface.main-chat');
    if (composerEl && visible(composerEl)) ids.add('composer.text-entry');
    if (root && $$('[data-message-author-role="user"],[data-testid*="user-message"]',root).length) ids.add('conversation.user-message');
    const assistants=root?$$('[data-message-author-role="assistant"],[data-testid*="assistant-message"]',root):[];
    if (assistants.length) ids.add('conversation.assistant-message');
    if (root && $$('article p,[data-message-author-role="assistant"] p',root).length) ids.add('response.rich-text');
    if (root && $$('pre code,pre,[data-testid*="code-block"]',root).length) ids.add('response.code-block');
    if (root && $$('table,[role="table"]',root).length) ids.add('response.data-table');
    if (root && $$('svg.recharts-surface,canvas,[data-testid*="chart"],[aria-label*="chart" i]',root).length) ids.add('response.data-chart');
    if (root && $('[data-message-author-role="assistant"] img,article img',root).some(el=>{const r=el.getBoundingClientRect();return r.width>=128&&r.height>=80&&!el.closest('button,[role="button"]');})) ids.add('response.image-generation');
    if (root && $$('a[href^="http"]',root).some(el=>el.closest('[data-message-author-role="assistant"],article'))) ids.add('conversation.citations');
    if (root && $$('a[download],[data-testid*="download"],[data-testid*="file-card"],[data-testid*="artifact"]',root).length) ids.add('response.file-output');
    if (root && $$('[data-testid*="artifact"],[data-testid*="canvas"],[data-testid*="writing-block"]',root).length) ids.add('response.writing-block');
    if (root && $('[aria-busy="true"],[data-is-streaming="true"],[data-testid*="stop"]',root).length) { ids.add('conversation.response-streaming'); ids.add('conversation.partial-generation'); }
    if (root && $('[data-testid*="agent-progress"],[data-testid*="agent-run"],[data-testid*="task-progress"],[data-testid*="subagent"]',root).length) ids.add('conversation.agent-progress');
    if (root && $('[data-testid*="interactive-widget"],[data-testid*="interactive-ui"],[role="application"],[data-testid*="calculator"],[data-testid*="bill-split"],[data-testid*="game-widget"]',root).some(el=>visible(el)&&!excluded(el))) ids.add('response.interactive-widget');
    if (root && $('[data-message-author-role="assistant"] [class*="grid-cols-2"],[data-message-author-role="assistant"] [class*="grid-cols-3"],[data-testid*="side-by-side"],[data-testid*="comparison-panel"]',root).some(el=>visible(el)&&!excluded(el))) ids.add('response.side-by-side-visuals');
    if (root && $('[data-testid*="interactive-chart"],button[aria-label*="interactive chart" i],button[aria-label*="gráfico interactivo" i]',root).some(el=>visible(el)&&!excluded(el))) ids.add('response.interactive-chart');
    if (root && $('[data-testid*="canvas"]',root).some(el=>visible(el)&&!excluded(el))) ids.add('response.canvas-workspace');
    if (root && $('[data-testid*="slide"],[data-testid*="presentation"]',root).some(el=>visible(el)&&!excluded(el))) ids.add('response.slides-editor');

    const has=(re)=>re.test(hay);
    if (has(/send-button|send message|send prompt|enviar mensaje|enviar prompt/)) ids.add('composer.send');
    if (has(/stop-generating|stop generation|detener generaci[oó]n|stop-button/)) ids.add('conversation.stop-generation');
    if (has(/regenerate|retry|try again|regenerar|intentar de nuevo/)) ids.add('conversation.regenerate');
    if (has(/edit.*message|edit-turn|editar mensaje|editar pregunta/)) ids.add('conversation.edit-user-message');
    if (has(/copy.*(response|message|code)|copy-button|copiar respuesta|copiar c[oó]digo|copiar mensaje/)) ids.add('conversation.copy-response');
    if (has(/thumbs.?up|thumbs.?down|good response|bad response|buena respuesta|mala respuesta|feedback/)) ids.add('conversation.feedback');
    if (has(/share.*(chat|conversation|message)|compartir conversaci[oó]n|compartir respuesta/)) ids.add('conversation.share');
    if (has(/attach|upload|file-upload|paperclip|adjuntar|subir archivo|add files|agregar archivos/)) ids.add('composer.attach-file');
    if (has(/microphone|dictat|record audio|voice input|dictado|micr[oó]fono|grabar audio/)) ids.add('composer.dictation');
    if (has(/voice mode|start voice|talk|modo voz|iniciar voz|voz en tiempo real/)) ids.add('composer.voice-mode');
    if (has(/tools menu|tool-picker|more tools|herramientas/)) ids.add('composer.tool-picker');
    if (has(/search the web|web search|buscar en la web|b[uú]squeda web/)) ids.add('composer.web-search-tool');
    if (has(/deep research|investigaci[oó]n profunda/)) ids.add('composer.deep-research-tool');
    if (has(/data analysis|analyze data|an[aá]lisis de datos/)) ids.add('composer.data-analysis-tool');
    if (has(/branch.*chat|branch in new chat|ramificar|continuar en un nuevo chat/)) ids.add('conversation.branch');
    if (has(/read aloud|listen|leer en voz alta|escuchar/)) ids.add('response.audio-output');
    if (has(/source|citation|sources|fuente|cita|referencias/)) ids.add('response.sources-panel');
    if (root && $$('[data-testid*="search-result"],[data-testid*="web-search"]',root).length) ids.add('conversation.web-search-results');
    if (root && $$('[data-testid*="followup"],[data-testid*="suggested-reply"]',root).length) ids.add('conversation.follow-up-suggestion');
    if (root && $$('[data-testid*="project"],[data-project-id]',root).length) ids.add('conversation.project-context');
    if (root && $$('[data-testid*="connector"],[data-testid*="connected-app"]',root).length) ids.add('conversation.connected-app-context');
    if (root && $$('button,[role="button"]',root).some(el=>/preview|run code|previsualizar|ejecutar/i.test([attr(el,'aria-label',70),attr(el,'data-testid',70)].join(' ')))) ids.add('response.code-preview-run');
    if (root && $$('[data-testid*="audio"],audio',root).length) ids.add('response.audio-output');
    if (root && $$('input[type="file"],button[aria-label*="image" i],[data-testid*="image-upload"]',composerEl?.parentElement||root).length) ids.add('composer.image-input');
    if (root && $$('input[type="file"],button[aria-label*="audio" i],[data-testid*="audio-upload"]',composerEl?.parentElement||root).length) ids.add('composer.audio-file');
    return [...ids].sort();
  }
  function styleSummary(el) {
    if(!el) return null;
    const s=getComputedStyle(el), r=el.getBoundingClientRect();
    return {tag:el.tagName.toLowerCase(),role:attr(el,'role',30),testId:attr(el,'data-testid',70),classes:classes(el),display:s.display,position:s.position,flexDirection:s.flexDirection,overflow:s.overflow,fontSize:s.fontSize,width:Math.round(r.width),height:Math.round(r.height)};
  }
  function structure(root, controls) {
    if(!root) return {nodes:[],total:0,truncated:false};
    const nodes=[];
    const walk=(el,depth)=>{
      if(!el||nodes.length>=280||excluded(el)||depth>18)return;
      nodes.push({depth,tag:el.tagName.toLowerCase(),role:attr(el,'role',40),testId:attr(el,'data-testid',70),classes:classes(el),messageRole:attr(el,'data-message-author-role',20),ariaLive:attr(el,'aria-live',30),ariaBusy:attr(el,'aria-busy',10),childElements:el.children?.length||0});
      for(const child of el.children){if(nodes.length>=280)break;walk(child,depth+1);}
    };
    walk(root,0);
    const total=root.querySelectorAll('*').length+1;
    return {nodes,total,truncated:total>nodes.length};
  }
  function styleSheets() {
    return [...document.styleSheets].slice(0,80).map((s,i)=>{
      let rules=null,error=false;
      try{rules=s.cssRules?.length??null;}catch{error=true;}
      let path=s.href?'stylesheet':'inline-style';
      if(s.href){try{const u=new URL(s.href);path=u.origin+u.pathname;}catch{path='external-stylesheet';}}
      return {index:i,path,crossOriginOrInaccessible:error,ruleCount:rules};
    });
  }
  async function fingerprintOf(value){
    const bytes=new TextEncoder().encode(value);
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  }
  function regionKey(){return globalThis.HarmoniaRegionPolicy?.classifyRegion(location.href)||'conversation';}
  function streamActive(root){return !!root?.querySelector('[aria-busy="true"],[data-is-streaming="true"],[data-testid*="stop"]');}
  const MAX_MESSAGE_CHARS=2000000, MESSAGE_CHUNK_CHARS=80000;
  async function snapshotVisibleMessages(){
    if(!H.active)return;
    const root=mainRegion();if(!root)return;
    const currentRegion=regionKey();
    if(H.regionKey&&H.regionKey!==currentRegion)H.lastMessages.clear();
    H.regionKey=currentRegion;
    const isStreaming=streamActive(root);
    const elements=$$('[data-message-author-role="user"],[data-message-author-role="assistant"]',root).filter(el=>visible(el)&&!excluded(el)).slice(0,200);
    const liveKeys=new Set();
    for(let index=0;index<elements.length;index++){
      const el=elements[index],role=attr(el,'data-message-author-role',12);
      if(role!=='user'&&role!=='assistant')continue;
      const key=role+':'+index;liveKeys.add(key);
      const fullText=String(el.innerText||'').replace(/\r\n?/g,'\n');
      if(!fullText)continue;
      const truncated=fullText.length>MAX_MESSAGE_CHARS;
      const visibleText=fullText.slice(0,MAX_MESSAGE_CHARS);
      const sha=await fingerprintOf(visibleText),previous=H.lastMessages.get(key);
      const messageStreaming=role==='assistant'&&isStreaming&&index===elements.length-1;
      const wasStreaming=!!previous?.streaming;
      if(previous?.sha===sha&&wasStreaming===messageStreaming)continue;
      let operation='replace',remaining=visibleText,completedOnly=false;
      if(previous&&visibleText===previous.text&&wasStreaming&&!messageStreaming){operation='complete';remaining='';completedOnly=true;}
      else if(previous&&visibleText.startsWith(previous.text)&&visibleText.length>previous.text.length){operation='append';remaining=visibleText.slice(previous.text.length);}
      let offset=0,failed=false;
      do{
        const chunk=remaining.slice(offset,offset+MESSAGE_CHUNK_CHARS);
        const chunkOperation=completedOnly?'complete':(operation==='replace'&&offset===0?'replace':'append');
        const payload={regionKey:currentRegion,messageKey:key,role,index,operation:chunkOperation,
          delta:chunkOperation==='append'?chunk:'',text:chunkOperation==='replace'?chunk:'',
          contentSha256:sha,visible:true,streaming:messageStreaming,truncated,hiddenReasoningCaptured:false,
          chunkIndex:Math.floor(offset/MESSAGE_CHUNK_CHARS),chunkCount:completedOnly?1:Math.max(1,Math.ceil(remaining.length/MESSAGE_CHUNK_CHARS))};
        const result=await chrome.runtime.sendMessage({kind:'harmonia:event',event:{type:'conversation.visible.delta',payload}}).catch(()=>null);
        if(!result?.ok||result.value!==true){failed=true;break;}
        if(completedOnly)break;
        offset+=chunk.length;
      }while(offset<remaining.length);
      if(!failed)H.lastMessages.set(key,{text:visibleText,sha,streaming:messageStreaming});
    }
    for(const key of H.lastMessages.keys())if(!liveKeys.has(key))H.lastMessages.delete(key);
  }
  function scheduleMessageSnapshot(){if(!H.active||messageTimer)return;messageTimer=setTimeout(()=>{messageTimer=null;void snapshotVisibleMessages();},350);}
  function consoleEvent(event){
    if(!H.active||!event?.detail||typeof event.detail!=='object')return;
    let detail;try{detail=JSON.parse(JSON.stringify(event.detail));}catch{return;}
    const entries=Array.isArray(detail.entries)?detail.entries.slice(0,10).map(item=>({type:safe(item?.type,24),value:safe(item?.value,1000)})):[];
    const payload={regionKey:regionKey(),level:safe(detail.level,16),entries,observedAt:new Date().toISOString(),source:'page-console-bridge'};
    void chrome.runtime.sendMessage({kind:'harmonia:event',event:{type:'console.observed',payload}}).catch(()=>{});
  }
  let lastControls='';
  async function scanOnce(force=false) {
    if(!H.active)return;
    const root=mainRegion(), comp=composer();
    if(!root&&!comp)return;
    const roots=[...new Set([root,comp?.closest('form')||comp?.parentElement].filter(Boolean))];
    const controls=roots.flatMap(r=>controlsIn(r)).filter((c,i,a)=>a.findIndex(x=>x.signature===c.signature)===i).slice(0,100);
    const features=featureIds(root,comp,controls);
    const struct=structure(root||comp?.closest('form')||comp,controls);
    const viewport={width:innerWidth,height:innerHeight,devicePixelRatio:window.devicePixelRatio||1};
    const sheetSummary=styleSheets();
    const currentRegion=regionKey();
    const signature=JSON.stringify({regionKey:currentRegion,features,controls:controls.map(c=>c.signature),structureNodes:struct.nodes,styles:sheetSummary.map(s=>[s.path,s.ruleCount,s.crossOriginOrInaccessible]),viewport});
    const fingerprint=await fingerprintOf(signature);
    const now=Date.now();
    if(!force&&fingerprint===H.lastFingerprint)return;
    if(!force&&now-H.lastSentAt<4000){H.droppedScans++;return;}
    H.lastFingerprint=fingerprint;H.lastSentAt=now;
    const payload={
      catalogVersion:'0.1.2',fingerprint,features,controls:controls.map(({signature,...c})=>c),
      structure:struct,stylesheets:sheetSummary,viewport,
      layout:{main:styleSummary(root),composer:styleSummary(comp),assistant:styleSummary(root?.querySelector('[data-message-author-role="assistant"]'))},
      counts:{controls:controls.length,userMessages:root?$$('[data-message-author-role="user"]',root).length:0,assistantMessages:root?$$('[data-message-author-role="assistant"]',root).length:0,styleSheets:document.styleSheets.length},
      regionKey:currentRegion,
      privacy:{visibleMessageTextCaptured:true,composerTextCaptured:false,fieldValuesCaptured:false,hrefsCaptured:false,imageUrlsCaptured:false,hiddenReasoningCaptured:false,menusExcluded:true},
      droppedScans:H.droppedScans
    };
    await chrome.runtime.sendMessage({kind:'harmonia:event',event:{type:'ui.surface.scan',payload}}).catch(()=>{});
  }
  let scanInFlight=false,rescanPending=false;
  async function scan(force=false){
    if(scanInFlight){rescanPending=true;return;}
    scanInFlight=true;
    try{
      do{rescanPending=false;await scanOnce(force);force=false;}while(rescanPending&&H.active);
    }finally{scanInFlight=false;}
  }
  function scheduleScan(){if(timer)clearTimeout(timer);timer=setTimeout(()=>{timer=null;void scan(false);},1600);}
  function start(message){
    if(H.active)return;
    H.active=true;sessionId=message?.sessionId||null;
    window.addEventListener('resize',scheduleScan,{passive:true});
    window.addEventListener('popstate',scheduleScan,true);
    window.addEventListener('hashchange',scheduleScan,true);
    window.addEventListener('harmonia:console-observed',consoleEvent,false);
    void scan(true);scheduleMessageSnapshot();
    observer=new MutationObserver(records=>{
      const relevant=records.some(record=>{
        const target=record.target?.nodeType===1?record.target:record.target?.parentElement;
        if(!target||excluded(target))return false;
        if(record.type==='attributes'||record.type==='characterData')return true;
        if(record.type==='childList')return [...record.addedNodes,...record.removedNodes].some(node=>node.nodeType===1&&!excluded(node));
        return false;
      });
      if(relevant){scheduleScan();scheduleMessageSnapshot();}
    });
    const root=mainRegion()||document.body;
    observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','role','aria-label','aria-live','aria-busy','data-testid','data-message-author-role','disabled','data-state']});
    const comp=composer();
    if(comp&&!root?.contains(comp))observer.observe(comp.closest('form')||comp.parentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','role','aria-label','aria-live','aria-busy','data-testid','disabled','data-state']});
    // Sin sondeo periódico: las mutaciones estructurales y el viewport activan el barrido.
  }
  function stop(){
    if(!H.active)return;
    H.active=false;
    if(observer)observer.disconnect();observer=null;
    if(timer)clearTimeout(timer);timer=null;
    if(messageTimer)clearTimeout(messageTimer);messageTimer=null;
    H.periodic=null;H.lastMessages.clear();
    window.removeEventListener('resize',scheduleScan);
    window.removeEventListener('popstate',scheduleScan,true);
    window.removeEventListener('hashchange',scheduleScan,true);
    window.removeEventListener('harmonia:console-observed',consoleEvent,false);
  }
  chrome.runtime.onMessage.addListener(message=>{
    if(message?.kind==='harmonia:start')start(message);
    if(message?.kind==='harmonia:stop')stop();
  });
  chrome.runtime.sendMessage({kind:'harmonia:auto-settings'}).then(response=>{
    if(response?.ok&&response.value?.enabled&&response.value?.observe!==false)start({automatic:true});
  }).catch(()=>{});
})();