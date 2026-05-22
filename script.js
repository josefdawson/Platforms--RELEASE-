const button = document.getElementById("startButton");
const titleText = document.getElementById("title");
const player = document.getElementById("player");
const platformTemplate = document.getElementById("platform");
platformTemplate.classList.add("platform");
platformTemplate.style.display = "none";
const coordsUI = document.getElementById("coordsUI");
const red = document.getElementById("red")
const blue = document.getElementById("blue")
const black = document.getElementById("black")
const doorWidth = 100;
const doorHeight = 150;
const playerHeight = 50;
let platforms = [];
let stars = [];
let spikes = [];
const door = document.getElementById("finishDoor")
const star = document.getElementById("star")
const spike = document.getElementById("spike")
const starPoints = document.getElementById("starPoints")
const skipButton = document.getElementById("skipButton")
const chooseText = document.getElementById("chooseText")
const levelText = document.getElementById("lvl")
let levelRound = Math.floor(Math.random() * 5) + 1;
const wait = (ms) => new Promise(res => setTimeout(res, ms));
let level = 1
let points = 0
let isHardMode = false;
let isMultiplayer = false;
let isPaused = false;
let gameRunning = false;
let localReachedDoor = false;
let remotePlayersReachedDoor = {};

let x = 100, y = 100, vx = 0, vy = 0, onGround = false;
const keys = {};
let leftPressed = false;
let rightPressed = false;
let actionJump = false;
let actionDash = false;
let hasDoubleJump = false;
let doubleJumpUsed = false;
let hasDash = false;
let canDash = true;
let lastDirection = 1;
let shopOpen = false;
const DOUBLE_JUMP_COST = 10;
const DASH_COST = 15;
const SKIP_COST = 10;
let skipCount = 1;
let shopResolve = null;
let spawnX = x, spawnY = y;
const shopOverlay = document.getElementById("shopOverlay");
const shopStars = document.getElementById("shopStars");
const buyDoubleJump = document.getElementById("buyDoubleJump");
const buyDash = document.getElementById("buyDash");
const shopContinue = document.getElementById("shopContinue");
const buySkip = document.getElementById("buySkip");
const skipStatus = document.getElementById("skipStatus");
const doubleJumpStatus = document.getElementById("doubleJumpStatus");
const dashStatus = document.getElementById("dashStatus");
const mobileLeft = document.getElementById("mobileLeft");
const mobileRight = document.getElementById("mobileRight");
const mobileJump = document.getElementById("mobileJump");
const mobileDash = document.getElementById("mobileDash");

const modeSelectOverlay = document.getElementById("modeSelectOverlay");
const modeSelectBox = document.getElementById("modeSelectBox");
const normalModeBtn = document.getElementById("normalModeBtn");
const hardModeBtn = document.getElementById("hardModeBtn");

const multiplayerSelectOverlay = document.getElementById("multiplayerSelectOverlay");
const multiplayerSelectBox = document.getElementById("multiplayerSelectBox");
const singleplayerBtn = document.getElementById("singleplayerBtn");
const multiplayerBtn = document.getElementById("multiplayerBtn");

const pauseMenuOverlay = document.getElementById("pauseMenuOverlay");
const pauseMenuBox = document.getElementById("pauseMenuBox");
const resumeBtn = document.getElementById("resumeBtn");
const mainMenuBtn = document.getElementById("mainMenuBtn");

const confirmationOverlay = document.getElementById("confirmationOverlay");
const confirmationBox = document.getElementById("confirmationBox");
const confirmYesBtn = document.getElementById("confirmYesBtn");
const confirmNoBtn = document.getElementById("confirmNoBtn");

const remotePlayersContainer = document.getElementById("remotePlayersContainer");

let multiplayerSocket = null;
let playerId = null;
let myColor = '#ff0000';
let remotePlayers = {};

