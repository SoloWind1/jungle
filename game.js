// Jungle Dash: a small canvas platform adventure with no external dependencies.
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const timeEl = document.getElementById('time');
const bestScoreEl = document.getElementById('bestScore');
const titleScreen = document.getElementById('titleScreen');
const endScreen = document.getElementById('endScreen');
const endTitle = document.getElementById('endTitle');
const endMessage = document.getElementById('endMessage');
const endEyebrow = document.getElementById('endEyebrow');

const W = canvas.width;
const H = canvas.height;
const worldWidth = 5600;
const keys = {};
let state = 'title';
let lastTime = 0;
let elapsed = 0;
let cameraX = 0;
let score = 0;
let lives = 3;
let timeLeft = 60;
let bestScore = Number(localStorage.getItem('jungleDashBest') || 0);
bestScoreEl.textContent = bestScore;

const player = { x: 90, y: 480, w: 38, h: 54, vx: 0, vy: 0, grounded: false, invincible: 0, facing: 1 };
const spawn = { x: 90, y: 480 };
const platforms = [
	{ x: 0, y: 600, w: 640, h: 120 }, { x: 750, y: 600, w: 510, h: 120 },
	{ x: 1380, y: 600, w: 590, h: 120 }, { x: 2080, y: 600, w: 460, h: 120 },
	{ x: 2700, y: 600, w: 740, h: 120 }, { x: 3620, y: 600, w: 460, h: 120 },
	{ x: 4260, y: 600, w: 1340, h: 120 },
	{ x: 395, y: 460, w: 165, h: 22 }, { x: 855, y: 445, w: 180, h: 22 },
	{ x: 1160, y: 365, w: 140, h: 22 }, { x: 1510, y: 465, w: 170, h: 22 },
	{ x: 1815, y: 390, w: 150, h: 22 }, { x: 2230, y: 450, w: 165, h: 22 },
	{ x: 2840, y: 420, w: 180, h: 22 }, { x: 3160, y: 335, w: 150, h: 22 },
	{ x: 3730, y: 440, w: 170, h: 22 }, { x: 4460, y: 465, w: 180, h: 22 }
];
const coins = [
	[260, 530], [430, 405], [630, 545], [830, 530], [920, 390], [1180, 310], [1450, 530],
	[1550, 410], [1850, 335], [2160, 530], [2280, 395], [2600, 545], [2800, 530],
	[2900, 365], [3220, 280], [3500, 535], [3750, 385], [4150, 535], [4500, 410], [4850, 535], [5230, 535]
].map(([x, y]) => ({ x, y, collected: false }));
const enemies = [
	{ x: 485, y: 555, w: 42, h: 45, min: 400, max: 600, vx: 1.2, alive: true },
	{ x: 925, y: 400, w: 42, h: 45, min: 850, max: 1010, vx: 1, alive: true },
	{ x: 1570, y: 555, w: 42, h: 45, min: 1420, max: 1900, vx: 1.35, alive: true },
	{ x: 2320, y: 555, w: 42, h: 45, min: 2110, max: 2490, vx: 1.1, alive: true },
	{ x: 3020, y: 555, w: 42, h: 45, min: 2750, max: 3350, vx: 1.5, alive: true },
	{ x: 3860, y: 395, w: 42, h: 45, min: 3740, max: 3850, vx: 1, alive: true },
	{ x: 4660, y: 555, w: 42, h: 45, min: 4350, max: 5050, vx: 1.3, alive: true }
];
const spikes = [{ x: 570, y: 572, w: 52 }, { x: 1060, y: 572, w: 65 }, { x: 1930, y: 572, w: 70 }, { x: 2460, y: 572, w: 72 }, { x: 3370, y: 572, w: 62 }, { x: 4000, y: 572, w: 65 }, { x: 5350, y: 572, w: 72 }];
const trees = [120, 690, 1080, 1320, 1990, 2580, 3470, 4120, 5070, 5480];

function resetGame() {
	state = 'playing'; elapsed = 0; cameraX = 0; score = 0; lives = 3; timeLeft = 60;
	Object.assign(player, { x: spawn.x, y: spawn.y, vx: 0, vy: 0, invincible: 0, facing: 1 });
	coins.forEach(coin => coin.collected = false);
	enemies.forEach(enemy => enemy.alive = true);
	titleScreen.classList.remove('active'); endScreen.classList.remove('active'); updateHud();
}

