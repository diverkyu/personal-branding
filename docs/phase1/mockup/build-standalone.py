"""화면 시안(.dc.html)을 로그인 없이 열리는 단일 HTML 뷰어로 변환한다.

입력: mockup/*.dc.html (Claude 디자인 캔버스 형식, 런타임 support.js 필요)
출력: kyu-mockup.html (이 파일 하나만 있으면 브라우저에서 열림)
"""
import json
import re
import sys

src = sys.argv[1]
out = sys.argv[2]

SCREENS = [
    ('home', 'Main', '홈 (데스크톱)', 'wide'),
    ('mobile', 'HomeMobile', '홈 (모바일)', 'phone'),
    ('freediving', 'Freediving', 'Freediving 허브', 'wide'),
    ('tour', 'Tour', '투어 상세', 'wide'),
    ('story', 'Story', 'Story 목록', 'wide'),
    ('films', 'Films', 'Films 목록', 'wide'),
    ('filmd', 'FilmDetail', 'Films 작품 상세', 'wide'),
    ('travelm', 'TravelMenu', '여행 추천 메뉴·결정', 'wide'),
    ('travel', 'Travel', '여행 추천 목록', 'wide'),
    ('traveld', 'TravelDetail', '여행 추천 상세', 'wide'),
    ('admin', 'Admin', '어드민', 'wide'),
    ('ds', 'DesignSystem', '디자인 시스템', 'wide'),
]
FILE_TO_ID = {name + '.dc.html': sid for sid, name, _, _ in SCREENS}

BRIDGE = (
    '<script>document.addEventListener("click",function(e){'
    'var a=e.target.closest("a[data-go]");'
    'if(a){e.preventDefault();parent.postMessage({go:a.getAttribute("data-go")},"*");}'
    'else{var b=e.target.closest("a[href=\\"#\\"]");if(b){e.preventDefault();}}'
    '});</script>'
)


def convert(name):
    html = open(f'{src}/{name}.dc.html', encoding='utf-8').read()
    title = re.search(r'<title>(.*?)</title>', html, re.S).group(1)
    xdc = re.search(r'<x-dc>(.*)</x-dc>', html, re.S).group(1)
    helmet = re.search(r'<helmet>(.*?)</helmet>', xdc, re.S)
    head_extra = helmet.group(1) if helmet else ''
    body = xdc.replace(helmet.group(0), '') if helmet else xdc

    def fix_href(m):
        target = m.group(1)
        sid = FILE_TO_ID.get(target)
        return f'href="#" data-go="{sid}"' if sid else m.group(0)

    body = re.sub(r'href="([A-Za-z]+\.dc\.html)"', fix_href, body)
    assert '.dc.html' not in body, name
    assert '{{' not in body, name
    return (
        '<!doctype html><html lang="ko"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        f'<title>{title}</title>{head_extra}</head><body>{body}{BRIDGE}</body></html>'
    )


pages = {sid: convert(name) for sid, name, _, _ in SCREENS}
meta = [{'id': sid, 'label': label, 'kind': kind} for sid, _, label, kind in SCREENS]

pages_json = json.dumps(pages, ensure_ascii=False).replace('</', '<\\/')
meta_json = json.dumps(meta, ensure_ascii=False)

VIEWER = '''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>KYU 사이트 화면 시안</title>
<style>
html,body{margin:0;height:100%;font-family:'Noto Sans KR','DM Sans',system-ui,sans-serif;background:#e9ece8;color:#071e29}
#bar{position:fixed;top:0;left:0;right:0;height:56px;background:#071e29;color:#f4f4ec;display:flex;align-items:center;gap:8px;padding:0 16px;box-sizing:border-box;z-index:10;overflow-x:auto;white-space:nowrap}
#bar b{font-size:15px;margin-right:8px;letter-spacing:-.5px}
#bar button{font:inherit;font-size:13px;color:#f4f4ec;background:transparent;border:1px solid #ffffff40;border-radius:30px;padding:8px 14px;cursor:pointer;min-height:36px}
#bar button[aria-pressed="true"]{background:#d6f48a;color:#071e29;border-color:#d6f48a;font-weight:700}
#bar .sp{flex:1}
#bar .note{font-size:12px;color:#a0b4ba}
#stage{position:absolute;top:56px;left:0;right:0;bottom:0;display:flex;justify-content:center;background:#e9ece8}
#frame{border:0;background:#fff;height:100%;width:100%;box-shadow:0 0 0 1px #bdc8c3}
@media(max-width:700px){#bar .note{display:none}}
</style>
</head>
<body>
<div id="bar" role="toolbar" aria-label="화면 선택">
<b>KYU 시안</b>
<span id="screens"></span>
<span class="sp"></span>
<span id="widths"></span>
<span class="note">샘플 화면 · 일정·후기·글 제목은 자리표시</span>
</div>
<div id="stage"><iframe id="frame" title="화면 시안"></iframe></div>
<script>
var PAGES=__PAGES__;
var META=__META__;
var WIDTHS=[{k:"100%",l:"데스크톱"},{k:"768px",l:"태블릿"},{k:"390px",l:"모바일"}];
var cur="home",wid="100%";
var screensEl=document.getElementById("screens"),widthsEl=document.getElementById("widths"),frame=document.getElementById("frame");
function mk(label,pressed,fn){var b=document.createElement("button");b.type="button";b.textContent=label;b.setAttribute("aria-pressed",pressed?"true":"false");b.onclick=fn;return b;}
function render(){
  screensEl.innerHTML="";widthsEl.innerHTML="";
  META.forEach(function(m){screensEl.appendChild(mk(m.label,m.id===cur,function(){go(m.id);}));screensEl.appendChild(document.createTextNode(" "));});
  var kind=META.filter(function(m){return m.id===cur;})[0].kind;
  if(kind==="wide"){WIDTHS.forEach(function(w){widthsEl.appendChild(mk(w.l,w.k===wid,function(){wid=w.k;apply();render();}));widthsEl.appendChild(document.createTextNode(" "));});}
}
function apply(){
  var kind=META.filter(function(m){return m.id===cur;})[0].kind;
  frame.style.width=kind==="phone"?"390px":wid;
  frame.srcdoc=PAGES[cur];
}
function go(id){if(!PAGES[id])return;cur=id;location.hash=id;apply();render();}
window.addEventListener("message",function(e){if(e.data&&e.data.go)go(e.data.go);});
window.addEventListener("hashchange",function(){var id=location.hash.slice(1);if(PAGES[id]&&id!==cur){cur=id;apply();render();}});
var start=location.hash.slice(1);if(PAGES[start])cur=start;
apply();render();
</script>
</body>
</html>
'''

result = VIEWER.replace('__PAGES__', pages_json).replace('__META__', meta_json)
open(out, 'w', encoding='utf-8').write(result)
print('written', out, len(result), 'bytes')