function initMultiplayer() {
    playerId = Math.random().toString(36).substr(2, 9);

    const serverUrl = "ws://localhost:8080";

    try {
        multiplayerSocket = new WebSocket(serverUrl);

        multiplayerSocket.onopen = function() {
            multiplayerSocket.send(JSON.stringify({
                type: "join",
                playerId: playerId
            }));
        };

        multiplayerSocket.onmessage = function(event) {
            const msg = JSON.parse(event.data);

            if (msg.type === "yourColor") {
                myColor = msg.color;
                player.style.backgroundColor = myColor;
            }

            if (msg.type === "playerList") {
                // Sync to the server's current level
                if (msg.currentLevel && msg.currentLevel !== level) {
                    level = msg.currentLevel;
                    levelText.textContent = "Level " + level;
                }

                for (const id in msg.players) {
                    if (id !== playerId) {
                        if (!remotePlayers[id]) {
                            createRemotePlayer(id, msg.players[id].color);
                        }
                        remotePlayers[id].x = msg.players[id].x;
                        remotePlayers[id].y = msg.players[id].y;
                    }
                }
                for (const id in remotePlayers) {
                    if (!msg.players[id]) {
                        removeRemotePlayer(id);
                    }
                }
            }

            if (msg.type === "levelSync") {
                level = msg.level;
                levelText.textContent = "Level " + level;
            }

            if (msg.type === "playerState") {
                if (msg.playerId !== playerId) {
                    if (!remotePlayers[msg.playerId]) {
                        createRemotePlayer(msg.playerId, '#44ff44');
                    }
                    remotePlayers[msg.playerId].x = msg.x;
                    remotePlayers[msg.playerId].y = msg.y;
                }
            }

            if (msg.type === "levelComplete") {
                if (msg.playerId !== playerId) {
                    remotePlayersReachedDoor[msg.playerId] = true;
                }
            }
        };

        multiplayerSocket.onerror = function(error) {
            console.error("WebSocket error:", error);
            isMultiplayer = false;
        };
    } catch (error) {
        console.error("Failed to connect:", error);
        isMultiplayer = false;
    }
}

function createRemotePlayer(id, color) {
    const el = document.createElement("div");
    el.className = "remote-player";
    el.style.backgroundColor = color;
    el.style.display = "block";
    el.style.left = "0px";
    el.style.top = "0px";
    remotePlayersContainer.appendChild(el);
    remotePlayers[id] = {
        el: el,
        x: 0,
        y: 0,
        reachedDoor: false
    };
}

function removeRemotePlayer(id) {
    if (remotePlayers[id]) {
        remotePlayers[id].el.remove();
        delete remotePlayers[id];
    }
    delete remotePlayersReachedDoor[id];
}

function sendPlayerState() {
    if (multiplayerSocket && multiplayerSocket.readyState === WebSocket.OPEN) {
        multiplayerSocket.send(JSON.stringify({
            type: "playerState",
            playerId: playerId,
            x: x,
            y: y
        }));
    }
}

function sendLevelComplete() {
    if (multiplayerSocket && multiplayerSocket.readyState === WebSocket.OPEN) {
        multiplayerSocket.send(JSON.stringify({
            type: "levelComplete",
            playerId: playerId
        }));
    }
}

window.onkeydown = (e) => {
    const key = e.key.toLowerCase();
    if (key === "escape") {
        if (isPaused) {
            resumeGame();
        } else {
            pauseGame();
        }
        return;
    }
    if (key === "a" || key === "d") {
        keys[key] = true;
        if (key === "a") lastDirection = -1;
        if (key === "d") lastDirection = 1;
    }
    if (key === " ") actionJump = true;
    if (key === "q") actionDash = true;
};
window.onkeyup = (e) => {
    const key = e.key.toLowerCase();
    if (key === "a" || key === "d") keys[key] = false;
};

async function startGame() {
    gameRunning = false;
    await wait(50);
    isPaused = false;
    gameRunning = true;
    player.style.display = "block";
    black.style.display = "none";
    blue.style.display = "none";
    red.style.display = "none";
    door.style.display = "block";
    star.style.display = "none";
    spike.style.display = "none";
    starPoints.style.display = isHardMode ? "none" : "inline";
    chooseText.style.display = "none";
    levelText.style.display = "inline";
    skipButton.style.display = isHardMode ? "none" : "inline-block";
    shopOverlay.classList.add("hidden");
    shopOpen = false;

    await pickRoundBase();
    skipButton.textContent = `Skip Level (${skipCount})`;
    skipButton.disabled = skipCount === 0;
    loop();
}

function pauseGame() {
    if (!shopOpen) {
        isPaused = true;
        pauseMenuOverlay.classList.remove("hidden");
    }
}

function resumeGame() {
    isPaused = false;
    pauseMenuOverlay.classList.add("hidden");
    if (!isMultiplayer) {
        loop();
    }
}

function returnToMainMenu() {
    confirmationOverlay.classList.remove("hidden");
    pauseMenuOverlay.classList.add("hidden");
}

button.addEventListener("click", function() {
    button.style.display = "none";
    titleText.style.display = "none";
    chooseText.textContent = "Choose Game Mode";
    normalModeBtn.style.display = "inline-block";
    hardModeBtn.style.display = "inline-block";
});

