const $=id=>document.getElementById(id);
const D={a:"チーム名A",b:"チーム名B",sa:"2",sb:"1",r:"チーム名A"};
const stage=$("stage");
const card=$("card");
const editor=$("editor");
const form=$("form");
const a=$("a");
const b=$("b");
const sa=$("sa");
const sb=$("sb");
const type=$("type");
const custom=$("custom");
const wrap=$("custom-wrap");
const notice=$("notice");
const title=document.querySelector(".title");
const titleInk=title.querySelector(".ink");
const matchup=document.querySelector(".matchup");
const matchupInk=matchup.querySelector(".ink");
const teamAView=$("va");
const teamBView=$("vb");
const scoreLine=$("score");
const scoreInk=scoreLine.querySelector(".ink");
const scoreAView=$("vsa");
const scoreBView=$("vsb");
const outcome=document.querySelector(".outcome");
const outcomeInk=$("vr");
const lines=[...document.querySelectorAll(".reveal")];
const clean=(v,f)=>String(v??"").replace(/[\r\n\t]+/g," ").replace(/\s{2,}/g," ").trim()||f;
const score=v=>String(Math.max(0,Math.min(99,parseInt(v,10)||0)));
const draw=v=>/^(引き分け|引分け|draw)$/i.test(String(v).trim());

