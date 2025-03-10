// Game elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
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
let coinCount = 0;
let obstacles = [];
let coins = [];
let speedIncreaseInterval;
let lastObstacleTime = 0;
let lastCoinTime = 0;
let minObstacleDistance = 500;
let changeCharacterRunStatus;

//background image
const backgroundImage = new Image();
backgroundImage.src = 'background.webp';  // 確保該圖片與HTML/CSS配合

const highObstacles = new Image();
highObstacles.src = 'high.png';  // 確保該圖片與HTML/CSS配合

const lowObstacles = new Image();
lowObstacles.src = 'low.png';  // 確保該圖片與HTML/CSS配合

const floorImage = new Image();
floorImage.src = 'floor.png';  // 確保該圖片與HTML/CSS配合

// 背景位置
let bgX = 0;
const bgSpeed = 0.1;  // 背景移動速度

let objposX = 0;
let floorX = 0;

const characterRun1 = new Image();
characterRun1.src = 'run1.png';  // 確保該圖片與HTML/CSS配合
const characterRun2 = new Image();
characterRun2.src = 'run2.png';  // 確保該圖片與HTML/CSS配合
const characterSlide = new Image();
characterSlide.src = 'slide.png';  // 確保該圖片與HTML/CSS配合
let characterRunStauts = 0;
let characterSpriteStatus = 'run';

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
    gravity: 0.3,  // 降低重力使跳躍更高更遠
    slideHeight: 100,
    originalHeight: 200,
    draw: function () {
        ctx.fillStyle = 'transparent';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        if (this.isSliding) {
            ctx.drawImage(characterSlide, this.x - (this.x - characterSlide.x) / 2, this.y + 10, characterSlide.width * 0.6, characterSlide.height * 0.6);
        }
        else if (characterRunStauts == 1) {
            ctx.drawImage(characterRun2, this.x, this.y, characterRun2.width * 0.5, characterRun2.height * 0.5);
        }
        else if (characterRunStauts == 0) {
            ctx.drawImage(characterRun1, this.x, this.y, characterRun1.width * 0.5, characterRun1.height * 0.5);
        }
    },
    jump: function () {
        if (!this.isJumping && !this.isSliding) {
            this.isJumping = true;
            // 增加初始跳躍速度使跳得更高
            this.jumpVelocity = -14;  // 調整初始速度使高度為300px
        }
    },
    slide: function () {
        if (!this.isJumping && !this.isSliding) {
            this.isSliding = true;
            this.height = this.slideHeight;
            this.y = GROUND_Y - this.slideHeight;
        }
    },
    update: function () {
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
    checkCollision: function (object) {
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
    // Create coin object
    const coin = {
        x: canvas.width,
        y: GROUND_Y - 30, // Position just above the ground
        width: 20,
        height: 20,
        speed: gameSpeed,
        value: 5
    };

    const now = Date.now();

    // Control coin generation frequency
    if (now - lastCoinTime < 100) return;

    // Make sure coins don't spawn too close to obstacles
    let tooClose = false;
    obstacles.forEach(obstacle => {
        if (obstacle.x < 10) {
            tooClose = true;
        }
        else if (obstacle.type === 0) { // Only check ground obstacles
            const distance = obstacle.x - canvas.width;
            if (Math.abs(distance) < 200) {
                tooClose = true;
            }
        }
    });

    if (tooClose) return;



    coins.push(coin);
    lastCoinTime = now;
}

// Draw coins
function drawCoins() {
    ctx.fillStyle = 'gold';
    coins.forEach(coin => {
        // Draw circle for coin
        ctx.beginPath();
        ctx.arc(coin.x + coin.width / 2, coin.y + coin.height / 2, coin.width / 2, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Update coins
function updateCoins() {
    for (let i = coins.length - 1; i >= 0; i--) {
        coins[i].x -= gameSpeed;

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
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height)
            ctx.drawImage(lowObstacles, obstacle.x + (obstacle.width - lowObstacles.width) / 2, obstacle.y);
        } else {
            ctx.fillStyle = 'blue';
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height)
            ctx.drawImage(highObstacles, obstacle.x + (obstacle.width - highObstacles.width) / 2, obstacle.y);
        }
        //ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });
}

// Update obstacles
function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= gameSpeed;
        objposX = obstacles[i].x;

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
    ctx.drawImage(floorImage, floorX, GROUND_Y);
    ctx.drawImage(floorImage, floorX + canvas.width, GROUND_Y);

    // 更新背景位置
    floorX -= gameSpeed;
    if (floorX <= -canvas.width) {
        floorX = 0;  // 當背景完全移動出畫面，重置位置
    }
}

function drawBackground() {
    ctx.drawImage(backgroundImage, bgX, 0, canvas.width, canvas.height);
    ctx.drawImage(backgroundImage, bgX + canvas.width - 1, 0, canvas.width, canvas.height);

    // 更新背景位置
    bgX -= bgSpeed;
    if (bgX <= -canvas.width) {
        bgX = 0;  // 當背景完全移動出畫面，重置位置
    }
}


// Draw score/timer and coin count
function drawScore() {
    // Draw coin count
    ctx.fillStyle = 'gold';
    ctx.font = '24px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`金幣: ${coinCount}`, canvas.width - 30, 30);
}

function updatelevel() {
    gameSpeed = 5 * (1 + level / 5);
}

// 設定目標 FPS
const targetFPS = 60;
const frameInterval = 100 / targetFPS;  // 每幀的間隔時間（毫秒）

let lastFrameTime = 0;

function gameLoop(timestamp) {
    if (!gameActive) return;

    // 計算每幀的時間間隔
    const deltaTime = timestamp - lastFrameTime;
    if (deltaTime < frameInterval) return;

    // 更新上次幀的時間
    lastFrameTime = timestamp - (deltaTime % frameInterval);

    // 清空畫布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 創建障礙物與金幣
    createObstacle();
    createCoin();

    // 繪製與更新遊戲元素
    drawBackground();
    updatelevel();
    character.update();
    character.draw();
    updateObstacles();
    drawGround();
    drawObstacles();
    updateCoins();
    drawCoins();
    drawScore();

    // 繼續執行下一幀
    requestAnimationFrame(gameLoop);
}

// 開始遊戲
function startGame() {
    gameActive = true;
    coinCount = 0;
    obstacles = [];
    coins = [];
    level = 1;
    gameSpeed = 5;

    // 重置角色位置
    character.y = GROUND_Y - character.originalHeight;
    character.height = 200;
    character.isSliding = false;
    character.isJumping = false;

    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';

    // 每 10 秒提高遊戲速度
    speedIncreaseInterval = setInterval(() => {
        level += 1;
    }, 20000);

    // 每 100 毫秒更新角色狀態
    changeCharacterRunStatus = setInterval(() => {
        characterRunStauts += 1;
        characterRunStauts %= 2;
    }, 100);

    // 開始遊戲循環
    requestAnimationFrame(gameLoop);
}

// Game over function
function gameOver() {
    gameActive = false;
    clearInterval(speedIncreaseInterval);
    clearInterval(changeCharacterRunStatus);
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

window.addEventListener('keydown', function (e) {
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

window.addEventListener('keyup', function (e) {
    keyDown[e.key] = false;
});

// 按鈕事件監聽
restartButton.addEventListener('click', startGame);
redirectButton.addEventListener('click', redirectToNextPage);