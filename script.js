// Background Ant Animation
const bgCanvas = document.getElementById('bgCanvas');
const bgCtx = bgCanvas.getContext('2d');

let bgWidth, bgHeight;
let ants = [];

function resizeBg() {
    bgWidth = window.innerWidth;
    bgHeight = window.innerHeight;
    bgCanvas.width = bgWidth;
    bgCanvas.height = bgHeight;
}

window.addEventListener('resize', resizeBg);
resizeBg();

class Ant {
    constructor() {
        this.x = Math.random() * bgWidth;
        this.y = Math.random() * bgHeight;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = 1 + Math.random();
        this.wander = 0.2;
    }

    update() {
        this.angle += (Math.random() - 0.5) * this.wander;
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        if (this.x < 0) this.x = bgWidth;
        if (this.x > bgWidth) this.x = 0;
        if (this.y < 0) this.y = bgHeight;
        if (this.y > bgHeight) this.y = 0;
    }

    draw() {
        bgCtx.fillStyle = '#ff9800'; // Match new primary color
        bgCtx.beginPath();
        bgCtx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        bgCtx.fill();
    }
}

for (let i = 0; i < 40; i++) {
    ants.push(new Ant());
}

function animateBg() {
    bgCtx.clearRect(0, 0, bgWidth, bgHeight);
    ants.forEach(ant => {
        ant.update();
        ant.draw();
    });
    requestAnimationFrame(animateBg);
}
animateBg();


// Application Logic
const imageUpload = document.getElementById('imageUpload');
const homeSection = document.getElementById('home-section');
const analysisSection = document.getElementById('analysis-section');
const loadingScreen = document.getElementById('loading-screen');
const loadingText = document.getElementById('loading-text');

const origCanvas = document.getElementById('originalCanvas');
const origCtx = origCanvas.getContext('2d');
const analyzedCanvas = document.getElementById('analyzedCanvas');
const analyzedCtx = analyzedCanvas.getContext('2d');
const heatmapCanvas = document.getElementById('heatmapCanvas');
const heatmapCtx = heatmapCanvas.getContext('2d');

const interrogateBtn = document.getElementById('interrogate-btn');
const interrogateResult = document.getElementById('interrogate-result');

let currentImage = null;

const funnyLoadingMessages = [
    "Locating the ant manager...",
    "Checking the pheromone GPS...",
    "Counting tiny legs...",
    "Consulting senior ants...",
    "Negotiating with the ant colony...",
    "Almost done..."
];

imageUpload.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            currentImage = img;
            startFunnyLoading(img);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

function startFunnyLoading(img) {
    loadingScreen.classList.remove('hidden');
    let messageIndex = 0;
    loadingText.innerText = "Asking the ants for directions...";
    
    const messageInterval = setInterval(() => {
        loadingText.innerText = funnyLoadingMessages[messageIndex];
        messageIndex = (messageIndex + 1) % funnyLoadingMessages.length;
    }, 600); // change message fast for humor

    setTimeout(() => {
        clearInterval(messageInterval);
        loadingScreen.classList.add('hidden');
        showAnalysis();
        processImage(img);
        triggerConfetti();
    }, 3000); // 3 seconds fake loading
}

function showAnalysis() {
    homeSection.classList.remove('active');
    analysisSection.classList.remove('hidden');
    analysisSection.classList.add('active');
    
    // reset interrogation
    interrogateResult.classList.add('hidden');
    interrogateBtn.style.display = 'inline-block';
}

function resetApp() {
    analysisSection.classList.remove('active');
    analysisSection.classList.add('hidden');
    homeSection.classList.add('active');
    imageUpload.value = '';
}

interrogateBtn.addEventListener('click', () => {
    interrogateBtn.style.display = 'none';
    interrogateResult.classList.remove('hidden');
});

