document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.promo-banner, .hero-title, .hero-subtitle, .search-box, .trust-bar').forEach(el => {
    el.classList.add('animate-in');
  });

  initAttachments();
  document.querySelectorAll('.dropdown').forEach(initDropdown);
  initModeShortcuts();
  initVoiceInput();
  initTypingPlaceholder();
  document.querySelectorAll('.nav-dropdown').forEach(initNavDropdown);
  initEngineTabs();
  initCompareProgress();
  initTutorScale();
  initDesignUnits();
  initHeaderReveal();
  initMobileMenu();
});

function initMobileMenu() {
  const header = document.querySelector('.site-header');
  const toggle = header.querySelector('.menu-toggle');
  const menu = document.getElementById('mobile-menu');

  const toolsToggle = menu.querySelector('.mobile-menu-tools-toggle');
  const toolsList = document.getElementById(toolsToggle.getAttribute('aria-controls'));

  function setToolsOpen(open) {
    toolsToggle.setAttribute('aria-expanded', String(open));
    toolsList.hidden = !open;
  }

  function setOpen(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
    // On phones the menu covers the page, so stop the page behind it scrolling
    document.documentElement.classList.toggle('menu-open', open);
    if (!open) setToolsOpen(false);
  }

  toggle.addEventListener('click', () => setOpen(menu.hidden));

  menu.addEventListener('click', e => {
    if (e.target.closest('.mobile-menu-tools-toggle')) {
      setToolsOpen(toolsList.hidden);
      return;
    }
    // Choosing anything else in the menu closes it
    const choice = e.target.closest('a, button');
    if (!choice) return;
    setOpen(false);
    if (choice.hasAttribute('data-focus-search')) document.getElementById('search-query').focus();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !menu.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });

  document.addEventListener('click', e => {
    if (!menu.hidden && !header.contains(e.target)) setOpen(false);
  });

  header.addEventListener('menu:close', () => setOpen(false));
}

// Past the hero, hide the nav on scroll down and bring it back on scroll up
function initHeaderReveal() {
  const header = document.querySelector('.site-header');
  const hero = document.querySelector('.hero');
  const toolsTrigger = header.querySelector('.nav-dropdown-trigger');
  const SCROLL_THRESHOLD = 6;

  let lastY = window.scrollY;
  let ticking = false;

  function update() {
    ticking = false;
    const y = window.scrollY;
    const pastHero = y > hero.offsetTop + hero.offsetHeight - header.offsetHeight;
    const delta = y - lastY;

    if (!pastHero) {
      header.classList.remove('is-hidden');
    } else if (delta > SCROLL_THRESHOLD) {
      if (toolsTrigger.getAttribute('aria-expanded') === 'true') toolsTrigger.click();
      header.dispatchEvent(new Event('menu:close'));
      header.classList.add('is-hidden');
    } else if (delta < -SCROLL_THRESHOLD) {
      header.classList.remove('is-hidden');
    }

    if (Math.abs(delta) > SCROLL_THRESHOLD) lastY = y;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });

  // Keyboard users tabbing into the nav should always be able to see it
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
}

