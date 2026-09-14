/* Original pet artwork based on Ryleigh and Cameron's photos. Decorative only. */
(() => {
  'use strict';
  if (document.querySelector('.pet-companions')) return;
  const script = document.currentScript;
  const assetBase = new URL('.', script.src);
  // Ship geometry with its renderer so cached HTML cannot apply an old sheet layout.
  const styles = document.createElement('style');
  styles.textContent = ".pet-companions{position:fixed;inset:0;z-index:30;pointer-events:none;overflow:hidden;contain:strict;user-select:none}\n.pet-companion{position:absolute;left:0;top:0;width:64px;height:64px;background:none!important;image-rendering:pixelated;pointer-events:none;will-change:transform;isolation:isolate;transition:none!important;animation:none!important}\n.pet-canvas{position:absolute;inset:0;display:block;width:100%;height:100%;max-width:none;image-rendering:pixelated;pointer-events:none;transition:none!important;animation:none!important}\n.pet-toggle{display:none!important}#dashboard>.pet-toggle{display:flex!important}\n.pet-companion--dog{width:82px;height:82px}\n.pet-toggle{position:fixed;right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));z-index:31;display:flex;align-items:center;gap:6px;min-height:38px;padding:6px 11px;border:1px solid #c8cfbf;border-radius:20px;background:#fffefaed;color:#244d3d;font:12px/1.2 \"Trebuchet MS\",Arial,sans-serif;box-shadow:0 2px 9px #203d310d;cursor:pointer}\n.pet-toggle:hover{background:#edf0e9}.pet-toggle svg{width:16px;height:16px;fill:currentColor}.pet-toggle:focus-visible{outline:3px solid #8b6f35;outline-offset:3px}\n@media(max-width:600px){.pet-companion{width:54px;height:54px}.pet-companion--dog{width:70px;height:70px}.pet-toggle{min-height:40px}}\n@media(prefers-reduced-motion:reduce){.pet-companion{will-change:auto}}\n@media print{.pet-companions,.pet-toggle{display:none!important}}\n";
  document.head.append(styles);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)');
  const layer = document.createElement('div');
  layer.className = 'pet-companions';
  layer.setAttribute('aria-hidden', 'true');
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'pet-toggle';
  toggle.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><ellipse cx="4" cy="7" rx="2" ry="2.7"/><ellipse cx="8" cy="4.5" rx="2" ry="2.7"/><ellipse cx="13" cy="4.5" rx="2" ry="2.7"/><ellipse cx="17" cy="7" rx="2" ry="2.7"/><path d="M5 13c1-2 2-4 5-4s4 2 5 4c3 5-1 6-5 4-4 2-8 1-5-4Z"/></svg><span></span>';
  const adminDashboard = document.getElementById('dashboard');
  let enabled = true;
  if (adminDashboard) try { enabled = localStorage.getItem('wedding-admin-pets-visible') !== 'false'; } catch {}
  let width = innerWidth, height = innerHeight, pointer = null, pointerAt = 0;
  let raf = 0, lastTime = 0, geometryAt = 0, obstacles = [], disposed = false;
  const trail = [];
  const creatures = ['black', 'tortie', 'dog'].map((kind, index) => {
    const element = document.createElement('div');
    element.className = 'pet-companion pet-companion--' + kind;
    const canvas = document.createElement('canvas');
    canvas.className = 'pet-canvas';
    canvas.width = canvas.height = 96;
    element.append(canvas);
    const context = canvas.getContext('2d');
    const artwork = new Image();
    element.dataset.pet = kind;
    layer.append(element);
    const pet = {element, canvas, context, artwork, ready:false, index, kind, x:0, y:0, size:0, gait:0, frame:2, walking:false, quiet:0};
    artwork.onload = () => {
      if (artwork.naturalWidth !== 384 || artwork.naturalHeight !== 192) return;
      pet.ready = true;
      renderFrame(pet);
    };
    artwork.src = new URL('pet-' + kind + '-walk8.png', assetBase).href;
    return pet;
  });
  document.body.append(layer);
  if (adminDashboard) adminDashboard.append(toggle);
  const clamp = (value, min, max) => Math.max(min, Math.min(Math.max(min,max), value));
  const editing = () => !!document.activeElement?.matches('input,textarea,select,[contenteditable="true"]');
  const visible = () => enabled && !document.hidden && !editing();
  function setFrame(pet, frame) {
    pet.frame = frame;
    renderFrame(pet);
  }
  function renderFrame(pet) {
    pet.canvas.dataset.frame = String(pet.frame);
    if (!pet.ready || !pet.context) return;
    const ctx = pet.context;
    ctx.clearRect(0,0,96,96);
    ctx.imageSmoothingEnabled = false;
    // One complete, opaque pose per draw: crossfading creates ghosted legs.
    // Exact source rectangles keep every paw inside its own sprite cell.
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(pet.artwork,(pet.frame%4)*96,Math.floor(pet.frame/4)*96,96,96,0,0,96,96);
  }
  function advanceGait(pet) {
    setFrame(pet, Math.floor(pet.gait/.16)%8);
  }
  function paint(pet) {
    pet.element.style.transform = `translate3d(${Math.round(pet.x)}px,${Math.round(pet.y)}px,0)`;
  }
  function park() {
    const groupWidth = creatures.reduce((sum,p)=>sum+p.size,0) + 8;
    let x = Math.max(6, (width-groupWidth)/2);
    for (const pet of creatures) {
      pet.x = clamp(x,4,width-pet.size-4);
      pet.y = Math.max(4,height-pet.size-52);
      pet.element.style.opacity='1';
      setFrame(pet,2); paint(pet); x += pet.size+4;
    }
  }
  function measure() {
    width = document.documentElement.clientWidth;
    height = innerHeight;
    if (pointer && (pointer.x > width || pointer.y > height)) {
      pointer={...pointer,x:clamp(pointer.x,0,width),y:clamp(pointer.y,0,height)};
      trail.length=0;
    }
    for (const pet of creatures) {
      pet.size = pet.element.getBoundingClientRect().width || (pet.kind==='dog'?82:64);
      pet.x = clamp(pet.x,4,width-pet.size-4);
      pet.y = clamp(pet.y,4,height-pet.size-4);
    }
    geometryAt=0;
    if (!pointer || reduced.matches) park();
    start();
  }
  function collectObstacles(now) {
    if (geometryAt && now-geometryAt<200) return;
    geometryAt=now;
    obstacles = [...document.querySelectorAll('input,textarea,select,button,a,.rsvp-card')]
      .filter(el=>el!==toggle && el.getClientRects().length)
      .map(el=>el.getBoundingClientRect())
      .filter(r=>r.bottom>0 && r.top<height && r.right>0 && r.left<width);
    if (adminDashboard && toggle.getClientRects().length) obstacles.push(toggle.getBoundingClientRect());
  }
  function avoid(x,y,size) {
    // Keep the visible part of each padded sprite away from interactive content.
    for (let pass=0;pass<3;pass++) {
      for (const box of obstacles) {
        const inset=size*.12;
        if (x+size-inset<=box.left-5 || x+inset>=box.right+5 || y+size-inset<=box.top-5 || y+inset>=box.bottom+5) continue;
        const options=[{x:box.left-size+inset-7,y},{x:box.right-inset+7,y},{x,y:box.top-size+inset-7},{x,y:box.bottom-inset+7}]
          .filter(p=>p.x>=4 && p.x<=width-size-4 && p.y>=4 && p.y<=height-size-4);
        options.sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));
        if(options.length){x=options[0].x;y=options[0].y;}
      }
    }
    return {x:clamp(x,4,width-size-4),y:clamp(y,4,height-size-4)};
  }
  function delayedPointer(now,index) {
    const before=now-100-index*145;
    let point=pointer;
    for(let i=trail.length-1;i>=0;i--) if(trail[i].time<=before){point=trail[i];break;}
    return point;
  }
  function tick(now) {
    raf=0;
    if (!visible() || disposed || reduced.matches) return;
    const dt=Math.min((now-lastTime)/1000 || 1/60,.045); lastTime=now;
    collectObstacles(now);
    const wandering = !pointer || (pointer.touch && now-pointerAt>10000);
    creatures.forEach((pet,index)=>{
      let tx,ty;
      if (wandering) {
        // Return to bottom-edge wandering after ten seconds without a touch.
        const home=width*(.32+index*.17)-pet.size/2;
        tx=home+Math.sin(now/4800+index*1.8)*Math.min(42,width*.07);
        ty=height-pet.size-54+Math.sin(now/3500+index)*5;
      } else {
        const point=delayedPointer(now,index);
        const offsets=(pointer.touch || width<600 ? [[-45,20],[0,54],[48,18]] : [[-73,22],[5,54],[77,15]])[index];
        const idle=now-pointerAt>1500;
        tx=point.x+offsets[0]-pet.size/2+(idle?Math.sin(now/2200+index*2)*13:0);
        ty=point.y+offsets[1]+(idle?Math.cos(now/2600+index*2)*8:0);
        if(ty+pet.size>height-12) ty=point.y-pet.size-28-(index%2)*25;
      }
      const target=avoid(clamp(tx,4,width-pet.size-4),clamp(ty,4,height-pet.size-4),pet.size);
      const dx=target.x-pet.x,dy=target.y-pet.y,distance=Math.hypot(dx,dy);
      const speed=pointer?.touch && !wandering ? 165-index*12 : (coarse.matches?85:220-index*18);
      const step=Math.min(distance, speed*dt, distance*5*dt);
      if(distance>1.5){pet.x+=dx/distance*step;pet.y+=dy/distance*step;}
      // A steady 1.28-second gait with eight crisp poses.
      // A short settling delay prevents repeated walk/idle flicker at low speeds.
      if(distance>1.5 && step/dt>12){pet.walking=true;pet.quiet=0;}
      else {pet.quiet+=dt;if(pet.quiet>.18)pet.walking=false;}
      if(pet.walking){pet.gait+=dt;advanceGait(pet);}
      else {pet.gait=0;setFrame(pet,2);}
      // Pass through clicks, and fade while crossing a control instead of obscuring it.
      const inset=pet.size*.2;
      const overlaps=obstacles.some(b=>pet.x+pet.size-inset>b.left && pet.x+inset<b.right && pet.y+pet.size-inset>b.top && pet.y+inset<b.bottom);
      pet.element.style.opacity=overlaps?'.12':'1';
      paint(pet);
    });
    raf=requestAnimationFrame(tick);
  }
  function start() {
    if (disposed) return;
    layer.hidden=!visible();
    toggle.querySelector('span').textContent=enabled?'Pets: on':'Pets: off';
    toggle.setAttribute('aria-label',enabled?'Hide pet companions':'Show pet companions');
    toggle.setAttribute('aria-pressed',String(enabled));
    if(raf){cancelAnimationFrame(raf);raf=0;}
    if(!visible())return;
    if(reduced.matches){park();return;}
    lastTime=performance.now();raf=requestAnimationFrame(tick);
  }
  toggle.addEventListener('click',()=>{
    enabled=!enabled;
    try {localStorage.setItem('wedding-admin-pets-visible',String(enabled));}catch{}
    start();
  });
  function trackPointer(event, touch=false) {
    if(reduced.matches || !enabled || event.isPrimary===false || editing())return;
    if(touch && event.target?.closest?.('input,textarea,select,button,a,label,[contenteditable="true"]'))return;
    const now=performance.now();
    if (!pointer || pointer.touch!==touch) trail.length=0;
    pointer={x:event.clientX,y:event.clientY,touch};pointerAt=now;
    if(!trail.length || now-trail[trail.length-1].time>=25)trail.push({...pointer,time:now});
    while(trail.length>40)trail.shift();
  }
  addEventListener('pointerdown',event=>trackPointer(event,event.pointerType==='touch'),{passive:true});
  addEventListener('pointermove',event=>trackPointer(event,event.pointerType==='touch'),{passive:true});
  // Browsers cancel pointer moves when a swipe becomes scrolling. Passive touch
  // events keep following the finger without capturing or blocking that scroll.
  function trackTouch(event) {
    if(event.touches.length!==1)return;
    const point=event.touches[0];
    trackPointer({clientX:point.clientX,clientY:point.clientY,target:event.target},true);
  }
  addEventListener('touchstart',trackTouch,{passive:true});
  addEventListener('touchmove',trackTouch,{passive:true});
  addEventListener('resize',measure,{passive:true});
  addEventListener('scroll',()=>{geometryAt=0;},{passive:true});
  document.addEventListener('visibilitychange',start);
  document.addEventListener('focusin',start);
  document.addEventListener('focusout',()=>queueMicrotask(start));
  reduced.addEventListener('change',()=>{pointer=null;trail.length=0;start();});
  coarse.addEventListener('change',()=>{pointer=null;trail.length=0;start();});
  addEventListener('pagehide',()=>{disposed=true;if(raf)cancelAnimationFrame(raf);});
  addEventListener('pageshow',()=>{disposed=false;start();});
  measure();
})();
