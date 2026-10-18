#!/usr/bin/env node
/** Interactive candidate, trusted device only. No credentials in args, logs or .env files. */
import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {resolve,join} from 'node:path';
import {readFile} from 'node:fs/promises';
import {openOnline,khoraOrigin} from './native-open.mjs';
import {PortableSession} from './client.mjs';
async function ask(text,{secret=false}={}){
 process.stdout.write(text);const output=new Writable({write(chunk,_encoding,done){if(!secret)process.stdout.write(chunk);done();}});
 const rl=createInterface({input:process.stdin,output,terminal:true,historySize:0});
 try{return (await rl.question('')).trim();}finally{rl.close();if(secret)process.stdout.write('\n');}
}
let session;
try{
 if(!process.stdin.isTTY||process.argv.length>2)throw Error('interactive_trusted_device_required');
 console.log('Khora · cliente portable de revisión. No usar datos reales sin revisión final.');
 console.log('No protege frente a un equipo malicioso. No usar corpus en equipos públicos o de renta.');
 if((await ask('¿Este es tu equipo de confianza? Escribe SI: ')).toUpperCase()!=='SI')throw Error('trusted_device_required');
 const origin=khoraOrigin(await ask('Origen HTTPS de Khora: '));
 const id=await ask('Identificador de tu bóveda: ');
 console.log('Se abrirá el navegador: sesión de Khora y código de Ente Auth para esta apertura.');
 session=new PortableSession(await openOnline({origin,id}));
 const option=await ask('1 Descargar y cifrar texto UTF-8; 2 Analizar texto UTF-8 ya cifrado: ');
 const folder=resolve(await ask('Carpeta de destino (sin archivos previos con el mismo nombre): '));
 if(option==='1'){
  const link=await ask('Enlace HTTPS privado de descarga (entrada oculta): ',{secret:true});
  const provenance=await session.download(link,join(folder,'corpus.age'));
  await session.analyzeText(join(folder,'corpus.age'),join(folder,'informe.age'),{provenance});
 }else if(option==='2'){
  const path=resolve(await ask('Ruta del archivo de texto cifrado en formato age: '));
  await session.analyzeText(path,join(folder,'informe.age'));
 }else throw Error('operation_not_supported');
 console.log('Operación terminada. Original y/o informe cifrados; no se imprimió su contenido.');
}catch{
 // Raw network errors, links, tokens and plaintext must never reach the terminal.
 console.error('No se completó la operación. No se habilitó acceso alternativo. Conserva los archivos cifrados existentes.');process.exitCode=1;
}finally{session?.close();}