function initStreamingAnswer(panel) {
  const answer = panel.querySelector('.citation-answer');
  const sources = panel.querySelector('.citation-sources');
  const heading = sources.querySelector('.citation-heading');
  const items = [...sources.querySelectorAll('.citation-list li')];
  const stickers = [...panel.querySelectorAll('.engine-sticker')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const WORD_DELAY = 16;
  const WORD_JITTER = 18;
  const START_DELAY = 300;
  const PAUSE_BEFORE_SOURCES = 250;

  // Wrap each word in a span and leave the spaces as plain text, so a finished block's underline runs unbroken;
  // inline elements like the [1] refs become one token each
  function tokenize(el) {
    [...el.childNodes].forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parts = node.textContent.split(/(\s+)/).filter(Boolean);
        node.replaceWith(...parts.map(part => {
          if (/^\s+$/.test(part)) return document.createTextNode(part);
          const span = document.createElement('span');
          span.className = 'stream-token';
          span.textContent = part;
          return span;
        }));
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        node.classList.add('stream-token');
      }
    });
    return [...el.querySelectorAll('.stream-token')];
  }

  const answerTokens = tokenize(answer);
  const headingTokens = tokenize(heading);
  const itemTokens = items.map(tokenize);
  const allTokens = [...answerTokens, ...headingTokens, ...itemTokens.flat()];
  const blocks = [answer, heading, ...items];
  panel.classList.add('stream-ready');

  let run = 0;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function reveal(block, tokens, id) {
    for (const token of tokens) {
      if (id !== run) return false;
      token.classList.add('is-shown');
      await wait(WORD_DELAY + Math.random() * WORD_JITTER);
    }
    if (id !== run) return false;
    block.classList.add('is-complete');
    return true;
  }

  function reset() {
    run++;
    allTokens.forEach(t => t.classList.remove('is-shown'));
    blocks.forEach(b => b.classList.remove('is-complete'));
    items.forEach(li => li.classList.remove('is-started'));
    sources.classList.remove('is-shown');
    stickers.forEach(s => s.classList.remove('is-shown'));
  }

  async function play() {
    reset();
    const id = run;

    if (reduceMotion) {
      allTokens.forEach(t => t.classList.add('is-shown'));
      blocks.forEach(b => b.classList.add('is-complete'));
      items.forEach(li => li.classList.add('is-started'));
      sources.classList.add('is-shown');
      stickers.forEach(s => s.classList.add('is-shown'));
      return;
    }

    await wait(START_DELAY);
    if (!(await reveal(answer, answerTokens, id))) return;

    await wait(PAUSE_BEFORE_SOURCES);
    if (id !== run) return;
    sources.classList.add('is-shown');
    await wait(PAUSE_BEFORE_SOURCES);

    if (!(await reveal(heading, headingTokens, id))) return;
    for (let i = 0; i < items.length; i++) {
      items[i].classList.add('is-started');
      if (!(await reveal(items[i], itemTokens[i], id))) return;
    }
    stickers.forEach(s => s.classList.add('is-shown'));
  }

  panel.addEventListener('engine:show', play);
  // Stop typing but leave the text in place: the panel is still visible while the next one fades in over it
  panel.addEventListener('engine:hide', () => { run++; });
}

