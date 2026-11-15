'use strict';
function configError(config) {
 const identifier = /^[A-Za-z0-9_.-]+$/;
 if (!config) return 'config.js is missing or did not load.';
 if (typeof config.dataSource !== 'string' || !identifier.test(config.dataSource))
  return 'Set dataSource to a valid Guacamole data source, such as postgresql.';
 if (!Array.isArray(config.connections) || !config.connections.length)
  return 'Add at least one connection.';
 const ids = new Set();
 for (const connection of config.connections) {
  if (!connection || typeof connection.id !== 'string' || !identifier.test(connection.id)
      || typeof connection.name !== 'string' || !connection.name.trim())
   return 'Give each connection a valid string ID and a display name.';
  if (ids.has(connection.id)) return 'Each connection ID must be unique.';
  ids.add(connection.id);
 }
 return '';
}
const setupError = configError(window.lemonConfig);
if (setupError) {
 document.querySelector('#setup-error').textContent = setupError;
 document.querySelector('#setup').hidden = false;
 document.querySelector('header').hidden = true;
 document.querySelector('#desktops').hidden = true;
} else {
 startWorkspace(window.lemonConfig);
}
function startWorkspace(config) {
const {connections,dataSource}=config;
for(const {id,name} of connections){
 const button=document.createElement('button');
 button.dataset.computer=id;
 button.textContent=name;
 document.querySelector('header nav').append(button);
 document.querySelector('#second-computer').add(new Option(name,id));
 const pane=document.createElement('section');
 pane.dataset.id=id;
 pane.hidden=true;
 const heading=document.createElement('h2');
 heading.append(name+' ');
 const badge=document.createElement('span');
 badge.textContent='Not opened';
 heading.append(badge);
 const frame=document.createElement('iframe');
 frame.title=name;
 frame.allow='clipboard-read; clipboard-write; fullscreen';
 pane.append(heading,frame);
 document.querySelector('#desktops').append(pane);
}

const panes=[...document.querySelectorAll('main section')];
let focused=localStorage.getItem('lemon.focus')||connections[0].id;
if(!panes.some(p=>p.dataset.id===focused))focused=connections[0].id;
let layout=localStorage.getItem('lemon.layout')||'single';
const layoutPicker=document.querySelector('#layout-picker');
const minimumConnections={single:1,split:2,all:3,pip:3};
for(const option of [...layoutPicker.options]){
 if(connections.length<minimumConnections[option.value])option.remove();
}
if(![...layoutPicker.options].some(option=>option.value===layout))layout='single';
const openedAt=new WeakMap();
function openPane(pane){const frame=pane.querySelector('iframe');if(!frame.getAttribute('src')){const id=btoa(pane.dataset.id+'\0c\0'+dataSource);frame.src='/guacamole/#/client/'+encodeURIComponent(id);openedAt.set(pane,Date.now());pane.querySelector('span').textContent='Opened · status inside pane';}}
function render(){
 document.querySelector('main').dataset.layout=layout;
 let other=localStorage.getItem('lemon.second')||'2';
 if(other===focused||!panes.some(p=>p.dataset.id===other))other=panes.find(p=>p.dataset.id!==focused)?.dataset.id||'';
 const selector=document.querySelector('#second-computer'); selector.value=other; [...selector.options].forEach(o=>o.disabled=o.value===focused); selector.hidden=selector.disabled=layout!=='split'; selector.labels[0].hidden=selector.hidden;
 const visible=layout==='single'?[focused]:layout==='split'?[focused,other]:[focused,...connections.map(connection=>connection.id).filter(id=>id!==focused).slice(0,2)];
 for(const pane of panes){pane.hidden=!visible.includes(pane.dataset.id);pane.classList.toggle('focus',pane.dataset.id===focused);if(!pane.hidden)openPane(pane);}
 document.querySelectorAll('[data-computer]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.computer===focused)));
 document.querySelector('#layout-picker').value=layout;
 localStorage.setItem('lemon.focus',focused);localStorage.setItem('lemon.layout',layout);
}
document.querySelectorAll('[data-computer]').forEach(b=>b.onclick=()=>{focused=b.dataset.computer;render();});
document.querySelector('#layout-picker').onchange=event=>{layout=event.target.value;render();};
document.querySelector('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('main').requestFullscreen();}catch{workspaceStatus('Full screen is unavailable in this browser.');}};
const workspaceStatus=message=>{const notice=document.querySelector('#workspace-status');notice.textContent=message;notice.hidden=!message;};
const sizing=new Map();
const viewNames=Object.fromEntries(connections.map(({id,name})=>[id,name]));
function activeConnection(pane){
 const frame=pane.querySelector('iframe');
 const hash=frame.contentWindow.location.hash;
 const route=hash.match(/^#\/client\/([^/?]+)/);
 if(!route)return null;
 const encoded=decodeURIComponent(route[1]);
 const id=atob(encoded).split('\0')[0];
 return {encoded,name:viewNames[id]||'Guacamole desktop'};
}
function managed(pane){
 const w=pane.querySelector('iframe').contentWindow;
 const injector=w.angular?.element(w.document.body).injector();
 if(!injector)return null;
 const clients=injector.get('guacClientManager').getManagedClients();
 const connection=activeConnection(pane); const client=connection && clients[connection.encoded];
 return client?{client,root:injector.get('$rootScope')}:null;
}
document.querySelector('#second-computer').onchange=event=>{localStorage.setItem('lemon.second',event.target.value);render();};
for(const pane of panes){
 const heading=pane.querySelector('h2');
 heading.tabIndex=0;heading.setAttribute('role','button');heading.setAttribute('aria-label','Select '+pane.querySelector('iframe').title);
 const select=()=>{if(document.fullscreenElement){document.exitFullscreen().catch(()=>workspaceStatus("Press Esc to exit full screen."));return;} focused=pane.dataset.id;render();};
 heading.onclick=select;heading.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}};
}
function showDirect(pane){
 if(pane.dataset.id!==focused)return;
 const link=document.querySelector('#open-direct');
 link.href=pane.querySelector('iframe').src;
 link.hidden=false;
}
function updateSessions(){
 const direct=document.querySelector('#open-direct'); direct.hidden=true;
 for(const pane of panes){
  const badge=pane.querySelector('h2 span');
  if(!pane.querySelector('iframe').getAttribute('src'))continue;
  try{
   const name=activeConnection(pane)?.name||viewNames[pane.dataset.id]; pane.querySelector('h2').firstChild.textContent=name+' '; if(pane.dataset.id===focused)document.title=name+' | Lemon Console'; const session=managed(pane); if(!session){badge.textContent='Sign in / loading'; if(Date.now()-openedAt.get(pane)>15000)showDirect(pane);continue;}
   const state=session.client.clientState;
   const labels={IDLE:'Ready',CONNECTING:'Connecting',WAITING:'Waiting for desktop',CONNECTED:'Connected',DISCONNECTED:'Disconnected',CLIENT_ERROR:'Desktop error',TUNNEL_ERROR:'Connection error'};
   badge.textContent=state.tunnelUnstable?'Connection unstable':labels[state.connectionState]||'Status unavailable';
   pane.dataset.connection=state.connectionState;
   if(state.connectionState==='CONNECTED'){
    const props=session.client.clientProperties;
    if(sizing.get(pane.dataset.id)?.props!==props){
     session.root.$evalAsync(()=>{props.autoFit=true;props.scale=props.minScale;}); sizing.set(pane.dataset.id,{props});
    }

   }
  }catch{badge.textContent='Workspace cannot read desktop status';showDirect(pane);}
 }
}
document.addEventListener('fullscreenchange',()=>{
  const button=document.querySelector('#fullscreen');
 const label=document.fullscreenElement?'Exit full screen':'Desktop full screen';
 button.title=label;
 button.setAttribute('aria-label',label);
 button.setAttribute('aria-pressed',String(Boolean(document.fullscreenElement)));
 for(const pane of panes){try{pane.querySelector('iframe').contentWindow.dispatchEvent(new Event('resize'));}catch{}}
});
render();
updateSessions();setInterval(updateSessions,750);
}
