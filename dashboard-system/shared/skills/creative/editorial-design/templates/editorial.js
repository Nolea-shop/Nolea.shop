document.addEventListener('DOMContentLoaded', () => {
    // 1. Smooth Scroll (Lenis)
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);

    // 2. Sparkle Burst
    const createSparkle = (x, y, color = '#ff5733') => {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        sparkle.style.left = `${x}px`;
        sparkle.style.top = `${y}px`;
        sparkle.style.backgroundColor = color;
        document.body.appendChild(sparkle);
        gsap.to(sparkle, {
            y: '-=100', opacity: 0, scale: 0, 
            duration: 1.5, onComplete: () => sparkle.remove()
        });
    };

    document.addEventListener('click', (e) => {
        const colors = ['#ff5733', '#7c3aed', '#fbbf24'];
        createSparkle(e.pageX, e.pageY, colors[Math.floor(Math.random()*colors.length)]);
    });

    // 3. Entrance Revealing
    gsap.to(".gsap-reveal", {
        opacity: 1, y: 0, duration: 1, stagger: 0.1, ease: "power4.out"
    });
});
