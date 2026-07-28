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
const rand=(min,max)=>Math.random()*(max-min)+min;
const randInt=(min,max)=>Math.floor(rand(min,max+1));
const px=value=>`${Math.round(value)}px`;

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
  outcome.style.fontSize=`${Math.max(28,base*(available/natural)*.985)}px`;
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

function randomizeLineNoise(line,width){
  const previous=Number(line.dataset.noise);
  let variant=randInt(0,5);
  if(Number.isFinite(previous)&&variant===previous)variant=(variant+randInt(1,5))%6;
  line.dataset.noise=String(variant);

  const skew=rand(-7,7);
  const topLeft=randInt(0,8);
  const topRight=randInt(0,7);
  const bottomRight=randInt(93,100);
  const bottomLeft=randInt(92,100);

  line.style.setProperty("--noise-brightness",rand(1.28,1.62).toFixed(2));
  line.style.setProperty("--noise-contrast",rand(1.35,1.95).toFixed(2));
  line.style.setProperty("--noise-opacity",rand(.94,1).toFixed(2));
  line.style.setProperty("--noise-skew",`${skew.toFixed(2)}deg`);
  line.style.setProperty("--noise-offset-x",px(rand(-12,12)));
  line.style.setProperty("--noise-offset-y",px(rand(-8,8)));
  line.style.setProperty("--noise-clip",`polygon(0 ${topLeft}%,100% ${topRight}%,100% ${bottomRight}%,0 ${bottomLeft}%)`);
  line.style.setProperty("--edge-width",px(rand(2,4)));

  line.style.setProperty("--noise-x1",px(rand(-9,9)));
  line.style.setProperty("--noise-x2",px(rand(-7,7)));
  line.style.setProperty("--noise-x3",px(rand(-9,9)));
  line.style.setProperty("--noise-y0",px(rand(-2,2)));
  line.style.setProperty("--noise-y1",px(rand(-5,5)));
  line.style.setProperty("--noise-y2",px(rand(-4,4)));
  line.style.setProperty("--noise-y3",px(rand(-5,5)));
  line.style.setProperty("--noise-y4",px(rand(-2,2)));

  line.style.setProperty("--text-x1",px(rand(-2.5,2.5)));
  line.style.setProperty("--text-x2",px(rand(-2.5,2.5)));
  line.style.setProperty("--text-x3",px(rand(-1.8,1.8)));
  line.style.setProperty("--glitch-x1",px(rand(-4,-2)));
  line.style.setProperty("--glitch-x2",px(rand(2,4)));
  line.style.setProperty("--glitch-x3",px(rand(-3,-1)));
  line.style.setProperty("--glitch-x4",px(rand(1,2.5)));
  line.style.setProperty("--glitch-y1",px(rand(-1.5,1.5)));
  line.style.setProperty("--glitch-y2",px(rand(-1.5,1.5)));

  const scanWidth=Math.min(160,Math.max(54,width*rand(.25,.42)));
  const travel=Math.max(1,width-scanWidth);
  line.style.setProperty("--scan-width",px(scanWidth));
  line.style.setProperty("--scan-start",px(-scanWidth-rand(10,22)));
  line.style.setProperty("--scan-q1",px(travel*.25));
  line.style.setProperty("--scan-mid",px(travel*.5));
  line.style.setProperty("--scan-q3",px(travel*.75));
  line.style.setProperty("--scan-end",px(width+rand(8,20)));
}

function prepareTimeline(){
  lines.forEach(line=>line.classList.add("prepared"));
  layout();
  let cursor=70;
  let dividerDelay=850;

  lines.forEach((line,index)=>{
    const width=Math.max(1,line.offsetWidth,line.scrollWidth);
    randomizeLineNoise(line,width);

    const baseDuration=Number(line.dataset.duration||520);
    const distanceDuration=width*rand(.68,.88);
    const duration=Math.round(Math.min(940,Math.max(baseDuration*rand(.92,1.16),distanceDuration)));
    const gap=Math.max(16,Number(line.dataset.gap||45)+randInt(-12,18));

    line.style.setProperty("--line-delay",`${cursor}ms`);
    line.style.setProperty("--wipe-duration",`${duration}ms`);
    line.style.setProperty("--glitch-delay",`${cursor+Math.round(duration*rand(.58,.7))}ms`);

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
