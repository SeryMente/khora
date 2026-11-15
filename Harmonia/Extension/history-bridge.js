(() => {
  'use strict';
  const root=window;
  const historyRef=root.history;
  const marker='__harmoniaHistoryBridgeInstalledV1';
  const eventName='harmonia:history-change';
  if(!historyRef||root[marker])return;
  let wrappedCount=0;
  for(const method of ['pushState','replaceState']){
    const original=historyRef[method];
    if(typeof original!=='function')continue;
    const ownDescriptor=Object.getOwnPropertyDescriptor(historyRef,method);
    const prototypeDescriptor=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(historyRef),method);
    try{
      Object.defineProperty(historyRef,method,{
        configurable:true,
        enumerable:ownDescriptor?.enumerable??prototypeDescriptor?.enumerable??false,
        writable:true,
        value:function(...args){
          const result=Reflect.apply(original,this,args);
          if(this===historyRef)queueMicrotask(()=>root.dispatchEvent(new Event(eventName)));
          return result;
        }
      });
      wrappedCount+=1;
    }catch(_){}
  }
  if(wrappedCount>0)Object.defineProperty(root,marker,{value:true,configurable:false,enumerable:false,writable:false});
})();