gsap.registerPlugin(ScrollTrigger);

// ════════════════ STATE ════════════════
const G = {
    guest: null,
    busy: false,
    lastScrollTop: 0,
    scrollVelocity: 0,
    targetDate: new Date('July 7, 2026 00:00:00').getTime()
};

// ════════════════ COUNTDOWN ════════════════
function updateCountdown() {
    const now = Date.now();
    const diff = G.targetDate - now;
    if (diff < 0) return;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const fmt = n => String(n).padStart(2, '0');
    
    // Update preloader countdown
    if (document.getElementById('pD')) {
        document.getElementById('pD').textContent = fmt(days);
        document.getElementById('pH').textContent = fmt(hours);
        document.getElementById('pM').textContent = fmt(minutes);
        document.getElementById('pS').textContent = fmt(seconds);
    }
}
setInterval(updateCountdown, 1000);
updateCountdown();

// ════════════════ CANVAS SYSTEMS ════════════════

// 1. Star Field (BG)
const initStarField = () => {
    const cv = document.getElementById('c-bg');
    const cx = cv.getContext('2d');
    let W, H;
    const resize = () => { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({ length: 80 }, () => ({
        x: Math.random(), y: Math.random(),
        r: Math.random() * 0.7 + 0.1,
        a: Math.random() * 0.4 + 0.1,
        da: Math.random() * 0.005 + 0.002,
        dir: 1
    }));

    const animate = () => {
        cx.clearRect(0, 0, W, H);
        const g = cx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
        g.addColorStop(0, 'rgba(40,0,90,0.12)');
        g.addColorStop(1, 'rgba(5,0,16,0)');
        cx.fillStyle = g;
        cx.fillRect(0, 0, W, H);

        stars.forEach(s => {
            s.a += s.da * s.dir;
            if (s.a > 0.7 || s.a < 0.05) s.dir *= -1;
            cx.beginPath();
            cx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
            cx.fillStyle = `rgba(253, 242, 207, ${s.a})`;
            cx.fill();
        });
        requestAnimationFrame(animate);
    };
    animate();
};

// 2. God Rays (Cinematic Atmosphere)
const initGodRays = () => {
    const cv = document.getElementById('c-rays');
    const cx = cv.getContext('2d');
    let W, H, t = 0;
    const resize = () => { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const rays = Array.from({ length: 7 }, (_, i) => ({
        angle: i * 26 + 10,
        w: Math.random() * 60 + 30,
        a: Math.random() * 0.06 + 0.02
    }));

    const animate = () => {
        cx.clearRect(0, 0, W, H);
        t += 0.003;
        rays.forEach((r, i) => {
            const a = (r.angle + Math.sin(t + i) * 0.8) * Math.PI / 180;
            const x2 = W / 2 + Math.cos(a) * H * 1.5;
            const y2 = H / 2 + Math.sin(a) * H * 1.5;
            const grad = cx.createLinearGradient(W / 2, H * 0.2, x2, y2);
            const op = r.a * (0.5 + Math.sin(t * 0.7 + i) * 0.5);
            grad.addColorStop(0, `rgba(212, 175, 55, ${op})`);
            grad.addColorStop(0.4, `rgba(212, 175, 55, ${op * 0.3})`);
            grad.addColorStop(1, 'rgba(212, 175, 55, 0)');
            cx.save();
            cx.translate(W / 2, H * 0.2);
            cx.rotate(a);
            const w = r.w * (1 + Math.sin(t * 0.5 + i) * 0.15);
            cx.fillStyle = grad;
            cx.beginPath();
            cx.moveTo(0, 0);
            cx.lineTo(-w, H * 2);
            cx.lineTo(w, H * 2);
            cx.closePath();
            cx.fill();
            cx.restore();
        });
        requestAnimationFrame(animate);
    };
    animate();
};

// 3. Animus Gold Dust (Interactive)
const initGoldDust = () => {
    const cv = document.getElementById('c-dust');
    const cx = cv.getContext('2d');
    let W, H;
    const resize = () => { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const pts = Array.from({ length: 60 }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.0 + 0.2,
        sx: Math.random() * 0.15 - 0.075,
        sy: -(Math.random() * 0.2 + 0.05),
        a: Math.random() * 0.3 + 0.2,
        da: Math.random() * 0.01 + 0.002,
        dir: 1,
        color: `rgba(${212 + Math.random() * 40 | 0}, ${175 + Math.random() * 30 | 0}, ${100 + Math.random() * 40 | 0}, `
    }));

    const animate = () => {
        cx.clearRect(0, 0, W, H);
        pts.forEach(p => {
            p.x = (p.x + p.sx + W) % W;
            p.y = (p.y + p.sy - G.scrollVelocity * 0.4 + H) % H;
            p.a += p.da * p.dir;
            if (p.a > 0.85 || p.a < 0.1) p.dir *= -1;
            
            cx.beginPath();
            cx.arc(p.x, p.y, p.r * (1 + G.scrollVelocity * 0.05), 0, Math.PI * 2);
            cx.fillStyle = p.color + p.a + ')';
            cx.shadowBlur = 6 + G.scrollVelocity;
            cx.shadowColor = p.color + '0.3)';
            cx.fill();
        });
        requestAnimationFrame(animate);
    };
    animate();
};

// 4. Majestic Wipe Dust (Cinematic Cloud)
let burstDust; 
const initWipeDust = () => {
    const cv = document.getElementById('wipe-dust');
    const cx = cv.getContext('2d');
    let W, H;
    const resize = () => { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    let pts = [];
    burstDust = (dir) => {
        pts = Array.from({ length: 300 }, () => ({
            x: W / 2 + (Math.random() - 0.5) * W * 1.5,
            y: H / 2 + (Math.random() - 0.5) * H * 1.5,
            r: Math.random() * 1.2 + 0.3, // Smaller particles
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4 + (dir * 2),
            jitter: Math.random() * 0.1,
            a: 1,
            life: 1,
            decay: Math.random() * 0.008 + 0.004,
            color: `rgba(${212 + Math.random() * 43 | 0}, ${175 + Math.random() * 30 | 0}, ${55 + Math.random() * 40 | 0}, `
        }));
    };

    const animate = () => {
        cx.clearRect(0, 0, W, H);
        pts.forEach((p, i) => {
            // Random jitter for "cloud" feel
            p.vx += (Math.random() - 0.5) * 0.5;
            p.vy += (Math.random() - 0.5) * 0.5;
            
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;

            if (p.life <= 0) {
                pts.splice(i, 1);
                return;
            }
            cx.beginPath();
            cx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            cx.fillStyle = p.color + p.life + ')';
            cx.fill();
        });
        requestAnimationFrame(animate);
    };
    animate();
};

// ════════════════ B-ROLL ENGINE (BULLETPROOF PARALLAX) ════════════════
const initBRollEngine = () => {
    const sc = document.getElementById('scroll');
    const wipe = document.getElementById('wipe');
    const wipeBar = document.getElementById('wipe-bar');
    let curS = 0;
    let isT = false;
    let failSafe;

    if (!sc || !wipe) return;

    // Initial State: Ensure Hero is visible immediately
    const sections = document.querySelectorAll('.S');
    if (sections[0]) {
        sections[0].classList.add('active-scene');
        const content = sections[0].querySelector('.inner, .card');
        if (content) gsap.set(content, { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' });
    }

    sc.addEventListener('scroll', () => {
        const h = window.innerHeight;
        const nextS = Math.round(sc.scrollTop / h);

        if (nextS !== curS && !isT) {
            isT = true;
            const dir = nextS > curS ? 1 : -1;
            
            // Clear any existing fail-safe
            clearTimeout(failSafe);
            
            const tl = gsap.timeline({
                onComplete: () => {
                    curS = nextS;
                    isT = false;
                    gsap.set(wipe, { opacity: 0, display: 'none' });
                    sections.forEach((s, i) => {
                        if (i !== nextS) s.classList.remove('active-scene');
                    });
                }
            });

            // 1. PHASE 1: IMMEDIATE GOLDEN OVERSHADOW (Starts at 0)
            tl.set(wipe, { display: 'flex', opacity: 0 })
              .to(wipe, { opacity: 1, duration: 0.8, ease: 'power2.in' }) // Covers quickly
              .fromTo(wipeBar, { y: dir * 150, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, 0)
              .call(() => { if (burstDust) burstDust(dir); }, null, 0.05) // Dust starts almost instantly
            
            // 2. PHASE 2: CINEMATIC SWAP (Only after overshadowed)
            .call(() => {
                sections.forEach((s, i) => {
                    const content = s.querySelector('.inner, .card');
                    if (!content) return;

                    if (i === nextS) {
                        s.classList.add('active-scene');
                        s.style.zIndex = "50";
                        gsap.fromTo(content, 
                            { y: dir * 120, opacity: 0, scale: 0.92, filter: 'blur(20px)' },
                            { y: 0, opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.6, ease: 'expo.out', overwrite: true }
                        );
                    } else if (i === curS) {
                        s.style.zIndex = "20";
                        gsap.to(content, { 
                            y: -dir * 100, 
                            opacity: 0, 
                            scale: 1.1, 
                            filter: 'blur(30px)',
                            duration: 1.0, 
                            ease: 'power2.inOut',
                            overwrite: true,
                            onComplete: () => { s.classList.remove('active-scene'); }
                        });
                    } else {
                        s.classList.remove('active-scene');
                        gsap.set(content, { opacity: 0, y: dir * 100, filter: 'blur(20px)' });
                    }
                });
            }, null, 0.8) // EXACTLY when wipe is at max opacity
            
            // 3. PHASE 3: GRACEFUL REVEAL
            .to(wipe, { opacity: 0, duration: 1.2, ease: 'power2.out', delay: 0.2 })
            .to(wipeBar, { y: -dir * 150, opacity: 0, duration: 1.2, ease: 'power3.in' }, 1.0);

            // EMERGENCY FAIL-SAFE
            failSafe = setTimeout(() => {
                if (isT) {
                    isT = false;
                    curS = nextS;
                    gsap.set(wipe, { opacity: 0, display: 'none' });
                    sections.forEach((s, i) => {
                        const content = s.querySelector('.inner, .card');
                        if (i === nextS) {
                            s.classList.add('active-scene');
                            if (content) gsap.set(content, { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' });
                        } else {
                            s.classList.remove('active-scene');
                        }
                    });
                }
            }, 3000);
        }
    });
};

// ════════════════ PRELOADER SEQUENCE ════════════════
const runPreloader = () => {
    const wrap = document.getElementById('pre-chars');
    'AKSHIM'.split('').forEach(c => {
        const s = document.createElement('span');
        s.className = 'pc';
        s.textContent = c;
        wrap.appendChild(s);
    });

    const tl = gsap.timeline();

    tl.to('#pre-logo', {
        opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.7)'
    }, 0.3)
    .to('.pc', {
        opacity: 1, y: 0, scale: 1,
        duration: 0.5, stagger: 0.1, ease: 'back.out(2)'
    }, 0.7)
    .to('#pre-line', { width: '240px', duration: 1.2, ease: 'power3.out' }, 1.2)
    .to('#pre-tagline', { opacity: 0.75, y: 0, duration: 1, ease: 'power2.out' }, 1.5)
    .to('#pre-cd', { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 1.8)
    .addLabel('exit', 4.0)
    .set('#pre-curtain', { scaleY: 0, transformOrigin: 'top center' }, 'exit')
    .to('#pre-curtain', { scaleY: 1, duration: 0.7, ease: 'power4.in' }, 'exit')
    .to('.pc', { y: -40, opacity: 0, stagger: 0.04, duration: 0.5, ease: 'power2.in' }, 'exit+=0.1')
    .to('#pre-tagline,#pre-cd,#pre-line', { opacity: 0, duration: 0.3 }, 'exit+=0.1')
    .to('#pre', { yPercent: -100, duration: 1.1, ease: 'power4.inOut', onComplete: () => {
        const pre = document.getElementById('pre');
        if (pre) pre.remove();
        // START HEAVY ASSETS ONLY AFTER PRELOADER IS GONE
        initGodRays();
        initGoldDust();
    }}, 'exit+=0.8')
    .to('#nav', { opacity: 1, duration: 1, ease: 'power2.out' }, 'exit+=1.1')
    .fromTo('.fc', { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 1.2, stagger: 0.1, ease: 'back.out(2)' }, 'exit+=1.0')
    .fromTo('#heroContent', { opacity: 0, y: 30, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 1.5, ease: 'power3.out' }, 'exit+=0.9')
    .to('#hint', { opacity: 1, duration: 1 }, 'exit+=2.2');
};

// ════════════════ UTILITIES ════════════════
function goTo(i) {
    const sections = document.querySelectorAll('.S');
    if (sections[i]) sections[i].scrollIntoView({ behavior: 'smooth' });
}

function openLogin() { 
    document.getElementById('loginModal').classList.remove('hidden');
    document.getElementById('loginModal').classList.add('flex');
}

function doLogin() {
    const name = document.getElementById('lN').value.trim();
    if (name) {
        document.getElementById('loginModal').classList.add('hidden');
        document.getElementById('rsvpLock').remove();
        document.getElementById('hw').textContent = `Welcome, ${name}! The Marwah family is honored by your presence.`;
        document.getElementById('hw').classList.remove('hidden');
    } else {
        document.getElementById('lErr').textContent = 'Please enter your name.';
    }
}

function doRSVP() {
    const name = document.getElementById('rN').value;
    if (name) {
        document.getElementById('rsvpBox').innerHTML = `
            <div class="text-center py-10">
                <div class="text-5xl mb-4">🌸</div>
                <h2 class="s-h royal-head text-3xl gold-metallic mb-4">Your presence is awaited!</h2>
                <p class="font-cormorant italic text-lg text-[#fdf2cf]/80">We have received your RSVP, ${name}. We cannot wait to celebrate with you.</p>
            </div>
        `;
    }
}

function cpAddr() {
    navigator.clipboard.writeText("Taj Palace, 2, Sardar Patel Marg, Diplomatic Enclave, Chanakyapuri, New Delhi – 110 021");
    alert("Address copied to clipboard!");
}

function toggleMenu() {
    const menu = document.getElementById('m-menu');
    menu.classList.toggle('translate-x-full');
}

// ════════════════ INIT ════════════════
document.addEventListener('DOMContentLoaded', () => {
    initStarField(); // Only lightweight stars at start
    initBRollEngine();
    initWipeDust();
    runPreloader();
});
