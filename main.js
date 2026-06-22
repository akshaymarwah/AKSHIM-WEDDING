gsap.registerPlugin(ScrollTrigger);

// ════════════════ STATE ════════════════
const G = {
    guest: null,
    busy: false,
    lastScrollTop: 0,
    scrollVelocity: 0,
    targetDate: new Date('July 7, 2026 00:00:00').getTime(),
    lang: localStorage.getItem('akshim_lang') || null
};

// ════════════════ TRANSLATIONS ════════════════
const I18N = {
    en: {
        nav_home: "HOME",
        nav_story: "STORY",
        nav_events: "EVENTS",
        nav_venue: "VENUE",
        nav_rsvp: "RSVP",
        nav_login: "GUEST LOGIN",
        btn_enter: "Enter Royal Portal",
        welcome_msg: "Welcome to the Royal Union",
        countdown_days: "DAYS",
        countdown_hrs: "HRS",
        countdown_min: "MIN",
        countdown_sec: "SEC",
        story_title: "Our Eternal Story",
        chapter_1: "Chapter I",
        chapter_1_title: "The Solitary Stars",
        chapter_1_text: `"Born near the sacred confluences of Prayagraj, a mind of relentless innovation was shaped—a creator of solutions and an architect of possibilities. Miles away, under the regal skies of Gwalior, a brilliant spirit decoded the secrets of elements and the music of language, guiding young minds with grace and wisdom. Two solitary stars, revolving in their own orbits, destined to align."`,
        chapter_2: "Chapter II",
        chapter_2_title: "The Celestial Convergence",
        chapter_2_text: `"When the precision of science met the vision of innovation, a beautiful alchemy unfolded. Her deep understanding of elements and his passion for creating seamless systems sparked an unexpected connection. It was a perfect integration of heart and mind—where logic transformed into poetry, and two distinct paths merged into a single journey of endless possibilities."`,
        chapter_3: "Chapter III",
        chapter_3_title: "The Mirror Soul",
        chapter_3_text: `"In each other's eyes, they found their most beautiful design. He found the focal element that gave meaning to all his ideas, while she discovered a story deeper than any textbook. Now, walking hand in hand, they are building a modern-day kingdom—a shared space of love, laughter, and lifelong discovery."`,
        presence_msg: `"Your presence is a gift that we treasure. We look forward to creating beautiful, everlasting memories together in the heart of Prayagraj."`
    },
    hi: {
        nav_home: "मुखपृष्ठ",
        nav_story: "कहानी",
        nav_events: "कार्यक्रम",
        nav_venue: "स्थान",
        nav_rsvp: "आरएसवीपी",
        nav_login: "अतिथि लॉगिन",
        btn_enter: "शाही पोर्टल में प्रवेश करें",
        welcome_msg: "शाही मिलन में आपका स्वागत है",
        countdown_days: "दिन",
        countdown_hrs: "घंटे",
        countdown_min: "मिनट",
        countdown_sec: "सेकंड",
        story_title: "हमारी शाश्वत कहानी",
        chapter_1: "अध्याय १",
        chapter_1_title: "अकेले सितारे",
        chapter_1_text: `"प्रयागराज के पावन संगम तट पर एक विलक्षण प्रतिभा का जन्म हुआ—जो नए विचारों के सृजक और सुव्यवस्थित समाधानों के शिल्पी बने। वहीं दूसरी ओर, ग्वालियर के राजसी इतिहास के आँचल में, एक प्रबुद्ध आत्मा तत्वों के रहस्यों को सुलझाती और भाषा के सौंदर्य को संवारती थी, जो अपनी शिक्षा से युवा मनों को प्रेरित कर रही थीं। अपने-अपने पथ पर चलते दो जाज्वल्यमान नक्षत्र, जिनका दिव्य मिलन निश्चित था।"`,
        chapter_2: "अध्याय २",
        chapter_2_title: "दिव्य मिलन",
        chapter_2_text: `"जब विज्ञान की सूक्ष्मता का मिलन नवोन्मेष की दूरदर्शिता से हुआ, तो एक अद्भुत कीमिया का उदय हुआ। तत्वों पर उनकी गहरी समझ और सुव्यवस्थित प्रणालियों के निर्माण के प्रति उनके समर्पण ने एक अनोखा सूत्र बाँध दिया। यह दिल और दिमाग का एक संपूर्ण सामंजस्य था—जहाँ तर्क ने प्रेम का रूप ले लिया, और दो अलग-अलग राहें मिलकर एक साझा यात्रा बन गईं।"`,
        chapter_3: "अध्याय ३",
        chapter_3_title: "दर्पण आत्मा",
        chapter_3_text: `"एक-दूसरे के साहचर्य में, उन्होंने जीवन की सबसे सुंदर रचना को पाया। उन्हें वह मुख्य तत्व मिल गया जिसने उनके सभी विचारों को पूर्णता दी, और उन्हें एक ऐसी दास्ताँ मिली जो हर परिभाषा से परे थी। अब, एक-दूसरे का हाथ थामे, वे अपने सपनों के एक नए संसार का निर्माण कर रहे हैं—जहाँ हर दिन खुशियों, साझा उत्सवों और असीम प्रेम से भरा है।"`,
        presence_msg: `"आपका आगमन हमारे लिए एक अमूल्य उपहार है। हम प्रयागराज के पावन हृदय स्थल पर एक साथ सुंदर और अमिट यादें बनाने के लिए उत्सुक हैं।"`
    }
};

