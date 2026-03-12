/* name=background-suggestion.js
   Canvas animation — speed lines + subtle particles + mouse parallax.
   Coloque <canvas id="bg-canvas"></canvas> no <body> e inclua este script
   antes do </body> (eu digo onde inserir abaixo).
*/

(function () {
  // Graceful degrade
  if (!window.requestAnimationFrame) {
    console.log('[background] requestAnimationFrame não disponível — fallback sem animação.');
    document.getElementById('bg-futuristic')?.classList.remove('animate');
    return;
  }

  const canvas = document.getElementById('bg-canvas');
  const bg = document.getElementById('bg-futuristic');

  // If canvas missing, create one dynamically (safe)
  let createdCanvas = false;
  if (!canvas) {
    createdCanvas = true;
  }

  const cvs = canvas || (function () {
    const c = document.createElement('canvas');
    c.id = 'bg-canvas';
    document.body.insertBefore(c, document.body.firstChild);
    return c;
  })();

  const ctx = cvs.getContext('2d', { alpha: true });

  let W = 1, H = 1, DPR = Math.max(1, window.devicePixelRatio || 1);

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    cvs.width = Math.floor(W * DPR);
    cvs.height = Math.floor(H * DPR);
    cvs.style.width = W + 'px';
    cvs.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  // Particles / streaks
  const NUM_STREAKS = Math.min(140, Math.floor((W * H) / 9000)); // adaptive
  const streaks = [];
  const sparks = [];

  // helper random
  const rand = (a,b) => a + Math.random() * (b - a);

  function resetStreak(s) {
    // start near center with random direction
    const angle = rand(-Math.PI/2 - 0.6, -Math.PI/2 + 0.6); // moving outward upward-ish
    const speed = rand(0.6, 3.2);
    s.x = W * 0.5 + rand(-60, 60);
    s.y = H * 0.65 + rand(-40, 40);
    s.vx = Math.cos(angle) * speed * (0.6 + Math.random()*1.4);
    s.vy = Math.sin(angle) * speed * (0.6 + Math.random()*1.4);
    s.len = rand(18, 120);
    s.width = rand(0.6, 2.6);
    s.alpha = rand(0.06, 0.35);
    s.hue = rand(200, 215);
    s.life = rand(80, 200);
    s.age = 0;
    s.prev = null;
  }

  function resetSpark(p) {
    p.x = rand(0, W);
    p.y = rand(0, H);
    p.r = rand(0.3, 1.6);
    p.alpha = rand(0.06, 0.28);
    p.vx = rand(-0.12, 0.12);
    p.vy = rand(-0.06, 0.06);
  }

  function init() {
    streaks.length = 0;
    for (let i=0;i<NUM_STREAKS;i++){
      const s = {};
      resetStreak(s);
      // randomize initial age so they appear staggered
      s.age = Math.floor(Math.random() * s.life);
      streaks.push(s);
    }

    sparks.length = 0;
    const SP = Math.max(70, Math.floor(W * H / 45000));
    for (let i=0;i<SP;i++){
      const p = {};
      resetSpark(p);
      sparks.push(p);
    }

    // start bg animation class if available
    if (bg) bg.classList.add('animate');
  }

  // Parallax offset from mouse (subtle)
  const parallax = { tx:0, ty:0, vx:0, vy:0 };
  let mouseX = W/2, mouseY = H/2;
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    // compute target translate small
    parallax.tx = (W/2 - mouseX) * 0.02;
    parallax.ty = (H/2 - mouseY) * 0.02;
  }, { passive: true });

  // Respect reduced motion
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(40, now - last) / 16.666; // normalized delta
    last = now;

    ctx.clearRect(0,0,W,H);

    // slight parallax transform on canvas
    if (!reduceMotion) {
      // slow easing
      parallax.vx += (parallax.tx - parallax.vx) * 0.08;
      parallax.vy += (parallax.ty - parallax.vy) * 0.08;
      ctx.save();
      ctx.translate(parallax.vx * 0.4, parallax.vy * 0.4);
    } else {
      ctx.save();
    }

    // draw streaks (motion blur lines)
    for (let i=0;i<streaks.length;i++){
      const s = streaks[i];
      s.age += dt;
      s.x += s.vx * dt * 1.25;
      s.y += s.vy * dt * 1.25;

      // create tail endpoint
      const tx = s.x - s.vx * s.len / 6;
      const ty = s.y - s.vy * s.len / 6;

      // fade with age
      const lifeRatio = 1 - (s.age / s.life);
      const a = Math.max(0, s.alpha * lifeRatio);

      // draw gradient line
      const grad = ctx.createLinearGradient(s.x, s.y, tx, ty);
      grad.addColorStop(0, `rgba(180,220,255,${a})`);
      grad.addColorStop(0.5, `rgba(125,200,255,${a*0.5})`);
      grad.addColorStop(1, `rgba(30,60,120,${a*0.0})`);

      ctx.lineWidth = s.width;
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      // small bright head
      ctx.beginPath();
      ctx.fillStyle = `rgba(200,240,255,${Math.min(0.9, a*2)})`;
      ctx.arc(s.x - s.vx*0.06, s.y - s.vy*0.06, Math.max(0.6, s.width*0.8), 0, Math.PI*2);
      ctx.fill();

      if (s.age > s.life ||
         s.x < -120 || s.x > W + 120 || s.y < -120 || s.y > H + 120) {
        resetStreak(s);
      }
    }

    // tiny floating sparks (depth dust)
    for (let i=0;i<sparks.length;i++){
      const p = sparks[i];
      p.x += p.vx * dt * 0.6;
      p.y += p.vy * dt * 0.6;
      p.alpha = Math.max(0.02, (p.alpha + Math.sin(now/3000 + i)/400) );

      ctx.fillStyle = `rgba(200,230,255,${p.alpha})`;
      ctx.fillRect(p.x, p.y, p.r, p.r);

      if (p.x < -10 || p.x > W+10 || p.y < -10 || p.y > H+10) {
        resetSpark(p);
      }
    }

    // subtle center flare to match the image center (glow)
    const cx = W * 0.5;
    const cy = H * 0.62;
    const flareRadius = Math.min(W,H) * 0.14;
    const radial = ctx.createRadialGradient(cx, cy, 0, cx, cy, flareRadius);
    radial.addColorStop(0, 'rgba(160,220,255,0.06)');
    radial.addColorStop(0.6, 'rgba(30,60,110,0.0)');
    ctx.fillStyle = radial;
    ctx.fillRect(cx - flareRadius, cy - flareRadius, flareRadius*2, flareRadius*2);

    ctx.restore();

    // schedule next
    requestAnimationFrame(frame);
  }

  // initialize
  init();
  requestAnimationFrame(frame);

  // optional: small performance booster on page invisible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // reduce loops by stopping animations — but keep canvas visible
      // (we won't cancel rAF here — in complex setups you can cancel)
    }
  });

  // expose small control if needed
  window._bgEffect = {
    refresh: init,
    disable: function(){
      if (bg) bg.classList.remove('animate');
      createdCanvas && cvs.remove();
    }
  };

})();