normalModeBtn.addEventListener("click", function() {
    isHardMode = false;
    normalModeBtn.style.display = "none";
    hardModeBtn.style.display = "none";
    chooseText.textContent = "Choose Player Mode";
    singleplayerBtn.style.display = "inline-block";
    multiplayerBtn.style.display = "inline-block";
});

hardModeBtn.addEventListener("click", function() {
    isHardMode = true;
    normalModeBtn.style.display = "none";
    hardModeBtn.style.display = "none";
    chooseText.textContent = "Choose Player Mode";
    singleplayerBtn.style.display = "inline-block";
    multiplayerBtn.style.display = "inline-block";
});

singleplayerBtn.addEventListener("click", function() {
    isMultiplayer = false;
    singleplayerBtn.style.display = "none";
    multiplayerBtn.style.display = "none";
    chooseText.textContent = "Choose your characters color!";
    black.style.display = "inline-block";
    blue.style.display = "inline-block";
    red.style.display = "inline-block";
});

multiplayerBtn.addEventListener("click", function() {
    isMultiplayer = true;
    singleplayerBtn.style.display = "none";
    multiplayerBtn.style.display = "none";
    chooseText.textContent = "Choose your characters color!";
    black.style.display = "inline-block";
    blue.style.display = "inline-block";
    red.style.display = "inline-block";
    initMultiplayer();
});

red.addEventListener("click", function() {
    if (!isMultiplayer) {
        player.style.backgroundColor = "red";
    }
    startGame()
})

blue.addEventListener("click", function() {
    if (!isMultiplayer) {
        player.style.backgroundColor = "blue";
    }
    startGame()
})

black.addEventListener("click", function() {
    if (!isMultiplayer) {
        player.style.backgroundColor = "black";
    }
    startGame()
})

buyDoubleJump.addEventListener("click", purchaseDoubleJump);
buyDash.addEventListener("click", purchaseDash);
buySkip.addEventListener("click", purchaseSkip);
skipButton.addEventListener("click", function() {
    if (skipCount > 0 && !shopOpen) {
        skipCount -= 1;
        skipButton.textContent = `Skip Level (${skipCount})`;
        skipButton.disabled = skipCount === 0;
        updateShopUI();
        finishRound();
    }
});
shopContinue.addEventListener("click", function() {
    if (shopResolve) {
        shopResolve();
        shopResolve = null;
    }
});

resumeBtn.addEventListener("click", function() {
    resumeGame();
});

mainMenuBtn.addEventListener("click", function() {
    returnToMainMenu();
});

confirmYesBtn.addEventListener("click", function() {
    gameRunning = false;
    confirmationOverlay.classList.add("hidden");
    pauseMenuOverlay.classList.add("hidden");
    isPaused = false;
    level = 1;
    points = 0;
    hasDoubleJump = false;
    hasDash = false;
    skipCount = 1;
    isHardMode = false;
    isMultiplayer = false;
    player.style.display = "none";
    door.style.display = "none";
    starPoints.style.display = "none";
    levelText.style.display = "none";
    coordsUI.style.display = "none";
    skipButton.style.display = "none";
    clearPlatforms();
    clearStars();
    clearSpikes();
    button.style.display = "block";
    titleText.style.display = "block";
    for (const id in remotePlayers) {
        removeRemotePlayer(id);
    }
    if (multiplayerSocket) {
        multiplayerSocket.close();
        multiplayerSocket = null;
    }
});

confirmNoBtn.addEventListener("click", function() {
    confirmationOverlay.classList.add("hidden");
    pauseMenuOverlay.classList.remove("hidden");
});

mobileLeft.addEventListener("pointerdown", function(e) {
    e.preventDefault();
    leftPressed = true;
});
mobileLeft.addEventListener("pointerup", function() { leftPressed = false; });
mobileLeft.addEventListener("pointercancel", function() { leftPressed = false; });

mobileRight.addEventListener("pointerdown", function(e) {
    e.preventDefault();
    rightPressed = true;
});
mobileRight.addEventListener("pointerup", function() { rightPressed = false; });
mobileRight.addEventListener("pointercancel", function() { rightPressed = false; });

mobileJump.addEventListener("pointerdown", function(e) {
    e.preventDefault();
    actionJump = true;
});

mobileDash.addEventListener("pointerdown", function(e) {
    e.preventDefault();
    actionDash = true;
});

function checkCollision(rect1, rect2) {
    const r1 = rect1.getBoundingClientRect();
    const r2 = rect2.getBoundingClientRect();

    return (
        r1.left < r2.right &&
        r1.right > r2.left &&
        r1.top < r2.bottom &&
        r1.bottom > r2.top
    );
}

