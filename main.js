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
    if (!cv) return;
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

// 2. God Rays
const initGodRays = () => {
    const cv = document.getElementById('c-rays');
    if (!cv) return;
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

// 3. Gold Dust
const initGoldDust = () => {
    const cv = document.getElementById('c-dust');
    if (!cv) return;
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

// ════════════════ INTERGALACTIC WARP ENGINE ════════════════
let startWarp;
const initWarpEngine = () => {
    const cv = document.getElementById('warp-canvas');
    if (!cv) return;
    const cx = cv.getContext('2d');
    let W, H;
    const resize = () => { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    let stars = [];
    let isWarping = false;
    let speed = 0;

    startWarp = (dir) => {
        isWarping = true;
        gsap.to(cv, { opacity: 1, duration: 0.3 });
        
        stars = Array.from({ length: 150 }, () => ({
            x: Math.random() * W,
            y: Math.random() * H,
            z: Math.random() * W
        }));

        const tl = gsap.timeline({
            onComplete: () => {
                isWarping = false;
                gsap.to(cv, { opacity: 0, duration: 0.5 });
            }
        });

        tl.to({ v: 0 }, { v: 40, duration: 0.6, ease: 'power2.in', onUpdate: function() { speed = this.targets()[0].v; } })
          .to({ v: 40 }, { v: 0, duration: 0.8, ease: 'power2.out', onUpdate: function() { speed = this.targets()[0].v; } });
    };

    const animate = () => {
        if (!isWarping) {
            cx.clearRect(0, 0, W, H);
            requestAnimationFrame(animate);
            return;
        }

        cx.fillStyle = 'rgba(5, 0, 16, 0.2)';
        cx.fillRect(0, 0, W, H);

        stars.forEach(s => {
            s.z -= speed;
            if (s.z <= 0) s.z = W;
            const x = (s.x - W / 2) * (W / s.z) + W / 2;
            const y = (s.y - H / 2) * (W / s.z) + H / 2;
            const r = (W / s.z) * 1.5;
            const px = (s.x - W / 2) * (W / (s.z + speed * 2)) + W / 2;
            const py = (s.y - H / 2) * (W / (s.z + speed * 2)) + H / 2;

            cx.beginPath();
            cx.moveTo(x, y);
            cx.lineTo(px, py);
            cx.lineWidth = r;
            cx.strokeStyle = `rgba(212, 175, 55, ${Math.min(1, 2 - s.z/500)})`;
            cx.stroke();
        });

        requestAnimationFrame(animate);
    };
    animate();
};

// ════════════════ CINEMATIC SCROLL INTERCEPTOR ════════════════
const initBRollEngine = () => {
    const sections = document.querySelectorAll('.S');
    let curS = 0;
    let isT = false;

    if (!sections.length) return;

    const show = (i) => {
        sections.forEach((s, idx) => {
            const content = s.querySelector('.inner, .card');
            if (idx === i) {
                s.classList.add('active-scene');
                if (content) gsap.set(content, { opacity: 1, scale: 1, filter: 'blur(0px)', y: 0 });
            } else {
                s.classList.remove('active-scene');
                if (content) gsap.set(content, { opacity: 0 });
            }
        });
    };
    show(0);

    const navigate = (targetIndex) => {
        if (isT || targetIndex < 0 || targetIndex >= sections.length || targetIndex === curS) return;

        isT = true;
        const dir = targetIndex > curS ? 1 : -1;
        const prevContent = sections[curS]?.querySelector('.inner, .card');
        const nextContent = sections[targetIndex]?.querySelector('.inner, .card');

        if (startWarp) startWarp(dir);

        const tl = gsap.timeline({
            onComplete: () => {
                curS = targetIndex;
                isT = false;
                show(targetIndex);
            }
        });

        if (dir === 1) {
            if (prevContent) tl.to(prevContent, { scale: 6, opacity: 0, filter: 'blur(60px)', duration: 1.2, ease: 'power2.in' }, 0);
            if (nextContent) {
                sections[targetIndex].classList.add('active-scene');
                tl.fromTo(nextContent, { scale: 0, opacity: 0, filter: 'blur(40px)' }, { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 1.5, ease: 'expo.out' }, 0.2);
            }
        } else {
            if (prevContent) tl.to(prevContent, { scale: 0, opacity: 0, filter: 'blur(40px)', duration: 1.0, ease: 'power2.in' }, 0);
            if (nextContent) {
                sections[targetIndex].classList.add('active-scene');
                tl.fromTo(nextContent, { scale: 6, opacity: 0, filter: 'blur(60px)' }, { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 1.5, ease: 'expo.out' }, 0.2);
            }
        }

        gsap.to('.bg-mandala', { 
            scale: dir === 1 ? 5 : 0.2, opacity: 0, duration: 1, ease: 'power4.in',
            onComplete: () => {
                gsap.set('.bg-mandala', { scale: dir === 1 ? 0.2 : 5 });
                gsap.to('.bg-mandala', { scale: 1.5, opacity: 0.1, duration: 1.5, ease: 'power2.out' });
            }
        });
    };

    window.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaY) < 15) return;
        navigate(curS + (e.deltaY > 0 ? 1 : -1));
    }, { passive: true });

    let ts = 0;
    window.addEventListener('touchstart', (e) => ts = e.touches[0].clientY, { passive: true });
    window.addEventListener('touchend', (e) => {
        const te = e.changedTouches[0].clientY;
        const diff = ts - te;
        if (Math.abs(diff) > 40) navigate(curS + (diff > 0 ? 1 : -1));
    }, { passive: true });

    // Expose to global for menu links
    window.goTo = (i) => navigate(i);
};

