import { app,auth,db,rdb,signInAnonymously,onAuthStateChanged,updateProfile,doc,getDoc,setDoc,updateDoc,onSnapshot,collection,query,where,addDoc,serverTimestamp,runTransaction,getDocs,orderBy,limit,ref,onDisconnect,onValue,rset,rts } from "./firebase.js";
import { ITEMS,ITEM_MAP } from "./items.js";
import { QUESTS } from "./quests.js";

const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const state={uid:null,user:null,usersCache:new Map(),onlineSet:new Set(),incomingUnsub:null,outgoingUnsub:null};

function show(el){el.classList.remove("hidden")} function hide(el){el.classList.add("hidden")}
function fmt(n){return new Intl.NumberFormat().format(n)}
function now(){return Date.now()}

async function ensureUserDoc(uid){
  const uref=doc(db,"users",uid); const snap=await getDoc(uref);
  if(!snap.exists()){
    await setDoc(uref,{username:"",usernameLower:"",balance:0,inventory:{},questProgress:{},joinedAt:serverTimestamp(),lastLogin:serverTimestamp()});
  }else{
    await updateDoc(uref,{lastLogin:serverTimestamp()});
  }
}

function presence(uid){
  const sref=ref(rdb,"status/"+uid);
  onDisconnect(sref).set({state:"offline",t:rts()});
  rset(sref,{state:"online",t:rts()});
}

function tabs(){
  $$(".tabs button").forEach(b=>b.addEventListener("click",e=>{
    $$(".tabs button").forEach(x=>x.classList.remove("active")); e.currentTarget.classList.add("active");
    const t=e.currentTarget.dataset.tab; $$(".tab").forEach(x=>x.classList.remove("active")); $("#tab-"+t).classList.add("active");
  }))
}

function renderHeader(){
  const u=state.user||{}; $("#greet").textContent=u.username?u.username:""; $("#balance").textContent=u.balance!=null?("$"+fmt(u.balance)):""; $("#onlineCount").textContent=state.onlineSet.size?("Online "+state.onlineSet.size):"";
}

function renderQuests(){
  const wrap=$("#questsList"); wrap.innerHTML="";
  QUESTS.forEach(q=>{
    const last=(state.user.questProgress||{})[q.id]||0;
    const can=now()-last>24*3600*1000;
    const div=document.createElement("div");
    div.className="card";
    const items=q.rewards.map(r=>ITEM_MAP[r.item].name).join(", ");
    div.innerHTML='<div class="title">'+q.title+'</div><div class="meta">Items: '+items+'</div><div class="row"><span class="badge">+$'+q.money+'</span><button class="btn" '+(can?"":"disabled")+'>Complete</button></div>';
    div.querySelector("button").addEventListener("click",()=>completeQuest(q));
    wrap.appendChild(div);
  })
}

function addToInventory(inv,itemId,qty){
  const v=inv[itemId]||0; inv[itemId]=v+qty; if(inv[itemId]<=0) delete inv[itemId];
}

function randInt(a,b){return Math.floor(Math.random()*(b-a+1))+a}

async function completeQuest(q){
  await runTransaction(db,async tx=>{
    const uref=doc(db,"users",state.uid); const usnap=await tx.get(uref); const u=usnap.data();
    const last=(u.questProgress||{})[q.id]||0;
    if(now()-last<=24*3600*1000) return;
    const inv=Object.assign({},u.inventory||{});
    q.rewards.forEach(r=>addToInventory(inv,r.item,randInt(r.min,r.max)));
    const qp=Object.assign({},u.questProgress||{}); qp[q.id]=now();
    tx.update(uref,{balance:(u.balance||0)+q.money,inventory:inv,questProgress:qp});
  })
}

function renderInventory(){
  const wrap=$("#inventoryList"); wrap.innerHTML="";
  const inv=state.user.inventory||{};
  Object.keys(inv).sort().forEach(k=>{
    const it=ITEM_MAP[k]; const qty=inv[k];
    const div=document.createElement("div"); div.className="card";
    div.innerHTML='<div class="title">'+it.name+'</div><div class="row"><span class="badge">'+it.rarity+'</span><span>x'+qty+'</span><button class="btn">Offer</button></div>';
    div.querySelector("button").addEventListener("click",()=>prefillOfferItem(k,1));
    wrap.appendChild(div);
  })
}

function prefillOfferItem(itemId,qty){
  addItemRow("#offerItems",itemId,qty);
  $$(".tabs button").forEach(b=>b.classList.remove("active")); $('[data-tab="offers"]').classList.add("active");
  $$(".tab").forEach(x=>x.classList.remove("active")); $("#tab-offers").classList.add("active");
}