function handleCollision(platRect) {
    if (vy > 0) {
        y = platRect.top - playerHeight;
        vy = 0;
        onGround = true;
        doubleJumpUsed = false;
        canDash = true;
    }
}

function isLanding(playerRect, platRect) {
    return (
        vy >= 0 &&
        playerRect.bottom <= platRect.top + 15 &&
        playerRect.bottom >= platRect.top - 20 &&
        playerRect.right > platRect.left + 10 &&
        playerRect.left < platRect.right - 10
    );
}

function clearPlatforms() {
    platforms.forEach(p => p.remove());
    platforms = [];
}

function clearStars() {
    stars.forEach(s => s.remove());
    stars = [];
}

function clearSpikes() {
    spikes.forEach(s => s.remove());
    spikes = [];
}

function createStarAt(xPos, yPos) {
    const s = star.cloneNode(true);
    s.id = "";
    s.className = "star-clone";
    s.style.left = xPos + "px";
    s.style.top = yPos + "px";
    s.style.display = "block";
    document.body.appendChild(s);
    stars.push(s);
    return s;
}

function createSpikeAt(xPos, yPos, width = 80, height = 80) {
    const s = spike.cloneNode(true);
    s.id = "";
    s.className = "spike-clone";
    s.style.left = xPos + "px";
    s.style.top = (yPos - height) + "px";
    s.style.width = width + "px";
    s.style.height = height + "px";
    s.style.display = "block";
    document.body.appendChild(s);
    spikes.push(s);
    return s;
}

function createPlatform(layout) {
    const p = platformTemplate.cloneNode(true);
    p.id = "";
    p.className = "platform";
    p.style.left = layout.left + "px";
    p.style.top = layout.top + "px";
    p.style.width = layout.width + "px";
    p.style.right = "";
    p.style.display = "block";
    document.body.appendChild(p);
    platforms.push(p);
    return p;
}

function clampPlatform(left, width) {
    // Allow platforms to extend far to the right (up to 8000px)
    const maxX = 8000;
    width = Math.min(width, maxX - left - 10);
    left = Math.max(10, Math.min(left, maxX - width - 10));
    return { left, width };
}

function jitter(value, range) {
    return value + Math.floor(Math.random() * (range * 2 + 1)) - range;
}

function getRoundLayout(roundId) {
    const h = window.innerHeight;
    const bottom = h - 140;

    function genPattern(type, count) {
        const result = [];
        const screenW = window.innerWidth;
        const baseLeft = 60 + Math.floor(Math.random() * 200);
        const spacing = Math.max(180, Math.floor(screenW / (count + 1)));

        for (let i = 0; i < count; i++) {
            const left = baseLeft + i * spacing + jitter(0, 40);
            let top;
            let width = isHardMode ? (160 + Math.floor(Math.random() * 120)) : (220 + Math.floor(Math.random() * 200));

            switch (type) {
                case 'ascending':
                    top = bottom - (i * 80) + jitter(0, 20);
                    break;
                case 'descending':
                    top = bottom - ((count - i - 1) * 80) + jitter(0, 20);
                    break;
                case 'pyramid':
                    top = bottom - (Math.abs(Math.floor(count / 2) - i) * 90) + jitter(0, 20);
                    break;
                case 'cluster':
                    top = bottom - (Math.floor(Math.random() * 220)) + jitter(0, 30);
                    width = isHardMode ? (120 + Math.floor(Math.random() * 180)) : (160 + Math.floor(Math.random() * 300));
                    break;
                case 'flat':
                    top = bottom + jitter(-30, 20);
                    width = isHardMode ? (180 + Math.floor(Math.random() * 120)) : (240 + Math.floor(Math.random() * 200));
                    break;
                case 'stagger':
                default:
                    top = bottom - ((i % 2 === 0) ? 40 : 160) + jitter(0, 20);
                    break;
            }

            result.push({ left: left, top: Math.max(120, top), width });
        }
        return result;
    }

    const patterns = ['ascending', 'descending', 'pyramid', 'cluster', 'flat', 'stagger'];
    const chosen = patterns[(roundId - 1) % patterns.length];
    const alt = patterns[Math.floor(Math.random() * patterns.length)];
    const patternType = Math.random() < 0.6 ? chosen : alt;
    let count = 3 + Math.floor(Math.random() * 3);

    if (isHardMode) {
        count = 4 + Math.floor(Math.random() * 3);
    }

    let rawPlatforms = genPattern(patternType, count);

    let platforms = rawPlatforms.map(p => {
        const minWidth = isHardMode ? 100 : 140;
        const jittered = {
            width: Math.max(minWidth, jitter(p.width, 40)),
            left: jitter(p.left, 30),
            top: Math.max(120, jitter(p.top, 25))
        };
        const clamped = clampPlatform(jittered.left, jittered.width);
        return { left: clamped.left, top: jittered.top, width: clamped.width };
    });

    platforms.sort((a, b) => a.left - b.left);

    const maxJump = 120;

    for (let i = 1; i < platforms.length; i++) {
        const lower = platforms[i - 1];
        const upper = platforms[i];
        const gap = lower.top - upper.top;
        if (gap > maxJump) {
            upper.top = lower.top - maxJump;
        }
        upper.top = Math.max(120, upper.top);
    }

    const doorPlatformIndex = Math.max(0, platforms.length - 1);
    const starPlatformIndex = Math.max(0, Math.floor(platforms.length / 2));

    const startPlat = platforms[0];
    const startX = startPlat ? Math.min(Math.max(20, startPlat.left + 20 + jitter(0, 30)), window.innerWidth - 80) : 80;
    const startY = startPlat ? Math.max(80, startPlat.top - playerHeight) : Math.max(80, bottom - playerHeight);

    return {
        platforms,
        startX,
        startY,
        doorPlatformIndex,
        starPlatformIndex
    };
}

