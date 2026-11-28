/* Public-facing design preview. Only established tour facts are used here. */
(() => {
  const breadcrumb = (label, parent = '') => `<nav class="breadcrumb" aria-label="현재 위치"><a href="#home">Home</a><span>/</span>${parent ? '<a href="#freediving">Freediving</a><span>/</span>' : ''}<span>${label}</span></nav>`;
  const factList = `<dl class="divep-facts"><div><dt>기간</dt><dd>2026.12.01–12.05<span>화요일부터 토요일까지</span></dd></div><div><dt>장소</dt><dd>필리핀, 코론<span>Coron · Palawan</span></dd></div><div><dt>인솔</dt><dd>이동규 강사<span>KYU</span></dd></div></dl>`;
  const faq = `<div class="divep-faq"><details><summary>처음이라 무엇부터 물어봐야 할지 모르겠어요.</summary><div><p>현재 경험과 만나보고 싶은 바다를 편하게 알려주세요. 수업이나 투어 중 어떤 과정이 맞을지 이야기하는 것부터 시작하면 됩니다.</p><a class="text-link" href="#contact?type=freediving">프리다이빙 이야기 나누기</a></div></details><details><summary>투어 참가 조건과 비용은 어디에서 확인하나요?</summary><div><p>참가 조건, 비용, 포함 사항은 투어별 안내를 확인해 주세요. 이 시안에는 확인되지 않은 금액과 조건을 넣지 않았습니다. 실제 신청 전에는 운영 중인 투어 안내와 문의를 통해 확인할 수 있습니다.</p></div></details><details><summary>장비가 없어도 문의할 수 있나요?</summary><div><p>가지고 있는 장비가 없어도 문의를 남길 수 있습니다. 준비물과 대여 여부는 참여하려는 수업이나 투어에 맞춰 확인해 주세요.</p></div></details></div>`;

  window.KyuDivePages = {
    freediving: `
      <section class="wrap divep-intro">
        ${breadcrumb('Freediving')}
        <div class="divep-title-row"><div><p class="eyebrow">A little closer to the sea</p><h1>Freediving<span>.</span></h1></div><p>처음 물에 들어가는 날.<br><span>바다를 만나고, 나의 감각을 발견하는 시간.</span></p></div>
      </section>
      <section class="wrap divep-ocean-feature" aria-labelledby="divep-ocean-title">
        <div class="divep-ocean-photo"><img src="assets/coron.webp" alt="코론 산호초 위에서 프리다이빙하는 다이버와 2026년 12월 투어 안내 포스터" fetchpriority="high"></div>
        <div class="divep-ocean-copy"><p class="eyebrow">Dive with KYU</p><h2 id="divep-ocean-title">더 깊이보다,<br>더 가까이.</h2><p>처음 만나는 물의 감각.<br>눈앞에 펼쳐지는 바다의 풍경.<br>그 순간을 함께 만나고 싶습니다.</p><a class="button button-lime" href="#tours">바다 여행 둘러보기</a><div class="divep-signature"><span>KYU</span><p>이동규<br><span>프리다이빙 강사</span></p></div></div>
      </section>
      <section class="wrap divep-paths" aria-labelledby="divep-paths-title">
        <div class="divep-section-heading"><p class="eyebrow">Find your way</p><h2 id="divep-paths-title">어떤 바다를 만나고 싶나요?</h2><p>경험이 달라도, 바다를 향한 마음은 저마다의 모습으로 시작됩니다.</p></div>
        <div class="divep-path-grid"><article><span class="divep-path-word">Begin</span><h3>처음 시작하는 프리다이빙</h3><p>프리다이빙이 궁금하다면 지금의 경험과 궁금한 점을 들려주세요. 시작에 필요한 이야기를 함께 나눕니다.</p><a class="text-link" href="#contact?type=freediving">시작에 대해 이야기하기</a></article><article><span class="divep-path-word">Explore</span><h3>함께 떠나는 바다 여행</h3><p>사진으로 보던 바다를 직접 만나는 시간. 예정된 투어의 장소와 일정을 살펴보세요.</p><a class="text-link" href="#tours">예정된 투어 보기</a></article><article><span class="divep-path-word">Remember</span><h3>물 밖에서도 이어지는 기록</h3><p>바다에서 떠오른 생각, 여행에서 만난 장면들. 프리다이빙의 이야기를 글과 이미지로 나눕니다.</p><a class="text-link" href="#story">Story 읽어보기</a></article></div>
      </section>
      <section class="divep-next-band" aria-labelledby="divep-next-title"><div class="wrap divep-next-inner"><div><p class="eyebrow">The next destination</p><h2 id="divep-next-title">이번에는, 코론.</h2><p>필리핀 팔라완의 푸른 바다에서.<br>2026년 12월, 함께 만날 장면을 준비합니다.</p></div><div class="divep-next-meta"><span class="divep-status">모집 중 · 시안 표시</span><p>2026.12.01–12.05</p><span>필리핀 코론 · 이동규 강사 인솔</span><a class="button button-ink" href="#tour/coron">코론 투어 자세히 보기</a></div></div></section>
      <section class="wrap divep-faq-section" aria-labelledby="divep-faq-title"><div><p class="eyebrow">Before we dive</p><h2 id="divep-faq-title">처음이라면,<br>궁금한 것부터.</h2><p>작은 질문도 괜찮아요.<br>편하게 이야기해주세요.</p></div>${faq}</section>
    `,
    tours: `
      <section class="wrap divep-intro">
        ${breadcrumb('Tours', 'freediving')}
        <div class="divep-title-row"><div><p class="eyebrow">Freediving journeys</p><h1>Tours<span>.</span></h1></div><p>다음 여행은, 바다로.<br><span>KYU와 함께 만날 새로운 풍경.</span></p></div>
      </section>
      <section class="wrap divep-tour-list" aria-labelledby="divep-tour-list-title"><div class="divep-list-header"><h2 id="divep-tour-list-title">예정된 바다 여행</h2><span>Upcoming journeys</span></div>
        <article class="divep-tour-card"><a class="divep-tour-card-image" href="#tour/coron" aria-label="2026 코론 프리다이빙 투어 자세히 보기"><img src="assets/coron.webp" alt="규강이 추천하는 그 바다, CORON 프리다이빙 투어 포스터" fetchpriority="high"></a><div class="divep-tour-card-copy"><div class="divep-card-top"><span class="divep-status">모집 중 · 시안 표시</span><span>Philippines</span></div><p class="divep-location">CORON, PALAWAN</p><h2><a href="#tour/coron">2026 코론<br>프리다이빙 투어</a></h2><p>규강이 추천하는 그 바다.<br>푸른 산호초와 코론의 풍경을 만나러 갑니다.</p><dl class="divep-inline-facts"><div><dt>일정</dt><dd>2026.12.01–12.05</dd></div><div><dt>인솔</dt><dd>이동규 강사</dd></div></dl><a class="text-link" href="#tour/coron">투어 자세히 보기</a></div></article>
        <p class="divep-preview-note">디자인 미리보기입니다. 모집 상태는 기존 안내를 활용한 예시이며, 실제 잔여 자리와 참가 조건은 문의 시 확인해 주세요.</p>
      </section>
      <section class="wrap divep-invitation" aria-labelledby="divep-invitation-title"><span class="divep-serif-mark" aria-hidden="true">Sea you<br>somewhere.</span><div><p class="eyebrow">Your next journey</p><h2 id="divep-invitation-title">가보고 싶은 바다가 있나요?</h2><p>날짜가 맞지 않거나, 다른 바다가 궁금하다면 이야기해주세요.<br>새로운 여행은 작은 대화에서 시작되기도 하니까요.</p><a class="button button-ink" href="#contact?type=tour">다음 여행 이야기하기</a></div></section>
    `,
    coron: `
      <section class="wrap divep-tour-heading">
        <nav class="breadcrumb" aria-label="현재 위치"><a href="#home">Home</a><span>/</span><a href="#freediving">Freediving</a><span>/</span><a href="#tours">Tours</a><span>/</span><span>Coron</span></nav>
        <div class="divep-tour-heading-grid"><div><p class="eyebrow">Coron · Palawan · Philippines</p><h1>2026 코론<br>프리다이빙 투어<span>.</span></h1><p>규강이 추천하는 그 바다.</p></div><div class="divep-tour-heading-aside"><span class="divep-status">모집 중 · 시안 표시</span><p>2026.12.01–12.05</p><span>이동규 강사 인솔</span></div></div>
      </section>
      <figure class="wrap divep-tour-cover"><img src="assets/coron.webp" alt="2026년 12월 1일부터 5일까지 진행되는 코론 프리다이빙 투어 포스터"><figcaption>코론의 바다에서 만날 다음 장면.</figcaption></figure>
      <div class="wrap divep-tour-detail-layout"><div class="divep-tour-body">
        <section class="divep-tour-opening" aria-labelledby="divep-coron-intro"><p class="eyebrow">About the journey</p><h2 id="divep-coron-intro">사진 속 그 바다를,<br>직접 만나는 시간.</h2><p>눈앞에 펼쳐진 산호초와 푸른 물빛. 코론에서 보내는 바다 여행을 소개합니다.</p><p>이동규 강사와 함께하는 2026 코론 프리다이빙 투어는 12월 1일부터 5일까지의 일정입니다. 나에게 맞는 여행인지, 어떤 준비가 필요한지 궁금한 점을 편하게 남겨주세요.</p></section>
        <section class="divep-tour-checks" aria-labelledby="divep-coron-checks"><p class="eyebrow">Before you join</p><h2 id="divep-coron-checks">함께 확인할 이야기</h2><p>여행을 결정하기 전에 아래 내용을 함께 확인해주세요.</p><div class="divep-check-row"><h3>참가 경험과 조건</h3><p>지금까지의 프리다이빙 경험을 알려주세요. 이번 투어의 참가 조건과 맞는지 확인합니다.</p></div><div class="divep-check-row"><h3>일정과 이동</h3><p>항공편, 만나는 장소와 세부 일정은 별도 투어 안내를 기준으로 확인합니다.</p></div><div class="divep-check-row"><h3>비용과 준비물</h3><p>참가비, 포함·불포함 사항, 필요한 장비와 개인 준비물을 확인한 뒤 신청합니다.</p></div><p class="divep-preview-note">이 페이지는 상세 화면의 구성 시안입니다. 세부 일정·비용·잔여 인원은 확정 정보로 표시하지 않았습니다.</p></section>
        <figure class="divep-poster-detail"><img src="assets/coron-portrait.webp" alt="이동규 강사 인솔 2026 코론 프리다이빙 투어 세로 포스터" loading="lazy"><figcaption>2026 CORON FREEDIVING TOUR</figcaption></figure>
        <div class="divep-detail-bottom"><a class="text-link" href="#tours">모든 투어 보기</a><a class="text-link" href="#freediving">프리다이빙 둘러보기</a></div>
      </div><aside class="divep-tour-summary" aria-label="코론 투어 정보"><div class="divep-summary-sticky"><p class="eyebrow">Journey at a glance</p><h2>함께 떠날 바다,<br>Coron.</h2>${factList}<a class="button button-ink" href="#contact?type=tour">코론 투어 문의하기</a><p class="divep-summary-note">문의 화면으로 이어집니다.<br>이 시안에서는 예약이 접수되지 않습니다.</p></div></aside></div>
    `
  };
})();