function applyLanguage(lang) {
    if (!I18N[lang]) return;
    const elements = document.querySelectorAll('[data-t]');
    elements.forEach(el => {
        const key = el.getAttribute('data-t');
        if (I18N[lang][key]) {
            el.classList.add('lang-switching');
            setTimeout(() => {
                el.textContent = I18N[lang][key];
                el.classList.remove('lang-switching');
            }, 300);
        }
    });
    
    // Update placeholders if any
    document.querySelectorAll('[data-t-placeholder]').forEach(el => {
        const key = el.getAttribute('data-t-placeholder');
        if (I18N[lang][key]) el.placeholder = I18N[lang][key];
    });

    document.documentElement.lang = lang;
}

function setLanguage(lang) {
    G.lang = lang;
    localStorage.setItem('akshim_lang', lang);
    applyLanguage(lang);
    
    const modal = document.getElementById('modal-lang');
    if (modal) {
        modal.classList.add('opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 1000);
    }
    
    // Restart any language-sensitive animations if needed
    if (lang === 'hi') {
        document.body.style.fontFamily = "'Cinzel', serif"; // Fallback/Mixed
    }
}

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
                if (content) gsap.set(content, { opacity: 1, scale: 1, filter: 'blur(0px)', y: 0, xPercent: 0 });
                s.scrollTop = 0; // Reset scroll position when arriving
            } else {
                s.classList.remove('active-scene');
                if (content) gsap.set(content, { opacity: 0 });
            }
        });
    };
    show(0);

    const navigate = (targetIndex, force = false) => {
        if (isT || targetIndex < 0 || targetIndex >= sections.length || targetIndex === curS) return;

        // Prevent page change if current section is scrolling internally
        const activeSection = sections[curS];
        if (activeSection && !force) {
            let scrollEl = activeSection;
            const scrollableChild = activeSection.querySelector('.inner, .card, .matte-royal-card');
            if (scrollableChild && scrollableChild.scrollHeight > scrollableChild.clientHeight + 5) {
                scrollEl = scrollableChild;
            }

            const scrollTop = scrollEl.scrollTop;
            const scrollHeight = scrollEl.scrollHeight;
            const clientHeight = scrollEl.clientHeight;

            if (scrollHeight > clientHeight + 5) {
                const dir = targetIndex > curS ? 1 : -1;
                if (dir === 1 && scrollTop + clientHeight < scrollHeight - 15) {
                    return; // Scroll down internally
                }
                if (dir === -1 && scrollTop > 15) {
                    return; // Scroll up internally
                }
            }
        }

        isT = true;
        const dir = targetIndex > curS ? 1 : -1;
        const prevContent = sections[curS]?.querySelector('.inner, .card');
        const nextContent = sections[targetIndex]?.querySelector('.inner, .card');

        const isStoryTransition = 
            sections[curS]?.id.startsWith('s1_') && 
            sections[targetIndex]?.id.startsWith('s1_');

        const isEventsTransition = 
            sections[curS]?.id.startsWith('s2_') && 
            sections[targetIndex]?.id.startsWith('s2_');

        const isSlidingTransition = isStoryTransition || isEventsTransition;

        const tl = gsap.timeline({
            onComplete: () => {
                curS = targetIndex;
                isT = false;
                show(targetIndex);
            }
        });

        if (isSlidingTransition) {
            // Kindle Book-style smooth slide transition
            if (dir === 1) {
                if (prevContent) tl.to(prevContent, { xPercent: -100, opacity: 0, duration: 0.8, ease: 'power2.inOut' }, 0);
                if (nextContent) {
                    sections[targetIndex].classList.add('active-scene');
                    tl.fromTo(nextContent, 
                        { xPercent: 100, opacity: 0 }, 
                        { xPercent: 0, opacity: 1, duration: 0.8, ease: 'power2.inOut' }, 0.02
                    );
                }
            } else {
                if (prevContent) tl.to(prevContent, { xPercent: 100, opacity: 0, duration: 0.8, ease: 'power2.inOut' }, 0);
                if (nextContent) {
                    sections[targetIndex].classList.add('active-scene');
                    tl.fromTo(nextContent, 
                        { xPercent: -100, opacity: 0 }, 
                        { xPercent: 0, opacity: 1, duration: 0.8, ease: 'power2.inOut' }, 0.02
                    );
                }
            }
        } else {
            // Standard major section cosmic broll warp
            if (startWarp) startWarp(dir);

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
        }
    };



    // Expose to global for menu links with index mapping for split story chapters & event slides
    window.goTo = (i) => {
        const mapping = {
            0: 0, // Home
            1: 1, // Story (Chapter I)
            2: 4, // Events (Day I - Morning)
            3: 8, // Venue
            4: 9  // RSVP
        };
        const target = mapping[i] !== undefined ? mapping[i] : i;
        navigate(target, true);
    };

    // Expose direct slide navigation for next/prev buttons
    window.goToSlide = (i) => {
        navigate(i, true);
    };
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
            G.guest = {
                ...data.guest,
                groupId: data.guest.group_id,
                sentAt: data.guest.sent_at
            };
            updateGuestUI();
            closeLogin();
            // Reset for next time
            resetLoginUI();
            
            // Enrollment prompt for Biometrics (Face ID)
            if (typeof enrollBiometrics === 'function') {
                setTimeout(() => enrollBiometrics(data.guest.id), 1000);
            }
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
            G.guest = {
                ...data.guest,
                groupId: data.guest.group_id,
                sentAt: data.guest.sent_at
            };
            updateGuestUI();
            setupPushNotifications();
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

    // Update Portal Data
    const portalName = document.getElementById('portal-greeting-name');
    if (portalName) portalName.textContent = `Welcome, ${G.guest.name}`;
    
    const portalStatus = document.getElementById('portal-guest-status');
    if (portalStatus) {
        const status = G.guest.status || 'uninvited';
        portalStatus.textContent = status.toUpperCase();
        if (status === 'sent' || status === 'accepted') {
            portalStatus.className = "bg-green-500/10 text-green-400 border border-green-500/40 px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest";
        }
    }

    // Update Travel Info
    const pDate = document.getElementById('portal-arrival-date');
    if (pDate) pDate.value = G.guest.arrival_date || '';
    
    const pMode = document.getElementById('portal-arrival-mode');
    if (pMode) pMode.value = G.guest.arrival_mode || '';
    
    const pDetails = document.getElementById('portal-arrival-details');
    if (pDetails) pDetails.value = G.guest.arrival_details || '';

    const pImg = document.getElementById('portal-image-url');
    if (pImg) pImg.value = G.guest.profile_image_url || '';

    const pDoc = document.getElementById('portal-doc-url');
    if (pDoc) pDoc.value = G.guest.document_url || '';

    // Update Photo Preview
    const pPreview = document.getElementById('portal-profile-preview');
    if (pPreview && G.guest.profile_image_url) {
        pPreview.innerHTML = `<img src="${G.guest.profile_image_url}" class="w-full h-full object-cover">`;
    }

    // Update Vault Visibility
    const vaultSection = document.getElementById('portal-vault-section');
    if (vaultSection) {
        if (G.guest.vault_access !== false) {
            vaultSection.classList.remove('hidden');
            loadVault();
        } else {
            vaultSection.classList.add('hidden');
        }
    }

    console.log('Guest UI Updated for:', G.guest.name);
}

