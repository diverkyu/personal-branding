const articles = [
  {id:'fantasy',category:'AI 창작',title:'내 방의 문을 열면 판타지 세계가 펼쳐진다면?',summary:'익숙한 방에서 시작해, 한 번도 가본 적 없는 세계로. 상상을 영상으로 옮기는 과정을 함께 나눕니다.',image:'fantasy.webp',alt:'판타지 바다와 거대한 바위 아치를 바라보는 인물',label:'기존 작업을 활용한 구성 예시'},
  {id:'guide',category:'AI 창작',title:'이런 AI 영상, 어떻게 만드냐고요?',summary:'처음 시작하는 사람을 위한 AI 영상 제작 가이드. 캐릭터와 장면을 준비하고, 하나의 이야기로 이어가는 흐름을 살펴봅니다.',image:'guide.webp',alt:'방 안에서 니트를 입고 카메라를 바라보는 AI 캐릭터 규린',label:'기존 작업을 활용한 구성 예시'},
  {id:'workflow',category:'AI 창작',title:'상상을 한 편의 영상으로 잇는 워크플로우',summary:'아이디어에서 이미지, 그리고 움직이는 장면까지. 「환상속으로」 제작 과정을 한눈에 따라가는 기록입니다.',image:'workflow.webp',alt:'현실의 문과 판타지 세계를 연결하는 세 단계 설명 그림',label:'기존 작업을 활용한 구성 예시'},
  {id:'coron',category:'프리다이빙',title:'코론, 한 호흡으로 만나는 바다',summary:'푸른 바다와 산호초 사이에서 마주할 장면들. 코론 프리다이빙 투어 자료를 활용한 이야기 카드 시안입니다.',image:'coron.webp',alt:'코론 바닷속의 다이버와 산호초',label:'시안용 가제 · 본문 미작성'}
];
const films=[{ep:'06',title:'오늘은 참치가 아니네요',image:'film6.webp',duration:'1:30'},{ep:'05',title:'기다리면 와',image:'film5.webp',duration:''},{ep:'04',title:'나 오늘 칭찬 받았다',image:'film4.webp',duration:''}];
const homePage=document.getElementById('home-page');
const storyPage=document.getElementById('story-page');
const search=document.getElementById('story-search');
const extendedPage=document.getElementById('extended-page');
let activeFilter='전체';

function make(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
function articleButton(article,className){const button=make('a',className);button.href=`#article/${article.id}`;return button;}
function card(article){
  const node=make('article','story-card');
  const imageButton=articleButton(article,`card-image ${article.id}`);imageButton.setAttribute('aria-label',`${article.title} 시안 보기`);
  const image=make('img');image.src=`assets/${article.image}`;image.alt=article.alt;image.loading='lazy';imageButton.append(image);node.append(imageButton);
  const meta=make('div','card-meta');meta.append(make('span','category-text',article.category),make('span','','Story'));node.append(meta);
  const heading=make('h3');const button=articleButton(article,'');button.textContent=article.title;heading.append(button);node.append(heading,make('p','',article.summary));
  const byline=make('div','card-byline');byline.append(make('span','','by KYU'),make('span','',article.id==='coron'?'시안용 가제':'시안 예시'));node.append(byline);return node;
}
document.getElementById('home-articles').append(...articles.filter(a=>a.id!=='fantasy').slice(0,2).map(card));
const filmContainer=document.getElementById('home-films');
for(const film of films){const link=make('a','film-item');link.href=`#film/ep${Number(film.ep)}`;
 const figure=make('div','film-image');const img=make('img');img.src=`assets/${film.image}`;img.alt=`찬란한 보통의 날들 ${Number(film.ep)}화 포스터`;img.loading='lazy';figure.append(img,make('span','',`EP.${film.ep}`));const play=make('span','play-small','▷');play.setAttribute('aria-hidden','true');figure.append(play);link.append(figure,make('span','meta',`찬란한 보통의 날들${film.duration?' · '+film.duration:''}`),make('h3','',film.title));filmContainer.append(link);}
function renderStories(){const q=search.value.trim().toLocaleLowerCase('ko');const list=articles.filter(a=>(activeFilter==='전체'||a.category===activeFilter)&&(!q||`${a.title} ${a.summary} ${a.category}`.toLocaleLowerCase('ko').includes(q)));
 document.getElementById('story-articles').replaceChildren(...list.map(card));document.getElementById('result-count').textContent=String(list.length);document.getElementById('empty-state').hidden=list.length>0;
 document.getElementById('search-state').textContent=q?`“${search.value.trim()}” 검색 결과 ${list.length}개`:'구성 예시 · 글과 이미지를 눌러 미리 볼 수 있어요.';
 document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===activeFilter)));}
