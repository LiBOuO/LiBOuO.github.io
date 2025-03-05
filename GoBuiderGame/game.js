// Game elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalTimeSpan = document.getElementById('finalTime');
const finalCoinsSpan = document.getElementById('finalCoins');
const restartButton = document.getElementById('restartButton');
const redirectButton = document.getElementById('redirectButton');

// 設定跳轉按鈕的目標URL
const REDIRECT_URL = "https://portaly.cc/ftc17257/support"; // 替換為你想跳轉的實際URL

// Game constants
const GROUND_HEIGHT = 50;
const GROUND_Y = canvas.height - GROUND_HEIGHT;

// Game variables
let gameActive = false;
let gameSpeed = 5;
let score = 0;
let coinCount = 0;
let obstacles = [];
let coins = [];
let speedIncreaseInterval;
let lastObstacleTime = 0;
let lastCoinTime = 0;
let minObstacleDistance = 500;

//background image
const backgroundImage = new Image();
backgroundImage.src = 'background.png';  // 確保該圖片與HTML/CSS配合

// 背景位置
let bgX = 0;
const bgSpeed = 3;  // 背景移動速度

// Character properties
const character = {
    x: 100,
    y: GROUND_Y - 200,
    width: 100,
    height: 200,
    isJumping: false,
    isSliding: false,
    jumpHeight: 300,
    jumpVelocity: 0,
    gravity: 0.1,  // 降低重力使跳躍更高更遠
    slideHeight: 100,
    originalHeight: 200,
    draw: function() {
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    },
    jump: function() {
        if (!this.isJumping && !this.isSliding) {
            this.isJumping = true;
            // 增加初始跳躍速度使跳得更高
            this.jumpVelocity = -10;  // 調整初始速度使高度為300px
        }
    },
    slide: function() {
        if (!this.isJumping && !this.isSliding) {
            this.isSliding = true;
            this.height = this.slideHeight;
            this.y = GROUND_Y - this.slideHeight;
        }
    },
    update: function() {
        // Handle jumping
        if (this.isJumping) {
            this.y += this.jumpVelocity;
            this.jumpVelocity += this.gravity;
            
            // 確保跳躍高度不超過300px
            const maxHeight = GROUND_Y - this.height - this.jumpHeight;
            if (this.y < maxHeight) {
                this.y = maxHeight;
                this.jumpVelocity = 0;  // 開始下落
            }
            
            // Check if landed
            if (this.y >= GROUND_Y - this.height) {
                this.y = GROUND_Y - this.height;
                this.isJumping = false;
                this.jumpVelocity = 0;
            }
        }
        
        // Reset sliding
        if (this.isSliding && !keyDown["ArrowDown"]) {
            this.height = this.originalHeight;
            this.y = GROUND_Y - this.originalHeight;
            this.isSliding = false;
        }
    },
    checkCollision: function(object) {
        return (
            this.x < object.x + object.width &&
            this.x + this.width > object.x &&
            this.y < object.y + object.height &&
            this.y + this.height > object.y
        );
    }
};

// Obstacle factory
function createObstacle() {
    const now = Date.now();
    
    // 減少障礙物生成頻率，使跳躍有更多時間
    if (now - lastObstacleTime < 1800 / (gameSpeed / 5)) return;
    
    // Check if last obstacle has traveled minimum distance
    if (obstacles.length > 0) {
        const lastObstacle = obstacles[obstacles.length - 1];
        if (canvas.width - (lastObstacle.x + lastObstacle.width) < minObstacleDistance) {
            return;
        }
    }
    
    // Randomly choose obstacle type (0: bottom obstacle, 1: top obstacle)
    const type = Math.floor(Math.random() * 2);
    
    let obstacle = {
        x: canvas.width,
        width: 120,
        type: type,
        speed: gameSpeed
    };
    
    if (type === 0) { // Bottom obstacle
        obstacle.height = 100;
        obstacle.y = GROUND_Y - obstacle.height;
    } else { // Top obstacle
        obstacle.height = canvas.height - GROUND_Y + 450;
        obstacle.y = 0;
    }
    
    obstacles.push(obstacle);
    lastObstacleTime = now;
}

// Coin factory - create coins on the ground
function createCoin() {
    const now = Date.now();
    
    // Control coin generation frequency
    if (now - lastCoinTime < 100) return;
    
    // Make sure coins don't spawn too close to obstacles
    let tooClose = false;
    obstacles.forEach(obstacle => {
        if (obstacle.type === 0) { // Only check ground obstacles
            const distance = obstacle.x - canvas.width;
            if (Math.abs(distance) < 200) {
                tooClose = true;
            }
        }
    });
    
    if (tooClose) return;
    
    // Create coin object
    const coin = {
        x: canvas.width,
        y: GROUND_Y - 30, // Position just above the ground
        width: 20,
        height: 20,
        speed: gameSpeed,
        value: 5
    };
    
    coins.push(coin);
    lastCoinTime = now;
}

