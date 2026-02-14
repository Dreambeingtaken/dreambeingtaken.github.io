const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function getCanvasSize() {
    const rect = canvas.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
}



let score = 0;
let timeLeft = 200; // Time limit in seconds
let gameInterval;
let targetSpeed = 1.5; // Initial speed of the red target
let targetDirection = { x: 1, y: 1 }; // Direction for target movement

const target = {
    x: 0,
    y: 0,
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
const jumpscareVideo = document.getElementById('jumpscareVideo');
const jumpscareSound = document.getElementById("jumpscareSound");
const whisperAudio = document.getElementById("whisperAudio");

jumpscareVideo.src = 'jumpscare/foxy.mp4';
jumpscareVideo.style.display = 'none';



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
    const size = getCanvasSize();

    target.x = Math.random() * (size.w - target.radius * 2) + target.radius;
    target.y = Math.random() * (size.h - target.radius * 2) + target.radius;
}


function moveTarget() {
    const size = getCanvasSize();

    target.x += targetSpeed * targetDirection.x;
    target.y += targetSpeed * targetDirection.y;

    if (target.x - target.radius < 0 || target.x + target.radius > size.w) {
        targetDirection.x *= -1;
    }

    if (target.y - target.radius < 0 || target.y + target.radius > size.h) {
        targetDirection.y *= -1;
    }
}


function moveBlueCircle() {
    if (!blueCircle.active) return;

    const size = getCanvasSize();

    blueCircle.x += blueCircle.speed * (Math.random() < 0.5 ? 1 : -1);
    blueCircle.y += blueCircle.speed * (Math.random() < 0.5 ? 1 : -1);

    if (blueCircle.x - blueCircle.radius < 0 || blueCircle.x + blueCircle.radius > size.w) {
        blueCircle.x = blueCircle.radius + Math.random() * (size.w - 2 * blueCircle.radius);
    }

    if (blueCircle.y - blueCircle.radius < 0 || blueCircle.y + blueCircle.radius > size.h) {
        blueCircle.y = blueCircle.radius + Math.random() * (size.h - 2 * blueCircle.radius);
    }
}


function moveGreenCircle() {
    if (!greenCircle.active) return;

    const size = getCanvasSize();

    if (greenCircle.chasing) {
        const dx = target.x - greenCircle.x;
        const dy = target.y - greenCircle.y;
        const distance = Math.hypot(dx, dy);

        if (distance > 1) {
            greenCircle.x += (greenCircle.speed * dx) / distance;
            greenCircle.y += (greenCircle.speed * dy) / distance;
        }
    } else {
        greenCircle.x += greenCircle.speed * (Math.random() < 0.5 ? 1 : -1);
        greenCircle.y += greenCircle.speed * (Math.random() < 0.5 ? 1 : -1);
    }

    // Keep inside canvas
    if (greenCircle.x - greenCircle.radius < 0)
        greenCircle.x = greenCircle.radius;

    if (greenCircle.x + greenCircle.radius > size.w)
        greenCircle.x = size.w - greenCircle.radius;

    if (greenCircle.y - greenCircle.radius < 0)
        greenCircle.y = greenCircle.radius;

    if (greenCircle.y + greenCircle.radius > size.h)
        greenCircle.y = size.h - greenCircle.radius;
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
    const size = getCanvasSize();

    blueCircle.active = true;
    blueCircle.x = Math.random() * (size.w - blueCircle.radius * 2) + blueCircle.radius;
    blueCircle.y = Math.random() * (size.h - blueCircle.radius * 2) + blueCircle.radius;
}


function activateGreenCircle() {
    const size = getCanvasSize();

    greenCircle.active = true;
    greenCircle.x = Math.random() * (size.w - greenCircle.radius * 2) + greenCircle.radius;
    greenCircle.y = Math.random() * (size.h - greenCircle.radius * 2) + greenCircle.radius;
}


function deactivateGreenCircle() {
    greenCircle.active = false;
    greenCircle.chasing = false; // Stop chasing
}

function playJumpScare() {
    whisperAudio.volume = 0.3;
whisperAudio.currentTime = 0;
whisperAudio.play().catch(e => console.log(e));

    clearInterval(gameInterval);

    document.getElementById("gameCanvas").style.display = "none";
    document.getElementById("scoreboard").style.display = "none";
      
    document.getElementById("riddleScreen").style.display = "flex";
    document.getElementById("riddleResult").style.display = "none";
document.getElementById("riddleInput").value = "";

}





function endGame() {
    jumpscareVideo.onended = null;
    jumpscareVideo.pause();
    jumpscareVideo.style.display = "none";

    document.getElementById("score").innerText =
        "GAME OVER — Final Score: " + score;

    document.getElementById('gameCanvas').style.display = 'none';
    document.getElementById('scoreboard').style.display = 'none';
    document.getElementById('startGameButton').style.display = 'block';

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
    resizeCanvas();
    resetTarget();     // <<< ADD THIS LINE
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

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();

    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    checkHit(mouseX, mouseY);
});


canvas.addEventListener('touchstart', (event) => {
    event.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const touch = event.changedTouches[0];

    const mouseX = touch.clientX - rect.left;
    const mouseY = touch.clientY - rect.top;

    checkHit(mouseX, mouseY);
}, { passive: false });



document.getElementById('gameCanvas').style.display = 'none'; // Initially hide the game canvas
document.getElementById('scoreboard').style.display = 'none'; // Initially hide the scoreboard
window.addEventListener('resize', () => {
    resizeCanvas();
    resetTarget();
});
document.getElementById("riddleSubmit").addEventListener("click", () => {

    const result = document.getElementById("riddleResult");

result.style.display = "block";
result.innerText =
    "WRONG. JENI DESPISES YOU. YOUR WISDOM IS NOT WORTHY OF THE ORDER.";
    result.style.animation = "subtleShake 0.4s ease-in-out";


setTimeout(() => {

    // Show prophecy hint
    result.innerText += "\n\nRemember this. Once the sun sets, Carnival will rise. You will understand in few years.";

    // Allow browser ONE frame to render text
    setTimeout(() => {

        document.getElementById("riddleScreen").style.display = "none";
        whisperAudio.pause();
whisperAudio.currentTime = 0;


        jumpscareVideo.style.display = "block";
        jumpscareVideo.currentTime = 0;
        jumpscareVideo.muted = false;
        jumpscareVideo.volume = 1;

        jumpscareVideo.play().catch(e => console.log(e));
        jumpscareVideo.onended = endGame;

    }, 4000);

}, 3000);


});


