// game.js
class GoalieClicker {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Конфигурация
        this.FPS = 60;
        this.PUCK_RADIUS = 14;
        this.START_LIVES = 1;
        this.MAX_SPEED_MULT = 3;
        this.SPEED_RAMP_TIME = 60.0;
        this.BOUQUET_SCALE = 2.0;
        this.MAN_X = 0.63;
        this.MAN_Y = 0.6;
        this.MAN_SCALE = 2.3;
        this.MAN_SWITCH_SPEED = 0.5;
        this.manTimer = 0;
        this.manFrame = 0;
        this.WOMAN_X = 0.42;
        this.WOMAN_Y = 0.6;
        this.WOMAN_SCALE = 2.3;
        this.WOMAN_SWITCH_SPEED = 0.6;
        this.womanTimer = 0;
        this.womanFrame = 0;

        this.muted = false;
        this.assetsLoaded = false;
        this.loadingProgress = 0;
        this.bgRect = { x: 0, y: 0, width: 0, height: 0 };
        this.bgScale = 1;
        
        this.config = {
            "bg": { "path": "background.jpg", "width": 1024, "height": 1470, "aspectRatio": 1024/1470 },
            "goalieL": { "img": "keepL.png", "x_rel": 0.1, "y_rel": 0.68, "scale": 1.25 },
            "goalieR": { "img": "keepR.png", "x_rel": 0.65, "y_rel": 0.68, "scale": 1.25 },
            "spawns": [{ "x_rel": 0.233, "y_rel": 0.1 }, { "x_rel": 0.76, "y_rel": 0.1 }],
            "targets": [{ "x_rel": 0.233, "y_rel": 1.0 }, { "x_rel": 0.76, "y_rel": 1.0 }],
            "line": { "y_rel": 0.8 }
        };
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.loadAssets();
        this.resetGameState();
        this.setupUI();
        this.gameLoop();
    }

    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        window.addEventListener('orientationchange', () => setTimeout(() => this.resizeCanvas(), 100));
    }

    resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const gameContainer = document.getElementById('gameContainer');
        const rect = gameContainer.getBoundingClientRect();

        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
        this.canvas.width = Math.round(rect.width * dpr);
        this.canvas.height = Math.round(rect.height * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        
        this.computeGameRect();
    }

    computeGameRect() {
        const rect = this.canvas.getBoundingClientRect();
        const canvasWidth = rect.width;
        const canvasHeight = rect.height;

        const bgAspect = this.config.bg.aspectRatio;
        const containerAspect = canvasWidth / canvasHeight;
        
        if (containerAspect > bgAspect) {
            this.bgRect.height = canvasHeight;
            this.bgRect.width = canvasHeight * bgAspect;
            this.bgRect.x = (canvasWidth - this.bgRect.width) / 2;
            this.bgRect.y = 0;
        } else {
            this.bgRect.width = canvasWidth;
            this.bgRect.height = canvasWidth / bgAspect;
            this.bgRect.x = 0;
            this.bgRect.y = (canvasHeight - this.bgRect.height) / 2;
        }
        
        this.bgScale = this.bgRect.width / this.config.bg.width;
        this.setupSpawnsAndTargets();
    }

    async loadAssets() {
        this.assets = {};
        await this.loadImages();
        await this.loadSounds();
    }

    loadImages() {
        return new Promise((resolve) => {
            const imagesToLoad = [
                { key: 'bg', path: this.config.bg.path },
                { key: 'goalieL', path: this.config.goalieL.img },
                { key: 'goalieR', path: this.config.goalieR.img },
                { key: 'bouquet', path: 'bouquet.png' },
                { key: 'man1', path: 'man_1.png' },
                { key: 'man2', path: 'man_2.png' },
                { key: 'woman1', path: 'woman_1.png' },
                { key: 'woman2', path: 'woman_2.png' },
            ];
            
            const totalAssets = imagesToLoad.length;
            let loadedCount = 0;

            imagesToLoad.forEach(imgData => {
                const img = new Image();
                img.onload = () => {
                    loadedCount++;
                    this.loadingProgress = (loadedCount / totalAssets) * 100;
                    this.updateLoadingDisplay();
                    if (loadedCount === totalAssets) {
                        this.assetsLoaded = true;
                        this.enableStartButton();
                        resolve();
                    }
                };
                img.onerror = () => {
                    console.error(`Не удалось загрузить: assets/${imgData.path}`);
                    loadedCount++;
                    if (loadedCount === totalAssets) {
                        this.assetsLoaded = true;
                        this.enableStartButton();
                        resolve();
                    }
                };
                img.src = `assets/${imgData.path}`;
                this.assets[imgData.key] = img;
            });
        });
    }

    updateLoadingDisplay() {
        const loadingText = document.getElementById('loadingText');
        if (loadingText) {
            loadingText.textContent = `Загрузка... ${Math.round(this.loadingProgress)}%`;
        }
    }

    enableStartButton() {
        const startButton = document.getElementById('startButton');
        const loadingText = document.getElementById('loadingText');
        if (startButton) {
            setTimeout(() => {
                startButton.disabled = false;
                if (loadingText) loadingText.style.display = 'none';
            }, 500);
        }
    }

    async loadSounds() {
        this.sounds = {};
        const soundsToLoad = [ { key: 'background', path: 'game.mp3' }, { key: 'save', path: 'save.mp3' }, { key: 'miss', path: 'miss.mp3' }];
        for (const sound of soundsToLoad) {
            try {
                const audio = new Audio(`assets/${sound.path}`);
                audio.loop = sound.key === 'background';
                this.sounds[sound.key] = audio;
            } catch (error) { console.warn(`Не удалось загрузить звук: ${sound.path}`, error); }
        }
    }

    setupEventListeners() {
        this.canvas.addEventListener('click', () => this.handleClick());
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        document.addEventListener('keydown', (e) => this.handleKey(e));
    }

    resetGameState() {
        this.score = 0;
        this.lives = this.START_LIVES;
        this.speedMult = 1.0;
        this.elapsed = 0;
        this.pucks = [];
        this.spawnTimer = 0;
        this.lineY = this.config.line.y_rel * this.bgRect.height;
        this.gameOver = false;
        this.playing = false;
        this.goalieL = this.createGoalie("L");
        this.goalieR = this.createGoalie("R");
        this.currentGoalie = this.goalieL;
    }

    setupUI() {
        document.getElementById('startButton').addEventListener('click', () => { if (this.assetsLoaded) this.startGame(); });
        document.getElementById('restartButton').addEventListener('click', () => this.startGame());
    }

    createGoalie(side) {
        const conf = side === "L" ? this.config.goalieL : this.config.goalieR;
        const img = this.assets[side === "L" ? "goalieL" : "goalieR"];
        return {
            img: img, x: conf.x_rel * this.bgRect.width, y: conf.y_rel * this.bgRect.height,
            w: img ? img.width * conf.scale * this.bgScale : 0, h: img ? img.height * conf.scale * this.bgScale : 0
        };
    }

    setupSpawnsAndTargets() {
        this.spawns = this.config.spawns.map(s => ({ x: s.x_rel * this.bgRect.width, y: s.y_rel * this.bgRect.height }));
        this.targets = this.config.targets.map(t => ({ x: t.x_rel * this.bgRect.width, y: t.y_rel * this.bgRect.height }));
    }

    startGame() {
        if (!this.assetsLoaded) return;
        this.resetGameState();
        this.playing = true;
        
        const nameInputSection = document.getElementById('nameInputSection');
        if (nameInputSection) {
            nameInputSection.classList.add('hidden');
            document.getElementById('playerNameInput').value = '';
            const submitButton = document.getElementById('submitScoreButton');
            submitButton.disabled = false;
            submitButton.textContent = 'Сохранить';
        }

        this.hideUI();
        this.playBackgroundMusic();
    }

    playBackgroundMusic() {
        if (this.sounds.background && !this.muted) {
            this.sounds.background.currentTime = 0;
            this.sounds.background.play().catch(e => {});
        }
    }

    stopBackgroundMusic() {
        if (this.sounds.background) { this.sounds.background.pause(); }
    }

    hideUI() {
        document.getElementById('startScreen')?.classList.add('hidden');
        document.getElementById('gameOverScreen')?.classList.add('hidden');
    }

    handleKey(e) { if (e.code === 'KeyM') this.toggleMute(); }

    toggleMute() {
        this.muted = !this.muted;
        Object.values(this.sounds).forEach(sound => { sound.muted = this.muted; });
        if (this.muted) this.stopBackgroundMusic();
        else if (this.playing) this.playBackgroundMusic();
    }

    handleClick() { if (this.playing) this.toggleGoalie(); }
    handleTouchStart(e) { e.preventDefault(); if (this.playing) this.toggleGoalie(); }
    toggleGoalie() { this.currentGoalie = this.currentGoalie === this.goalieL ? this.goalieR : this.goalieL; }

    gameLoop() {
        const now = performance.now();
        const dt = (now - (this.lastTime || now)) / 1000;
        this.lastTime = now;
        this.update(dt);
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    update(dt) {
        if (!this.playing) return;

        this.elapsed += dt;
        this.speedMult = 1.0 + Math.min(1.0, this.elapsed / this.SPEED_RAMP_TIME) * (this.MAX_SPEED_MULT - 1.0);
        this.spawnTimer += dt;

        if (this.pucks.length === 0 && this.spawnTimer >= 0.5) { this.spawnTimer = 0; this.spawnPuck(); }

        for (let i = this.pucks.length - 1; i >= 0; i--) {
            const puck = this.pucks[i];
            puck.update(dt);
            if (puck.y >= this.lineY && !puck.fade) {
                if (this.checkSave(puck)) {
                    puck.fade = true; this.score++; this.playSound('save');
                } else {
                    puck.fade = true; this.lives--; this.playSound('miss');
                    if (this.lives <= 0) this.endGame();
                }
            }
            if (!puck.alive) this.pucks.splice(i, 1);
        }   
        
        this.manTimer += dt;
        if (this.manTimer >= this.MAN_SWITCH_SPEED) { this.manTimer = 0; this.manFrame = 1 - this.manFrame; }
        this.womanTimer += dt;
        if (this.womanTimer >= this.WOMAN_SWITCH_SPEED) { this.womanTimer = 0; this.womanFrame = 1 - this.womanFrame; }
    }

    playSound(soundKey) {
        if (this.sounds[soundKey] && !this.muted) {
            const sound = this.sounds[soundKey].cloneNode();
            sound.volume = 0.7;
            sound.play().catch(e => {});
        }
    }

    checkSave(puck) {
        const goalie = this.currentGoalie;
        return (puck.x >= goalie.x && puck.x <= goalie.x + goalie.w && puck.y >= goalie.y && puck.y <= goalie.y + goalie.h);
    }

    spawnPuck() {
        const spawnIndex = Math.floor(Math.random() * this.spawns.length);
        const spawn = this.spawns[spawnIndex];
        const target = this.targets[spawnIndex];
        const baseSpeed = (260 + Math.random() * 100) * this.speedMult;
        const rotation = (Math.random() < 0.5 ? -1 : 1) * 15 * Math.PI / 180;
        this.pucks.push(new Puck(spawn.x, spawn.y, target.x, target.y, baseSpeed, this.PUCK_RADIUS * this.bgScale, rotation));
    }

    endGame() {
        if (this.gameOver) return;
        this.playing = false; this.gameOver = true;
        this.showGameOverScreen();
    }

    async showGameOverScreen() {
        this.stopBackgroundMusic();
        
        const gameOverScreen = document.getElementById('gameOverScreen');
        const finalScoreEl = document.getElementById('finalScore');
        const nameInputSection = document.getElementById('nameInputSection');
        const submitButton = document.getElementById('submitScoreButton');
        const nameInput = document.getElementById('playerNameInput');
        
        finalScoreEl.textContent = `Ваш результат: ${this.score} букетов`;
        gameOverScreen.classList.remove('hidden');

        const leaderboard = await this.fetchLeaderboard();
        this.displayLeaderboard(leaderboard);
        
        const isTopScore = !leaderboard || leaderboard.length < 10 || this.score > (leaderboard[leaderboard.length - 1]?.score || 0);

        if (isTopScore && this.score > 0) {
            nameInputSection.classList.remove('hidden');
            
            const submitHandler = async () => {
                const name = nameInput.value.trim();
                if (name) {
                    submitButton.disabled = true; submitButton.textContent = 'Сохранение...';
                    await this.submitScore(name, this.score);
                    nameInputSection.classList.add('hidden');
                    const updatedLeaderboard = await this.fetchLeaderboard();
                    this.displayLeaderboard(updatedLeaderboard);
                }
            };
            
            submitButton.replaceWith(submitButton.cloneNode(true));
            document.getElementById('submitScoreButton').addEventListener('click', submitHandler);
        }
    }

    async fetchLeaderboard() {
        const leaderboardLoading = document.getElementById('leaderboardLoading');
        leaderboardLoading.textContent = 'Загрузка...';
        leaderboardLoading.style.display = 'block';
        try {
            const response = await fetch('/api/leaderboard');
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            leaderboardLoading.style.display = 'none';
            return data;
        } catch (error) {
            console.error('Ошибка при загрузке лидерборда:', error);
            leaderboardLoading.textContent = 'Не удалось загрузить таблицу';
            return [];
        }
    }

    async submitScore(name, score) {
        try {
            await fetch('/api/leaderboard', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, score }),
            });
        } catch (error) { console.error('Ошибка при отправке результата:', error); }
    }
    
    displayLeaderboard(leaderboard) {
        const listEl = document.getElementById('leaderboardList');
        listEl.innerHTML = '';

        if (!leaderboard || leaderboard.length === 0) {
            const emptyLi = document.createElement('li');
            emptyLi.textContent = 'Будьте первым в таблице лидеров!';
            listEl.appendChild(emptyLi);
            return;
        }

        leaderboard.forEach(entry => {
            const li = document.createElement('li');
            const nameSpan = document.createElement('span');
            const scoreSpan = document.createElement('span');
            nameSpan.textContent = entry.name;
            scoreSpan.textContent = `${entry.score} букетов`;
            li.appendChild(nameSpan);
            li.appendChild(scoreSpan);
            listEl.appendChild(li);
        });
    }displayLeaderboard(leaderboard) {
    const listEl = document.getElementById('leaderboardList');
    listEl.innerHTML = '';

    if (!leaderboard || leaderboard.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.textContent = 'Будьте первым в таблице лидеров!';
        // ДОБАВИТЬ ЭТИ СТРОКИ ДЛЯ ЦЕНТРИРОВАНИЯ:
        emptyLi.style.justifyContent = 'center';
        emptyLi.style.textAlign = 'center';
        listEl.appendChild(emptyLi);
        return;
    }

    leaderboard.forEach(entry => {
        const li = document.createElement('li');
        const nameSpan = document.createElement('span');
        const scoreSpan = document.createElement('span');
        nameSpan.textContent = entry.name;
        scoreSpan.textContent = `${entry.score} букетов`;
        li.appendChild(nameSpan);
        li.appendChild(scoreSpan);
        listEl.appendChild(li);
    });
}

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const bgImg = this.assets.bg;
        if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
             ctx.drawImage(bgImg, this.bgRect.x, this.bgRect.y, this.bgRect.width, this.bgRect.height);
        }

        if (!this.playing) return;

        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.round(70 * this.bgScale)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(`${this.score}`, this.bgRect.x + this.bgRect.width / 2, this.bgRect.y + 100 * this.bgScale);
        ctx.restore();

        const manImg = this.manFrame === 0 ? this.assets.man1 : this.assets.man2;
        if (manImg && manImg.complete) {
            const scale = this.MAN_SCALE * this.bgScale; const w = manImg.width * scale; const h = manImg.height * scale;
            const x = this.bgRect.x + this.bgRect.width * this.MAN_X - w / 2; const y = this.bgRect.y + this.bgRect.height * this.MAN_Y - h / 2;
            ctx.drawImage(manImg, x, y, w, h);
        }

        const womanImg = this.womanFrame === 0 ? this.assets.woman1 : this.assets.woman2;
        if (womanImg && womanImg.complete) {
            const scale = this.WOMAN_SCALE * this.bgScale; const w = womanImg.width * scale; const h = womanImg.height * scale;
            const x = this.bgRect.x + this.bgRect.width * this.WOMAN_X - w / 2; const y = this.bgRect.y + this.bgRect.height * this.WOMAN_Y - h / 2;
            ctx.drawImage(womanImg, x, y, w, h);
        }

        for (const puck of this.pucks) { puck.draw(ctx, this.bgRect); }
        this.drawGoalie(this.currentGoalie);
    }

    drawGoalie(goalie) {
        if (goalie.img && goalie.img.complete) {
            this.ctx.drawImage(goalie.img, this.bgRect.x + goalie.x, this.bgRect.y + goalie.y, goalie.w, goalie.h);
        }
    }
}

class Puck {
    constructor(sx, sy, tx, ty, baseSpeed, radius = 14, rotation = 0) {
        this.x = sx; this.y = sy; this.radius = radius; this.rotation = rotation;
        const dx = tx - sx; const dy = ty - sy; const distance = Math.sqrt(dx * dx + dy * dy) || 1.0;
        this.vx = dx / distance * baseSpeed; this.vy = dy / distance * baseSpeed;
        this.fade = false; this.alive = true;
    }
    update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; if (this.fade) this.alive = false; }
    draw(ctx, bgRect) {
        const screenX = bgRect.x + this.x; const screenY = bgRect.y + this.y;
        const game = window.goalieGameInstance; const img = game.assets?.bouquet;
        ctx.save();
        if (img && img.complete) {
            const scale = game.BOUQUET_SCALE * game.bgScale; const w = img.width * scale; const h = img.height * scale;
            ctx.translate(screenX, screenY); ctx.rotate(this.rotation); ctx.drawImage(img, -w / 2, -h / 2, w, h);
        } else {
            ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

window.addEventListener('load', () => {
    window.goalieGameInstance = new GoalieClicker();
});