function initTestimonialSequence(panel) {
  const avatar = panel.querySelector('.testimonial-avatar');
  const typing = panel.querySelector('.typing-bubble');
  const bubble = panel.querySelector('.testimonial-bubble');
  const quote = panel.querySelector('.testimonial-quote');
  const author = panel.querySelector('.testimonial-author');
  const pills = [...panel.querySelectorAll('.stat-pill')];
  const counts = [...panel.querySelectorAll('.stat-count')];
  const stickers = [...panel.querySelectorAll('.engine-sticker')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const COUNT_DURATION = 700;
  const parts = [avatar, typing, bubble, quote, author, ...pills, ...stickers];

  panel.classList.add('seq-ready');

  let run = 0;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const show = el => el.classList.add('is-shown');

  // Counts 0 -> target with one decimal on the way, landing on the whole number
  function countUp(el, id) {
    const target = Number(el.dataset.count);
    const start = performance.now();
    function tick(now) {
      if (id !== run) return;
      const t = Math.min((now - start) / COUNT_DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = t < 1 ? (target * eased).toFixed(1) : String(target);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function reset() {
    run++;
    parts.forEach(el => el.classList.remove('is-shown'));
    counts.forEach(el => { el.textContent = '0'; });
  }

  async function play() {
    reset();
    const id = run;
    const step = async ms => { await wait(ms); return id === run; };

    if (reduceMotion) {
      [avatar, bubble, quote, author, ...pills, ...stickers].forEach(show);
      counts.forEach(el => { el.textContent = el.dataset.count; });
      return;
    }

    if (!(await step(250))) return;
    show(avatar);
    if (!(await step(250))) return;
    show(typing);
    if (!(await step(1100))) return;
    typing.classList.remove('is-shown');
    show(bubble);
    if (!(await step(200))) return;
    show(quote);
    if (!(await step(750))) return;
    show(author);
    for (let i = 0; i < pills.length; i++) {
      if (!(await step(i === 0 ? 350 : 250))) return;
      show(pills[i]);
      countUp(counts[i], id);
    }
    if (!(await step(700))) return;
    stickers.forEach(show);
  }

  panel.addEventListener('engine:show', play);
  // Stop the sequence but leave everything visible while the next panel fades in over it
  panel.addEventListener('engine:hide', () => { run++; });
}

// The mockup panels and phone bento cards size themselves in "design pixels" (--u, --bu), which CSS
// derives from container units. Older Safari (before iOS 16) has no container units, so set them in px here too.
function initDesignUnits() {
  const targets = [
    ...[...document.querySelectorAll('.tutor-screen')].map(el => [el, '--u', 439]),
    ...[...document.querySelectorAll('.bento-card')].map(el => [el, '--bu', 334]),
  ];
  const designWidth = new Map(targets.map(([el, prop, width]) => [el, [prop, width]]));

  const observer = new ResizeObserver(entries => {
    entries.forEach(({ target }) => {
      const [prop, width] = designWidth.get(target);
      // clientWidth ignores transforms, matching what container units measure
      target.style.setProperty(prop, `${target.clientWidth / width}px`);
    });
  });
  targets.forEach(([el]) => observer.observe(el));
}

// On phones, scale the 455px video-call mockup to 95% of its column (the Figma proportion)
function initTutorScale() {
  const visual = document.querySelector('.tutor-visual');
  const column = document.querySelector('.engine-container');
  const phone = window.matchMedia('(max-width: 767px)');

  function update() {
    if (!phone.matches) {
      visual.style.removeProperty('--tutor-scale');
      return;
    }
    const scale = Math.min(1, (column.clientWidth * 0.95) / 455);
    visual.style.setProperty('--tutor-scale', scale.toFixed(4));
  }

  new ResizeObserver(update).observe(column);
  phone.addEventListener('change', update);
  update();
}

function initCompareProgress() {
  const scroller = document.querySelector('.compare-scroll');
  const track = document.querySelector('.compare-progress');
  const thumb = track.querySelector('.compare-progress-thumb');

  function update() {
    const max = scroller.scrollWidth - scroller.clientWidth;
    const ratio = max > 0 ? scroller.scrollLeft / max : 0;
    thumb.style.transform = `translateX(${ratio * (track.clientWidth - thumb.offsetWidth)}px)`;
  }

  scroller.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

function initEngineTabs() {
  initStreamingAnswer(document.getElementById('engine-panel-citations'));
  initTestimonialSequence(document.getElementById('engine-panel-validated'));

  const section = document.querySelector('.learning-engine');
  const container = section.querySelector('.engine-container');
  const tablist = section.querySelector('[role="tablist"]');
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const indicator = section.querySelector('.engine-indicator');
  const AUTOPLAY_DELAY = 6000;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let current = 0;
  let timer = null;
  let inView = false;
  let keyboardFocused = false;

  function moveIndicator() {
    const tab = tabs[current];
    indicator.style.transform = `translateY(${tab.offsetTop}px)`;
    indicator.style.height = `${tab.offsetHeight}px`;
  }

  function schedule() {
    clearTimeout(timer);
    if (reduceMotion || !inView || keyboardFocused) return;
    const delay = Number(tabs[current].dataset.autoplayDelay) || AUTOPLAY_DELAY;
    timer = setTimeout(() => select(current + 1), delay);
  }

  const panelFor = tab => document.getElementById(tab.getAttribute('aria-controls'));

  function select(index, focus = false) {
    const previous = current;
    current = (index + tabs.length) % tabs.length;
    tabs.forEach((tab, i) => {
      const active = i === current;
      const panel = panelFor(tab);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panel.classList.toggle('is-active', active);
      panel.inert = !active;
    });
    if (previous !== current) {
      panelFor(tabs[previous]).dispatchEvent(new Event('engine:hide'));
      panelFor(tabs[current]).dispatchEvent(new Event('engine:show'));
    }
    moveIndicator();
    if (focus) tabs[current].focus();
    schedule();
  }

  tabs.forEach((tab, i) => tab.addEventListener('click', () => select(i)));

  tablist.addEventListener('keydown', e => {
    const targets = {
      ArrowDown: current + 1,
      ArrowRight: current + 1,
      ArrowUp: current - 1,
      ArrowLeft: current - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    if (e.key in targets) {
      e.preventDefault();
      select(targets[e.key], true);
    }
  });

  // Hold the current tab while someone is tabbing through it with the keyboard
  container.addEventListener('focusin', e => { keyboardFocused = e.target.matches(':focus-visible'); schedule(); });
  container.addEventListener('focusout', e => {
    if (!container.contains(e.relatedTarget)) { keyboardFocused = false; schedule(); }
  });

  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    schedule();
  }, { threshold: 0.4 }).observe(section);

  new ResizeObserver(moveIndicator).observe(tablist);
  moveIndicator();
}

function initModeShortcuts() {
  const input = document.getElementById('search-query');

  document.querySelectorAll('[data-set-mode]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelector(`#mode-menu [data-value="${button.dataset.setMode}"]`).click();
      input.focus();
    });
  });
}

function initNavDropdown(dropdown) {
  const trigger = dropdown.querySelector('.nav-dropdown-trigger');
  const menu = document.getElementById(trigger.getAttribute('aria-controls'));

  function setOpen(open) {
    trigger.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
  }

  trigger.addEventListener('click', () => {
    setOpen(trigger.getAttribute('aria-expanded') !== 'true');
  });

  dropdown.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !menu.hidden) {
      setOpen(false);
      trigger.focus();
    }
  });

  dropdown.addEventListener('focusout', e => {
    if (!dropdown.contains(e.relatedTarget)) setOpen(false);
  });

  document.addEventListener('click', e => {
    if (!dropdown.contains(e.target)) setOpen(false);
  });
}