function resetToSpawn() {
    x = (typeof spawnX === 'number') ? spawnX : 100;
    y = (typeof spawnY === 'number') ? spawnY : 100;
    vx = 0;
    vy = 0;
    player.style.left = x + "px";
    player.style.top = y + "px";
    onGround = true;
    doubleJumpUsed = false;
    canDash = true;
}

function updateShopUI() {
    shopStars.textContent = points;
    buyDoubleJump.disabled = hasDoubleJump || points < DOUBLE_JUMP_COST;
    buyDash.disabled = hasDash || points < DASH_COST;
    buySkip.disabled = points < SKIP_COST;
    doubleJumpStatus.textContent = hasDoubleJump ? "Owned" : "Not owned";
    dashStatus.textContent = hasDash ? "Owned" : "Not owned";
    skipStatus.textContent = skipCount > 0 ? `${skipCount} skip${skipCount === 1 ? '' : 's'} available` : "Need to buy skips";
    buyDoubleJump.textContent = hasDoubleJump ? "Purchased" : `Buy Double Jump (${DOUBLE_JUMP_COST})`;
    buyDash.textContent = hasDash ? "Purchased" : `Buy Dash (${DASH_COST})`;
    buySkip.textContent = `Buy Skip (${SKIP_COST})`;
    if (skipButton) {
        skipButton.textContent = `Skip Level (${skipCount})`;
        skipButton.disabled = skipCount === 0;
    }
}

function purchaseDoubleJump() {
    if (!hasDoubleJump && points >= DOUBLE_JUMP_COST) {
        points -= DOUBLE_JUMP_COST;
        hasDoubleJump = true;
        updateShopUI();
        starPoints.textContent = "Stars: " + points;
    }
}

function purchaseDash() {
    if (!hasDash && points >= DASH_COST) {
        points -= DASH_COST;
        hasDash = true;
        updateShopUI();
        starPoints.textContent = "Stars: " + points;
    }
}

function purchaseSkip() {
    if (points >= SKIP_COST) {
        points -= SKIP_COST;
        skipCount += 1;
        updateShopUI();
        starPoints.textContent = "Stars: " + points;
    }
}

function openShop() {
    shopOpen = true;
    shopOverlay.classList.remove("hidden");
    updateShopUI();
    return new Promise(resolve => {
        shopResolve = () => {
            shopOverlay.classList.add("hidden");
            shopOpen = false;
            resolve();
        };
    });
}

function tryJump() {
    if (onGround) {
        vy = -15;
        onGround = false;
        doubleJumpUsed = false;
    } else if (hasDoubleJump && !doubleJumpUsed) {
        vy = -15;
        doubleJumpUsed = true;
    }
}

function tryDash() {
    if (hasDash && canDash) {
        vx = lastDirection * 15;
        canDash = false;
    }
}

