/* Original pet artwork based on Ryleigh and Cameron's photos. Decorative only. */
(() => {
  'use strict';
  if (document.querySelector('.pet-companions')) return;
  const script = document.currentScript;
  const assetBase = new URL('.', script.src);
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
    const frameA=document.createElement('div'),frameB=document.createElement('div');
    for(const frame of [frameA,frameB]) {
      frame.className='pet-frame';
      frame.style.backgroundImage = `url("${new URL('pet-' + kind + '-walk8.png', assetBase)}")`;
      element.append(frame);
    }
    element.dataset.pet = kind;
    layer.append(element);
    return {element, frameA, frameB, index, kind, x:0, y:0, size:0, gait:0, frame:-1, walking:false, quiet:0};
  });
  document.body.append(layer);
  if (adminDashboard) adminDashboard.append(toggle);
  const clamp = (value, min, max) => Math.max(min, Math.min(Math.max(min,max), value));
  const editing = () => !!document.activeElement?.matches('input,textarea,select,[contenteditable="true"]');
  const visible = () => enabled && !document.hidden && !editing();
  function setFrame(pet, frame) {
    pet.frame = frame;
    pet.element.style.backgroundPosition = `${(frame % 4) * 100 / 3}% ${frame >= 4 ? 100 : 0}%`;
    pet.frameA.style.backgroundPosition=pet.element.style.backgroundPosition;
    pet.frameA.style.opacity='1';pet.frameB.style.opacity='0';
  }
  function blendGait(pet) {
    const phase=pet.gait/.16,frame=Math.floor(phase)%8,next=(frame+1)%8;
    const mix=.5-.5*Math.cos(Math.PI*(phase-Math.floor(phase)));
    pet.frame=frame;
    pet.element.style.backgroundPosition=`${(frame%4)*100/3}% ${frame>=4?100:0}%`;
    pet.frameA.style.backgroundPosition=pet.element.style.backgroundPosition;
    pet.frameB.style.backgroundPosition=`${(next%4)*100/3}% ${next>=4?100:0}%`;
    pet.frameA.style.opacity=String(1-mix);pet.frameB.style.opacity=String(mix);
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
    if (width < 600 || (pointer && (pointer.x > width || pointer.y > height))) { pointer=null;trail.length=0; }
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
    const mobile = width < 600 || coarse.matches || !pointer;
    creatures.forEach((pet,index)=>{
      let tx,ty;
      if (mobile) {
        // Gentle bottom-edge wandering for touch screens and before the first mouse move.
        const home=width*(.32+index*.17)-pet.size/2;
        tx=home+Math.sin(now/4800+index*1.8)*Math.min(42,width*.07);
        ty=height-pet.size-54+Math.sin(now/3500+index)*5;
      } else {
        const point=delayedPointer(now,index);
        const offsets=[[-73,22],[5,54],[77,15]][index];
        const idle=now-pointerAt>1500;
        tx=point.x+offsets[0]-pet.size/2+(idle?Math.sin(now/2200+index*2)*13:0);
        ty=point.y+offsets[1]+(idle?Math.cos(now/2600+index*2)*8:0);
        if(ty+pet.size>height-12) ty=point.y-pet.size-28-(index%2)*25;
      }
      const target=avoid(clamp(tx,4,width-pet.size-4),clamp(ty,4,height-pet.size-4),pet.size);
      const dx=target.x-pet.x,dy=target.y-pet.y,distance=Math.hypot(dx,dy);
      const step=Math.min(distance, (coarse.matches?85:220-index*18)*dt, distance*5*dt);
      if(distance>1.5){pet.x+=dx/distance*step;pet.y+=dy/distance*step;}
      // A steady 1.28-second gait with eight poses, blended at display refresh rate.
      // A short settling delay prevents repeated walk/idle flicker at low speeds.
      if(distance>1.5 && step/dt>12){pet.walking=true;pet.quiet=0;}
      else {pet.quiet+=dt;if(pet.quiet>.18)pet.walking=false;}
      if(pet.walking){pet.gait+=dt;blendGait(pet);}
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
  addEventListener('pointermove',event=>{
    if(event.pointerType==='touch' || reduced.matches || !enabled)return;
    const now=performance.now();
    pointer={x:event.clientX,y:event.clientY};pointerAt=now;
    if(!trail.length || now-trail[trail.length-1].time>=25)trail.push({...pointer,time:now});
    while(trail.length>40)trail.shift();
  },{passive:true});
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
