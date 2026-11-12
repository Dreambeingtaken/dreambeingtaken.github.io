(() => {
    'use strict';

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startPanel = document.getElementById('startPanel');
    const playPanel = document.getElementById('playPanel');
    const gameOverPanel = document.getElementById('gameOverPanel');
    const usernameInput = document.getElementById('usernameInput');
    const difficultySelect = document.getElementById('difficultySelect');
    const startError = document.getElementById('startError');
    const scoreValue = document.getElementById('scoreValue');
    const timerValue = document.getElementById('timerValue');
    const comboValue = document.getElementById('comboValue');
    const bestValue = document.getElementById('bestValue');
    const gameStatus = document.getElementById('gameStatus');
    const pausedOverlay = document.getElementById('pausedOverlay');
    const riddleScreen = document.getElementById('riddleScreen');
    const riddleForm = document.getElementById('riddleForm');
    const riddleInput = document.getElementById('riddleInput');
    const riddleResult = document.getElementById('riddleResult');
    const riddleErrorLine = document.getElementById('riddleErrorLine');
    const riddleProphecyLine = document.getElementById('riddleProphecyLine');
    const jumpscareVideo = document.getElementById('jumpscareVideo');
    const whisperAudio = document.getElementById('whisperAudio');
    const hitSound = document.getElementById('hitSound');

    const GAME_DURATION = 200;
    const STORAGE_KEY = 'jenis-pop-game-high-scores-v2';
    const DIFFICULTIES = {
        easy: { label: 'Easy', baseSpeed: 115, speedStep: 5, shrinkEvery: 14 },
        normal: { label: 'Normal', baseSpeed: 145, speedStep: 8, shrinkEvery: 11 },
        Hard: { label: 'Hard', baseSpeed: 185, speedStep: 11, shrinkEvery: 9 }
    };

    let mode = 'menu';
    let username = '';
    let difficulty = DIFFICULTIES.normal;
    let score = 0;
    let timeLeft = GAME_DURATION;
    let bestScore = 0;
    let combo = 0;
    let comboTimer = 0;
    let elapsed = 0;
    let rafId = 0;
    let lastFrameTime = 0;
    let canvasWidth = 960;
    let canvasHeight = 540;
    let slowMoTimer = 0;
    let riddleTimeout = 0;
    let riddleSubmitted = false;
    const processedMilestones = new Set();

    const target = { x: 350, y: 240, vx: 110, vy: 95, radius: 25, pulse: 0, turnTimer: 0 };
    const blueOrb = { x: 0, y: 0, vx: 70, vy: 55, radius: 17, active: false, charged: false, life: 0, phase: 0 };
    const greenOrb = { x: 0, y: 0, vx: -65, vy: 52, radius: 24, active: false, chasing: false, phase: 0 };

    function loadHighScores() {
        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            return Array.isArray(stored) ? stored.filter(item => item && typeof item.name === 'string' && Number.isFinite(item.score)) : [];
        } catch (error) {
            return [];
        }
    }

    function renderHighScores() {
        const list = document.getElementById('highScoreList');
        const entries = loadHighScores().sort((a, b) => b.score - a.score).slice(0, 5);
        list.replaceChildren();
        if (!entries.length) {
            const empty = document.createElement('li');
            empty.className = 'empty-score';
            empty.textContent = 'Your first run is waiting.';
            list.appendChild(empty);
            return;
        }
        entries.forEach((entry, index) => {
            const item = document.createElement('li');
            const name = document.createElement('span');
            const points = document.createElement('strong');
            name.textContent = `${index + 1}. ${entry.name}`;
            points.textContent = String(entry.score);
            item.append(name, points);
            list.appendChild(item);
        });
    }

    function saveScore() {
        if (!username || score <= 0) return false;
        const entries = loadHighScores();
        const previousBest = Math.max(0, ...entries.filter(item => item.name.toLowerCase() === username.toLowerCase()).map(item => item.score));
        const isNewBest = score > previousBest;
        entries.push({ name: username, score, date: new Date().toISOString() });
        entries.sort((a, b) => b.score - a.score);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 20)));
        } catch (error) {
            // The game remains playable when browser storage is unavailable.
        }
        renderHighScores();
        return isNewBest;
    }

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvasWidth = rect.width;
        canvasHeight = rect.height;
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        clampEntity(target);
        clampEntity(blueOrb);
        clampEntity(greenOrb);
        if (mode === 'playing' || mode === 'paused') render();
    }

    function clampEntity(entity) {
        if (!Number.isFinite(entity.x) || !Number.isFinite(entity.y)) return;
        entity.x = Math.max(entity.radius, Math.min(canvasWidth - entity.radius, entity.x));
        entity.y = Math.max(entity.radius, Math.min(canvasHeight - entity.radius, entity.y));
    }

    function randomPoint(radius) {
        const padding = radius + 8;
        return {
            x: padding + Math.random() * Math.max(1, canvasWidth - padding * 2),
            y: padding + Math.random() * Math.max(1, canvasHeight - padding * 2)
        };
    }

    function setRandomVelocity(entity, speed) {
        const angle = Math.random() * Math.PI * 2;
        entity.vx = Math.cos(angle) * speed;
        entity.vy = Math.sin(angle) * speed;
    }

    function resetTarget() {
        const point = randomPoint(target.radius);
        target.x = point.x;
        target.y = point.y;
        setRandomVelocity(target, difficulty.baseSpeed);
    }

    function updateHud() {
        scoreValue.textContent = String(score);
        timerValue.innerHTML = `${Math.ceil(timeLeft)}<span>s</span>`;
        comboValue.textContent = combo >= 2 ? `×${combo}` : '—';
        bestValue.textContent = String(bestScore);
    }

    function updateTimer() {
        timerValue.innerHTML = `${Math.ceil(timeLeft)}<span>s</span>`;
    }

    function playOneShot(audio, volume = 1) {
        if (!audio) return;
        try {
            audio.pause();
            audio.currentTime = 0;
            audio.volume = volume;
            const result = audio.play();
            if (result && typeof result.catch === 'function') result.catch(() => {});
        } catch (error) {
            // Sound is optional; gameplay should never depend on it.
        }
    }

    function startGame() {
        username = usernameInput.value.trim().slice(0, 18) || 'Player';
        difficulty = DIFFICULTIES[difficultySelect.value] || DIFFICULTIES.normal;
        score = 0;
        timeLeft = GAME_DURATION;
        combo = 0;
        comboTimer = 0;
        elapsed = 0;
        slowMoTimer = 0;
        processedMilestones.clear();
        target.turnTimer = 0;
        blueOrb.active = false;
        blueOrb.charged = false;
        blueOrb.life = 0;
        greenOrb.active = false;
        greenOrb.chasing = false;
        riddleSubmitted = false;
        clearTimeout(riddleTimeout);
        jumpscareVideo.pause();
        jumpscareVideo.style.display = 'none';
        riddleScreen.hidden = true;
        pausedOverlay.hidden = true;
        gameOverPanel.hidden = true;
        startPanel.hidden = true;
        playPanel.hidden = false;
        resizeCanvas();
        target.radius = 25;
        resetTarget();
        bestScore = Math.max(0, ...loadHighScores().filter(item => item.name.toLowerCase() === username.toLowerCase()).map(item => item.score));
        gameStatus.textContent = 'Tap the red target to score. Keep the streak going.';
        updateHud();
        updateTimer();
        whisperAudio.pause();
        whisperAudio.currentTime = 0;
        mode = 'playing';
        lastFrameTime = performance.now();
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(gameLoop);
    }

    function pauseGame() {
        if (mode === 'playing') {
            mode = 'paused';
            cancelAnimationFrame(rafId);
            pausedOverlay.hidden = false;
            document.getElementById('pauseGameButton').textContent = 'Resume';
            gameStatus.textContent = 'Paused. Your time is safe.';
            return;
        }
        if (mode === 'paused') resumeGame();
    }

    function resumeGame() {
        if (mode !== 'paused') return;
        mode = 'playing';
        pausedOverlay.hidden = true;
        document.getElementById('pauseGameButton').textContent = 'Pause';
        gameStatus.textContent = 'Back in action.';
        lastFrameTime = performance.now();
        rafId = requestAnimationFrame(gameLoop);
    }

    function restartGame() {
        if (mode === 'riddle' || mode === 'jumpscare') return;
        startGame();
    }

    function finishGame(message = 'The 200-second challenge is complete.') {
        cancelAnimationFrame(rafId);
        mode = 'gameover';
        whisperAudio.pause();
        whisperAudio.currentTime = 0;
        jumpscareVideo.pause();
        jumpscareVideo.style.display = 'none';
        riddleScreen.hidden = true;
        pausedOverlay.hidden = true;
        playPanel.hidden = true;
        startPanel.hidden = true;
        gameOverPanel.hidden = false;
        const newBest = saveScore();
        bestScore = Math.max(bestScore, score);
        document.getElementById('finalScore').textContent = String(score);
        document.getElementById('gameOverTitle').innerHTML = 'Game over<span>.</span>';
        document.getElementById('gameOverMessage').textContent = message;
        document.getElementById('personalBestMessage').textContent = newBest ? 'A new personal best. Nice one.' : `Your best on this device: ${bestScore}`;
    }

    function gameLoop(timestamp) {
        if (mode !== 'playing') return;
        const dt = Math.min(Math.max((timestamp - lastFrameTime) / 1000, 0), 0.04);
        lastFrameTime = timestamp;
        elapsed += dt;
        updateGame(dt);
        render();
        if (timeLeft <= 0) {
            timeLeft = 0;
            updateTimer();
            finishGame('The 200-second challenge is complete.');
            return;
        }
        rafId = requestAnimationFrame(gameLoop);
    }

    function updateGame(dt) {
        timeLeft -= dt;
        updateTimer();
        if (comboTimer > 0) {
            comboTimer -= dt;
            if (comboTimer <= 0) {
                combo = 0;
                comboValue.textContent = '—';
            }
        }
        if (slowMoTimer > 0) slowMoTimer = Math.max(0, slowMoTimer - dt);

        const slowFactor = slowMoTimer > 0 ? 0.58 : 1;
        const speed = (difficulty.baseSpeed + Math.floor(score / 5) * difficulty.speedStep) * slowFactor;
        const targetSpeed = Math.hypot(target.vx, target.vy) || 1;
        target.vx = (target.vx / targetSpeed) * speed;
        target.vy = (target.vy / targetSpeed) * speed;
        target.x += target.vx * dt;
        target.y += target.vy * dt;
        target.pulse += dt * 3.2;
        target.turnTimer += dt;
        if (score >= 15 && target.turnTimer >= 4.2) {
            target.turnTimer = 0;
            const currentSpeed = Math.hypot(target.vx, target.vy) || speed;
            const currentAngle = Math.atan2(target.vy, target.vx);
            const changedAngle = currentAngle + (Math.random() - 0.5) * 1.25;
            target.vx = Math.cos(changedAngle) * currentSpeed;
            target.vy = Math.sin(changedAngle) * currentSpeed;
        }
        if (target.x < target.radius || target.x > canvasWidth - target.radius) {
            target.x = Math.max(target.radius, Math.min(canvasWidth - target.radius, target.x));
            target.vx *= -1;
        }
        if (target.y < target.radius || target.y > canvasHeight - target.radius) {
            target.y = Math.max(target.radius, Math.min(canvasHeight - target.radius, target.y));
            target.vy *= -1;
        }

        if (blueOrb.active) {
            blueOrb.life -= dt;
            blueOrb.phase += dt * 2.2;
            blueOrb.x += blueOrb.vx * dt * slowFactor;
            blueOrb.y += blueOrb.vy * dt * slowFactor;
            if (blueOrb.x < blueOrb.radius || blueOrb.x > canvasWidth - blueOrb.radius) blueOrb.vx *= -1;
            if (blueOrb.y < blueOrb.radius || blueOrb.y > canvasHeight - blueOrb.radius) blueOrb.vy *= -1;
            clampEntity(blueOrb);
            if (blueOrb.life <= 0) blueOrb.active = false;
        }

        if (greenOrb.active) {
            greenOrb.phase += dt * 1.8;
            if (greenOrb.chasing) {
                const dx = target.x - greenOrb.x;
                const dy = target.y - greenOrb.y;
                const distance = Math.hypot(dx, dy) || 1;
                const chaseSpeed = 74 + Math.min(score, 60) * 0.55;
                greenOrb.x += (dx / distance) * chaseSpeed * dt;
                greenOrb.y += (dy / distance) * chaseSpeed * dt;
            } else {
                greenOrb.x += (greenOrb.vx + Math.sin(elapsed * 1.8) * 24) * dt;
                greenOrb.y += (greenOrb.vy + Math.cos(elapsed * 1.4) * 21) * dt;
                if (greenOrb.x < greenOrb.radius || greenOrb.x > canvasWidth - greenOrb.radius) greenOrb.vx *= -1;
                if (greenOrb.y < greenOrb.radius || greenOrb.y > canvasHeight - greenOrb.radius) greenOrb.vy *= -1;
            }
            clampEntity(greenOrb);
        }
    }

    function drawCanvasBackground() {
        const bg = ctx.createRadialGradient(canvasWidth * .5, canvasHeight * .46, 10, canvasWidth * .5, canvasHeight * .46, Math.max(canvasWidth, canvasHeight) * .75);
        bg.addColorStop(0, '#19121b');
        bg.addColorStop(.65, '#0d0a10');
        bg.addColorStop(1, '#050406');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        ctx.save();
        ctx.strokeStyle = 'rgba(255,183,197,.045)';
        ctx.lineWidth = 1;
        const gap = 42;
        for (let x = 0; x <= canvasWidth; x += gap) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasHeight); ctx.stroke();
        }
        for (let y = 0; y <= canvasHeight; y += gap) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasWidth, y); ctx.stroke();
        }
        ctx.restore();
    }

    function drawOrb(x, y, radius, colors, glow, phase = 0, withOrbit = false) {
        ctx.save();
        const pulse = 1 + Math.sin(phase) * .055;
        if (withOrbit) {
            ctx.strokeStyle = `${colors[1]}66`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.ellipse(x, y, radius * (1.55 + Math.sin(phase * .7) * .04), radius * .72, phase * .35, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.shadowColor = glow;
        ctx.shadowBlur = radius * 1.35;
        const gradient = ctx.createRadialGradient(x - radius * .3, y - radius * .36, 1, x, y, radius * pulse);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(.4, colors[1]);
        gradient.addColorStop(1, colors[2]);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,.65)';
        ctx.beginPath();
        ctx.arc(x - radius * .28, y - radius * .3, Math.max(2, radius * .11), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawTarget() {
        const pulse = 1 + Math.sin(target.pulse) * .045;
        drawOrb(target.x, target.y, target.radius * pulse,
            ['#fff0ef', '#ff4b58', '#9c1429'], 'rgba(255,55,80,.75)', target.pulse, false);
        ctx.save();
        ctx.strokeStyle = 'rgba(255,150,155,.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(target.x, target.y, target.radius + 5 + Math.sin(target.pulse) * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    function drawBlueOrb() {
        if (!blueOrb.active) return;
        const colors = blueOrb.charged ? ['#f0ffff', '#48d9ff', '#1457b8'] : ['#effaff', '#53aaff', '#174a9e'];
        const glow = blueOrb.charged ? 'rgba(65,218,255,.85)' : 'rgba(69,158,255,.72)';
        drawOrb(blueOrb.x, blueOrb.y, blueOrb.radius * (blueOrb.charged ? 1.12 : 1), colors, glow, blueOrb.phase, blueOrb.charged);
    }

    function drawGreenOrb() {
        if (!greenOrb.active) return;
        // Keep the emerald orb luminous and intriguing; let players discover its role themselves.
        drawOrb(greenOrb.x, greenOrb.y, greenOrb.radius, ['#f2fff5', '#5eff9b', '#087541'], 'rgba(51,255,137,.9)', greenOrb.phase, true);
        ctx.save();
        ctx.strokeStyle = 'rgba(189,255,211,.72)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(greenOrb.x, greenOrb.y, greenOrb.radius + 7 + Math.sin(greenOrb.phase * 1.2) * 2, greenOrb.phase * .8, greenOrb.phase * .8 + Math.PI * 1.55);
        ctx.stroke();
        ctx.restore();
    }

    function render() {
        if (!canvasWidth || !canvasHeight) return;
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        drawCanvasBackground();
        drawTarget();
        drawBlueOrb();
        drawGreenOrb();
    }

    function activateBlueOrb(charged = false) {
        const point = randomPoint(blueOrb.radius);
        blueOrb.x = point.x;
        blueOrb.y = point.y;
        blueOrb.active = true;
        blueOrb.charged = charged;
        blueOrb.life = 9;
        blueOrb.phase = Math.random() * Math.PI * 2;
        setRandomVelocity(blueOrb, charged ? 90 : 66);
        gameStatus.textContent = charged ? 'A charged bonus just appeared.' : 'A blue bonus orb appeared. +2 points.';
    }

    function activateGreenOrb(chasing = false) {
        const point = randomPoint(greenOrb.radius);
        greenOrb.x = point.x;
        greenOrb.y = point.y;
        greenOrb.active = true;
        greenOrb.chasing = chasing;
        greenOrb.phase = Math.random() * Math.PI * 2;
        setRandomVelocity(greenOrb, 56);
        gameStatus.textContent = 'Something new has appeared. Take a look.';
    }

    function deactivateGreenOrb() {
        greenOrb.active = false;
        greenOrb.chasing = false;
    }

    function handleMilestones() {
        // Process every crossed threshold so bonus points and combo awards cannot skip an event.
        for (let threshold = 5; threshold <= 50; threshold += 5) {
            if (score < threshold || processedMilestones.has(threshold)) continue;
            processedMilestones.add(threshold);

            activateBlueOrb(threshold % 20 === 0);
            if (threshold === 10) activateGreenOrb(false);
            if (threshold === 15 || threshold === 30 || threshold === 50) deactivateGreenOrb();
            if (threshold === 20 || threshold === 40) activateGreenOrb(true);

            const currentSpeed = Math.hypot(target.vx, target.vy) || difficulty.baseSpeed;
            setRandomVelocity(target, currentSpeed + difficulty.speedStep);
            target.radius = Math.max(14, 25 - Math.floor(threshold / difficulty.shrinkEvery));
        }
    }

    function awardTargetHit() {
        const now = performance.now();
        if (comboTimer > 0) combo += 1;
        else combo = 1;
        comboTimer = 2.1;
        let points = 1;
        if (combo >= 5 && combo % 5 === 0) {
            points += 2;
            gameStatus.textContent = `×${combo} combo! Bonus +2.`;
        } else {
            gameStatus.textContent = combo >= 2 ? `×${combo} combo — keep it going.` : 'Nice hit. Keep the streak going.';
        }
        score += points;
        target.radius = Math.max(14, 25 - Math.floor(score / difficulty.shrinkEvery));
        resetTarget();
        playOneShot(hitSound, .55);
        handleMilestones();
        bestValue.textContent = String(Math.max(bestScore, score));
        updateHud();
    }

    function checkHit(clientX, clientY) {
        if (mode !== 'playing') return;
        const rect = canvas.getBoundingClientRect();
        const x = (clientX - rect.left) * (canvasWidth / rect.width);
        const y = (clientY - rect.top) * (canvasHeight / rect.height);

        // Check the mystery orb first so a direct tap always registers it.
        if (greenOrb.active && Math.hypot(x - greenOrb.x, y - greenOrb.y) <= greenOrb.radius + 10) {
            playOneShot(hitSound, .72);
            triggerRiddle();
            return;
        }
        if (blueOrb.active && Math.hypot(x - blueOrb.x, y - blueOrb.y) <= blueOrb.radius + 9) {
            playOneShot(hitSound, .62);
            const points = blueOrb.charged ? 5 : 2;
            score += points;
            if (blueOrb.charged) slowMoTimer = 3.5;
            blueOrb.active = false;
            gameStatus.textContent = blueOrb.charged ? 'Charged bonus collected. +5 and a brief slow-motion boost.' : 'Bonus collected. +2 points.';
            handleMilestones();
            updateHud();
            bestValue.textContent = String(Math.max(bestScore, score));
            return;
        }
        if (Math.hypot(x - target.x, y - target.y) <= target.radius + 9) awardTargetHit();
    }

    function triggerRiddle() {
        mode = 'riddle';
        cancelAnimationFrame(rafId);
        whisperAudio.loop = true;
        playOneShot(whisperAudio, .28);
        riddleSubmitted = false;
        riddleInput.value = '';
        riddleErrorLine.textContent = '';
        riddleProphecyLine.textContent = '';
        riddleErrorLine.classList.remove('shake');
        riddleResult.hidden = true;
        document.getElementById('riddleSubmit').disabled = false;
        riddleScreen.hidden = false;
        setTimeout(() => riddleInput.focus(), 120);
    }

    function submitRiddle(event) {
        event.preventDefault();
        if (riddleSubmitted) return;

        const answer = riddleInput.value.trim();
        if (!answer) {
            riddleInput.focus();
            return;
        }

        riddleSubmitted = true;
        document.getElementById('riddleSubmit').disabled = true;
        riddleResult.hidden = false;
        riddleErrorLine.textContent = 'WRONG. JENI DESPISES YOU. YOUR WISDOM IS NOT WORTHY OF THE ORDER.';
        riddleErrorLine.classList.remove('shake');
        void riddleErrorLine.offsetWidth;
        riddleErrorLine.classList.add('shake');

        riddleTimeout = window.setTimeout(() => {
            riddleProphecyLine.textContent = 'Remember this. Once the sun sets, Carnival will rise. You will understand in few years.';
            riddleTimeout = window.setTimeout(beginJumpscare, 4000);
        }, 3000);
    }

    function beginJumpscare() {
        if (mode !== 'riddle') return;
        mode = 'jumpscare';
        riddleScreen.hidden = true;
        whisperAudio.pause();
        whisperAudio.currentTime = 0;
        jumpscareVideo.style.display = 'block';
        jumpscareVideo.currentTime = 0;
        jumpscareVideo.volume = 1;
        jumpscareVideo.onended = () => finishGame('L Oopsies...');
        jumpscareVideo.onerror = () => finishGame('L Oopsies...');
        const playPromise = jumpscareVideo.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
                // If a browser blocks the video, end gracefully rather than leaving a frozen overlay.
                window.setTimeout(() => finishGame('L Oopsies...'), 1200);
            });
        }
    }

    document.getElementById('setupForm').addEventListener('submit', event => {
        event.preventDefault();
        if (!usernameInput.value.trim()) {
            startError.textContent = 'Enter a name before starting your run.';
            usernameInput.focus();
            return;
        }
        startError.textContent = '';
        startGame();
    });

    document.getElementById('pauseGameButton').addEventListener('click', pauseGame);
    document.getElementById('resumeOverlayButton').addEventListener('click', resumeGame);
    document.getElementById('restartButton').addEventListener('click', restartGame);
    document.getElementById('playAgainButton').addEventListener('click', startGame);
    document.getElementById('backToMenuButton').addEventListener('click', () => {
        gameOverPanel.hidden = true;
        startPanel.hidden = false;
        mode = 'menu';
        renderHighScores();
    });
    riddleForm.addEventListener('submit', submitRiddle);
    canvas.addEventListener('pointerdown', event => {
        event.preventDefault();
        checkHit(event.clientX, event.clientY);
    }, { passive: false });


    window.addEventListener('resize', resizeCanvas, { passive: true });
    if ('ResizeObserver' in window) {
        const observer = new ResizeObserver(() => {
            if (!playPanel.hidden) resizeCanvas();
        });
        observer.observe(canvas);
    }

    renderHighScores();
    updateHud();
})();