function optionItems(){
  const sel=document.createElement("select");
  ITEMS.forEach(i=>{const o=document.createElement("option"); o.value=i.id; o.textContent=i.name; sel.appendChild(o)});
  return sel;
}

function addItemRow(container,itemId,qty){
  const wrap=$(container);
  const row=document.createElement("div"); row.className="row";
  const sel=optionItems(); if(itemId) sel.value=itemId;
  const input=document.createElement("input"); input.type="number"; input.min="1"; input.value=qty||1;
  const del=document.createElement("button"); del.className="btn"; del.textContent="Remove";
  del.addEventListener("click",()=>row.remove());
  row.appendChild(sel); row.appendChild(input); row.appendChild(del);
  wrap.appendChild(row);
}

function collectRows(container){
  const rows=$$(container+" .row");
  const map={};
  rows.forEach(r=>{const id=r.querySelector("select").value; const qty=parseInt(r.querySelector("input").value||"0",10); if(qty>0){map[id]=(map[id]||0)+qty}});
  return map;
}

function usersSelect(){
  const sel=$("#tradeTo"); sel.innerHTML="";
  const ids=[...state.onlineSet].filter(x=>x!==state.uid);
  ids.forEach(id=>{
    const u=state.usersCache.get(id);
    if(u){const o=document.createElement("option"); o.value=id; o.textContent=u.username||id.slice(0,6); sel.appendChild(o)}
  })
}

async function sendOffer(){
  const to=$("#tradeTo").value;
  if(!to) return;
  const itemsOffered=collectRows("#offerItems");
  const itemsRequested=collectRows("#requestItems");
  const moneyOffered=Math.max(0,parseInt($("#offerMoney").value||"0",10));
  await addDoc(collection(db,"tradeOffers"),{fromUid:state.uid,toUid:to,itemsOffered,itemsRequested,moneyOffered,status:"pending",createdAt:serverTimestamp()});
  $("#offerItems").innerHTML=""; $("#requestItems").innerHTML=""; $("#offerMoney").value="0";
}

function renderOfferCard(o,side){
  const div=document.createElement("div"); div.className="card";
  const from=state.usersCache.get(o.fromUid)||{username:o.fromUid.slice(0,6)};
  const to=state.usersCache.get(o.toUid)||{username:o.toUid.slice(0,6)};
  const io=Object.entries(o.itemsOffered||{}).map(([k,v])=>ITEM_MAP[k].name+" x"+v).join(", ")||"None";
  const ir=Object.entries(o.itemsRequested||{}).map(([k,v])=>ITEM_MAP[k].name+" x"+v).join(", ")||"None";
  const money=o.moneyOffered?("$"+fmt(o.moneyOffered)):"$0";
  const head=document.createElement("div"); head.className="row"; head.innerHTML='<div class="title">'+(from.username||"")+" → "+(to.username||"")+'</div><span class="badge">'+o.status+'</span>';
  const body=document.createElement("div"); body.className="meta"; body.textContent="Offer: "+io+" | Money: "+money+" | Request: "+ir;
  div.appendChild(head); div.appendChild(body);
  if(side==="incoming"&&o.status==="pending"){
    const row=document.createElement("div"); row.className="row";
    const acc=document.createElement("button"); acc.className="btn"; acc.textContent="Accept";
    const dec=document.createElement("button"); dec.className="btn"; dec.textContent="Decline";
    acc.addEventListener("click",()=>acceptOffer(o.id));
    dec.addEventListener("click",()=>declineOffer(o.id));
    row.appendChild(acc); row.appendChild(dec); div.appendChild(row);
  }
  return div;
}

async function acceptOffer(id){
  await runTransaction(db,async tx=>{
    const oref=doc(db,"tradeOffers",id); const osnap=await tx.get(oref); if(!osnap.exists()) return; const o=osnap.data();
    if(o.status!=="pending"||o.toUid!==state.uid) return;
    const fromRef=doc(db,"users",o.fromUid); const toRef=doc(db,"users",o.toUid);
    const [fromSnap,toSnap]=await Promise.all([tx.get(fromRef),tx.get(toRef)]);
    const from=fromSnap.data(), to=toSnap.data();
    if((from.balance||0)<(o.moneyOffered||0)) return;
    const invFrom=Object.assign({},from.inventory||{}); const invTo=Object.assign({},to.inventory||{});
    for(const [k,v] of Object.entries(o.itemsOffered||{})){ if((invFrom[k]||0)<v) return; }
    for(const [k,v] of Object.entries(o.itemsRequested||{})){ if((invTo[k]||0)<v) return; }
    for(const [k,v] of Object.entries(o.itemsOffered||{})){ invFrom[k]-=v; if(invFrom[k]<=0) delete invFrom[k]; invTo[k]=(invTo[k]||0)+v; }
    for(const [k,v] of Object.entries(o.itemsRequested||{})){ invTo[k]-=v; if(invTo[k]<=0) delete invTo[k]; invFrom[k]=(invFrom[k]||0)+v; }
    const m=o.moneyOffered||0;
    tx.update(fromRef,{balance:(from.balance||0)-m,inventory:invFrom});
    tx.update(toRef,{balance:(to.balance||0)+m,inventory:invTo});
    tx.update(oref,{status:"accepted",resolvedAt:serverTimestamp()});
  })
}