// ════════════════ PRELOADER SEQUENCE ════════════════
const runPreloader = () => {
    const wrap = document.getElementById('pre-chars');
    if (!wrap) return;
    'AKSHIM'.split('').forEach(c => {
        const s = document.createElement('span');
        s.className = 'pc';
        s.textContent = c;
        wrap.appendChild(s);
    });

    const tl = gsap.timeline();

    tl.to('#pre-logo', { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.7)' }, 0.3)
    .to('.pc', { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(2)' }, 0.7)
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
        initGodRays();
        initGoldDust();
    }}, 'exit+=0.8')
    .to('#nav', { opacity: 1, duration: 1, ease: 'power2.out' }, 'exit+=1.1')
    .fromTo('#heroContent', { opacity: 0, y: 30, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 1.5, ease: 'power3.out' }, 'exit+=0.9');
};

// ════════════════ UTILITIES ════════════════
function openLogin() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        document.body.classList.add('overflow-hidden');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeLogin() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        document.body.classList.remove('overflow-hidden');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function requestOTP() {
    const name = document.getElementById('lN').value.trim();
    const phone = document.getElementById('lP').value.trim();
    const btn = document.getElementById('otp-request-btn');
    const err = document.getElementById('login-error');

    if (!name || !phone) {
        err.textContent = "Please enter your name and phone";
        err.classList.remove('hidden');
        return;
    }

    G.busy = true;
    btn.textContent = "SENDING CODE...";
    btn.disabled = true;
    err.classList.add('hidden');

    try {
        const res = await fetch('/api/guest/request-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone })
        });
        const data = await res.json();

        if (data.success) {
            // Show Step 2
            document.getElementById('login-step-1').classList.add('hidden');
            document.getElementById('login-step-2').classList.remove('hidden');
            document.getElementById('otp-request-btn').classList.add('hidden');
            document.getElementById('login-submit-btn').classList.remove('hidden');
            
            if (data.debug) {
                console.log("DEBUG: Check server logs for OTP (WhatsApp not connected)");
            }
        } else {
            err.textContent = data.error || "Failed to send code";
            err.classList.remove('hidden');
        }
    } catch (e) {
        err.textContent = "Connection Error";
        err.classList.remove('hidden');
    } finally {
        G.busy = false;
        btn.textContent = "REQUEST ACCESS CODE";
        btn.disabled = false;
    }
}