function initTypingPlaceholder() {
  const input = document.getElementById('search-query');
  // [full question, shorter phone version]; the short one is used only when the full one won't fit
  const queries = [
    ['How does photosynthesis work?'],
    ['Why does time slow down near a black hole?', 'How do black holes bend time?'],
    ['Explain the causes of World War I'],
    ['Summarize peer-reviewed studies on microplastics in drinking water', 'Summarize microplastics research'],
    ['What is the derivative of sin(x)²?'],
    ['Summarize the plot of Macbeth'],
    ['How do I solve a quadratic equation?', 'Solve a quadratic equation'],
    ['What does current research say about remote learning and student outcomes?', 'Does remote learning work?'],
    ['How do vaccines train the immune system?', 'How do vaccines work?'],
    ['Explain Newton’s three laws of motion', 'Newton’s laws of motion'],
    ['What is the difference between mitosis and meiosis?', 'Mitosis vs. meiosis explained'],
    ['Compare recent findings on CRISPR off-target effects', 'Latest CRISPR safety findings'],
    ['What does an integral actually measure?', 'What does an integral measure?'],
    ['How does quantum entanglement work?', 'What is quantum entanglement?'],
  ];

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const TYPE_SPEED = 45;
  const DELETE_SPEED = 22;
  const HOLD_AFTER_TYPING = 1800;
  const PAUSE_BEFORE_NEXT = 400;
  const START_DELAY = 1200;

  let queryIndex = 0;
  let current = queries[0][0];
  let charIndex = current.length;
  let deleting = true;

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  // Placeholders can't wrap, so on narrow inputs (phones) skip questions wider than the input
  const measure = document.createElement('canvas').getContext('2d');
  function fits(query) {
    const style = getComputedStyle(input);
    measure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    if (measure.letterSpacing !== undefined) measure.letterSpacing = style.letterSpacing;
    const available = input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    return measure.measureText(query).width <= available;
  }

  // The full question if it fits, else its short version, else null (skipped)
  function pick(versions) {
    return versions.find(fits) || null;
  }

  function next(from) {
    for (let step = 1; step <= queries.length; step++) {
      const i = (from + step) % queries.length;
      const text = pick(queries[i]);
      if (text) return [i, text];
    }
    const i = (from + 1) % queries.length;
    return [i, queries[i][queries[i].length - 1]];
  }

  async function loop() {
    await wait(START_DELAY + HOLD_AFTER_TYPING);

    while (true) {
      const query = current;

      if (deleting) {
        charIndex--;
        input.placeholder = query.slice(0, charIndex);
        if (charIndex === 0) {
          deleting = false;
          [queryIndex, current] = next(queryIndex);
          await wait(PAUSE_BEFORE_NEXT);
        } else {
          await wait(DELETE_SPEED);
        }
      } else {
        charIndex++;
        input.placeholder = query.slice(0, charIndex);
        if (charIndex === query.length) {
          deleting = true;
          await wait(HOLD_AFTER_TYPING);
        } else {
          await wait(TYPE_SPEED + Math.random() * 40);
        }
      }
    }
  }

  loop();
}