function result(){
  return type.value==="a"?clean(a.value,D.a):type.value==="b"?clean(b.value,D.b):type.value==="custom"?clean(custom.value,"結果未入力"):"引き分け";
}
function options(){
  type.options[1].text=`${clean(a.value,"チームA")} の勝利`;
  type.options[2].text=`${clean(b.value,"チームB")} の勝利`;
}
function toggle(){
  wrap.hidden=type.value!=="custom";
  if(!wrap.hidden)setTimeout(()=>custom.focus(),0);
}
function data(){
  return{a:clean(a.value,D.a),b:clean(b.value,D.b),sa:score(sa.value),sb:score(sb.value),r:result()};
}
function setForm(x){
  a.value=x.a;b.value=x.b;sa.value=x.sa;sb.value=x.sb;options();
  if(draw(x.r)){type.value="draw";custom.value=""}
  else if(x.r===x.a){type.value="a";custom.value=""}
  else if(x.r===x.b){type.value="b";custom.value=""}
  else{type.value="custom";custom.value=x.r}
  toggle();
}
function setView(x){
  teamAView.textContent=x.a;
  teamBView.textContent=x.b;
  scoreAView.textContent=x.sa;
  scoreBView.textContent=x.sb;
  scoreLine.ariaLabel=`${x.sa} 対 ${x.sb}`;
  $("label").textContent=draw(x.r)?"DRAW":"WINNER";
  outcomeInk.textContent=x.r;
  document.title=`GAME RESULT | ${x.a} vs ${x.b}`;
}
function urlFor(x){
  const u=new URL(location.href);
  u.search="";
  u.searchParams.set("a",x.a);
  u.searchParams.set("b",x.b);
  u.searchParams.set("sa",x.sa);
  u.searchParams.set("sb",x.sb);
  u.searchParams.set("r",x.r);
  return u;
}
function fitSingleLine(element,inner,minSize){
  element.style.removeProperty("font-size");
  const available=Math.max(1,card.clientWidth);
  const natural=Math.max(1,inner.scrollWidth);
  if(natural<=available)return true;
  const base=parseFloat(getComputedStyle(element).fontSize)||minSize;
  element.style.fontSize=`${Math.max(minSize,base*(available/natural)*.985)}px`;
  return inner.scrollWidth<=available+1;
}
function fitTitle(){fitSingleLine(title,titleInk,24)}
function fitMatchup(){
  matchup.classList.remove("stacked");
  matchup.style.removeProperty("font-size");
  const available=Math.max(1,card.clientWidth);
  const natural=Math.max(1,matchupInk.scrollWidth);
  if(natural<=available)return;
  const base=parseFloat(getComputedStyle(matchup).fontSize)||24;
  const target=base*(available/natural)*.985;
  if(target>=18){matchup.style.fontSize=`${target}px`;return}
  matchup.classList.add("stacked");
  matchup.style.removeProperty("font-size");
  const widest=Math.max(teamAView.scrollWidth,teamBView.scrollWidth,1);
  if(widest>available){
    const stackedBase=parseFloat(getComputedStyle(matchup).fontSize)||24;
    matchup.style.fontSize=`${Math.max(17,stackedBase*(available/widest)*.985)}px`;
  }
}
function fitScore(){
  scoreLine.style.removeProperty("font-size");
  const available=Math.max(1,card.clientWidth);
  const natural=Math.max(1,scoreInk.scrollWidth);
  if(natural>available){
    const base=parseFloat(getComputedStyle(scoreLine).fontSize)||72;
    scoreLine.style.fontSize=`${Math.max(36,base*(available/natural)*.985)}px`;
  }
}
function fitOutcome(){
  outcome.classList.remove("wrap");
  outcome.style.removeProperty("font-size");
  const available=Math.max(1,card.clientWidth);
  const natural=Math.max(1,outcomeInk.scrollWidth);
  if(natural<=available)return;
  const base=parseFloat(getComputedStyle(outcome).fontSize)||32;
  outcome.style.fontSize=`${Math.max(22,base*(available/natural)*.985)}px`;
  if(outcomeInk.scrollWidth>available+1)outcome.classList.add("wrap");
}
function fitCard(){
  stage.style.setProperty("--card-scale","1");
  const style=getComputedStyle(stage);
  const available=Math.max(1,stage.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom));
  const height=Math.max(1,card.offsetHeight);
  const scale=Math.min(1,available/height);
  stage.style.setProperty("--card-scale",String(Math.max(.72,scale*.985)));
}
function layout(){
  stage.style.setProperty("--card-scale","1");
  fitTitle();fitMatchup();fitScore();fitOutcome();fitCard();
}
function prepareTimeline(){
  lines.forEach(line=>line.classList.add("prepared"));
  layout();
  let cursor=70;
  let dividerDelay=850;
  lines.forEach((line,index)=>{
    const width=Math.max(1,line.offsetWidth,line.scrollWidth);
    const scanWidth=Math.min(112,Math.max(38,width*.2));
    const baseDuration=Number(line.dataset.duration||520);
    const duration=Math.round(Math.min(820,Math.max(baseDuration,width*.72)));
    const gap=Number(line.dataset.gap||45);
    line.style.setProperty("--line-delay",`${cursor}ms`);
    line.style.setProperty("--wipe-duration",`${duration}ms`);
    line.style.setProperty("--glitch-delay",`${cursor+Math.round(duration*.62)}ms`);
    line.style.setProperty("--scan-width",`${Math.round(scanWidth)}px`);
    line.style.setProperty("--scan-start",`${Math.round(-scanWidth-8)}px`);
    line.style.setProperty("--scan-end",`${Math.round(width+4)}px`);
    line.style.setProperty("--scan-mid",`${Math.round((width-scanWidth)/2)}px`);
    if(index===1)dividerDelay=cursor+duration+35;
    cursor+=duration+gap;
  });
  stage.style.setProperty("--divider-delay",`${dividerDelay}ms`);
}
function play(){
  stage.classList.remove("playing");
  prepareTimeline();
  void stage.offsetWidth;
  stage.classList.add("playing");
}
function closeEditor(){editor.classList.remove("open");document.activeElement?.blur()}
function openEditor(){editor.classList.add("open");setTimeout(()=>a.focus(),180)}
function apply(closeSheet=true){
  const x=data();setForm(x);setView(x);history.replaceState(null,"",urlFor(x));
  if(closeSheet)closeEditor();
  requestAnimationFrame(()=>requestAnimationFrame(play));
  return x;
}
async function copy(text){
  if(navigator.clipboard&&isSecureContext)return navigator.clipboard.writeText(text);
  const t=document.createElement("textarea");
  t.value=text;t.style.position="fixed";t.style.opacity=0;document.body.append(t);t.select();document.execCommand("copy");t.remove();
}
async function share(){
  const x=apply(false);
  const url=urlFor(x).toString();
  const text=`${x.a} VS ${x.b}\n${x.sa} VS ${x.sb}\n${x.r}`;
  try{
    if(navigator.share)return await navigator.share({title:"GAME RESULT",text,url});
    await copy(url);notice.textContent="共有URLをコピーしました。";openEditor();
  }catch(e){
    if(e?.name!=="AbortError"){await copy(url);notice.textContent="共有URLをコピーしました。";openEditor()}
  }
}
function fromUrl(){
  const p=new URLSearchParams(location.search);
  if(!p.has("a")&&!p.has("b")&&!p.has("r"))return null;
  return{a:clean(p.get("a"),D.a),b:clean(p.get("b"),D.b),sa:score(p.get("sa")??D.sa),sb:score(p.get("sb")??D.sb),r:clean(p.get("r"),D.r)};
}
function scheduleLayout(){cancelAnimationFrame(scheduleLayout.frame);scheduleLayout.frame=requestAnimationFrame(layout)}
form.addEventListener("submit",e=>{e.preventDefault();apply()});
type.addEventListener("change",toggle);
a.addEventListener("input",options);
b.addEventListener("input",options);
$("edit").onclick=openEditor;
$("replay").onclick=play;
$("share").onclick=share;
$("close").onclick=closeEditor;
$("reset").onclick=()=>{setForm(D);notice.textContent="初期値に戻しました。"};
stage.addEventListener("click",()=>{if(!editor.classList.contains("open"))play()});
editor.addEventListener("click",e=>{if(e.target===editor)closeEditor()});
window.addEventListener("resize",scheduleLayout,{passive:true});
window.addEventListener("orientationchange",()=>setTimeout(scheduleLayout,120),{passive:true});
const initial=fromUrl();
setForm(initial||D);
setView(initial||D);
window.addEventListener("pageshow",()=>setTimeout(()=>{play();if(!initial)openEditor()},150));
if(document.fonts?.ready)document.fonts.ready.then(scheduleLayout);
if(typeof ResizeObserver==="function")new ResizeObserver(scheduleLayout).observe(stage);