function updateHud() { scoreEl.textContent = score; livesEl.textContent = lives; timeEl.textContent = Math.ceil(timeLeft); }
function isDown(...names) { return names.some(name => keys[name]); }
function overlaps(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

function update(dt) {
	if (state !== 'playing') return;
	elapsed += dt; timeLeft -= dt;
	if (timeLeft <= 0) return finish(false, 'The jungle clock ran out.');
	const left = isDown('ArrowLeft', 'a', 'A'); const right = isDown('ArrowRight', 'd', 'D');
	player.vx += (right ? .72 : 0) - (left ? .72 : 0);
	player.vx *= (left || right) ? .88 : .78; player.vx = Math.max(-6, Math.min(6, player.vx));
	if (player.vx !== 0) player.facing = Math.sign(player.vx);
	player.vy += 0.58; player.x += player.vx; player.y += player.vy; player.grounded = false;
	if (isDown('Space', 'ArrowUp', 'w', 'W') && !player.jumpHeld && player.grounded === false) {
		// Jumping is handled using the landing flag from the prior frame below.
	}
	if (player.x < 0) player.x = 0; if (player.x > worldWidth - player.w) player.x = worldWidth - player.w;
	for (const platform of platforms) {
		const wasAbove = player.y + player.h - player.vy <= platform.y;
		if (player.vy >= 0 && wasAbove && player.x + player.w > platform.x && player.x < platform.x + platform.w && player.y + player.h >= platform.y) {
			player.y = platform.y - player.h; player.vy = 0; player.grounded = true;
		}
	}
	if (isDown('Space', 'ArrowUp', 'w', 'W') && player.grounded && !player.jumpUsed) { player.vy = -13; player.grounded = false; player.jumpUsed = true; }
	if (!isDown('Space', 'ArrowUp', 'w', 'W')) player.jumpUsed = false;
	if (player.y > H + 80) hurt();
	if (player.invincible > 0) player.invincible -= dt;
	coins.forEach(coin => { if (!coin.collected && overlaps(player, { x: coin.x - 13, y: coin.y - 13, w: 26, h: 26 })) { coin.collected = true; score += 10; } });
	enemies.forEach(enemy => {
		if (!enemy.alive) return;
		enemy.x += enemy.vx; if (enemy.x < enemy.min || enemy.x > enemy.max) enemy.vx *= -1;
		if (overlaps(player, enemy)) {
			if (player.vy > 0 && player.y + player.h - enemy.y < 25) { enemy.alive = false; player.vy = -9; score += 50; }
			else hurt();
		}
	});
	spikes.forEach(spike => { if (overlaps(player, { x: spike.x, y: spike.y, w: spike.w, h: 28 })) hurt(); });
	if (player.x > 5440) finish(true, 'You found the hidden jungle crown.');
	cameraX += (player.x - W * .36 - cameraX) * .1; cameraX = Math.max(0, Math.min(worldWidth - W, cameraX)); updateHud();
}

function hurt() {
	if (player.invincible > 0 || state !== 'playing') return;
	lives--; updateHud();
	if (lives <= 0) return finish(false, 'The trail got the better of you.');
	player.x = Math.max(0, player.x - 180); player.y = 430; player.vx = 0; player.vy = -7; player.invincible = 1.4;
}

function finish(won, message) {
	state = won ? 'won' : 'lost'; if (score > bestScore) { bestScore = score; localStorage.setItem('jungleDashBest', bestScore); bestScoreEl.textContent = bestScore; }
	endTitle.textContent = won ? 'YOU WIN!' : 'GAME OVER'; endTitle.style.color = won ? '#d8f05a' : '#ff9a60';
	endEyebrow.textContent = won ? 'The trail is complete' : 'The jungle keeps its secrets'; endMessage.textContent = `${message} Score: ${score}`;
	endScreen.classList.add('active');
}

function draw() {
	ctx.clearRect(0, 0, W, H); drawBackground(); ctx.save(); ctx.translate(-cameraX, 0);
	trees.forEach(drawTree); platforms.forEach(drawPlatform); spikes.forEach(drawSpikes);
	coins.forEach(drawCoin); enemies.forEach(drawEnemy); drawFinish(); drawPlayer(); ctx.restore();
}

function drawBackground() {
	const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#55ad8a'); sky.addColorStop(1, '#c2d879'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
	ctx.fillStyle = '#71b786'; for (let i = -1; i < 13; i++) { const x = i * 150 - (cameraX * .18 % 150); ctx.beginPath(); ctx.arc(x, 310, 150, Math.PI, 0); ctx.fill(); }
	ctx.fillStyle = 'rgba(244, 229, 140, .4)'; ctx.beginPath(); ctx.arc(1050 - cameraX * .1, 115, 62, 0, Math.PI * 2); ctx.fill();
	ctx.fillStyle = 'rgba(18, 67, 54, .3)'; for (let i = 0; i < 24; i++) { const x = (i * 260 - cameraX * .28) % (W + 300); ctx.fillRect(x, 190 + (i % 4) * 25, 11, 260); }
}
function drawTree(x) { ctx.fillStyle = '#643f32'; ctx.fillRect(x, 285, 28, 315); ctx.fillStyle = '#235f4b'; ctx.beginPath(); ctx.arc(x + 12, 245, 72, 0, Math.PI * 2); ctx.arc(x - 35, 295, 55, 0, Math.PI * 2); ctx.arc(x + 58, 290, 58, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#378260'; ctx.beginPath(); ctx.arc(x + 5, 210, 37, 0, Math.PI * 2); ctx.fill(); }
function drawPlatform(p) { ctx.fillStyle = '#593d2c'; ctx.fillRect(p.x, p.y, p.w, p.h); ctx.fillStyle = '#2d8052'; ctx.fillRect(p.x, p.y, p.w, 15); ctx.fillStyle = '#68ad55'; for (let x = p.x + 12; x < p.x + p.w; x += 33) { ctx.fillRect(x, p.y + 15, 6, 28); } }
function drawSpikes(s) { ctx.fillStyle = '#d96b4b'; const count = Math.floor(s.w / 18); for (let i = 0; i < count; i++) { ctx.beginPath(); ctx.moveTo(s.x + i * 18, s.y + 27); ctx.lineTo(s.x + i * 18 + 9, s.y); ctx.lineTo(s.x + i * 18 + 18, s.y + 27); ctx.fill(); } }
function drawCoin(c) { if (c.collected) return; const bob = Math.sin(elapsed * 5 + c.x) * 4; ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(c.x, c.y + bob, 13, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#f6a53c'; ctx.beginPath(); ctx.arc(c.x, c.y + bob, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff1a2'; ctx.fillRect(c.x - 3, c.y - 8 + bob, 4, 8); }
function drawEnemy(e) { if (!e.alive) return; ctx.fillStyle = '#813c54'; ctx.beginPath(); ctx.arc(e.x + 21, e.y + 24, 21, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#f6cc84'; ctx.fillRect(e.x + 5, e.y + 30, 32, 15); ctx.fillStyle = '#fff'; ctx.fillRect(e.x + 10, e.y + 16, 8, 9); ctx.fillRect(e.x + 25, e.y + 16, 8, 9); ctx.fillStyle = '#142e2b'; ctx.fillRect(e.x + 14, e.y + 18, 4, 6); ctx.fillRect(e.x + 26, e.y + 18, 4, 6); }
function drawFinish() { ctx.fillStyle = '#5d3c2e'; ctx.fillRect(5480, 360, 10, 240); ctx.fillStyle = '#f67d42'; ctx.beginPath(); ctx.moveTo(5490, 365); ctx.lineTo(5600, 395); ctx.lineTo(5490, 425); ctx.fill(); ctx.fillStyle = '#f7efc9'; ctx.fillRect(5460, 600, 65, 12); }
function drawPlayer() { if (player.invincible > 0 && Math.floor(elapsed * 12) % 2 === 0) return; const x = player.x, y = player.y; ctx.save(); if (player.facing < 0) { ctx.translate(x + player.w, 0); ctx.scale(-1, 1); } else ctx.translate(x, 0); ctx.fillStyle = '#e86f45'; ctx.fillRect(7, y + 15, 28, 34); ctx.fillStyle = '#f4c477'; ctx.beginPath(); ctx.arc(21, y + 15, 16, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#1b4940'; ctx.fillRect(6, y + 1, 30, 10); ctx.fillRect(12, y + 47, 8, 7); ctx.fillRect(26, y + 47, 8, 7); ctx.fillStyle = '#fff'; ctx.fillRect(25, y + 12, 5, 5); ctx.fillStyle = '#173b37'; ctx.fillRect(28, y + 14, 3, 3); ctx.restore(); }

function gameLoop(timestamp) { const dt = Math.min((timestamp - lastTime) / 1000, .033); lastTime = timestamp; update(dt); draw(); requestAnimationFrame(gameLoop); }
document.addEventListener('keydown', event => { keys[event.key] = true; if (['ArrowUp', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault(); });
document.addEventListener('keyup', event => { keys[event.key] = false; });
document.getElementById('startButton').addEventListener('click', resetGame);
document.getElementById('againButton').addEventListener('click', resetGame);
document.querySelectorAll('[data-control]').forEach(button => { const key = button.dataset.control === 'left' ? 'ArrowLeft' : button.dataset.control === 'right' ? 'ArrowRight' : 'Space'; button.addEventListener('pointerdown', () => keys[key] = true); button.addEventListener('pointerup', () => keys[key] = false); button.addEventListener('pointerleave', () => keys[key] = false); });
updateHud(); requestAnimationFrame(gameLoop);