async function loadVault() {
    const gallery = document.getElementById('vault-gallery');
    if (!gallery) return;

    try {
        const res = await fetch('/api/vault');
        const data = await res.json();
        if (data.error) return console.error('Vault error:', data.error);

        if (data.length === 0) {
            gallery.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center py-20 text-gold/20">
                    <i class="fa-solid fa-images text-4xl mb-4"></i>
                    <p class="text-[10px] uppercase tracking-widest">No memories shared yet</p>
                </div>
            `;
            return;
        }

        gallery.innerHTML = data.map(img => `
            <div class="relative aspect-square rounded overflow-hidden group border border-gold/10 hover:border-gold/40 transition-all cursor-pointer shadow-lg" onclick="previewVaultImage('${img.url}')">
                <img src="${img.url}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <p class="text-[8px] text-gold font-bold uppercase tracking-widest truncate">By ${img.uploader_name}</p>
                    <p class="text-[7px] text-gold/40 uppercase">${new Date(img.created_at).toLocaleDateString()}</p>
                </div>
            </div>
        `).join('');
    } catch (err) { console.error('Load vault failed:', err); }
}

async function uploadToVault(input) {
    const file = input.files[0];
    if (!file) return;

    const btn = document.querySelector('button[onclick="uploadToVault(this)"]') || input.parentElement.querySelector('.bg-gradient-to-r');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Uploading...';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', 'shared-vault');

    try {
        const res = await fetch('/api/vault/upload', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            showToast('Memory shared! 👑');
            loadVault();
        } else {
            showToast('Upload failed: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (err) {
        showToast('Network error', 'error');
    } finally {
        btn.innerHTML = originalContent;
        input.value = '';
    }
}

function previewVaultImage(url) {
    // Basic full screen preview or simple link
    window.open(url, '_blank');
}

async function savePortalDetails() {
    if (!G.guest) return;
    const btn = document.querySelector('button[onclick="savePortalDetails()"]');
    const originalText = btn.textContent;
    btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Saving...';

    const payload = {
        ...G.guest,
        arrival_date: document.getElementById('portal-arrival-date').value,
        arrival_mode: document.getElementById('portal-arrival-mode').value,
        arrival_details: document.getElementById('portal-arrival-details').value,
        profile_image_url: document.getElementById('portal-image-url').value,
        document_url: document.getElementById('portal-doc-url').value
    };

    try {
        const res = await fetch(`/api/contacts/${G.guest.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            G.guest = payload; // Update local state
            showToast('Details updated! 👑');
            updateGuestUI();
        } else {
            showToast('Update failed', 'error');
        }
    } catch (err) {
        showToast('Network error', 'error');
    } finally {
        btn.textContent = originalText;
    }
}

async function portalFileUpload(input, bucket, hiddenId) {
    const file = input.files[0];
    if (!file) return;

    const labelId = hiddenId.replace('-url', '-label');
    const label = document.getElementById(labelId);
    const originalText = label.textContent;
    label.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Uploading...';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);

    try {
        const res = await fetch('/api/upload-file', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById(hiddenId).value = data.url;
            label.textContent = 'Uploaded ✅';
            showToast('File uploaded!');
            
            // If it was a profile image, update the preview immediately
            if (hiddenId === 'portal-image-url') {
                const preview = document.getElementById('portal-profile-preview');
                if (preview) preview.innerHTML = `<img src="${data.url}" class="w-full h-full object-cover">`;
            }
        } else {
            showToast('Upload failed', 'error');
            label.textContent = originalText;
        }
    } catch (err) {
        showToast('Error uploading', 'error');
        label.textContent = originalText;
    }
}

function openGuestPortal() {
    const portal = document.getElementById('guestPortal');
    if (portal) {
        portal.classList.remove('hidden');
        portal.classList.add('flex');
        document.body.classList.add('overflow-hidden');
    }
}

function closeGuestPortal() {
    const portal = document.getElementById('guestPortal');
    if (portal) {
        portal.classList.add('hidden');
        portal.classList.remove('flex');
        document.body.classList.remove('overflow-hidden');
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

// ════════════════ PUSH NOTIFICATIONS ════════════════
async function setupPushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    
    try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('SW Registered');
        
        // Wait for SW to be active
        await navigator.serviceWorker.ready;

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
        
        const publicKey = 'BGWBSIM3yGvRpSTLB0nhEnUXvY_KKIFtoFj3jzhzAVq1h6F-ZDmSybAJkEf24Tq01D3zYZ9PyrXLLxOeUI5ABBo';
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
        
        await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription })
        });
        console.log('Push Subscribed');
    } catch (err) { console.error('Push setup failed:', err); }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
    return outputArray;
}

// ════════════════ INIT ════════════════
document.addEventListener('DOMContentLoaded', () => {
    initStarField(); 
    
    // Language Check
    if (!G.lang) {
        const modal = document.getElementById('modal-lang');
        if (modal) modal.classList.remove('hidden');
    } else {
        applyLanguage(G.lang);
    }
    
    initBRollEngine();
    initWarpEngine();
    runPreloader();
    checkGuestStatus();
});
