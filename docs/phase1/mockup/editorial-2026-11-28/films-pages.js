(function () {
  'use strict';

  const episodes = [
    { id: 'ep1', number: 1, title: '괜찮지 않아도 돼', youtube: '3k32mZ3Oljo' },
    { id: 'ep2', number: 2, title: '우리 집 가자.', youtube: 'dWkZg3Dd0Wk' },
    { id: 'ep3', number: 3, title: '보통이', youtube: 'Wkb3ODdFUcU' },
    { id: 'ep4', number: 4, title: '나 오늘 칭찬 받았다', youtube: 'XgXksq6FK4w' },
    { id: 'ep5', number: 5, title: '기다리면 와', youtube: 'KBljgnPfzRU' },
    { id: 'ep6', number: 6, title: '오늘은 참치가 아니네요', youtube: 'X3WToqlJLUQ', duration: '1:30' }
  ];
  let cleanup = null;
  const number = e => String(e.number).padStart(2, '0');
  const poster = e => `assets/film${e.number}.webp`;
  const route = e => `#film/${e.id}`;
  const triangle = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';

  function episodeCard(e) {
    return `<article class="filmp-card"><a href="${route(e)}" class="filmp-card-image" aria-label="${e.title}, ${e.number}화 보기"><img src="${poster(e)}" alt="찬란한 보통의 날들 ${e.number}화 포스터" loading="lazy"><span class="filmp-episode-tag">EP.${number(e)}</span><span class="filmp-card-play">${triangle}</span></a><p class="filmp-card-meta">찬란한 보통의 날들${e.duration ? ' · ' + e.duration : ''}</p><h3><a href="${route(e)}">${e.title}</a></h3><p class="filmp-card-type">AI 숏드라마 · KYU</p></article>`;
  }

  function renderList() {
    const latest = episodes.at(-1);
    return `<div class="filmp-page">
      <section class="wrap filmp-intro">
        <nav class="breadcrumb" aria-label="현재 위치"><a href="#home">Home</a><span>/</span><span>Films</span></nav>
        <div class="filmp-title-row"><div><p class="eyebrow">Films · A collection of stories</p><h1>만들고 싶은<br><em>이야기</em></h1></div><p class="filmp-intro-note">상상으로 시작해, 하나의 장면으로.<br>AI로 만든 짧은 이야기들을 모았습니다.</p></div>
      </section>
      <section class="wrap filmp-feature" aria-labelledby="filmp-feature-title">
        <a href="${route(latest)}" class="filmp-feature-visual" aria-label="6화 오늘은 참치가 아니네요 보기"><img src="${poster(latest)}" alt="흰 목도리를 두른 여성과 주황색 고양이" fetchpriority="high"><span class="filmp-visual-label">Latest film / EP.06</span><span class="filmp-feature-play">${triangle}<span>작품 보기</span></span></a>
        <div class="filmp-feature-copy"><p class="eyebrow">찬란한 보통의 날들 · EP.06</p><h2 id="filmp-feature-title">오늘은 참치가<br>아니네요</h2><p>AI로 만든 숏드라마,<br>「찬란한 보통의 날들」의 여섯 번째 이야기.</p><div class="filmp-facts"><span>숏드라마</span><span>1:30</span><span>Created by KYU</span></div><a href="${route(latest)}" class="button button-ink">6화 보기</a><a href="#film/ep1" class="text-link">첫 이야기부터 보기</a></div>
      </section>
      <section class="wrap filmp-collection" aria-labelledby="filmp-collection-title">
        <div class="filmp-collection-head"><div><p class="eyebrow">Series</p><h2 id="filmp-collection-title">찬란한 보통의 날들 <span>6편</span></h2></div><div class="filmp-sort" role="group" aria-label="작품 정렬"><button type="button" data-film-sort="latest" aria-pressed="true">최신순</button><button type="button" data-film-sort="first" aria-pressed="false">첫 화부터</button></div></div>
        <div class="filmp-grid" data-film-grid>${[...episodes].reverse().map(episodeCard).join('')}</div>
        <p class="filmp-sort-status" data-film-status aria-live="polite">최신순으로 6편을 보여드려요.</p>
      </section>
      <section class="filmp-process"><div class="wrap filmp-process-inner"><div><p class="eyebrow">Behind the scenes</p><h2>장면이 되기까지의<br>이야기도 궁금하다면.</h2></div><div><p>아이디어를 다듬고, 이미지를 만들고,<br>움직이는 한 장면으로 이어가는 과정.<br>Story에서 창작의 뒷이야기를 만나보세요.</p><a href="#story" class="text-link">제작 이야기 읽기</a></div></div></section>
    </div>`;
  }

  function renderDetail(id) {
    const e = episodes.find(item => item.id === id);
    if (!e) return `<section class="wrap filmp-not-found"><p class="eyebrow">Films</p><h1>이 작품을 찾을 수 없어요.</h1><p>전체 작품 목록에서 다시 골라주세요.</p><a class="button button-ink" href="#films">Films로 돌아가기</a></section>`;
    const prev = episodes[e.number - 2];
    const next = episodes[e.number];
    return `<div class="filmp-page">
      <div class="wrap filmp-detail-crumb"><nav class="breadcrumb" aria-label="현재 위치"><a href="#home">Home</a><span>/</span><a href="#films">Films</a><span>/</span><span>EP.${number(e)}</span></nav></div>
      <section class="filmp-screen-section" aria-labelledby="filmp-detail-title"><div class="wrap filmp-screen-layout">
        <div class="filmp-player-column"><div class="filmp-player" data-film-player><button class="filmp-player-start" type="button" data-play-film="${e.id}" aria-label="${e.title} 영상 재생"><img src="${poster(e)}" alt="찬란한 보통의 날들 ${e.number}화 영상 포스터"><span class="filmp-player-play">${triangle}<span>영상 재생</span></span></button></div><p class="filmp-player-note">재생을 누르면 YouTube 플레이어가 열립니다.</p><a class="text-link" href="https://www.youtube.com/shorts/${e.youtube}" target="_blank" rel="noopener noreferrer">YouTube에서 보기</a></div>
        <div class="filmp-detail-copy"><a href="#films" class="filmp-series-link">찬란한 보통의 날들</a><p class="filmp-detail-episode">EP.${number(e)}</p><h1 id="filmp-detail-title">${e.title}</h1><p class="filmp-detail-description">찬란한 보통의 날들 EP.${e.number}<br>AI로 만든 숏드라마입니다.</p><dl class="filmp-detail-facts"><div><dt>형식</dt><dd>AI 숏드라마 · 세로 영상</dd></div><div><dt>크리에이터</dt><dd>KYU · 이동규</dd></div>${e.duration ? `<div><dt>재생 시간</dt><dd>${e.duration}</dd></div>` : ''}<div><dt>시리즈</dt><dd>찬란한 보통의 날들</dd></div></dl><div class="filmp-detail-links"><a href="#story" class="text-link">창작 이야기 읽기</a><a href="#contact?type=creative" class="text-link">함께 작업하기</a></div></div>
      </div></section>
      <nav class="wrap filmp-nextprev" aria-label="이전과 다음 작품">${prev ? `<a href="${route(prev)}"><span>이전 화 · EP.${number(prev)}</span><strong>${prev.title}</strong></a>` : '<a href="#films"><span>Series</span><strong>전체 작품 보기</strong></a>'}${next ? `<a href="${route(next)}"><span>다음 화 · EP.${number(next)}</span><strong>${next.title}</strong></a>` : '<a href="#film/ep1"><span>처음부터 다시</span><strong>첫 번째 이야기</strong></a>'}</nav>
      <section class="wrap filmp-episodes" aria-labelledby="filmp-episodes-title"><div class="section-heading"><div><p class="eyebrow">Continue watching</p><h2 id="filmp-episodes-title">이어서 볼 이야기</h2></div><a class="text-link" href="#films">작품 전체 보기</a></div><div class="filmp-episode-strip">${episodes.map(item => `<a href="${route(item)}" class="filmp-strip-card"${item.id === e.id ? ' aria-current="page"' : ''}><div><img src="${poster(item)}" alt="${item.number}화 포스터" loading="lazy">${item.id === e.id ? '<span>현재 작품</span>' : ''}</div><span>EP.${number(item)}</span><strong>${item.title}</strong></a>`).join('')}</div></section>
    </div>`;
  }

  function dispose() {
    cleanup?.abort();
    cleanup = null;
  }

  function init(root) {
    dispose();
    cleanup = new AbortController();
    root.addEventListener('click', event => {
      const sortButton = event.target.closest('[data-film-sort]');
      if (sortButton && root.contains(sortButton)) {
        const first = sortButton.dataset.filmSort === 'first';
        root.querySelector('[data-film-grid]').innerHTML = (first ? episodes : [...episodes].reverse()).map(episodeCard).join('');
        root.querySelectorAll('[data-film-sort]').forEach(button => button.setAttribute('aria-pressed', String(button === sortButton)));
        root.querySelector('[data-film-status]').textContent = first ? '첫 화부터 6편을 보여드려요.' : '최신순으로 6편을 보여드려요.';
      }
      const playButton = event.target.closest('[data-play-film]');
      if (playButton && root.contains(playButton)) {
        const e = episodes.find(item => item.id === playButton.dataset.playFilm);
        if (!e) return;
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube-nocookie.com/embed/${e.youtube}?autoplay=1&playsinline=1&rel=0`;
        iframe.title = `찬란한 보통의 날들 ${e.number}화 ${e.title}`;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        playButton.parentElement.replaceChildren(iframe);
        iframe.focus();
      }
    }, { signal: cleanup.signal });
  }

  window.KyuFilmPages = { renderList, renderDetail, init, dispose };
})();
