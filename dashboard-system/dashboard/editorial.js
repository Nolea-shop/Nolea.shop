// Editorial Interaction System
// GSAP + Lenis + tsParticles (Sparkles)

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Smooth Scroll (Lenis)
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // 2. Sparkle / Glitter System
    const createSparkle = (x, y, color = '#ff5733', isStar = false) => {
        const sparkle = document.createElement('div');
        sparkle.className = isStar ? 'sparkle sparkle--star' : 'sparkle';
        const size = Math.random() * (isStar ? 12 : 4) + 2;
        
        sparkle.style.width = `${size}px`;
        sparkle.style.height = `${size}px`;
        sparkle.style.left = `${x}px`;
        sparkle.style.top = `${y}px`;
        sparkle.style.backgroundColor = color;
        sparkle.style.opacity = Math.random() * 0.8 + 0.2;
        
        document.body.appendChild(sparkle);

        gsap.to(sparkle, {
            y: '-=100',
            x: `+=${(Math.random() - 0.5) * 50}`,
            opacity: 0,
            scale: 0,
            duration: Math.random() * 2 + 1,
            ease: "power2.out",
            onComplete: () => sparkle.remove()
        });
    };

    // Sparkle Burst on Click
    document.addEventListener('click', (e) => {
        const colors = ['#ff5733', '#7c3aed', '#fbbf24', '#0ea5e9'];
        for (let i = 0; i < 8; i++) {
            createSparkle(
                e.pageX + (Math.random() - 0.5) * 20,
                e.pageY + (Math.random() - 0.5) * 20,
                colors[Math.floor(Math.random() * colors.length)],
                Math.random() > 0.8
            );
        }
    });

    // 3. Ambient Sparkles
    setInterval(() => {
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight + window.scrollY;
        createSparkle(x, y, '#ffffff', false);
    }, 400);

    // 4. Entrance Choreography
    gsap.from(".top-nav", {
        y: -50,
        opacity: 0,
        delay: 0.5,
        duration: 1.5,
        ease: "expo.out"
    });

    gsap.to(".gsap-reveal", {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 1,
        stagger: 0.1,
        ease: "power4.out",
        delay: 0.2
    });

    // 5. Magnetic Hover Utility
    const magneticElements = document.querySelectorAll('.card, .top-nav a, .pill');
    magneticElements.forEach(el => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            gsap.to(el, {
                x: x * 0.1,
                y: y * 0.1,
                duration: 0.4,
                ease: "power2.out"
            });
        });
        el.addEventListener('mouseleave', () => {
            gsap.to(el, {
                x: 0,
                y: 0,
                duration: 0.6,
                ease: "elastic.out(1, 0.3)"
            });
        });
    });

    // 6. Lucide Icons
    if (window.lucide) {
        lucide.createIcons();
    }
});
