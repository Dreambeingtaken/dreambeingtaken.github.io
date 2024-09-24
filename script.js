const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let score = 0;
let timeLeft = 200; // Time limit in seconds
let gameInterval;
let targetSpeed = 1.5; // Initial speed of the red target
let targetDirection = { x: 1, y: 1 }; // Direction for target movement

const target = {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: 25
};

const blueCircle = {
    x: 0,
    y: 0,
    radius: 30,
    speed: 2.5,
    active: false
};

const greenCircle = {
    x: 0,
    y: 0,
    radius: 40,
    active: false
};

const hitSound = new Audio('sounds/hit.mp3');  // Path to your hit sound effect
const backgroundMusic = document.getElementById('lofiAudio');  // Background music element

// Create a jumpscare video element
const jumpscareVideo = document.createElement('video');
jumpscareVideo.src = 'jumpscare/foxy.mp4'; // Path to jumpscare video
jumpscareVideo.style.position = 'absolute'; // Positioning absolute to allow placing in canvas area
jumpscareVideo.style.top = '50%'; // Center vertically
jumpscareVideo.style.left = '50%'; // Center horizontally
jumpscareVideo.style.transform = 'translate(-50%, -50%)'; // Offset to center
jumpscareVideo.style.width = canvas.width + 'px'; // Match canvas width
jumpscareVideo.style.height = canvas.height + 'px'; // Match canvas height
jumpscareVideo.style.display = 'none';  // Initially hidden
jumpscareVideo.style.zIndex = '10'; // Ensure it is on top of canvas
document.body.appendChild(jumpscareVideo); // Add video to the body

// Scoreboard
let username = '';
const scores = {}; // Object to hold usernames and scores

// Start game button
document.getElementById('startGameButton').addEventListener('click', startGameHandler);
document.getElementById('startGameButton').addEventListener('touchstart', startGameHandler);

function startGameHandler() {
    username = document.getElementById('usernameInput').value;
    if (username) {
        document.getElementById('gameCanvas').style.display = 'block';
        document.getElementById('scoreboard').style.display = 'block';
        document.getElementById('scoreboard').innerHTML = `<h2>Scoreboard</h2><div id="scores">${username}: 0</div>`;
        
        // Hide the start button
        document.getElementById('startGameButton').style.display = 'none';  
        
        startGame();
    } else {
        alert('Please enter a username!');
    }
}

// Play and pause buttons for background music
document.getElementById('playButton').addEventListener('click', function () {
    backgroundMusic.volume = 0.5; // Set the volume (adjust if needed)
    backgroundMusic.play().catch(error => {
        console.error('Audio playback failed:', error);
    });
});

document.getElementById('pauseButton').addEventListener('click', function () {
    backgroundMusic.pause(); // Pause the audio
});

function drawTarget() {
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.closePath();
}

