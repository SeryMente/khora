(()=> {
  if (globalThis.__harmoniaObserver?.active) return;
  const H = globalThis.__harmoniaObserver = { active:false, lastFingerprint:null, lastSentAt:0, droppedScans:0 };
  let observer=null, timer=null, sessionId=null;

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
    if (root && $$('[aria-busy="true"],[data-is-streaming="true"],[data-testid*="stop"]',root).length) ids.add('conversation.response-streaming');

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
  let lastControls='';
  async function scan(force=false) {
    if(!H.active)return;
    const root=mainRegion(), comp=composer();
    if(!root&&!comp)return;
    const roots=[...new Set([root,comp?.closest('form')||comp?.parentElement].filter(Boolean))];
    const controls=roots.flatMap(r=>controlsIn(r)).filter((c,i,a)=>a.findIndex(x=>x.signature===c.signature)===i).slice(0,100);
    const features=featureIds(root,comp,controls);
    const struct=structure(root||comp?.closest('form')||comp,controls);
    const signature=JSON.stringify({features,controls:controls.map(c=>c.signature),nodes:Math.round(struct.total/20)*20,styles:styleSheets().map(s=>[s.path,s.ruleCount,s.crossOriginOrInaccessible])});
    const now=Date.now();
    if(!force&&signature===H.lastFingerprint)return;
    if(!force&&now-H.lastSentAt<4000){H.droppedScans++;return;}
    H.lastFingerprint=signature;H.lastSentAt=now;
    const payload={
      catalogVersion:'0.1.0',features,controls:controls.map(({signature,...c})=>c),
      structure:struct,stylesheets:styleSheets(),
      layout:{main:styleSummary(root),composer:styleSummary(comp),assistant:styleSummary(root?.querySelector('[data-message-author-role="assistant"]'))},
      counts:{controls:controls.length,userMessages:root?$$('[data-message-author-role="user"]',root).length:0,assistantMessages:root?$$('[data-message-author-role="assistant"]',root).length:0,styleSheets:document.styleSheets.length},
      privacy:{conversationTextCaptured:false,composerTextCaptured:false,fieldValuesCaptured:false,hrefsCaptured:false,imageUrlsCaptured:false,menusExcluded:true},
      droppedScans:H.droppedScans
    };
    await chrome.runtime.sendMessage({kind:'harmonia:event',event:{type:'ui.surface.scan',payload}}).catch(()=>{});
  }
  function scheduleScan(){if(timer)clearTimeout(timer);timer=setTimeout(()=>{timer=null;void scan(false);},1600);}
  function start(message){
    if(H.active)return;
    H.active=true;sessionId=message?.sessionId||null;
    void scan(true);
    observer=new MutationObserver(scheduleScan);
    const root=mainRegion()||document.body;
    observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['class','role','aria-label','aria-live','aria-busy','data-testid','data-message-author-role','disabled','data-state']});
    const comp=composer();
    if(comp&&!root?.contains(comp))observer.observe(comp.closest('form')||comp.parentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','role','aria-label','aria-live','aria-busy','data-testid','disabled','data-state']});
    const periodic=setInterval(()=>{if(!H.active){clearInterval(periodic);return;}void scan(false);},10000);
    H.periodic=periodic;
  }
  function stop(){
    if(!H.active)return;
    void scan(true);
    H.active=false;
    if(observer)observer.disconnect();observer=null;
    if(timer)clearTimeout(timer);timer=null;
    if(H.periodic)clearInterval(H.periodic);H.periodic=null;
  }
  chrome.runtime.onMessage.addListener(message=>{
    if(message?.kind==='harmonia:start')start(message);
    if(message?.kind==='harmonia:stop')stop();
  });
})();