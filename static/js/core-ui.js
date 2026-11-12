/**
 * Vinista Core UI: Live Clock, Spotlight Tracking & Download Progress Counter
 */

// 1. Live Clock
function initLiveClock() {
    const hoursEl = document.getElementById('clockHours');
    const minutesEl = document.getElementById('clockMinutes');
    const secondsEl = document.getElementById('clockSeconds');

    if (!hoursEl || !minutesEl || !secondsEl) return;

    function updateClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');

        hoursEl.textContent = h;
        minutesEl.textContent = m;
        secondsEl.textContent = s;
    }

    updateClock();
    setInterval(updateClock, 1000);
}

// 2. Spotlight Border Mouse Tracker
function initSpotlightCards() {
    const cards = document.querySelectorAll('.spotlight-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });
}

// 3. Sliding Progress Counter Animation
function animateProgress(counterEl, fillEl, targetValue = 92, duration = 2200) {
    let current = 0;
    const startTime = performance.now();

    return new Promise((resolve) => {
        function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            current = Math.floor(easeProgress * targetValue);

            if (counterEl) counterEl.textContent = current;
            if (fillEl) fillEl.style.width = `${current}%`;

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                resolve();
            }
        }
        requestAnimationFrame(step);
    });
}

function completeProgress(counterEl, fillEl) {
    return new Promise((resolve) => {
        let current = parseInt(counterEl.textContent, 10) || 90;
        const interval = setInterval(() => {
            current += 2;
            if (current >= 100) {
                current = 100;
                clearInterval(interval);
                if (counterEl) counterEl.textContent = '100';
                if (fillEl) fillEl.style.width = '100%';
                setTimeout(resolve, 200);
            } else {
                if (counterEl) counterEl.textContent = current;
                if (fillEl) fillEl.style.width = `${current}%`;
            }
        }, 15);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initLiveClock();
    initSpotlightCards();
});

