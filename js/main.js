/* 조은의원 탈모 DB 랜딩 — 라이브러리 없이 (인앱 브라우저 속도) */
(() => {
  const CLINIC = {
    phone: '051-313-4042',
    leadEndpoint: '', // NestJS API 연결 시: https://api.<도메인>/api/leads
  };

  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const track = (event, params = {}) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, landing_variant: variant, ...params });
  };

  /* 제목 A/B: ?h=a|b|c (기본 a) — 신청 데이터의 landing_variant로 저장 */
  const HEADLINES = {
    a: ['탈모약만 먹으면', '될까요?'],
    b: ['약만 먹어도', '괜찮을까요?'],
    c: ['그냥 탈모약만', '먹으면 안 되나요?'],
  };
  const fromUrl = new URLSearchParams(location.search).get('h');
  let variant = HEADLINES[fromUrl] ? fromUrl : null;
  try {
    if (variant) sessionStorage.setItem('landing_variant', variant);
    else variant = sessionStorage.getItem('landing_variant');
  } catch {}
  if (!HEADLINES[variant]) variant = 'a';
  if (variant !== 'a') {
    const [light, bold] = HEADLINES[variant];
    document.querySelector('[data-variant-light]').textContent = light;
    document.querySelector('[data-variant-bold]').textContent = bold;
    document.title = `${light} ${bold} | 조은의원`;
  }

  /* 전화 */
  document.querySelectorAll('[data-call]').forEach((a) => {
    a.href = `tel:${CLINIC.phone.replace(/\D/g, '')}`;
    a.addEventListener('click', () => track('call_click', { location: a.closest('header') ? 'header' : a.closest('footer') ? 'footer' : 'body' }));
  });
  document.querySelectorAll('[data-track]').forEach((el) => {
    el.addEventListener('click', () => track(el.dataset.track));
  });

  /* 헤더 구분선 */
  const header = document.querySelector('.site-header');
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 4);
    // 내리면 위로 숨고, 올리면 다시 내려옴 (손떨림 정도의 작은 움직임은 무시)
    if (Math.abs(y - lastY) > 6) {
      header.classList.toggle('is-hidden', y > lastY && y > header.offsetHeight);
      lastY = y;
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* 히어로 등장 */
  const hero = document.querySelector('.hero');
  requestAnimationFrame(() => hero.classList.add('is-in'));

  /* 상담 신청: 하단 고정 버튼(히어로를 지나면 보임) → 팝업(이름·연락처·개인정보 동의) → CLINIC.leadEndpoint */
  const ctaBar = document.querySelector('.cta-bar');
  const lead = document.getElementById('lead');
  const leadForm = lead.querySelector('.lead-form');
  const leadDone = lead.querySelector('.lead-done');
  const leadError = lead.querySelector('.lead-error');
  const leadSubmit = leadForm.querySelector('.lead-submit');
  const fName = leadForm.elements.name;
  const fPhone = leadForm.elements.phone;
  const fPrivacy = leadForm.elements.privacy;
  const privacyBtn = leadForm.querySelector('.lead-more');
  const privacyBox = document.getElementById('lead-privacy');

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      ctaBar.classList.toggle('is-visible', !e.isIntersecting && e.boundingClientRect.bottom <= 0);
    }).observe(hero);
  } else {
    ctaBar.classList.add('is-visible');
  }

  const openLead = (from) => {
    leadForm.hidden = false;
    leadDone.hidden = true;
    leadError.textContent = ''; // 지난번 전송 실패 문구가 남지 않도록
    document.documentElement.classList.add('is-locked');
    if (lead.showModal) lead.showModal(); else lead.setAttribute('open', '');
    track('lead_open', { location: from });
  };
  const closeLead = () => {
    if (lead.close) lead.close(); else lead.removeAttribute('open');
  };
  lead.addEventListener('close', () => document.documentElement.classList.remove('is-locked'));
  lead.addEventListener('click', (e) => { if (e.target === lead) closeLead(); }); // 바깥(어두운 곳) 누르면 닫힘
  document.querySelectorAll('[data-open-lead]').forEach((b) => b.addEventListener('click', () => openLead(b.closest('.cta-bar') ? 'cta_bar' : 'body')));
  lead.querySelectorAll('[data-close-lead]').forEach((b) => b.addEventListener('click', closeLead));

  privacyBtn.addEventListener('click', () => {
    const open = privacyBox.hidden;
    privacyBox.hidden = !open;
    privacyBtn.setAttribute('aria-expanded', String(open));
    privacyBtn.textContent = open ? '접기' : '자세히보기';
  });

  // 연락처: 숫자만 받아 010-1234-5678 모양으로
  fPhone.addEventListener('input', () => {
    const d = fPhone.value.replace(/\D/g, '').slice(0, 11);
    fPhone.value = d.length < 4 ? d : d.length < 8 ? `${d.slice(0, 3)}-${d.slice(3)}` : d.length < 11 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  });
  [fName, fPhone, fPrivacy].forEach((el) => el.addEventListener(el === fPrivacy ? 'change' : 'input', () => { el.removeAttribute('aria-invalid'); leadError.textContent = ''; }));

  const leadCheck = () => {
    const phone = fPhone.value.replace(/\D/g, '');
    if (fName.value.trim().length < 2) return [fName, '이름을 2자 이상 입력해 주세요.'];
    if (!/^01[016789]\d{7,8}$/.test(phone)) return [fPhone, '연락처를 정확히 입력해 주세요. (예: 010-1234-5678)'];
    if (!fPrivacy.checked) return [fPrivacy, '개인정보 수집 및 이용에 동의해 주세요.'];
    return null;
  };
  const showDone = () => {
    leadForm.hidden = true;
    leadDone.hidden = false;
    leadForm.reset();
    leadDone.querySelector('[data-close-lead]').focus();
  };

  leadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bad = leadCheck();
    if (bad) {
      bad[0].setAttribute('aria-invalid', 'true');
      bad[0].focus();
      leadError.textContent = bad[1];
      return;
    }
    if (leadForm.elements.website.value) { showDone(); return; } // 숨은 칸이 채워졌으면 봇 → 보내지 않음
    const q = new URLSearchParams(location.search);
    const payload = {
      name: fName.value.trim(),
      phone: fPhone.value.replace(/\D/g, ''),
      privacy_agreed: true,
      landing_variant: variant,
      utm: Object.fromEntries(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'].filter((k) => q.get(k)).map((k) => [k, q.get(k)])),
      page_url: location.href,
      referrer: document.referrer || null,
    };
    leadSubmit.disabled = true;
    leadSubmit.textContent = '신청 중…';
    track('lead_submit');
    try {
      if (CLINIC.leadEndpoint) {
        const res = await fetch(CLINIC.leadEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } else {
        await new Promise((r) => setTimeout(r, 500)); // 데모: 서버 연결 전에는 보내지 않고 완료 화면만
      }
      track('lead_success');
      showDone();
    } catch {
      track('lead_error');
      leadError.textContent = `신청이 전송되지 않았습니다. 잠시 후 다시 시도하시거나 ${CLINIC.phone}로 전화해 주세요.`;
    } finally {
      leadSubmit.disabled = false;
      leadSubmit.textContent = '상담 신청하기';
    }
  });

  /* 탈모 고민: 스크롤로 각 카드가 화면 아래쪽 1/4 선을 넘으면 등장 + 체크 (누르는 동작 없음) */
  const worryEls = [...document.querySelectorAll('.worry, .worries-result')];
  if ('IntersectionObserver' in window && !reduceMotion()) {
    const wio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        wio.unobserve(e.target);
        if (e.target.classList.contains('worries-result')) track('worries_viewed');
      });
    }, { rootMargin: '0px 0px -25% 0px' });
    worryEls.forEach((el) => wio.observe(el));
  } else {
    worryEls.forEach((el) => el.classList.add('is-in'));
  }

  /* S02 정상 모발 → 탈모: 스크롤 진행도(0~1)를 --p로 넘겨 그림을 서서히 바꿈 (클릭 없음) */
  const cmpScene = document.querySelector('.cmp-scene');
  const cmpSticky = cmpScene.querySelector('.cmp-sticky');
  const cmpFrame = cmpScene.querySelector('.cmp-frame');
  const cmpSwitch = cmpScene.querySelector('.cmp-switch');
  let cmpState = 'normal';
  let cmpSeen = false;
  const updateCmp = () => {
    const sceneTop = cmpScene.getBoundingClientRect().top;
    const stickyTop = parseFloat(getComputedStyle(cmpSticky).top) || 0;
    const travel = cmpScene.offsetHeight - cmpSticky.offsetHeight; // 그림이 붙어 있는 스크롤 거리
    const p = Math.min(1, Math.max(0, (stickyTop - sceneTop) / (travel || 1)));
    cmpFrame.style.setProperty('--p', p.toFixed(3));
    cmpSwitch.style.setProperty('--p', p.toFixed(3));
    const state = p >= 0.5 ? 'loss' : 'normal';
    if (state !== cmpState) {
      cmpState = state;
      if (state === 'loss' && !cmpSeen) { cmpSeen = true; track('compare_scrolled'); }
    }
    cmpFrame.dataset.state = state;
    cmpSwitch.dataset.state = state;
  };
  let cmpTick = false;
  window.addEventListener('scroll', () => {
    if (cmpTick) return;
    cmpTick = true;
    requestAnimationFrame(() => { updateCmp(); cmpTick = false; });
  }, { passive: true });
  window.addEventListener('resize', updateCmp);
  updateCmp();

  /* Q 카드: 보이면 민감 부위가 깜빡이고 결론에 형광펜 */
  const whyNote = document.querySelector('.why-note');
  if ('IntersectionObserver' in window) {
    const nio = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      whyNote.classList.add('is-in');
      nio.disconnect();
    }, { threshold: 0.5 });
    nio.observe(whyNote);
  } else {
    whyNote.classList.add('is-in');
  }

  /* 미리 준비 밴드 등장 */
  const prepare = document.querySelector('.prepare');
  if ('IntersectionObserver' in window) {
    const pio = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      prepare.classList.add('is-in');
      pio.disconnect();
    }, { threshold: 0.3 });
    pio.observe(prepare);
  } else {
    prepare.classList.add('is-in');
  }

  /* S03 원장 여정: 화면에 들어오면 선이 그려지며 단계가 차례로 켜짐 */
  const path = document.querySelector('.path');
  if ('IntersectionObserver' in window && !reduceMotion()) {
    const jio = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      path.classList.add('is-in');
      path.closest('.journey').classList.add('is-in');
      jio.disconnect();
    }, { threshold: 0.5 });
    jio.observe(path);
  } else {
    path.classList.add('is-in');
    path.closest('.journey').classList.add('is-in');
  }

  /* S04 맞춤 상담 영상: 보일 때만 재생, 장면(듣기 → 진단 → 설명)에 맞춰 자막·진행 막대 갱신 */
  const consultBox = document.querySelector('.consult-video');
  const cv = consultBox.querySelector('video');
  const SCENES = [ // 인코딩 때 붙인 장면 경계(초) — 맞춤상담_섹션_플랜.md §6
    { end: 3.3, text: '먼저 듣습니다', desc: ['가족력과 시작 시기,', '해 온 관리를 여쭙니다.'] },
    { end: 6.13, text: '직접 봅니다', desc: ['두피 확대경으로', '굵기와 밀도를 봅니다.'] },
    { end: 7.97, text: '함께 정합니다', desc: ['지금 단계에 맞는', '치료 방향을 설명드립니다.'] },
    { end: 11.97, text: '세심하게 시술합니다', desc: ['두피 상태를 보며', '장비 시술을 진행합니다.'] }, // 사진 기반 AI 영상 (영상 아래 고지)
    { end: Infinity, text: '꾸준히 관리합니다', desc: ['정한 방향에 맞춰', '두피 레이저 관리를 진행합니다.'] },
  ];
  const bars = [...consultBox.querySelectorAll('.consult-bars i')];
  const cap = consultBox.querySelector('.consult-cap');
  let scene = 0;
  let raf = 0;
  const renderConsult = () => {
    const t = cv.currentTime;
    const i = SCENES.findIndex((s) => t < s.end);
    bars.forEach((bar, k) => {
      const start = k ? SCENES[k - 1].end : 0;
      const end = k === SCENES.length - 1 ? cv.duration || 16.6 : SCENES[k].end;
      const fill = k < i ? 1 : k > i ? 0 : (t - start) / (end - start);
      bar.style.setProperty('--fill', Math.min(1, Math.max(0, fill)).toFixed(3));
    });
    if (i !== scene) {
      scene = i;
      cap.querySelector('.consult-cap-text').textContent = SCENES[i].text;
      const desc = cap.querySelector('.consult-cap-desc');
      desc.replaceChildren(SCENES[i].desc[0], document.createElement('br'), SCENES[i].desc[1]);
      cap.classList.remove('is-swap');
      void cap.offsetWidth; // 애니메이션 다시 시작
      cap.classList.add('is-swap');
    }
  };
  const consultLoop = () => { renderConsult(); raf = requestAnimationFrame(consultLoop); };
  cv.addEventListener('play', () => { cancelAnimationFrame(raf); consultLoop(); });
  cv.addEventListener('pause', () => cancelAnimationFrame(raf));
  cv.addEventListener('seeked', renderConsult);
  let lastT = 0;
  let looped = false;
  cv.addEventListener('timeupdate', () => {
    if (!looped && cv.currentTime < lastT) { looped = true; track('consult_video_loop'); }
    lastT = cv.currentTime;
  });
  const conn = navigator.connection;
  if (conn && (conn.saveData || /2g|3g/.test(conn.effectiveType || ''))) { // 느린 망이면 480px 영상
    cv.querySelector('source').src = 'videos/consult-480.mp4';
    cv.load();
  }
  const showControls = () => { cv.controls = true; consultBox.classList.add('has-controls'); };
  if (reduceMotion() || !('IntersectionObserver' in window)) {
    showControls();
  } else {
    let consultSeen = false;
    new IntersectionObserver(([entry]) => {
      if (cv.controls) return;
      if (entry.isIntersecting) {
        if (!consultSeen) { consultSeen = true; track('consult_video_viewed'); }
        const p = cv.play();
        if (p && p.catch) p.catch(showControls); // 저전력 모드 등으로 자동재생이 막히면 재생 버튼
      } else {
        cv.pause();
      }
    }, { threshold: 0.5 }).observe(consultBox);
  }

  /* S05 둘러보기: 스크롤 고정 없이 자연스럽게 자동 전환되는 캐러셀 슬라이더 */
  const tour = document.querySelector('.tour');
  if (tour) {
    const tourSticky = tour.querySelector('.tour-sticky');
    const tourTrack = tour.querySelector('.tour-track');
    const tourCards = [...tourTrack.children];
    const tourCount = tour.querySelector('.tour-count b');
    const tourBar = tour.querySelector('.tour-bar');
    const prevBtn = tour.querySelector('.tour-prev');
    const nextBtn = tour.querySelector('.tour-next');
    const total = tourCards.length;

    let currentIndex = 0;
    let cardStep = 0;
    let autoTimer = null;
    let isVisible = false;
    let tourDone = false;

    const setSlide = (index, animate = true) => {
      currentIndex = (index + total) % total;
      tourCards.forEach((c, k) => c.classList.toggle('is-active', k === currentIndex));
      tourCount.textContent = String(currentIndex + 1).padStart(2, '0');
      tourBar.style.setProperty('--p', ((currentIndex + 1) / total).toFixed(3));

      if (animate) tourTrack.classList.add('is-animating');
      else tourTrack.classList.remove('is-animating');

      const offset = -currentIndex * cardStep;
      tourTrack.style.transform = `translate3d(${offset}px, 0, 0)`;

      if (currentIndex === total - 1 && !tourDone) {
        tourDone = true;
        track('tour_completed');
      }
    };

    const layoutTour = () => {
      const containerW = tourSticky.clientWidth;
      const gutter = parseFloat(getComputedStyle(tourTrack).paddingLeft) || 20;
      const maxW = 420;
      const calcW = Math.min(maxW, containerW - gutter * 2 - 24);
      tour.style.setProperty('--card-w', `${calcW}px`);
      cardStep = calcW + 12; // gap 12px
      setSlide(currentIndex, false);
    };

    const nextSlide = () => setSlide(currentIndex + 1);
    const prevSlide = () => setSlide(currentIndex - 1);

    const startAuto = () => {
      stopAuto();
      if (reduceMotion()) return;
      autoTimer = setInterval(() => {
        if (isVisible) nextSlide();
      }, 3500);
    };

    const stopAuto = () => {
      if (autoTimer) {
        clearInterval(autoTimer);
        autoTimer = null;
      }
    };

    if (prevBtn) prevBtn.addEventListener('click', () => { prevSlide(); startAuto(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { nextSlide(); startAuto(); });

    // 터치 및 마우스 스와이프
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let isDragging = false;
    let isHorizontal = null;
    let startOffset = 0;

    const onStart = (e) => {
      stopAuto();
      isDragging = true;
      isHorizontal = null;
      const point = e.touches ? e.touches[0] : e;
      startX = point.clientX;
      startY = point.clientY;
      currentX = startX;
      startOffset = -currentIndex * cardStep;
      tourTrack.classList.remove('is-animating');
    };

    const onMove = (e) => {
      if (!isDragging) return;
      const point = e.touches ? e.touches[0] : e;
      const diffX = point.clientX - startX;
      const diffY = point.clientY - startY;

      if (isHorizontal === null && e.touches) {
        if (Math.abs(diffX) > 6 || Math.abs(diffY) > 6) {
          isHorizontal = Math.abs(diffX) >= Math.abs(diffY);
        }
      }

      if (isHorizontal === false) { // 세로 스크롤이면 놓아 주고 자동 넘김 다시 시작 (onEnd는 isDragging이 꺼져 있어 건너뜀)
        isDragging = false;
        startAuto();
        return;
      }

      currentX = point.clientX;
      tourTrack.style.transform = `translate3d(${startOffset + diffX}px, 0, 0)`;
    };

    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      const diff = currentX - startX;
      const threshold = 40;
      if (diff < -threshold) {
        nextSlide();
      } else if (diff > threshold) {
        prevSlide();
      } else {
        setSlide(currentIndex, true);
      }
      startAuto();
    };

    tourTrack.addEventListener('touchstart', onStart, { passive: true });
    tourTrack.addEventListener('touchmove', onMove, { passive: true });
    tourTrack.addEventListener('touchend', onEnd, { passive: true });

    tourTrack.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    tourSticky.addEventListener('mouseenter', stopAuto);
    tourSticky.addEventListener('mouseleave', startAuto);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) startAuto();
        else stopAuto();
      }, { threshold: 0.15 }).observe(tour);
    } else {
      isVisible = true;
      startAuto();
    }

    layoutTour();
    window.addEventListener('resize', layoutTour);
  }

  /* S06 원장 인터뷰: 누르면 소리와 함께 재생, 질문을 누르면 그 장면으로 이동, 재생 중인 질문 표시 */
  const ivBox = document.querySelector('.interview-player');
  const iv = ivBox.querySelector('video');
  const ivChapters = [...document.querySelectorAll('.interview-chapters button')];
  const ivTimes = ivChapters.map((b) => Number(b.dataset.t));
  const ivMarks = new Set();
  const startInterview = (t) => {
    ivBox.classList.add('is-started');
    iv.controls = true;
    if (typeof t === 'number') {
      // preload="none"이라 첫 재생 땐 아직 길이를 모름: iOS Safari는 그때 정한 위치를 버리므로 메타데이터 뒤에 이동
      if (iv.readyState >= 1) iv.currentTime = t;
      else iv.addEventListener('loadedmetadata', () => { iv.currentTime = t; }, { once: true });
    }
    const p = iv.play();
    if (p && p.catch) p.catch(() => {});
  };
  ivBox.querySelector('.interview-play').addEventListener('click', () => { startInterview(); track('interview_play'); });
  iv.addEventListener('play', () => ivBox.classList.add('is-started'));
  ivChapters.forEach((btn) => btn.addEventListener('click', () => {
    startInterview(Number(btn.dataset.t));
    track('interview_chapter', { chapter: btn.textContent.replace(/^Q\d+/, '').trim() });
    const r = ivBox.getBoundingClientRect();
    if (r.top < header.offsetHeight || r.bottom > window.innerHeight) { // 영상이 화면 밖이면 영상으로 스크롤
      window.scrollTo({ top: r.top + window.scrollY - header.offsetHeight - 12, behavior: reduceMotion() ? 'auto' : 'smooth' });
    }
  }));
  iv.addEventListener('timeupdate', () => {
    const t = iv.currentTime;
    let cur = -1;
    ivTimes.forEach((s, k) => { if (t >= s) cur = k; });
    ivChapters.forEach((b, k) => b.setAttribute('aria-current', String(k === cur)));
    const pct = iv.duration ? Math.floor((t / iv.duration) * 4) * 25 : 0; // 25% 단위 시청 기록
    if (pct > 0 && !ivMarks.has(pct)) { ivMarks.add(pct); track('interview_progress', { percent: pct }); }
  });
  if ('IntersectionObserver' in window) { // 화면 밖으로 완전히 나가면 일시정지
    new IntersectionObserver(([entry]) => { if (!entry.isIntersecting && !iv.paused) iv.pause(); }, { threshold: 0 }).observe(ivBox);
  }

  /* S07 마지막 멘트: 글자를 한 글자씩 span으로 나눠, 스크롤로 문단이 올라오는 동안 차례로 채움 */
  const closingCopy = document.querySelector('.closing-copy');
  if (closingCopy) {
    const chars = [];
    closingCopy.querySelectorAll('[data-fill]').forEach((el) => {
      const read = el.cloneNode(true);
      read.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
      const label = Object.assign(document.createElement('span'), { className: 'visually-hidden', textContent: read.textContent });
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const texts = [];
      while (walker.nextNode()) texts.push(walker.currentNode);
      texts.forEach((node) => {
        const frag = document.createDocumentFragment();
        [...node.textContent].forEach((ch) => {
          if (/\s/.test(ch)) { frag.append(ch); return; }
          const s = Object.assign(document.createElement('span'), { className: 'fill-ch', textContent: ch });
          s.setAttribute('aria-hidden', 'true'); // 화면 낭독기는 한 글자씩 끊어 읽지 않도록 label을 읽음
          chars.push(s);
          frag.append(s);
        });
        node.replaceWith(frag);
      });
      el.append(label);
    });
    let lit = -1;
    let closingSeen = false;
    const fillClosing = () => {
      const r = closingCopy.getBoundingClientRect();
      const vh = window.innerHeight;
      const atBottom = window.scrollY + vh >= document.documentElement.scrollHeight - 4; // 화면이 낮아 끝 지점까지 못 올라와도 끝까지 채움
      // 문단 윗변이 화면 85%에 닿으면 시작, 문단 전체가 화면 80% 위로 올라오면 다 채움 (반쯤 빈 채로 멈춰 보이지 않게)
      const start = vh * 0.85;
      const end = vh * 0.8 - r.height;
      const p = atBottom ? 1 : Math.min(1, Math.max(0, (start - r.top) / (start - end)));
      const n = Math.round(p * chars.length);
      if (n === lit) return;
      lit = n;
      chars.forEach((s, k) => s.classList.toggle('is-on', k < n));
      if (n === chars.length && !closingSeen) { closingSeen = true; track('closing_viewed'); }
    };
    if (reduceMotion()) {
      chars.forEach((s) => s.classList.add('is-on'));
    } else {
      let fillTick = false;
      window.addEventListener('scroll', () => {
        if (fillTick) return;
        fillTick = true;
        requestAnimationFrame(() => { fillClosing(); fillTick = false; });
      }, { passive: true });
      window.addEventListener('resize', fillClosing);
      fillClosing();
    }
  }

  /* 전후 사진(정면·정수리 모두 펼쳐 둠): 각각 처음 화면에 들어오면 1회 기록 */
  if ('IntersectionObserver' in window) {
    const bio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        bio.unobserve(e.target);
        track('ba_viewed', { view: e.target.id.replace('ba-', '') });
      });
    }, { threshold: 0.6 });
    document.querySelectorAll('.ba-panel').forEach((p) => bio.observe(p));
  }

  /* 전후 비교 슬라이더: 세로로 쓸면 스크롤(touch-action: pan-y), 가로로 끌거나 누르면 위치 이동 */
  document.querySelectorAll('.ba').forEach((ba) => {
    const range = ba.querySelector('.ba-range');
    const tagBefore = ba.querySelector('.ba-tag-before');
    const tagAfter = ba.querySelector('.ba-tag-after');
    let used = false;
    const set = (pct) => {
      const v = Math.min(100, Math.max(0, pct));
      ba.style.setProperty('--pos', `${v}%`);
      range.value = String(Math.round(v));
      // 경계선이 태그를 덮기 시작하면(= 반대쪽 사진이 그 자리를 채우면) 그 태그는 숨김
      const w = ba.clientWidth || 1;
      const beforeEdge = ((tagBefore.offsetLeft + tagBefore.offsetWidth) / w) * 100;
      const afterEdge = (tagAfter.offsetLeft / w) * 100;
      tagBefore.classList.toggle('is-hidden', v < beforeEdge);
      tagAfter.classList.toggle('is-hidden', v > afterEdge);
    };
    const fromX = (x) => {
      const r = ba.getBoundingClientRect();
      set(((x - r.left) / r.width) * 100);
    };
    const markUsed = () => {
      if (used) return;
      used = true;
      track('ba_slider_used');
    };
    let start = null;
    let touched = false;
    ba.addEventListener('pointerdown', (e) => {
      touched = true;
      start = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
    });
    ba.addEventListener('pointermove', (e) => {
      if (!start || e.pointerId !== start.id) return;
      if (!start.moved && Math.abs(e.clientX - start.x) > 6 && Math.abs(e.clientX - start.x) > Math.abs(e.clientY - start.y)) {
        start.moved = true;
        ba.setPointerCapture(e.pointerId);
      }
      if (start.moved) { fromX(e.clientX); markUsed(); }
    });
    ba.addEventListener('pointerup', (e) => {
      if (start && !start.moved) { fromX(e.clientX); markUsed(); } // 짧게 누르면 그 위치로
      start = null;
    });
    ba.addEventListener('pointercancel', () => { start = null; });
    range.addEventListener('input', () => { touched = true; set(Number(range.value)); markUsed(); });

    // 처음 보일 때 한 번 좌우로 움직여 끌 수 있다는 걸 알려 줌 (만지면 멈춤)
    if (!reduceMotion() && 'IntersectionObserver' in window) {
      const tween = (from, to, ms) => new Promise((resolve) => {
        const t0 = performance.now();
        const step = (now) => {
          if (touched) return resolve();
          const k = Math.min(1, (now - t0) / ms);
          const ease = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
          set(from + (to - from) * ease);
          if (k < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
      const hint = new IntersectionObserver(async ([entry]) => {
        if (!entry.isIntersecting) return;
        hint.disconnect();
        await new Promise((r) => setTimeout(r, 400));
        await tween(50, 25, 500);
        await tween(25, 75, 800);
        await tween(75, 50, 500);
      }, { threshold: 0.6 });
      hint.observe(ba);
    }
  });

  /* 캐릭터 짤: 영상 → 자동재생이 막히면 애니메이션 webp → 동작 줄이기면 정지 이미지 */
  const arch = document.querySelector('.hero-arch');
  const video = arch.querySelector('video');
  const still = arch.querySelector('.hero-still');
  const reduce = { matches: reduceMotion() };
  const useAnimatedWebp = () => {
    arch.classList.add('no-video');
    video.removeAttribute('autoplay');
    video.pause();
    still.src = 'videos/hero-character-loop.webp';
  };
  if (reduce.matches) {
    video.remove();
  } else {
    const tryPlay = () => {
      const p = video.play();
      if (p && p.catch) p.catch(useAnimatedWebp);
    };
    video.addEventListener('error', useAnimatedWebp, true);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        if (arch.classList.contains('no-video')) return;
        if (entry.isIntersecting) tryPlay();
        else video.pause();
      }, { threshold: 0.1 }).observe(arch);
    } else {
      tryPlay();
    }
  }
})();