function loop() {
    if (!gameRunning) return;

    if (shopOpen) {
        requestAnimationFrame(loop);
        return;
    }

    if (isPaused && !isMultiplayer) {
        requestAnimationFrame(loop);
        return;
    }

    if (!isPaused) {
        const movingLeft = keys.a || leftPressed;
        const movingRight = keys.d || rightPressed;
        if (movingRight) {
            vx = 5;
            lastDirection = 1;
        } else if (movingLeft) {
            vx = -5;
            lastDirection = -1;
        } else {
            vx *= 0.8;
        }

        if (actionJump) {
            tryJump();
            actionJump = false;
        }
        if (actionDash) {
            tryDash();
            actionDash = false;
        }

        vy += 0.5;

        x += vx;
        y += vy;

        // No viewport clamping on X — player can move across the full platform width
        const maxY = window.innerHeight - 40;

        if (x < 0) x = 0;
        if (y < 0) { y = 0; vy = 0; }
        if (y >= maxY) {
            x = (typeof spawnX === 'number') ? spawnX : 100;
            y = (typeof spawnY === 'number') ? spawnY : 100;
            vx = 0;
            vy = 0;
            player.style.left = x + "px";
            player.style.top = y + "px";
            onGround = true;
        }

        player.style.left = x + "px";
        player.style.top = y + "px";

        if (coordsUI) {
            coordsUI.innerText = "X: " + Math.round(x) + " | Y: " + Math.round(y);
        }

        if (isMultiplayer) {
            sendPlayerState();
        }

        const playerRect = player.getBoundingClientRect();
        let landed = false;
        for (const plat of platforms) {
            const platRect = plat.getBoundingClientRect();
            if (checkCollision(player, plat)) {
                if (vy >= 0) {
                    const prevBottom = playerRect.bottom - vy;
                    if (prevBottom <= platRect.top + 5) {
                        handleCollision(platRect);
                        landed = true;
                        break;
                    }
                    if (playerRect.bottom > platRect.top && playerRect.top < platRect.top) {
                        y = platRect.top - playerHeight;
                        vy = 0;
                        onGround = true;
                        player.style.top = y + "px";
                        landed = true;
                        break;
                    }
                }
            }
        }
        if (!landed && y < maxY - 1) {
            onGround = false;
        }

        for (let i = stars.length - 1; i >= 0; i--) {
            const s = stars[i];
            if (checkCollision(player, s)) {
                points += 1;
                starPoints.textContent = "Stars: " + points;
                s.remove();
                stars.splice(i, 1);
            }
        }

        for (const hazard of spikes) {
            if (checkCollision(player, hazard)) {
                resetToSpawn();
                break;
            }
        }

        if (checkCollision(player, door)) {
            if (!localReachedDoor) {
                localReachedDoor = true;
                if (isMultiplayer) {
                    sendLevelComplete();
                }
                finishRound();
            }
        }
    }

    if (isMultiplayer) {
        for (const id in remotePlayers) {
            const rp = remotePlayers[id];
            rp.el.style.left = rp.x + "px";
            rp.el.style.top = rp.y + "px";

            if (checkCollision(rp.el, door)) {
                remotePlayersReachedDoor[id] = true;
            }
        }
    }

    requestAnimationFrame(loop);
}


async function finishRound() {
    if (isMultiplayer) {
        if (!localReachedDoor) {
            return;
        }
    }
    localReachedDoor = false;
    player.style.display = "none";
    levelText.textContent = "Completed!"
    level += 1
    await wait(1000);
    if (!isHardMode && level % 15 === 0) {
        await openShop();
    }
    await pickRoundBase();
    levelText.textContent = "Level " + level
}

