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
const colorText = document.getElementById("textColor")
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

window.onkeydown = (e) => {
    const key = e.key.toLowerCase();
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
    player.style.display = "block";
    black.style.display = "none";
    blue.style.display = "none";
    red.style.display = "none";
    door.style.display = "block";
    star.style.display = "none"; // keep template hidden
    spike.style.display = "none"; // keep spike template hidden
    starPoints.style.display = "inline";
    chooseText.style.display = "none";
    levelText.style.display = "inline";
    skipButton.style.display = "inline-block";
    shopOverlay.classList.add("hidden");
    shopOpen = false;

    await pickRoundBase();
    skipButton.textContent = `Skip Level (${skipCount})`;
    skipButton.disabled = skipCount === 0;
    loop(); 
}

button.addEventListener("click", function() {
    button.style.display = "none";
    titleText.style.display = "none";
    black.style.display = "inline-block";
    blue.style.display = "inline-block";
    red.style.display = "inline-block";
    chooseText.style.display = "inline";
});

red.addEventListener("click", function() {
    player.style.backgroundColor = "red";
    startGame()
})

blue.addEventListener("click", function() {
    player.style.backgroundColor = "blue";
    startGame()
})

black.addEventListener("click", function() {
    player.style.backgroundColor = "black";
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
    const maxX = window.innerWidth - 20;
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

    // Generate varied platform patterns instead of fixed stairs
    function genPattern(type, count) {
        const result = [];
        const screenW = window.innerWidth;
        const baseLeft = 60 + Math.floor(Math.random() * 200);
        const spacing = Math.max(180, Math.floor(screenW / (count + 1)));

        for (let i = 0; i < count; i++) {
            const left = baseLeft + i * spacing + jitter(0, 40);
            let top;
            let width = 220 + Math.floor(Math.random() * 200);

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
                    width = 160 + Math.floor(Math.random() * 300);
                    break;
                case 'flat':
                    top = bottom + jitter(-30, 20);
                    width = 240 + Math.floor(Math.random() * 200);
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
    // Choose a pattern influenced by roundId but with randomness
    const chosen = patterns[(roundId - 1) % patterns.length];
    const alt = patterns[Math.floor(Math.random() * patterns.length)];
    const patternType = Math.random() < 0.6 ? chosen : alt;
    const count = 3 + Math.floor(Math.random() * 3); // 3..5 platforms

    let rawPlatforms = genPattern(patternType, count);

    // Apply jitter and clamping
    let platforms = rawPlatforms.map(p => {
        const jittered = {
            width: Math.max(140, jitter(p.width, 40)),
            left: jitter(p.left, 30),
            top: Math.max(120, jitter(p.top, 25))
        };
        const clamped = clampPlatform(jittered.left, jittered.width);
        return { left: clamped.left, top: jittered.top, width: clamped.width };
    });

    // Ensure platforms are ordered left-to-right so progression makes sense
    platforms.sort((a, b) => a.left - b.left);

    // Player jump capability (approx). Keeps vertical gaps reachable.
    const maxJump = 120; // pixels - safe upper bound for current jump parameters

    // Enforce vertical gaps between consecutive platforms so the player can reach them
    for (let i = 1; i < platforms.length; i++) {
        const lower = platforms[i - 1];
        const upper = platforms[i];
        const gap = lower.top - upper.top; // positive when upper is higher (smaller top)
        if (gap > maxJump) {
            // Move the upper platform down so gap == maxJump
            upper.top = lower.top - maxJump;
        }
        // Never place a platform too close to the top of the viewport
        upper.top = Math.max(120, upper.top);
    }

    // Decide door and star platforms after sorting & constraining
    const doorPlatformIndex = Math.max(0, platforms.length - 1); // put door on right-most platform by default
    const starPlatformIndex = Math.max(0, Math.floor(platforms.length / 2)); // middle platform

    // Ensure start position sits on the first (left-most) platform
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
    if (shopOpen) {
        requestAnimationFrame(loop);
        return;
    }

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

    const maxX = window.innerWidth - 40;
    const maxY = window.innerHeight - 40;

    if (x < 0) x = 0;
    if (x > maxX) x = maxX;
    if (y < 0) { y = 0; vy = 0; }
    if (y >= maxY) {
        // Player touched bottom — reset to spawn position
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

    const playerRect = player.getBoundingClientRect();
    let landed = false;
    for (const plat of platforms) {
        const platRect = plat.getBoundingClientRect();
        if (checkCollision(player, plat)) {
            // If moving downwards, check if previous bottom was above platform top -> landing
            if (vy >= 0) {
                const prevBottom = playerRect.bottom - vy;
                if (prevBottom <= platRect.top + 5) {
                    handleCollision(platRect);
                    landed = true;
                    break;
                }
                // If penetration happened (fast fall), snap player to platform top
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

    // Check collisions with spawned stars
    for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i];
        if (checkCollision(player, s)) {
            points += 1;
            starPoints.textContent = "Stars: " + points;
            s.remove();
            stars.splice(i, 1);
        }
    }

    // Check collisions with spawned spike hazards
    for (const hazard of spikes) {
        if (checkCollision(player, hazard)) {
            resetToSpawn();
            break;
        }
    }

    if (checkCollision(player, door)) {
        finishRound();
    }

    requestAnimationFrame(loop);
}


async function finishRound() {
    player.style.display = "none";
    levelText.textContent = "Completed!"
    level += 1
    await wait(1000);
    if (level % 15 === 0) {
        await openShop();
    }
    await pickRoundBase();
    levelText.textContent = "Level " + level
}

async function pickRoundBase() {
    clearPlatforms();
    clearStars();
    clearSpikes();

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

    // spawn stars based on level: every 10 levels adds one more star
    const starCount = Math.floor((level - 1) / 10) + 1;
    const availableStarIndices = layout.platforms.map((_, i) => i).filter(i => i !== layout.doorPlatformIndex);
    for (let i = 0; i < starCount; i++) {
        const idx = availableStarIndices[Math.floor(i * availableStarIndices.length / starCount)];
        const plat = layout.platforms[idx];
        const sx = Math.round(plat.left + Math.max(0, (plat.width - 40) / 2));
        const sy = plat.top - 100;
        createStarAt(sx, sy);
    }

    // spawn hazards based on level: more spikes in harder levels, but keep them spaced apart
    const spikeWidth = 80;
    const spikeHeight = 80;
    const availableSpikeIndices = layout.platforms.map((_, i) => i).filter(i => i !== 0 && i !== layout.doorPlatformIndex);
    const maxSpikes = Math.max(1, Math.floor((availableSpikeIndices.length + 1) / 2));
    const spikeCount = Math.min(Math.max(1, Math.floor((level - 1) / 3) + 1), maxSpikes);
    if (availableSpikeIndices.length > 0) {
        const chosenSpikeIndices = [];
        const minPlatformGap = 2; // do not place spikes on adjacent platforms when possible
        for (const idx of availableSpikeIndices) {
            if (chosenSpikeIndices.length >= spikeCount) break;
            const tooClose = chosenSpikeIndices.some(existing => Math.abs(existing - idx) < minPlatformGap);
            if (!tooClose) {
                chosenSpikeIndices.push(idx);
            }
        }
        // if we still need more spikes, allow closer placement but still avoid duplicate platforms
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
    // place the player just above the platform to avoid spawning inside it
    y = layout.startY - 1;
    player.style.left = x + "px";
    player.style.top = y + "px";

    // record spawn so we can reset if the player falls off the bottom
    spawnX = x;
    spawnY = y;
    onGround = true;

    await wait(300);
    player.style.display = "block";
}