function drawBlueCircle() {
    if (blueCircle.active) {
        ctx.beginPath();
        ctx.arc(blueCircle.x, blueCircle.y, blueCircle.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'blue';
        ctx.fill();
        ctx.closePath();
    }
}

function drawGreenCircle() {
    if (greenCircle.active) {
        ctx.beginPath();
        ctx.arc(greenCircle.x, greenCircle.y, greenCircle.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'green';
        ctx.fill();
        ctx.closePath();
    }
}

function drawScore() {
    document.getElementById('score').innerText = `Score: ${score}`;
    scores[username] = score; // Update the user's score
    updateScoreboard();
}

function updateScoreboard() {
    const scoresDiv = document.getElementById('scores');
    scoresDiv.innerHTML = '';
    for (let user in scores) {
        scoresDiv.innerHTML += `${user}: ${scores[user]}<br>`;
    }
}

function drawTimer() {
    document.getElementById('timer').innerText = `Time Left: ${timeLeft}s`;
}

function resetTarget() {
    target.x = Math.random() * (canvas.width - target.radius * 2) + target.radius;
    target.y = Math.random() * (canvas.height - target.radius * 2) + target.radius;
}

function moveTarget() {
    target.x += targetSpeed * targetDirection.x;
    target.y += targetSpeed * targetDirection.y;

    // Reverse direction if the target hits the canvas boundaries
    if (target.x - target.radius < 0 || target.x + target.radius > canvas.width) {
        targetDirection.x *= -1;
    }
    if (target.y - target.radius < 0 || target.y + target.radius > canvas.height) {
        targetDirection.y *= -1;
    }
}

function moveBlueCircle() {
    if (blueCircle.active) {
        blueCircle.x += blueCircle.speed * (Math.random() < 0.5 ? 1 : -1);
        blueCircle.y += blueCircle.speed * (Math.random() < 0.5 ? 1 : -1);

        // Prevent blue circle from moving out of bounds
        if (blueCircle.x - blueCircle.radius < 0 || blueCircle.x + blueCircle.radius > canvas.width) {
            blueCircle.x = blueCircle.radius + Math.random() * (canvas.width - 2 * blueCircle.radius);
        }
        if (blueCircle.y - blueCircle.radius < 0 || blueCircle.y + blueCircle.radius > canvas.height) {
            blueCircle.y = blueCircle.radius + Math.random() * (canvas.height - 2 * blueCircle.radius);
        }
    }
}

function checkHit(mouseX, mouseY) {
    const distance = Math.hypot(mouseX - target.x, mouseY - target.y);
    if (distance < target.radius) {
        score++;
        hitSound.play();  // Play hit sound when the target is hit
        resetTarget();
        drawScore();

        // Power-up: Blue circle appears at score 5
        if (score === 5 && !blueCircle.active) {
            activateBlueCircle();
        }

        // Jumpscare trigger: Green circle appears at score 10
        if (score === 10 && !greenCircle.active) {
            activateGreenCircle();
        }

        // Increase difficulty
        if (score % 5 === 0) {
            targetSpeed += 0.2;
            target.radius = Math.max(15, target.radius - 1);
        }
    }

    if (blueCircle.active && Math.hypot(mouseX - blueCircle.x, mouseY - blueCircle.y) < blueCircle.radius) {
        blueCircle.active = false;  // Deactivate blue circle
        score += 2;  // Reward extra points for hitting the blue circle
        drawScore();
    }

    if (greenCircle.active && Math.hypot(mouseX - greenCircle.x, mouseY - greenCircle.y) < greenCircle.radius) {
        greenCircle.active = false;  // Deactivate green circle
        triggerJumpscare();  // Trigger jumpscare
    }
}

function activateBlueCircle() {
    blueCircle.x = Math.random() * (canvas.width - blueCircle.radius * 2) + blueCircle.radius;
    blueCircle.y = Math.random() * (canvas.height - blueCircle.radius * 2) + blueCircle.radius;
    blueCircle.active = true;
    setTimeout(() => { blueCircle.active = false; }, 5000);  // Disappear after 5 seconds if not clicked
}

function activateGreenCircle() {
    greenCircle.x = Math.random() * (canvas.width - greenCircle.radius * 2) + greenCircle.radius;
    greenCircle.y = Math.random() * (canvas.height - greenCircle.radius * 2) + greenCircle.radius;
    greenCircle.active = true;
}

function triggerJumpscare() {
    jumpscareVideo.style.display = 'block';  // Show jumpscare video
    jumpscareVideo.play();  // Play the jumpscare video
    jumpscareVideo.onended = endGame;  // End game after video ends
}

function getMousePos(event) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = (event.clientX || event.touches[0].clientX) - rect.left;
    const mouseY = (event.clientY || event.touches[0].clientY) - rect.top;
    return { mouseX, mouseY };
}

canvas.addEventListener('click', function (event) {
    const { mouseX, mouseY } = getMousePos(event);
    checkHit(mouseX, mouseY);
});

canvas.addEventListener('touchstart', function (event) {
    const { mouseX, mouseY } = getMousePos(event);
    checkHit(mouseX, mouseY);
});

// Start the game
function startGame() {
    score = 0;
    timeLeft = 100; // Reset timer
    targetSpeed = 1.5; // Reset target speed
    target.radius = 25; // Reset target size
    resetTarget();

    // Reset active states of circles
    blueCircle.active = false;
    greenCircle.active = false;

    // Start countdown timer
    gameInterval = setInterval(() => {
        timeLeft--;
        drawTimer();
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);

    // Start moving the target
    setInterval(() => {
        moveTarget();
        moveBlueCircle();
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas for redrawing
        drawTarget();
        drawBlueCircle();
        drawGreenCircle();
    }, 1000 / 60); // 60 FPS
}

// End the game
function endGame() {
    clearInterval(gameInterval);
    jumpscareVideo.style.display = 'none'; // Hide the jumpscare video
    document.getElementById('gameCanvas').style.display = 'none'; // Hide the game canvas
    document.getElementById('scoreboard').style.display = 'none'; // Hide scoreboard
    document.getElementById('startGameButton').style.display = 'block'; // Show start button
    alert(`Game over L Bozo! Your score is ${score}.`);
}

drawScore();
drawTimer();
