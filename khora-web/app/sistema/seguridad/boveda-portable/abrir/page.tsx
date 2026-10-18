import PortableControls from '../controls';
export const dynamic='force-dynamic';
export const metadata={title:'Autorizar apertura · Khora',referrer:'no-referrer'};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const p=await searchParams;
 const valid=typeof p.id==='string'&&/^[0-9a-f-]{36}$/.test(p.id)&&typeof p.challenge==='string'&&/^[A-Za-z0-9_-]{43}$/.test(p.challenge)&&typeof p.state==='string'&&/^[A-Za-z0-9_-]{43}$/.test(p.state)&&typeof p.port==='string'&&/^[0-9]{4,5}$/.test(p.port)&&Number(p.port)>=1024&&Number(p.port)<=65535;
 if(!valid)return <main className="p-6">Solicitud de apertura no válida. Inicia la apertura desde el cliente de Khora.</main>;
 return <main className="min-h-screen p-6 pb-28" style={{background:'var(--khora-bg)',color:'var(--khora-ink)'}}><PortableControls opening={{id:p.id as string,challenge:p.challenge as string,state:p.state as string,port:p.port as string}}/></main>;
}