async function declineOffer(id){
  await updateDoc(doc(db,"tradeOffers",id),{status:"declined",resolvedAt:serverTimestamp()});
}

function listenOffers(){
  if(state.incomingUnsub) state.incomingUnsub(); if(state.outgoingUnsub) state.outgoingUnsub();
  const iq=query(collection(db,"tradeOffers"),where("toUid","==",state.uid),orderBy("createdAt","desc"),limit(50));
  const oq=query(collection(db,"tradeOffers"),where("fromUid","==",state.uid),orderBy("createdAt","desc"),limit(50));
  state.incomingUnsub=onSnapshot(iq,s=>{
    const wrap=$("#incomingOffers"); wrap.innerHTML="";
    s.forEach(docu=>{const o={id:docu.id,...docu.data()}; wrap.appendChild(renderOfferCard(o,"incoming"))})
  });
  state.outgoingUnsub=onSnapshot(oq,s=>{
    const wrap=$("#outgoingOffers"); wrap.innerHTML="";
    s.forEach(docu=>{const o={id:docu.id,...docu.data()}; wrap.appendChild(renderOfferCard(o,"outgoing"))})
  });
}

async function cacheUser(uid){
  if(state.usersCache.has(uid)) return state.usersCache.get(uid);
  const snap=await getDoc(doc(db,"users",uid));
  const data= snap.exists()?snap.data():{username:uid.slice(0,6)};
  state.usersCache.set(uid,data); return data;
}

function renderOnline(){
  usersSelect();
  const wrap=$("#onlineUsers"); wrap.innerHTML="";
  const ids=[...state.onlineSet].filter(x=>x!==state.uid);
  ids.forEach(async id=>{
    await cacheUser(id);
    const u=state.usersCache.get(id);
    const div=document.createElement("div"); div.className="card";
    div.innerHTML='<div class="title">'+(u.username||id.slice(0,6))+'</div><div class="row"><span class="badge">online</span><button class="btn">Trade</button></div>';
    div.querySelector("button").addEventListener("click",()=>{ $("#tradeTo").value=id; $('[data-tab="offers"]').click(); });
    wrap.appendChild(div);
  })
  renderHeader();
}

function listenPresence(){
  onValue(ref(rdb,"status"),async s=>{
    const val=s.val()||{}; state.onlineSet=new Set(Object.keys(val).filter(k=>val[k].state==="online"));
    for(const id of state.onlineSet){ if(!state.usersCache.has(id)) await cacheUser(id) }
    renderOnline();
  })
}

function onUserDoc(){
  onSnapshot(doc(db,"users",state.uid),snap=>{state.user={uid:state.uid,...(snap.data()||{})}; renderHeader(); renderQuests(); renderInventory();})
}

function onAuth(){
  onAuthStateChanged(auth,async user=>{
    if(!user){await signInAnonymously(auth);return}
    state.uid=user.uid; await ensureUserDoc(user.uid); presence(user.uid); await cacheUser(user.uid); onUserDoc(); show($("#auth")); $("#app").classList.add("hidden");
  })
}

async function createUsername(){
  const input=$("#usernameInput"); const v=(input.value||"").trim();
  if(!v) return;
  const qy=query(collection(db,"users"),where("usernameLower","==",v.toLowerCase()),limit(1));
  const qs=await getDocs(qy);
  if(!qs.empty) return;
  await updateDoc(doc(db,"users",state.uid),{username:v,usernameLower:v.toLowerCase()});
  const usr=await getDoc(doc(db,"users",state.uid)); state.usersCache.set(state.uid,usr.data());
  $("#auth").style.display="none"; $("#app").classList.remove("hidden");
}

function init(){
  tabs();
  $("#addOfferItem").addEventListener("click",()=>addItemRow("#offerItems"));
  $("#addRequestItem").addEventListener("click",()=>addItemRow("#requestItems"));
  $("#sendOffer").addEventListener("click",sendOffer);
  $("#createUsername").addEventListener("click",createUsername);
  onAuth(); listenPresence(); listenOffers();
}

init();