const MULTIPLAYER_LEVELS = [
    {
        platforms: [
            { left: 50, top: 550, width: 200 },
            { left: 300, top: 470, width: 180 },
            { left: 530, top: 390, width: 160 },
            { left: 740, top: 310, width: 180 },
            { left: 970, top: 230, width: 200 }
        ],
        doorPlatformIndex: 4,
        starPlatformIndex: 2,
        startX: 100,
        startY: 500
    },
    {
        platforms: [
            { left: 30, top: 500, width: 180 },
            { left: 260, top: 420, width: 140 },
            { left: 450, top: 500, width: 160 },
            { left: 660, top: 340, width: 150 },
            { left: 860, top: 420, width: 140 },
            { left: 1050, top: 260, width: 180 }
        ],
        doorPlatformIndex: 5,
        starPlatformIndex: 2,
        startX: 80,
        startY: 450
    },
    {
        platforms: [
            { left: 20, top: 520, width: 220 },
            { left: 290, top: 440, width: 160 },
            { left: 500, top: 360, width: 140 },
            { left: 690, top: 440, width: 160 },
            { left: 900, top: 360, width: 140 },
            { left: 1090, top: 280, width: 200 }
        ],
        doorPlatformIndex: 5,
        starPlatformIndex: 2,
        startX: 70,
        startY: 470
    },
    {
        platforms: [
            { left: 40, top: 580, width: 200 },
            { left: 280, top: 500, width: 180 },
            { left: 510, top: 420, width: 160 },
            { left: 720, top: 340, width: 180 },
            { left: 950, top: 260, width: 160 },
            { left: 1160, top: 180, width: 200 }
        ],
        doorPlatformIndex: 5,
        starPlatformIndex: 2,
        startX: 90,
        startY: 530
    },
    {
        platforms: [
            { left: 60, top: 540, width: 160 },
            { left: 270, top: 460, width: 140 },
            { left: 460, top: 380, width: 180 },
            { left: 690, top: 460, width: 140 },
            { left: 880, top: 300, width: 160 },
            { left: 1090, top: 220, width: 180 }
        ],
        doorPlatformIndex: 5,
        starPlatformIndex: 2,
        startX: 110,
        startY: 490
    },
    {
        platforms: [
            { left: 10, top: 560, width: 240 },
            { left: 300, top: 480, width: 200 },
            { left: 550, top: 400, width: 180 },
            { left: 780, top: 320, width: 200 },
            { left: 1030, top: 240, width: 240 }
        ],
        doorPlatformIndex: 4,
        starPlatformIndex: 2,
        startX: 60,
        startY: 510
    },
    {
        platforms: [
            { left: 50, top: 500, width: 180 },
            { left: 280, top: 420, width: 160 },
            { left: 490, top: 340, width: 140 },
            { left: 680, top: 260, width: 160 },
            { left: 890, top: 340, width: 140 },
            { left: 1080, top: 260, width: 180 }
        ],
        doorPlatformIndex: 5,
        starPlatformIndex: 2,
        startX: 100,
        startY: 450
    },
    {
        platforms: [
            { left: 30, top: 580, width: 200 },
            { left: 280, top: 500, width: 160 },
            { left: 490, top: 580, width: 180 },
            { left: 720, top: 420, width: 160 },
            { left: 930, top: 340, width: 180 },
            { left: 1160, top: 260, width: 200 }
        ],
        doorPlatformIndex: 5,
        starPlatformIndex: 2,
        startX: 80,
        startY: 530
    },
    {
        platforms: [
            { left: 40, top: 520, width: 220 },
            { left: 310, top: 440, width: 180 },
            { left: 540, top: 360, width: 160 },
            { left: 750, top: 280, width: 180 },
            { left: 980, top: 200, width: 220 }
        ],
        doorPlatformIndex: 4,
        starPlatformIndex: 2,
        startX: 90,
        startY: 470
    },
    {
        platforms: [
            { left: 20, top: 550, width: 200 },
            { left: 270, top: 470, width: 160 },
            { left: 480, top: 390, width: 180 },
            { left: 710, top: 470, width: 160 },
            { left: 920, top: 310, width: 180 },
            { left: 1150, top: 230, width: 200 }
        ],
        doorPlatformIndex: 5,
        starPlatformIndex: 2,
        startX: 70,
        startY: 500
    }
];

