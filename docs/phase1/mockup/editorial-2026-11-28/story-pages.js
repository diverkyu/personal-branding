window.KyuStoryPages = (() => {
  const drafts = {
    fantasy: {
      intro: '방문 하나를 경계로, 익숙한 풍경이 전혀 다른 세계가 된다면 어떨까요. 「환상속으로」에서 출발한 상상을 글과 이미지로 함께 펼쳐봅니다.',
      sections: [
        ['익숙한 곳에서 시작하는 상상', '판타지의 시작이 꼭 특별한 장소일 필요는 없습니다. 매일 여닫는 문, 늘 서 있던 방, 별다를 것 없는 하루. 익숙한 장면이 있기에 그다음에 펼쳐질 낯선 세계가 더 선명하게 느껴집니다.', '이 글의 첫 장면은 하나의 질문입니다. 내 방의 문을 열면, 어떤 풍경을 만나고 싶을까요?'],
        ['문 너머의 장면', '푸른 바다, 하늘로 이어진 거대한 아치, 그 앞에 선 한 사람. 장면을 이루는 요소가 많아도 시선이 머무는 곳은 분명하게 남기고 싶습니다.', '커다란 세계를 바라보는 작은 인물의 뒷모습. 그 대비만으로도 이야기의 다음 순간을 상상할 수 있습니다.'],
        ['이미지에서 움직임으로', '하나의 이미지가 마음에 들었다면, 이제 그 안에서 무엇이 움직일지 생각해 볼 차례입니다. 카메라가 앞으로 나아갈지, 인물이 한 걸음 내디딜지, 풍경이 천천히 드러날지.', 'AI는 장면을 만드는 도구가 됩니다. 어떤 장면을 남길지, 어디에서 다음 장면으로 넘어갈지는 만드는 사람의 선택으로 이어집니다.'],
        ['상상을 이어가는 기록', '완성된 영상과 함께 처음 떠올린 생각도 남겨 두고 싶습니다. 어떤 장면에서 시작했는지, 무엇을 바꾸고 싶었는지. 다음 이야기는 그 기록에서 다시 시작할 수 있으니까요.']
      ], quote:'늘 열던 문에서, 한 번도 가보지 않은 곳으로.',related:'workflow',figure:'workflow.webp',caption:'현실의 문에서 판타지 풍경으로 이어지는 구성 이미지'
    },
    guide: {
      intro:'AI 영상이 궁금하지만 어디서 시작할지 막막할 때. 도구를 고르기 전에, 만들고 싶은 짧은 장면부터 떠올려 보세요.',
      sections:[
        ['먼저, 한 장면을 떠올려요', '누가, 어디에서, 무엇을 하고 있나요? 이 세 가지를 짧은 문장으로 적어 봅니다. 처음부터 긴 이야기를 만들기보다, 끝까지 완성할 수 있는 장면 하나가 출발점이 됩니다.'],
        ['인물과 공간을 준비해요', '인물이 어떻게 생겼는지, 어떤 옷을 입고 있는지, 어느 공간에 있는지. 장면 사이에 이어져야 할 요소를 정리하면 이미지들을 살펴볼 기준이 생깁니다.', '원하는 이미지 한 장을 먼저 고르고, 그 이미지가 이야기의 분위기를 잘 담고 있는지 확인해 보세요.'],
        ['움직임은 간단하게 정해요', '이미지에 움직임을 더할 때는 가장 중요한 행동부터 생각합니다. 고개를 돌린다, 문을 연다, 잠시 바라본다. 짧고 분명한 동작이 장면을 이해하는 데 도움이 됩니다.'],
        ['장면을 연결해 한 편으로', '장면이 모이면 순서와 길이를 조절합니다. 대사와 소리가 필요한지, 어느 순간에 멈추면 좋을지도 함께 살펴봅니다.', '처음 만든 영상이 마음에 들지 않아도 괜찮습니다. 바꾸고 싶은 부분을 하나씩 찾는 과정이 다음 작업의 기준이 됩니다.']
      ],quote:'도구보다 먼저, 만들고 싶은 장면 하나.',related:'fantasy',figure:'workflow.webp',caption:'아이디어와 이미지, 움직임을 연결하는 워크플로우 구성 예시'
    },
    workflow: {
      intro:'머릿속의 장면이 한 편의 영상이 되기까지. 생각을 적고, 이미지를 고르고, 움직임을 연결하는 흐름을 살펴봅니다.',
      sections:[
        ['이야기의 기준을 한 문장으로', '영상에서 가장 먼저 전하고 싶은 장면을 적습니다. 결과를 살펴볼 때마다 이 문장으로 돌아오면, 무엇을 더하고 무엇을 덜어낼지 생각하기 쉽습니다.'],
        ['이미지로 분위기를 맞추기', '색감과 빛, 인물과 공간의 관계를 이미지로 확인합니다. 장면 하나의 완성도뿐 아니라, 앞뒤 장면과 자연스럽게 이어지는지도 살펴봅니다.'],
        ['움직임과 호흡을 연결하기', '어떤 장면은 짧게 지나가고, 어떤 장면은 조금 오래 머물러도 좋습니다. 화면 안의 움직임과 편집의 속도가 함께 이야기의 호흡을 만듭니다.'],
        ['다음 작업을 위한 기록', '최종 결과와 함께 선택한 이미지, 시도한 방향, 다시 손보고 싶은 부분을 남깁니다. 완성된 한 편뿐 아니라 만들어 가는 과정도 하나의 기록이 됩니다.']
      ],quote:'아이디어를 장면으로, 장면을 이야기로.',related:'guide',figure:'fantasy.webp',caption:'「환상속으로」의 판타지 풍경'
    },
    coron: {
      intro:'푸른 바다와 산호초, 그 사이를 지나는 한 호흡. 코론 투어 포스터에서 출발한 이야기 페이지의 구성 예시입니다.',
      sections:[
        ['이번에 만날 바다, 코론', '필리핀 팔라완의 코론을 향합니다. 물 위에서 보던 풍경과 물속에서 만나는 풍경은 서로 다른 장면을 남깁니다. 이번 페이지는 그 장면들을 사진과 글로 기록할 공간을 미리 그려본 시안입니다.'],
        ['함께 떠나는 시간', '투어는 다이빙뿐 아니라 바다를 만나러 가는 시간을 함께 나누는 일이기도 합니다. 인솔 강사와 일정을 살펴보고, 자신에게 맞는 참여 방식은 출발 전에 확인해 주세요.'],
        ['다녀온 뒤 채워질 기록', '바다의 색, 기억에 남은 장면, 함께했던 사람들. 이 자리는 실제 투어를 다녀온 뒤 사진과 경험으로 채워질 수 있습니다. 아직 진행하지 않은 경험이나 참가자 후기를 미리 작성하지 않았습니다.']
      ],quote:'바다를 만나러 가는 시간도, 하나의 이야기.',related:'fantasy',figure:'coron-portrait.webp',caption:'2026 코론 프리다이빙 투어 포스터 · 제공된 자료'
    }
  };
  const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render(article, all) {
    const d=drafts[article.id]; if(!d) return '';
    const next=all.find(x=>x.id===d.related);
    return `<article class="reading-page">
      <header class="reading-header wrap"><nav class="breadcrumb" aria-label="현재 위치"><a href="#home">Home</a><span>/</span><a href="#story">Story</a><span>/</span><span>${escape(article.category)}</span></nav><div class="reading-heading"><p class="eyebrow">${escape(article.category)} · Story</p><h1>${escape(article.title)}</h1><p class="reading-deck">${escape(article.summary)}</p><div class="reading-meta"><span class="avatar">K</span><span>KYU · 이동규</span><span class="sample-label">본문은 시안용 편집 예시</span></div></div></header>
      <figure class="reading-cover wrap ${article.id}"><img src="assets/${article.image}" alt="${escape(article.alt)}"><figcaption>${escape(article.alt)}</figcaption></figure>
      <div class="reading-layout wrap"><aside class="reading-toc" aria-label="글 목차"><span>이 글의 흐름</span>${d.sections.map(([title],i)=>`<button data-reading-section="reading-section-${i}">${title}</button>`).join('')}<a class="text-link" href="#story">Story 목록</a></aside><div class="reading-body"><div class="reading-note">이 페이지는 글의 배치와 읽는 흐름을 보여주는 시안입니다. 아래 본문은 새로 작성한 예시이며, 실제 게시글에는 반영되지 않았습니다.</div><p class="reading-opening">${d.intro}</p>${d.sections.map(([title,...paras],i)=>`<section id="reading-section-${i}" class="reading-section"><h2>${title}</h2>${paras.map(p=>`<p>${p}</p>`).join('')}${i===0?`<blockquote>${d.quote}</blockquote>`:''}${i===1?`<figure class="reading-inline-figure ${article.id}"><img src="assets/${d.figure}" alt="${d.caption}" loading="lazy"><figcaption>${d.caption}</figcaption></figure>`:''}</section>`).join('')}
      ${article.id==='coron'?'<a class="button button-ink" href="#tour/coron">코론 투어 살펴보기</a>':'<a class="button button-ink" href="#films">영상 작품도 만나보세요</a>'}
      <div class="reading-author"><span class="avatar large">K</span><div><strong>KYU · 이동규</strong><p>프리다이빙을 가르치고, AI로 이야기를 만듭니다.</p><a class="text-link" href="#about">만드는 사람에 대하여</a></div></div></div></div>
      <section class="reading-next wrap"><span class="eyebrow">이어지는 이야기</span><a href="#article/${next.id}"><img src="assets/${next.image}" alt="${escape(next.alt)}" loading="lazy"><div><span>${next.category}</span><h2>${escape(next.title)}</h2><p>${escape(next.summary)}</p></div></a></section>
    </article>`;
  }
  return {render};
})();