function route(){
 const raw=location.hash.slice(1)||'home';const [path,query='']=raw.split('?');const params=new URLSearchParams(query);const [page,id]=path.split('/');
 window.KyuFilmPages?.dispose?.();
 homePage.hidden=page!=='home';storyPage.hidden=page!=='story';extendedPage.hidden=['home','story'].includes(page);extendedPage.replaceChildren();
 let nav=page;let title='KYU — 바다와 창작 사이';
 if(page==='story'){title='Story — KYU';}
 else if(page==='freediving'){extendedPage.innerHTML=window.KyuDivePages.freediving;title='Freediving — KYU';}
 else if(page==='tours'){extendedPage.innerHTML=window.KyuDivePages.tours;title='Tours — KYU';}
 else if(page==='tour'&&id==='coron'){extendedPage.innerHTML=window.KyuDivePages.coron;nav='tours';title='2026 코론 프리다이빙 투어 — KYU';}
 else if(page==='films'){extendedPage.innerHTML=window.KyuFilmPages.renderList();window.KyuFilmPages.init(extendedPage);title='만들고 싶은 이야기 · Films — KYU';}
 else if(page==='film'){extendedPage.innerHTML=window.KyuFilmPages.renderDetail(id);window.KyuFilmPages.init(extendedPage);nav='films';title='Films — KYU';}
 else if(page==='about'){extendedPage.innerHTML=window.KyuAboutContact.about;window.KyuAboutContact.init(extendedPage,params);title='About · 이동규 — KYU';}
 else if(page==='contact'){extendedPage.innerHTML=window.KyuAboutContact.contact;window.KyuAboutContact.init(extendedPage,params);title='Contact — KYU';}
 else if(page==='article'&&articles.some(a=>a.id===id)){const a=articles.find(a=>a.id===id);extendedPage.innerHTML=window.KyuStoryPages.render(a,articles);nav='story';title=`${a.title} — KYU`;}
 else if(page!=='home'){extendedPage.hidden=false;extendedPage.innerHTML='<section class="not-found wrap"><p class="eyebrow">KYU</p><h1>다른 이야기로 이어가 볼까요?</h1><p>이 주소에 연결된 시안 페이지를 찾지 못했어요.</p><div class="main-page-nav"><a class="button button-ink" href="#home">홈으로</a><a class="text-link" href="#story">Story 보기</a></div></section>';title='페이지를 찾지 못했어요 — KYU';}
 document.title=title+' · 디자인 시안';document.getElementById('contact-strip').hidden=page==='contact';
 document.querySelectorAll('[data-nav]').forEach(a=>{if(a.dataset.nav===nav)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 closeMenu();window.scrollTo({top:0,behavior:'instant'});document.getElementById('main').focus({preventScroll:true});
}
function closeMenu(){document.getElementById('mobile-nav').hidden=true;document.querySelector('.menu-button').setAttribute('aria-expanded','false');}
window.addEventListener('hashchange',route);
document.querySelector('.menu-button').addEventListener('click',event=>{const expanded=event.currentTarget.getAttribute('aria-expanded')==='true';event.currentTarget.setAttribute('aria-expanded',String(!expanded));document.getElementById('mobile-nav').hidden=expanded;});
document.querySelectorAll('#mobile-nav a').forEach(link=>link.addEventListener('click',()=>{closeMenu();if(link.hash){document.getElementById('main').focus({preventScroll:true});}}));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.getElementById('mobile-nav').hidden){closeMenu();document.querySelector('.menu-button').focus();}});
window.matchMedia('(min-width: 801px)').addEventListener('change',event=>{if(event.matches)closeMenu();});
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{activeFilter=button.dataset.filter;renderStories();}));
search.addEventListener('input',renderStories);
document.querySelector('.search-form').addEventListener('submit',event=>{event.preventDefault();renderStories();document.querySelector('.story-filter-head').scrollIntoView({block:'start'});});
document.querySelectorAll('[data-keyword]').forEach(button=>button.addEventListener('click',()=>{activeFilter='전체';search.value=button.dataset.keyword;renderStories();document.querySelector('.story-filter-head').scrollIntoView({block:'start'});}));
document.getElementById('reset-search').addEventListener('click',()=>{activeFilter='전체';search.value='';renderStories();search.focus();});
function focusSearch(){search.scrollIntoView({block:'center'});search.focus({preventScroll:true});}
document.querySelector('[data-search]').addEventListener('click',()=>{if(location.hash!=='#story'){window.addEventListener('hashchange',focusSearch,{once:true});location.hash='story';}else focusSearch();});
document.addEventListener('click',event=>{const button=event.target.closest('[data-article]');if(button){const a=articles.find(article=>article.id===button.dataset.article);if(a)location.hash=`article/${a.id}`;}const section=event.target.closest('[data-reading-section]');if(section){const target=document.getElementById(section.dataset.readingSection);target?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}});
document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();document.getElementById('main').focus();});
// Connect previously external section links to the complete design preview.
document.querySelectorAll('a[href^="https://www.diverkyu.com/"]').forEach(link=>{const u=new URL(link.href);const paths={'/about':'#about','/freediving':'#freediving','/freediving/tours':'#tours','/films':'#films'};const episode=u.pathname.match(/^\/films\/brilliant-ordinary-days-ep(\d)$/);const target=paths[u.pathname]||(episode?`#film/ep${episode[1]}`:null);if(target){link.href=target;link.removeAttribute('target');link.removeAttribute('rel');}});
renderStories();route();
