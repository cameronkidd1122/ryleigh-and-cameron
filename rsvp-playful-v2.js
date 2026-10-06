(() => {
  'use strict';
  const input = document.querySelector('#rsvp-form input[value="declined"]');
  const label = input?.closest('label');
  if (!label || label.dataset.playfulNo) return;
  label.dataset.playfulNo = 'true';
  const fine = matchMedia('(any-hover: hover) and (any-pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const style = document.createElement('style');
  style.textContent = `
    .rsvp-no-runway{display:contents}
    .rsvp-no-runway.is-playful{display:block;position:relative;height:130px;min-width:0}
    .rsvp-no-runway.is-playful>.choice{position:absolute;left:0;top:0;width:max-content;max-width:100%;background:var(--card,#fffefa);transform:translate3d(0,20px,0);transition:transform 105ms cubic-bezier(.12,.8,.2,1),border-color .15s;will-change:transform}
    .rsvp-no-runway.is-playful>.choice.is-taunting{animation:rsvp-no-taunt 360ms ease-in-out infinite}
    @keyframes rsvp-no-taunt{0%,100%{rotate:0deg;translate:0 0}20%{rotate:-2deg;translate:-2px 0}45%{rotate:2deg;translate:2px -1px}70%{rotate:-1.5deg;translate:-1px 1px}}
    .rsvp-no-runway.is-playful>.choice:has(input:checked){background:#eef2e8}
    .rsvp-no-runway.is-playful>.choice.is-settled{transition:none}
    @media(prefers-reduced-motion:reduce){.rsvp-no-runway.is-playful{display:contents}.rsvp-no-runway.is-playful>.choice{position:static;width:auto;transform:none!important;transition:none;animation:none;will-change:auto}}
  `;
  document.head.append(style);
  const stage = document.createElement('div');
  stage.className = 'rsvp-no-runway';
  label.before(stage); stage.append(label);
  let lastDodge = -Infinity, restUntil = 0, dodges = 0, keyboard = false, touchUntil = 0;
  let x = 0, y = 20;
  const settle = () => {
    label.classList.add('is-settled'); label.classList.remove('is-taunting'); label.style.transform = '';
    x = 0; y = 20; dodges = 0; lastDodge = -Infinity; restUntil = 0;
  };
  const configure = () => {
    stage.classList.toggle('is-playful', fine.matches && !reduced.matches);
    settle();
  };
  fine.addEventListener('change', configure); reduced.addEventListener('change', configure); configure();
  const distanceFrom = (px, py, left, top, width, height) => Math.hypot(
    Math.max(left - px, 0, px - left - width), Math.max(top - py, 0, py - top - height)
  );
  document.addEventListener('pointermove', event => {
    const now = performance.now();
    if (event.pointerType !== 'mouse' || event.buttons || !stage.classList.contains('is-playful') || input.checked || input.disabled || reduced.matches || now < touchUntil) return;
    // Keyboard focus remains stable until the visitor deliberately moves the mouse again.
    if (keyboard) {
      if (Math.abs(event.movementX || 0) + Math.abs(event.movementY || 0) < 3) return;
      keyboard = false;
    }
    if (document.activeElement?.matches('input:not([type=radio]),textarea,select') || input.closest('form').getAttribute('aria-busy') === 'true') { label.classList.remove('is-taunting'); return; }
    const bounds = stage.getBoundingClientRect(); const box = label.getBoundingClientRect();
    if (!bounds.width || !box.width || !box.height) return;
    if (distanceFrom(event.clientX,event.clientY,bounds.left,bounds.top,bounds.width,bounds.height) > 90) {
      label.classList.remove('is-taunting');
      if (now - lastDodge > 1800) dodges = 0;
      return;
    }
    label.classList.add('is-taunting');
    // React before the pointer lands, with only a tiny catch window after a long chase.
    if (distanceFrom(event.clientX,event.clientY,box.left,box.top,box.width,box.height) > 34 || now - lastDodge < 90 || now < restUntil) return;
    if (dodges >= 12) { dodges = 0; restUntil = now + 180; return; }
    const maxX = Math.max(0,bounds.width-box.width), maxY = Math.max(0,bounds.height-box.height);
    if (maxX < 12 && maxY < 12) return;
    const px = event.clientX-bounds.left, py = event.clientY-bounds.top;
    // Inset the landings so the wiggle stays inside its own row.
    const insetX = Math.min(7,maxX/2), insetY = Math.min(7,maxY/2);
    const candidates = [0,1/3,2/3,1].flatMap(u=>[0,.5,1].map(v=>[insetX+(maxX-2*insetX)*u,insetY+(maxY-2*insetY)*v]));
    let best = null, bestScore = -Infinity;
    for (const [nx,ny] of candidates) {
      const travel = Math.hypot(nx-x,ny-y);
      if (travel < 20) continue;
      const clearance = distanceFrom(px,py,nx,ny,box.width,box.height);
      // Favor more breathing room and vary the landing so it cannot be memorized.
      const score = clearance*3 - travel*.035 + Math.random()*22;
      if (score > bestScore) { best = [nx,ny]; bestScore = score; }
    }
    if (!best) return;
    [x,y] = best; lastDodge = now; dodges++;
    label.classList.remove('is-settled');
    label.style.transform = `translate3d(${Math.round(x)}px,${Math.round(y)}px,0)`;
  }, {passive:true});
  // Native radio selection is never intercepted: a successful catch still means No.
  document.addEventListener('keydown', event => {
    if (['Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(event.key)) { keyboard = true; settle(); }
  }, {capture:true});
  document.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse') { touchUntil = performance.now()+1500; settle(); }
  }, {capture:true,passive:true});
  input.addEventListener('change', () => { if (input.checked) settle(); });
  input.closest('form').addEventListener('reset', settle);
  addEventListener('resize', settle, {passive:true});
  addEventListener('blur', settle);
})();