// Draw coins
function drawCoins() {
    ctx.fillStyle = 'gold';
    coins.forEach(coin => {
        // Draw circle for coin
        ctx.beginPath();
        ctx.arc(coin.x + coin.width/2, coin.y + coin.height/2, coin.width/2, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Update coins
function updateCoins() {
    for (let i = coins.length - 1; i >= 0; i--) {
        coins[i].x -= coins[i].speed;
        
        // Remove coins that are off-screen
        if (coins[i].x + coins[i].width < 0) {
            coins.splice(i, 1);
            continue;
        }
        
        // Check if coin is collected
        if (character.checkCollision(coins[i])) {
            coinCount += coins[i].value;
            coins.splice(i, 1);
            // Play sound or add visual effect for coin collection here if desired
        }
    }
}

// Draw obstacles
function drawObstacles() {
    obstacles.forEach(obstacle => {
        if (obstacle.type === 0) {
            ctx.fillStyle = 'green';
        } else {
            ctx.fillStyle = 'blue';
        }
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });
}

// Update obstacles
function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= obstacles[i].speed;
        
        // Remove obstacles that are off-screen
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            continue;
        }
        
        // Check collision
        if (character.checkCollision(obstacles[i])) {
            gameOver();
        }
    }
}

// Draw ground
function drawGround() {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, GROUND_Y, canvas.width, GROUND_HEIGHT);
}

function drawBackground() {
    ctx.drawImage(backgroundImage, bgX, 0, canvas.width, canvas.height);
    ctx.drawImage(backgroundImage, bgX + canvas.width, 0, canvas.width, canvas.height);

    // 更新背景位置
    bgX -= bgSpeed;
    if (bgX <= -canvas.width) {
        bgX = 0;  // 當背景完全移動出畫面，重置位置
    }
}


// Draw score/timer and coin count
function drawScore() {
    ctx.fillStyle = 'black';
    ctx.font = '24px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`存活時間: ${Math.floor(score)} 秒`, canvas.width - 20, 30);
    
    // Draw coin count
    ctx.fillStyle = 'gold';
    ctx.textAlign = 'left';
    ctx.fillText(`金幣: ${coinCount}`, 20, 30);
}

// Main game loop
function gameLoop() {
    if (!gameActive) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update score
    score += 1/60;
    
    // Create obstacles and coins
    createObstacle();
    createCoin();
    
    // Draw and update game elements
    drawBackground();  // 先繪製背景
    drawGround();
    character.update();
    character.draw();
    updateObstacles();
    drawObstacles();
    updateCoins();
    drawCoins();
    drawScore();
    
    requestAnimationFrame(gameLoop);
}

// Start game function
function startGame() {
    gameActive = true;
    score = 0;
    coinCount = 0;
    obstacles = [];
    coins = [];
    gameSpeed = 5;
    
    // Reset character position
    character.y = GROUND_Y - character.originalHeight;
    character.height = 200; // 使用實際高度而非originalHeight
    this.height = this.originalHeight;
    this.y = GROUND_Y - this.originalHeight;
    this.isSliding = false;
    character.isJumping = false;
    
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    
    // Speed increase every 10 seconds
    speedIncreaseInterval = setInterval(() => {
        gameSpeed *= 1.1;
    }, 10000);
    
    gameLoop();
}

// Game over function
function gameOver() {
    gameActive = false;
    clearInterval(speedIncreaseInterval);
    
    finalTimeSpan.textContent = Math.floor(score);
    finalCoinsSpan.textContent = coinCount;
    gameOverScreen.style.display = 'flex';
}

// 跳轉到另一個網頁的函數
function redirectToNextPage() {
    window.open(REDIRECT_URL);
    newTab.location;
}

// Keyboard input
const keyDown = {};

window.addEventListener('keydown', function(e) {
    keyDown[e.key] = true;
    
    // Start game on any key if on start screen
    if (startScreen.style.display !== 'none') {
        startGame();
        return;
    }
    
    if (gameActive) {
        if (e.key === 'ArrowUp' || e.key === ' ') {
            character.jump();
        } else if (e.key === 'ArrowDown') {
            character.slide();
        }
    }
});

window.addEventListener('keyup', function(e) {
    keyDown[e.key] = false;
});

// 按鈕事件監聽
restartButton.addEventListener('click', startGame);
redirectButton.addEventListener('click', redirectToNextPage);