function initAttachments() {
  const fileInput = document.getElementById('search-files');
  const addButton = document.querySelector('.toolbar-add');
  const list = document.querySelector('.search-attachments');

  addButton.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    list.replaceChildren(...[...fileInput.files].map(file => {
      const item = document.createElement('li');
      item.className = 'search-attachment';
      item.textContent = file.name;
      item.title = file.name;
      return item;
    }));
    list.hidden = fileInput.files.length === 0;
  });
}

function initDropdown(dropdown) {
  const trigger = dropdown.querySelector('.dropdown-trigger');
  const menu = dropdown.querySelector('.dropdown-menu');
  const label = trigger.querySelector('.selector-label');
  const valueInput = dropdown.querySelector('input[type="hidden"]');
  const options = [...menu.querySelectorAll('[role="option"]')];
  const triggerIcon = trigger.querySelector('.selector-icon');
  const defaultOption = options.find(o => o.getAttribute('aria-selected') === 'true');
  const defaultIconSrc = triggerIcon?.getAttribute('src');

  const isOpen = () => trigger.getAttribute('aria-expanded') === 'true';

  function open() {
    trigger.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
    (options.find(o => o.getAttribute('aria-selected') === 'true') || options[0]).focus();
  }

  function close(returnFocus) {
    trigger.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    if (returnFocus) trigger.focus();
  }

  function select(option) {
    options.forEach(o => o.setAttribute('aria-selected', String(o === option)));
    label.textContent = option.textContent.trim();
    valueInput.value = option.dataset.value;

    const optionIcon = option.querySelector('.option-icon');
    if (triggerIcon && optionIcon) {
      triggerIcon.src = option === defaultOption ? defaultIconSrc : optionIcon.getAttribute('src');
      triggerIcon.classList.toggle('option-icon-small', optionIcon.classList.contains('option-icon-small'));
    }

    close(true);
  }

  trigger.addEventListener('click', () => (isOpen() ? close(false) : open()));

  trigger.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      open();
    }
  });

  options.forEach(option => option.addEventListener('click', () => select(option)));

  menu.addEventListener('keydown', e => {
    const index = options.indexOf(document.activeElement);
    const moves = {
      ArrowDown: Math.min(index + 1, options.length - 1),
      ArrowUp: Math.max(index - 1, 0),
      Home: 0,
      End: options.length - 1,
    };

    if (e.key in moves) {
      e.preventDefault();
      options[moves[e.key]].focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      select(options[index]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    } else if (e.key === 'Tab') {
      close(false);
    }
  });

  document.addEventListener('click', e => {
    if (isOpen() && !dropdown.contains(e.target)) close(false);
  });
}

function initVoiceInput() {
  const micButton = document.querySelector('.toolbar-mic');
  const input = document.getElementById('search-query');
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    micButton.disabled = true;
    micButton.title = 'Voice input isn’t supported in this browser';
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = document.documentElement.lang || 'en-US';
  recognition.interimResults = true;

  let listening = false;
  let baseText = '';

  function setListening(value) {
    listening = value;
    micButton.classList.toggle('is-listening', value);
    micButton.setAttribute('aria-pressed', String(value));
  }

  micButton.addEventListener('click', () => {
    if (listening) {
      recognition.stop();
      return;
    }
    baseText = input.value.trim();
    recognition.start();
    setListening(true);
  });

  recognition.addEventListener('result', e => {
    const transcript = [...e.results].map(result => result[0].transcript).join('');
    input.value = baseText ? `${baseText} ${transcript}` : transcript;
  });

  recognition.addEventListener('end', () => {
    setListening(false);
    input.focus();
  });

  recognition.addEventListener('error', e => {
    setListening(false);
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      micButton.title = 'Microphone access was blocked';
    }
  });
}