function processImage(img) {
    // Set canvas sizes
    const w = img.width;
    const h = img.height;
    
    // Scale down if too large to fit UI nicely, keeping aspect ratio
    const maxW = 800;
    let targetW = w;
    let targetH = h;
    if (w > maxW) {
        targetW = maxW;
        targetH = (h / w) * maxW;
    }

    [origCanvas, analyzedCanvas, heatmapCanvas].forEach(c => {
        c.width = targetW;
        c.height = targetH;
    });

    // 1. Draw Original
    origCtx.drawImage(img, 0, 0, targetW, targetH);

    // 2. Perform Image Processing to find Ants
    const imageData = origCtx.getImageData(0, 0, targetW, targetH);
    const data = imageData.data;

    // Use a grid to detect "ant" clusters (dark regions)
    const gridSize = 15; 
    const cols = Math.floor(targetW / gridSize);
    const rows = Math.floor(targetH / gridSize);
    const grid = new Array(cols * rows).fill(0);

    // Calculate average brightness
    let totalBrightness = 0;
    for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        totalBrightness += brightness;
    }
    const avgBrightness = totalBrightness / (targetW * targetH);

    // Threshold: Pixels much darker than average
    const threshold = avgBrightness * 0.65; 

    for (let y = 0; y < targetH; y++) {
        for (let x = 0; x < targetW; x++) {
            const index = (y * Math.floor(targetW) + x) * 4;
            const brightness = (data[index] + data[index + 1] + data[index + 2]) / 3;

            if (brightness < threshold) {
                const gridX = Math.floor(x / gridSize);
                const gridY = Math.floor(y / gridSize);
                if (gridX < cols && gridY < rows) {
                    grid[gridY * cols + gridX]++;
                }
            }
        }
    }

    const antPositions = [];
    const minDarkPixelsPerGrid = (gridSize * gridSize) * 0.15; // 15% dark pixels

    for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
            if (grid[gy * cols + gx] > minDarkPixelsPerGrid) {
                antPositions.push({
                    x: gx * gridSize + gridSize / 2,
                    y: gy * gridSize + gridSize / 2
                });
            }
        }
    }

    // Draw Analyzed Layer Background
    analyzedCtx.drawImage(img, 0, 0, targetW, targetH);
    analyzedCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    analyzedCtx.fillRect(0, 0, targetW, targetH);

    // Draw Bounding Boxes AND emojis
    analyzedCtx.font = "16px Arial";
    antPositions.forEach(pos => {
        // Neon green boxes
        analyzedCtx.strokeStyle = '#00ff00';
        analyzedCtx.lineWidth = 2;
        const boxSize = gridSize * 1.5;
        analyzedCtx.strokeRect(pos.x - boxSize/2, pos.y - boxSize/2, boxSize, boxSize);
        
        // Randomly add some small ant emojis near the boxes for fun
        if(Math.random() > 0.3) {
            analyzedCtx.fillText("🐜", pos.x + boxSize/2 + 2, pos.y - boxSize/2);
        }
    });

    let dirStr = "Unknown";
    let n = antPositions.length;
    
    // Fit a line using Linear Regression
    if (n > 1) {
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        antPositions.forEach(p => {
            sumX += p.x;
            sumY += p.y;
            sumXY += p.x * p.y;
            sumXX += p.x * p.x;
        });

        // Calculate slope and intercept
        const denominator = (n * sumXX - sumX * sumX);
        if (Math.abs(denominator) > 0.001) {
            const slope = (n * sumXY - sumX * sumY) / denominator;
            const intercept = (sumY - slope * sumX) / n;

            // Find extent of line based on ant positions
            let minX = targetW, maxX = 0;
            antPositions.forEach(p => {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
            });

            // Extend the line slightly
            minX = Math.max(0, minX - 40);
            maxX = Math.min(targetW, maxX + 40);

            const startY = slope * minX + intercept;
            const endY = slope * maxX + intercept;

            // Draw Trail Line (bright cyan)
            analyzedCtx.beginPath();
            analyzedCtx.moveTo(minX, startY);
            analyzedCtx.lineTo(maxX, endY);
            analyzedCtx.strokeStyle = '#00ffff';
            analyzedCtx.lineWidth = 4;
            analyzedCtx.setLineDash([15, 10]);
            analyzedCtx.stroke();
            analyzedCtx.setLineDash([]);

            // Direction arrow
            const angle = Math.atan2(endY - startY, maxX - minX);
            analyzedCtx.translate(maxX, endY);
            analyzedCtx.rotate(angle);
            analyzedCtx.beginPath();
            analyzedCtx.moveTo(0, 0);
            analyzedCtx.lineTo(-30, -15);
            analyzedCtx.lineTo(-30, 15);
            analyzedCtx.fillStyle = '#ff00ff'; // hot pink arrow
            analyzedCtx.fill();
            analyzedCtx.rotate(-angle);
            analyzedCtx.translate(-maxX, -endY);

            // Determine direction
            const dx = maxX - minX;
            const dy = endY - startY;
            if (dx > 0 && dy < 0) dirStr = "Mostly Northeast ↗";
            else if (dx > 0 && dy > 0) dirStr = "Mostly Southeast ↘";
            else if (dx < 0 && dy > 0) dirStr = "Mostly Southwest ↙";
            else dirStr = "Mostly Northwest ↖";
        }
    }

    // 3. Draw Heatmap (Scientific!)
    heatmapCtx.fillStyle = '#0a192f';
    heatmapCtx.fillRect(0, 0, targetW, targetH);

    antPositions.forEach(pos => {
        const gradient = heatmapCtx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 50);
        gradient.addColorStop(0, 'rgba(255, 0, 255, 0.7)'); // pink core
        gradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.4)'); // cyan mid
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        heatmapCtx.fillStyle = gradient;
        heatmapCtx.beginPath();
        heatmapCtx.arc(pos.x, pos.y, 50, 0, Math.PI * 2);
        heatmapCtx.fill();
    });

    // 4. Update Stats to Funny Strings
    document.getElementById('stat-count').innerText = `${n} ants detected`;
    document.getElementById('stat-direction').innerText = dirStr;
    document.getElementById('stat-density').innerText = n > 0 ? "Main trail detected" : "No highway found";
    
    let trafficLabel = "EXTREMELY ANT";
    if(n < 10) trafficLabel = "BARELY ANY ANTS";
    else if(n > 100) trafficLabel = "TOO MANY ANTS";
    document.getElementById('stat-length').innerText = trafficLabel;

    const confidence = Math.min(99, Math.floor(n / 2) + 60);
    document.getElementById('stat-confidence').innerText = `${confidence}% sure... probably.`;

    // 5. Update Report
    const trafficLevels = ['Light', 'Moderate', 'Heavy', 'WAY TOO HEAVY'];
    let levelIdx = Math.floor(n / 15);
    if (levelIdx > 3) levelIdx = 3;
    
    document.getElementById('report-traffic').innerText = trafficLevels[levelIdx];
    document.getElementById('report-status').innerText = 'Surprisingly good';
    document.getElementById('report-fastest').innerText = '0%';
    document.getElementById('report-jam').innerText = n > 40 ? 'YES 😭' : 'Not yet';
    document.getElementById('report-route').innerText = 'The same route as yesterday';
}