async function pickRoundBase() {
    clearPlatforms();
    clearStars();
    clearSpikes();

    if (isMultiplayer) {
        const levelIndex = (level - 1) % MULTIPLAYER_LEVELS.length;
        const layout = MULTIPLAYER_LEVELS[levelIndex];

        layout.platforms.forEach(platformLayout => createPlatform(platformLayout));

        const doorPlatform = layout.platforms[layout.doorPlatformIndex];
        const doorLeft = Math.round(doorPlatform.left + Math.max(0, (doorPlatform.width - doorWidth) / 2));
        door.style.left = doorLeft + "px";
        door.style.top = (doorPlatform.top - doorHeight) + "px";
        door.style.right = "";
        door.style.display = "block";

        const starCount = Math.floor((level - 1) / 10) + 1;
        const availableStarIndices = layout.platforms.map((_, i) => i).filter(i => i !== layout.doorPlatformIndex);
        for (let i = 0; i < starCount && i < availableStarIndices.length; i++) {
            const idx = availableStarIndices[i];
            const plat = layout.platforms[idx];
            const sx = Math.round(plat.left + Math.max(0, (plat.width - 40) / 2));
            const sy = plat.top - 100;
            createStarAt(sx, sy);
        }

        const spikeWidth = 80;
        const spikeHeight = 80;
        const availableSpikeIndices = layout.platforms.map((_, i) => i).filter(i => i !== 0 && i !== layout.doorPlatformIndex);
        const maxSpikes = Math.max(1, Math.floor((availableSpikeIndices.length + 1) / 2));
        let spikeCount = Math.min(Math.max(1, Math.floor((level - 1) / 3) + 1), maxSpikes);
        if (isHardMode) {
            spikeCount = Math.min(spikeCount * 2, availableSpikeIndices.length);
        }
        if (availableSpikeIndices.length > 0) {
            const chosenSpikeIndices = [];
            const minPlatformGap = 2;
            for (const idx of availableSpikeIndices) {
                if (chosenSpikeIndices.length >= spikeCount) break;
                const tooClose = chosenSpikeIndices.some(existing => Math.abs(existing - idx) < minPlatformGap);
                if (!tooClose) {
                    chosenSpikeIndices.push(idx);
                }
            }
            if (chosenSpikeIndices.length < spikeCount) {
                for (const idx of availableSpikeIndices) {
                    if (chosenSpikeIndices.length >= spikeCount) break;
                    if (!chosenSpikeIndices.includes(idx)) {
                        chosenSpikeIndices.push(idx);
                    }
                }
            }
            chosenSpikeIndices.sort((a, b) => a - b);

            chosenSpikeIndices.forEach(idx => {
                const plat = layout.platforms[idx];
                const sx = Math.round(plat.left + Math.max(0, (plat.width - spikeWidth) / 2));
                const sy = plat.top;
                createSpikeAt(sx, sy, spikeWidth, spikeHeight);
            });
        }

        x = layout.startX;
        y = layout.startY - 1;
        player.style.left = x + "px";
        player.style.top = y + "px";

        spawnX = x;
        spawnY = y;
        onGround = true;

        await wait(300);
        player.style.display = "block";
        return;
    }

    let newRound;
    do {
        newRound = Math.floor(Math.random() * 5) + 1;
    } while (newRound === levelRound);
    levelRound = newRound;

    const layout = getRoundLayout(levelRound);
    if (!layout) return;

    layout.platforms.forEach(platformLayout => createPlatform(platformLayout));

    const doorPlatform = layout.platforms[layout.doorPlatformIndex];
    const doorLeft = Math.round(doorPlatform.left + Math.max(0, (doorPlatform.width - doorWidth) / 2));
    door.style.left = doorLeft + "px";
    door.style.top = (doorPlatform.top - doorHeight) + "px";
    door.style.right = "";
    door.style.display = "block";

    const starCount = Math.floor((level - 1) / 10) + 1;
    const availableStarIndices = layout.platforms.map((_, i) => i).filter(i => i !== layout.doorPlatformIndex);
    for (let i = 0; i < starCount; i++) {
        const idx = availableStarIndices[Math.floor(i * availableStarIndices.length / starCount)];
        const plat = layout.platforms[idx];
        const sx = Math.round(plat.left + Math.max(0, (plat.width - 40) / 2));
        const sy = plat.top - 100;
        createStarAt(sx, sy);
    }

    const spikeWidth = 80;
    const spikeHeight = 80;
    const availableSpikeIndices = layout.platforms.map((_, i) => i).filter(i => i !== 0 && i !== layout.doorPlatformIndex);
    const maxSpikes = Math.max(1, Math.floor((availableSpikeIndices.length + 1) / 2));
    let spikeCount = Math.min(Math.max(1, Math.floor((level - 1) / 3) + 1), maxSpikes);
    if (isHardMode) {
        spikeCount = Math.min(spikeCount * 2, availableSpikeIndices.length);
    }
    if (availableSpikeIndices.length > 0) {
        const chosenSpikeIndices = [];
        const minPlatformGap = 2;
        for (const idx of availableSpikeIndices) {
            if (chosenSpikeIndices.length >= spikeCount) break;
            const tooClose = chosenSpikeIndices.some(existing => Math.abs(existing - idx) < minPlatformGap);
            if (!tooClose) {
                chosenSpikeIndices.push(idx);
            }
        }
        if (chosenSpikeIndices.length < spikeCount) {
            for (const idx of availableSpikeIndices) {
                if (chosenSpikeIndices.length >= spikeCount) break;
                if (!chosenSpikeIndices.includes(idx)) {
                    chosenSpikeIndices.push(idx);
                }
            }
        }
        chosenSpikeIndices.sort((a, b) => a - b);

        chosenSpikeIndices.forEach(idx => {
            const plat = layout.platforms[idx];
            const sx = Math.round(plat.left + Math.max(0, (plat.width - spikeWidth) / 2));
            const sy = plat.top;
            createSpikeAt(sx, sy, spikeWidth, spikeHeight);
        });
    }

    x = layout.startX;
    y = layout.startY - 1;
    player.style.left = x + "px";
    player.style.top = y + "px";

    spawnX = x;
    spawnY = y;
    onGround = true;

    await wait(300);
    player.style.display = "block";
}
