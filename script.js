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
    speed: 1.5, // Initial speed of the green circle
    active: false,
    chasing: false // Indicates if the green circle is chasing the red target
};

const hitSound = new Audio('sounds/hit.mp3');  // Path to your hit sound effect
const backgroundMusic = document.getElementById('lofiAudio');  // Background music element

// Create a jumpscare video element
const jumpscareVideo = document.createElement('video');
jumpscareVideo.src = 'jumpscare/foxy.mp4'; // Path to jumpscare video
jumpscareVideo.style.position = 'fixed'; // Use fixed positioning
jumpscareVideo.style.top = '0'; // Align to top
jumpscareVideo.style.left = '0'; // Align to left
jumpscareVideo.style.width = '100vw'; // Full viewport width
jumpscareVideo.style.height = '100vh'; // Full viewport height
jumpscareVideo.style.objectFit = 'cover'; // Cover the entire viewport
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
    document.getElementById('timer').innerText = `Time Left: ${Math.ceil(timeLeft)}s`;
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

function moveGreenCircle() {
    if (greenCircle.active) {
        // If greenCircle is in chasing mode, make it chase the red target
        if (greenCircle.chasing) {
            const dx = target.x - greenCircle.x;
            const dy = target.y - greenCircle.y;
            const distance = Math.hypot(dx, dy);
            
            // Ensure the green circle only moves if it is not already at the target position
            if (distance > 1) { // A small threshold to avoid jittering when close to the target
                greenCircle.x += (greenCircle.speed * dx) / distance;
                greenCircle.y += (greenCircle.speed * dy) / distance;
            }
        } else {
            // Move greenCircle randomly when not chasing
            greenCircle.x += greenCircle.speed * (Math.random() < 0.5 ? 1 : -1);
            greenCircle.y += greenCircle.speed * (Math.random() < 0.5 ? 1 : -1);
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

        // Power-up: Blue circle appears at score 5 and every 5 points thereafter
        if (score >= 5 && (score % 5 === 0)) {
            activateBlueCircle();
        }

        // Green circle logic
        if (score === 10 && !greenCircle.active) {
            activateGreenCircle(); // Activate at score 10
        }
        if (score === 15) {
            deactivateGreenCircle(); // Disappear at score 15
        }
        if (score === 20) {
            greenCircle.chasing = true; // Start chasing at score 20
        }
        if (score === 30) {
            deactivateGreenCircle(); // Disappear at score 30
        }
        if (score === 40) {
            activateGreenCircle(); // Appear again at score 40
            greenCircle.chasing = true; // Start chasing at score 40
        }
        if (score === 50) {
            deactivateGreenCircle(); // Disappear at score 50
        }

        // Increase difficulty
        if (score % 5 === 0) {
            targetSpeed += 0.2;
            target.radius = Math.max(15, target.radius - 1);
        }
    }

    if (blueCircle.active && Math.hypot(mouseX - blueCircle.x, mouseY - blueCircle.y) < blueCircle.radius) {
        blueCircle.active = false;  // Deactivate blue circle
        score += 2;  // Grant extra points for hitting the blue circle
        drawScore();
    }

    if (greenCircle.active && Math.hypot(mouseX - greenCircle.x, mouseY - greenCircle.y) < greenCircle.radius) {
        playJumpScare(); // Trigger jumpscare video when the green circle is hit
    }
}

function activateBlueCircle() {
    blueCircle.active = true;
    blueCircle.x = Math.random() * (canvas.width - blueCircle.radius * 2) + blueCircle.radius;
    blueCircle.y = Math.random() * (canvas.height - blueCircle.radius * 2) + blueCircle.radius;
}

function activateGreenCircle() {
    greenCircle.active = true;
    greenCircle.x = Math.random() * (canvas.width - greenCircle.radius * 2) + greenCircle.radius;
    greenCircle.y = Math.random() * (canvas.height - greenCircle.radius * 2) + greenCircle.radius;
}

function deactivateGreenCircle() {
    greenCircle.active = false;
    greenCircle.chasing = false; // Stop chasing
}

function playJumpScare() {
    jumpscareVideo.style.display = 'block'; // Show the jumpscare video
    jumpscareVideo.play();
    jumpscareVideo.onended = endGame; // End the game after the video ends
}

function endGame() {
    clearInterval(gameInterval);
    jumpscareVideo.style.display = 'none'; // Hide the jumpscare video
    alert('Game Over L Bozo! Your final score is: ' + score);
    document.getElementById('gameCanvas').style.display = 'none'; // Hide the canvas
    document.getElementById('scoreboard').style.display = 'none'; // Hide scoreboard
    document.getElementById('startGameButton').style.display = 'block'; // Show start button again
    resetGame();
}

function resetGame() {
    score = 0;
    timeLeft = 200; // Reset timer
    targetSpeed = 1.5; // Reset target speed
    target.radius = 25; // Reset target radius
    blueCircle.active = false; // Reset blue circle
    greenCircle.active = false; // Reset green circle
    greenCircle.chasing = false; // Reset chasing state
    resetTarget(); // Reset target position
    drawScore(); // Draw initial score
}

function startGame() {
    drawScore();
    drawTimer();
    gameInterval = setInterval(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
        moveTarget();
        moveBlueCircle();
        moveGreenCircle();
        drawTarget();
        drawBlueCircle();
        drawGreenCircle();
        drawTimer();

        timeLeft -= 1 / 60; // Decrease time left
        if (timeLeft <= 0) {
            endGame(); // End game if time runs out
        }

    }, 1000 / 60); // 60 frames per second
}

// Event listeners for mouse clicks
canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    checkHit(mouseX, mouseY);
});

// Event listeners for touch events on mobile devices
canvas.addEventListener('touchstart', (event) => {
    event.preventDefault(); // Prevent default touch actions
    const touch = event.touches[0];
    const rect = canvas.getBoundingClientRect();
    const mouseX = touch.clientX - rect.left;
    const mouseY = touch.clientY - rect.top;
    checkHit(mouseX, mouseY);
});

document.getElementById('gameCanvas').style.display = 'none'; // Initially hide the game canvas
document.getElementById('scoreboard').style.display = 'none'; // Initially hide the scoreboard