// Confetti Effect
const confettiCanvas = document.getElementById('confettiCanvas');
const confettiCtx = confettiCanvas.getContext('2d');
let confettiParticles = [];
let isConfettiActive = false;

function triggerConfetti() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    confettiParticles = [];
    isConfettiActive = true;

    for (let i = 0; i < 150; i++) {
        confettiParticles.push({
            x: Math.random() * confettiCanvas.width,
            y: Math.random() * confettiCanvas.height - confettiCanvas.height,
            w: Math.random() * 10 + 5,
            h: Math.random() * 10 + 5,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            speedY: Math.random() * 3 + 2,
            speedX: (Math.random() - 0.5) * 2,
            rot: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 10
        });
    }

    animateConfetti();
    setTimeout(() => { isConfettiActive = false; }, 5000); // Stop after 5s
}

function animateConfetti() {
    if (!isConfettiActive && confettiParticles.length === 0) {
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        return;
    }
    
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    
    for (let i = 0; i < confettiParticles.length; i++) {
        const p = confettiParticles[i];
        p.y += p.speedY;
        p.x += p.speedX;
        p.rot += p.rotSpeed;

        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate(p.rot * Math.PI / 180);
        confettiCtx.fillStyle = p.color;
        confettiCtx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
        confettiCtx.restore();

        // Remove if off screen
        if (p.y > confettiCanvas.height) {
            if(isConfettiActive) {
                p.y = -20;
                p.x = Math.random() * confettiCanvas.width;
            } else {
                confettiParticles.splice(i, 1);
                i--;
            }
        }
    }
    requestAnimationFrame(animateConfetti);
}
