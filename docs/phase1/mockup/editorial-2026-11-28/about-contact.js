(() => {
  'use strict';
  const email = 'energizer629@gmail.com';
  const about = `
    <section class="aboutp-intro wrap">
      <nav class="breadcrumb" aria-label="현재 위치"><a href="#home">Home</a><span>/</span><span>About</span></nav>
      <div class="aboutp-title-row"><div><p class="aboutp-kicker">About KYU</p><h1>바다와 창작 사이,<br><em>이동규</em>입니다.</h1></div><p class="aboutp-opening">프리다이빙을 가르치고,<br>AI로 이야기를 만듭니다.<span>Freediving instructor & AI creator</span></p></div>
    </section>
    <section class="aboutp-collage wrap" aria-label="KYU의 두 가지 세계">
      <figure class="aboutp-ocean"><img src="assets/coron.webp" alt="코론의 푸른 바다와 산호초 사이를 내려가는 프리다이버"><figcaption><span>In the ocean</span><span>몸으로 만나는 세계</span></figcaption></figure>
      <div class="aboutp-signature" aria-hidden="true"><span>Kyu.</span><small>Dive & Create</small></div>
      <figure class="aboutp-imagination"><img src="assets/fantasy.webp" alt="문 너머 펼쳐진 거대한 바위 아치와 푸른 판타지 바다"><figcaption><span>Beyond the frame</span><span>상상으로 넓히는 세계</span></figcaption></figure>
    </section>
    <section class="aboutp-letter wrap" aria-labelledby="aboutp-letter-title"><div><p class="aboutp-kicker">A little about me</p><h2 id="aboutp-letter-title">다른 두 세계를<br>오가며 만드는 기록.</h2><span class="aboutp-draft">소개 문구 시안</span></div><div class="aboutp-prose"><p>물속에서 보내는 시간과 화면 앞에서 이야기를 만드는 시간. 겉으로는 꽤 달라 보이지만, 둘 다 새로운 장면을 만나는 일이라고 생각합니다.</p><p>프리다이빙에서는 몸으로 경험하는 순간을, AI 창작에서는 머릿속에 있던 장면을 나눕니다. 이곳에는 그 과정에서 만든 영상과 바다의 기록, 함께할 수 있는 여행을 모았습니다.</p><p>잘 만든 결과물도 좋지만, 그 뒤의 과정도 함께 이야기하고 싶습니다. 처음 해보는 일 앞에서 나눌 수 있는 작은 힌트가 있다면 더 좋고요.</p><a class="text-link" href="#story">기록 더 읽어보기</a></div></section>
    <section class="aboutp-practices" aria-labelledby="aboutp-practices-title"><div class="wrap"><div class="aboutp-section-heading"><p class="aboutp-kicker">Two worlds, one KYU</p><h2 id="aboutp-practices-title">지금 하는 일.</h2></div><div class="aboutp-practice-grid"><article><span class="aboutp-practice-label">Freediving</span><h3>한 호흡으로<br>만나는 바다.</h3><p>프리다이빙 수업과 바다 여행. 처음의 궁금함부터 다음에 가보고 싶은 바다까지, 함께할 수 있는 경험을 소개합니다.</p><a class="text-link" href="#freediving">프리다이빙 살펴보기</a></article><article><span class="aboutp-practice-label">AI filmmaking</span><h3>상상을<br>움직이는 이야기로.</h3><p>AI로 만든 숏드라마와 영상, 그리고 제작 과정의 기록. 떠오른 아이디어를 한 장면씩 이어갑니다.</p><a class="text-link" href="#films">Films 살펴보기</a></article></div></div></section>
    <section class="aboutp-working wrap" aria-labelledby="aboutp-working-title"><div><p class="aboutp-kicker">How I work</p><h2 id="aboutp-working-title">작은 장면에서<br>시작합니다.</h2></div><div class="aboutp-working-list"><article><h3>경험하고</h3><p>직접 마주한 바다, 일상의 대화, 오래 남는 장면을 발견합니다.</p></article><article><h3>만들고</h3><p>영상과 이미지, 글 가운데 이야기에 어울리는 형태를 찾아갑니다.</p></article><article><h3>나눕니다</h3><p>결과와 과정을 함께 남기고, 다음 이야기를 이어갈 사람을 만납니다.</p></article></div></section>
    <section class="aboutp-connect wrap"><div><p class="aboutp-kicker">Around here</p><h2>화면 밖에서도 만나요.</h2><p>바다의 일상과 창작 소식을 각 계정에 나누고 있습니다.</p></div><div class="aboutp-socials"><a href="https://www.instagram.com/hiitskyu/" target="_blank" rel="noopener noreferrer"><span>Freediving & life</span><strong>@hiitskyu</strong></a><a href="https://www.instagram.com/kyureative/" target="_blank" rel="noopener noreferrer"><span>AI & creative</span><strong>@kyureative</strong></a></div></section>`;

  const contact = `
    <section class="contactp-intro wrap"><nav class="breadcrumb" aria-label="현재 위치"><a href="#home">Home</a><span>/</span><span>Contact</span></nav><p class="contactp-kicker">Let's talk</p><h1>다음 이야기는,<br><em>함께.</em></h1><p class="contactp-lead">처음 만날 바다부터, 함께 만들고 싶은 영상까지.<br>편하게 이야기를 남겨주세요.</p></section>
    <section class="contactp-layout wrap" aria-label="문의 작성"><aside class="contactp-aside"><div class="contactp-direct"><span class="contactp-kicker">Email</span><a class="contactp-email" href="mailto:${email}">${email}</a><button type="button" class="text-link" data-contact-copy>이메일 주소 복사</button><p class="contactp-copy-status" role="status" data-contact-copy-status></p></div><div class="contactp-guidance"><h2>이런 이야기를 나눌 수 있어요.</h2><ul><li><strong>프리다이빙</strong><span>수업, 시작 방법, 참여 일정</span></li><li><strong>바다 여행</strong><span>투어 일정과 참여 문의</span></li><li><strong>크리에이티브 협업</strong><span>AI 영상, 숏드라마, 콘텐츠 제작</span></li></ul></div><div class="contactp-social"><h2>Instagram</h2><a href="https://www.instagram.com/hiitskyu/" target="_blank" rel="noopener noreferrer">프리다이빙 · @hiitskyu</a><a href="https://www.instagram.com/kyureative/" target="_blank" rel="noopener noreferrer">크리에이티브 · @kyureative</a></div></aside>
      <div class="contactp-form-panel"><div class="contactp-form-heading"><h2>어떤 이야기를 들려주실 건가요?</h2><p>아래 내용을 적으면 사용 중인 메일 앱으로 이어집니다.<br>메일 앱에서 내용을 확인하고 직접 보내주세요.</p></div><form class="contactp-form" data-contact-form><div class="contactp-field"><label for="contactp-type">문의 주제</label><div class="contactp-select-wrap"><select id="contactp-type" name="type"><option value="freediving">프리다이빙 수업</option><option value="tour">투어 참여</option><option value="creative">크리에이티브 협업</option><option value="general" selected>그 밖의 이야기</option></select></div></div><div class="contactp-two-fields"><div class="contactp-field"><label for="contactp-name">이름 <span>필수</span></label><input id="contactp-name" name="name" autocomplete="name" maxlength="80" required placeholder="어떻게 불러드릴까요?"></div><div class="contactp-field"><label for="contactp-email">이메일 <span>필수</span></label><input id="contactp-email" type="email" name="email" autocomplete="email" maxlength="150" required placeholder="답장받을 이메일"></div></div><div class="contactp-field"><label for="contactp-message">이야기 <span>필수</span></label><textarea id="contactp-message" name="message" rows="7" minlength="10" maxlength="1800" required placeholder="궁금한 점이나 생각하고 있는 일정을 알려주세요. 협업이라면 만들고 싶은 콘텐츠를 간단히 소개해 주세요."></textarea><p class="contactp-field-note">10자 이상으로 적어주세요. 비밀번호나 결제 정보는 적지 마세요.</p></div><div class="contactp-submit-row"><button type="submit" class="button button-ink">메일 앱에서 이어서 보내기</button><span>작성 내용은 이 사이트에 저장되지 않습니다.</span></div><p class="contactp-form-status" role="status" data-contact-status></p><div class="contactp-fallback" data-contact-fallback hidden><p>메일 앱이 열리지 않으면 아래 주소로 직접 보내주세요.</p><a href="mailto:${email}">${email}</a><a data-contact-draft href="mailto:${email}" class="text-link">작성한 메일 다시 열기</a></div></form><p class="contactp-preview-note">문의 화면 시안 · 이 화면에서 문의가 자동 접수되지는 않습니다.</p></div>
    </section>`;

  function init(root, params = new URLSearchParams()) {
    const form = root.querySelector('[data-contact-form]');
    if (form) {
      const type = params?.get?.('type');
      if (['freediving', 'tour', 'creative', 'general'].includes(type)) form.elements.type.value = type;
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const name = form.elements.name.value.trim();
        const sender = form.elements.email.value.trim();
        const message = form.elements.message.value.trim();
        if (!name || message.length < 10) {
          root.querySelector('[data-contact-status]').textContent = '이름과 10자 이상의 이야기를 입력해 주세요.';
          (!name ? form.elements.name : form.elements.message).focus();
          return;
        }
        const topic = form.elements.type.selectedOptions[0].textContent;
        const subject = `[KYU 문의] ${topic} — ${name}`;
        const body = `이름: ${name}\n이메일: ${sender}\n문의 주제: ${topic}\n\n${message}`;
        const href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        root.querySelector('[data-contact-draft]').href = href;
        root.querySelector('[data-contact-fallback]').hidden = false;
        root.querySelector('[data-contact-status]').textContent = '메일 앱 열기를 요청했습니다. 열린 앱에서 내용을 확인하고 보내기를 눌러주세요. 아직 발송된 상태는 아닙니다.';
        window.location.href = href;
      });
    }
    root.querySelector('[data-contact-copy]')?.addEventListener('click', async () => {
      const status = root.querySelector('[data-contact-copy-status]');
      try {
        await navigator.clipboard.writeText(email);
        status.textContent = '이메일 주소를 복사했어요.';
      } catch {
        status.textContent = '자동 복사가 지원되지 않습니다. 위 이메일 주소를 선택해 복사해 주세요.';
      }
    });
  }
  window.KyuAboutContact = { about, contact, init };
})();