async function doLogin() {
    const phone = document.getElementById('lP').value.trim();
    const otp = document.getElementById('lOTP').value.trim();
    const btn = document.getElementById('login-submit-btn');
    const err = document.getElementById('login-error');

    if (!otp) return;
    
    G.busy = true;
    btn.textContent = "VERIFYING...";
    btn.disabled = true;
    err.classList.add('hidden');

    try {
        const res = await fetch('/api/guest/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, otp })
        });
        const data = await res.json();

        if (data.success) {
            G.guest = data.guest;
            updateGuestUI();
            closeLogin();
            // Reset for next time
            resetLoginUI();
        } else {
            err.textContent = data.error || "Invalid Code";
            err.classList.remove('hidden');
        }
    } catch (e) {
        err.textContent = "Connection Error";
        err.classList.remove('hidden');
    } finally {
        G.busy = false;
        btn.textContent = "VERIFY & ENTER";
        btn.disabled = false;
    }
}

function resetLoginUI() {
    document.getElementById('login-step-1').classList.remove('hidden');
    document.getElementById('login-step-2').classList.add('hidden');
    document.getElementById('otp-request-btn').classList.remove('hidden');
    document.getElementById('login-submit-btn').classList.add('hidden');
    document.getElementById('lOTP').value = '';
    document.getElementById('lN').value = '';
    document.getElementById('lP').value = '';
}

async function checkGuestStatus() {
    try {
        const res = await fetch('/api/guest/status');
        const data = await res.json();
        if (data.loggedIn) {
            G.guest = data.guest;
            updateGuestUI();
        }
    } catch (e) {}
}

function updateGuestUI() {
    if (!G.guest) return;

    // Lift Lockdown
    document.body.classList.remove('overflow-hidden');
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    // Update Nav
    const navBtn = document.getElementById('guest-login-btn');
    if (navBtn) {
        navBtn.textContent = G.guest.name.toUpperCase();
        navBtn.classList.add('border-gold');
    }

    // Update Hero Greeting
    const welcome = document.getElementById('guest-welcome');
    const greeting = document.getElementById('guest-greeting');
    if (welcome && greeting) {
        greeting.textContent = `Welcome, ${G.guest.name}`;
        welcome.classList.remove('hidden');
    }

    // Pre-fill RSVP
    const rsvpName = document.getElementById('rN');
    if (rsvpName && !rsvpName.value) {
        rsvpName.value = G.guest.name;
    }
}

function sendR() {
    const name = document.getElementById('rN').value;
    const souls = document.getElementById('rG')?.value || 1;
    const message = document.getElementById('rM')?.value || '';
    const box = document.getElementById('rsvpBox');

    if (!name) {
        alert("Please enter your name.");
        return;
    }

    if (box) {
        // Immediate Success UI
        box.innerHTML = `
            <div class="text-center py-20 flex flex-col items-center gap-6 animate-fadeIn">
                <span class="font-pinyon gold-metallic text-6xl">Thank You</span>
                <h2 class="font-decorative text-2xl gold-metallic uppercase tracking-[0.3em]">Sacred Vow Received</h2>
                <p class="font-cormorant italic text-xl text-[#fdf2cf]/80 max-w-sm">
                    "We have received your acceptance, ${name}. Your presence will add a brilliant light to our eternal story."
                </p>
                <div class="h-[1px] w-24 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mt-4"></div>
            </div>
        `;

        // Background sync to server
        fetch('/api/rsvp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, souls, message })
        }).catch(err => console.error("RSVP Sync Error:", err));
    }
}

function cpAddr() {
    navigator.clipboard.writeText("Taj Palace, 2, Sardar Patel Marg, Diplomatic Enclave, Chanakyapuri, New Delhi – 110 021");
    alert("Address copied to clipboard!");
}

function toggleMenu() {
    const menu = document.getElementById('m-menu');
    if (menu) menu.classList.toggle('translate-x-full');
}

// ════════════════ INIT ════════════════
document.addEventListener('DOMContentLoaded', () => {
    initStarField(); 
    initBRollEngine();
    initWarpEngine();
    runPreloader();
    checkGuestStatus();
});
