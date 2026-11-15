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
const phoneLayout=matchMedia('(max-width:680px), (max-width:950px) and (pointer:coarse) and (max-height:550px)');
const mobileComputer=document.querySelector('#mobile-computer');
const computerButtons=[...document.querySelectorAll('[data-computer]')];
for(const button of computerButtons){
 mobileComputer.add(new Option(button.textContent,button.dataset.computer));
}
mobileComputer.onchange=()=>{
 computerButtons.find(button=>button.dataset.computer===mobileComputer.value)?.click();
};
phoneLayout.addEventListener('change',render);
const keyboardEnabled=new WeakSet();
function render(){
 const displayLayout=phoneLayout.matches?'single':layout;
 mobileComputer.hidden=!phoneLayout.matches;
 document.querySelector('#phone-keyboard').hidden=!phoneLayout.matches;
 mobileComputer.value=focused;
 const selectedFrame=panes.find(pane=>pane.dataset.id===focused)?.querySelector('iframe');
 document.querySelector('#phone-keyboard').setAttribute('aria-pressed',String(keyboardEnabled.has(selectedFrame?.contentDocument)));
 document.querySelector('main').dataset.layout=displayLayout;
 let other=localStorage.getItem('lemon.second')||'2';
 if(other===focused||!panes.some(p=>p.dataset.id===other))other=panes.find(p=>p.dataset.id!==focused)?.dataset.id||'';
 const selector=document.querySelector('#second-computer'); selector.value=other; [...selector.options].forEach(o=>o.disabled=o.value===focused); selector.hidden=selector.disabled=displayLayout!=='split'; selector.labels[0].hidden=selector.hidden;
 const visible=displayLayout==='single'?[focused]:displayLayout==='split'?[focused,other]:[focused,...connections.map(connection=>connection.id).filter(id=>id!==focused).slice(0,2)];
 for(const pane of panes){pane.hidden=!visible.includes(pane.dataset.id);pane.classList.toggle('focus',pane.dataset.id===focused);if(!pane.hidden)openPane(pane);}
 document.querySelectorAll('[data-computer]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.computer===focused)));
 document.querySelector('#layout-picker').value=layout;
 localStorage.setItem('lemon.focus',focused);localStorage.setItem('lemon.layout',layout);
}
document.querySelectorAll('[data-computer]').forEach(button=>{
 button.onclick=()=>{
  focused=button.dataset.computer;
  render();
  const frame=panes.find(pane=>pane.dataset.id===focused).querySelector('iframe');
  button.blur();
  frame.focus({preventScroll:true});
  frame.addEventListener('load',()=>{
   if(focused===button.dataset.computer && document.activeElement===frame)
    frame.contentWindow.focus();
  },{once:true});
  frame.contentWindow.focus();
 };
});
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
let initialDesktopFocus=false;
function releasePhoneModifiers(pane){
 try{
  const session=managed(pane);
  if(session?.client.clientState.connectionState!=='CONNECTED')return;
  // Release left and right Shift, Control, Alt and Super.
  for(const keysym of [0xFFE1,0xFFE2,0xFFE3,0xFFE4,0xFFE9,0xFFEA,0xFFEB,0xFFEC])
   session.client.client.sendKeyEvent(false,keysym);
 }catch{}
}
let resumeReconnectTimer;
document.addEventListener('visibilitychange',()=>{
 clearInterval(resumeReconnectTimer);
 if(document.hidden || !phoneLayout.matches)return;
 const pane=panes.find(candidate=>candidate.dataset.id===focused);
 releasePhoneModifiers(pane);
 const deadline=Date.now()+22000;
 resumeReconnectTimer=setInterval(()=>{
  if(document.hidden || pane?.dataset.id!==focused || Date.now()>deadline){
   clearInterval(resumeReconnectTimer);
   return;
  }
  try{
   const state=managed(pane)?.client.clientState.connectionState;
   if(state!=='DISCONNECTED' && state!=='TUNNEL_ERROR')return;
   clearInterval(resumeReconnectTimer);
   pane.querySelector('iframe').contentWindow.location.reload();
  }catch{
   clearInterval(resumeReconnectTimer);
  }
 },750);
});
const doubleTapDisplays=new WeakSet();
function bindPhoneDoubleTap(pane,client){
 const display=client.getDisplay();
 const element=display.getElement();
 if(doubleTapDisplays.has(element))return;
 doubleTapDisplays.add(element);
 let start=null;
 let previous=null;
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 element.addEventListener('touchstart',event=>{
  if(!phoneLayout.matches || pane.dataset.id!==focused || event.touches.length!==1){
   start=previous=null;
   return;
  }
  const touch=event.touches[0];
  start={x:touch.clientX,y:touch.clientY,time:performance.now()};
 },true);
 element.addEventListener('touchmove',event=>{
  const touch=event.touches[0];
  if(start && (!touch || distance(start,{x:touch.clientX,y:touch.clientY})>8))
   start=previous=null;
 },true);
 element.addEventListener('touchcancel',()=>{start=previous=null;},true);
 element.addEventListener('touchend',event=>{
  const touch=event.changedTouches[0];
  const now=performance.now();
  if(!start || !touch || event.touches.length || now-start.time>200){
   start=previous=null;
   return;
  }
  const point={x:touch.clientX,y:touch.clientY,time:now};
  const first=previous;
  previous=point;
  start=null;
  if(!first || now-first.time>280 || distance(first,point)>14)return;
  const bounds=element.getBoundingClientRect();
  const scale=display.getScale();
  if(!scale || !bounds.width || !bounds.height)return;
  previous=null;
  event.preventDefault();
  event.stopImmediatePropagation();
  const mouse={x:Math.floor((first.x-bounds.left)/scale),y:Math.floor((first.y-bounds.top)/scale),
   left:false,middle:false,right:false,up:false,down:false};
  client.sendMouseState(mouse,false);
  mouse.left=true;
  client.sendMouseState(mouse,false);
  mouse.left=false;
  client.sendMouseState(mouse,false);
 },{capture:true,passive:false});
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
    if(phoneLayout.matches)bindPhoneDoubleTap(pane,session.client.client);
    const frame=pane.querySelector('iframe');
    const active=document.activeElement;
    if(!initialDesktopFocus && !phoneLayout.matches && pane.dataset.id===focused
      && (active===document.body || active===frame)){
     initialDesktopFocus=true;
     frame.focus({preventScroll:true});
     frame.contentWindow.focus();
    }
    const props=session.client.clientProperties;
    const scrollContent=pane.querySelector('iframe').contentDocument?.querySelector('.client-main .displayOuter');
    if(scrollContent){
     const gutter=phoneLayout.matches && props.scale>props.minScale+0.01?'48px':'';
     if(scrollContent.style.padding!==gutter)scrollContent.style.padding=gutter;
    }
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
const phoneKeyboardButton=document.querySelector('#phone-keyboard');

phoneKeyboardButton.onclick=()=>{
 if(!phoneLayout.matches)return;
 try{
  const frame=panes.find(pane=>pane.dataset.id===focused).querySelector('iframe');
  const w=frame.contentWindow;
  const doc=w.document;
  const root=w.angular?.element(doc.body).injector()?.get('$rootScope');
  if(!root)throw Error('Wait for the desktop to connect.');
  const closing=keyboardEnabled.has(doc) || Boolean(doc.querySelector('guac-text-input, guac-osk'));
  if(closing)doc.activeElement?.blur();
  root.$apply(()=>root.$broadcast('guacShowMenu'));
  try{
   const mode=doc.querySelector(closing?'#ime-none':'#ime-text');
   if(!mode)throw Error('Keyboard mode is unavailable.');
   if(!mode.checked)mode.click();
  }finally{
   root.$apply(()=>root.$broadcast('guacHideMenu'));
  }
  if(closing){
   releasePhoneModifiers(panes.find(pane=>pane.dataset.id===focused));
   keyboardEnabled.delete(doc);
   phoneKeyboardButton.setAttribute('aria-pressed','false');
   phoneKeyboardButton.blur();
   workspaceStatus('');
   return;
  }
  keyboardEnabled.add(doc);
  phoneKeyboardButton.setAttribute('aria-pressed','true');
  const field=doc.querySelector('guac-text-input textarea');
  if(field){field.focus({preventScroll:true});workspaceStatus('');}
  else workspaceStatus('Tap the Guacamole text field when it appears.');
 }catch(error){workspaceStatus(error.message);}
};
}
