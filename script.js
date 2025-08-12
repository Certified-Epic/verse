/**
 * script.js
 * Updated to include persistent achievement status via localStorage
 * and an interactive "Mark as Complete" button.
 */

// --- Constants & Global Variables ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const zoomSound = document.getElementById('zoomSound');
const hoverSound = document.getElementById('hoverSound');
const bgMusic = document.getElementById('bgMusic');

let achievementsData = []; // To hold data from achievements.json
let zoomLevel = 1.0;
const MAX_ZOOM = 3.0;
const MIN_ZOOM = 1.0;
const ZOOM_SPEED = 0.05;
const mouse = { x: 0, y: 0 };
let hoveredAchievement = null;
let activeAchievement = null;

const corePlanet = {
    x: 0,
    y: 0,
    radius: 50,
    spinAngle: 0,
    hoverRings: [],
    isHovered: false,
    isZoomedIn: false
};

const particlesStars = [];
const NUM_STARS = 200;

// Image assets
const centralImage = new Image();
centralImage.src = 'https://files.catbox.moe/8eyie5.png'; // Geometric shapes
const projectorImage = new Image();
projectorImage.src = 'https://files.catbox.moe/i76wxr.png'; // Correct projector base image
const lockedIcon = new Image();
lockedIcon.src = 'https://files.catbox.moe/2tciqz.png'; // Locked/Unachieved icon

let imagesLoaded = 0;
const totalImages = 3;

// --- Utility Functions ---
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    corePlanet.x = canvas.width / 2;
    corePlanet.y = canvas.height / 2;
}

function playAudio(audioElement) {
    if (audioElement && !audioElement.paused) {
        audioElement.pause();
        audioElement.currentTime = 0;
    }
    if (audioElement) {
        audioElement.play().catch(e => console.log("Audio playback blocked:", e));
    }
}

function playLoopingAudio(audioElement) {
    if (audioElement) {
        audioElement.play().catch(e => console.log("Audio playback blocked:", e));
    }
}

function loadImages() {
    const images = [centralImage, projectorImage, lockedIcon];
    images.forEach(img => {
        img.onload = () => {
            imagesLoaded++;
        };
        img.onerror = () => {
            console.error(`Failed to load image: ${img.src}`);
            imagesLoaded++; // Still increment to not block the app
        };
    });
}

function drawStars() {
    particlesStars.forEach(star => {
        star.x += star.vx;
        star.y += star.vy;
        if (star.x < 0 || star.x > canvas.width) star.x = Math.random() * canvas.width;
        if (star.y < 0 || star.y > canvas.height) star.y = Math.random() * canvas.height;

        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
    });
}

function createStars() {
    for (let i = 0; i < NUM_STARS; i++) {
        particlesStars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 1.5,
            vx: (Math.random() - 0.5) * 0.1,
            vy: (Math.random() - 0.5) * 0.1,
            alpha: Math.random()
        });
    }
}

function saveAchievements() {
    // Save the current state of achievements to localStorage
    localStorage.setItem('achievements', JSON.stringify(achievementsData));
}

// --- Drawing Functions ---
function drawCorePlanet() {
    // Save context state for planet-specific transformations
    ctx.save();
    ctx.translate(corePlanet.x, corePlanet.y);
    ctx.scale(zoomLevel, zoomLevel);

    // Subtle planet spinning animation
    ctx.rotate(corePlanet.spinAngle);
    ctx.strokeStyle = `rgba(255, 255, 255, 1)`;
    ctx.lineWidth = 2;
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 10;

    // Outer orbital ring
    ctx.beginPath();
    ctx.arc(0, 0, corePlanet.radius + 15, 0, Math.PI * 2);
    ctx.stroke();

    // Inner orbital ring
    ctx.beginPath();
    ctx.arc(0, 0, corePlanet.radius + 35, 0, Math.PI * 2);
    ctx.stroke();

    // Planet globe
    ctx.beginPath();
    ctx.arc(0, 0, corePlanet.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Hover rings animation
    if (corePlanet.isHovered) {
        for (let ring of corePlanet.hoverRings) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${ring.alpha})`;
            ctx.beginPath();
            ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
            ctx.stroke();
            ring.radius += 0.5;
            ring.alpha -= 0.01;
            if (ring.alpha <= 0) {
                ring.radius = corePlanet.radius + 55;
                ring.alpha = 1;
            }
        }
    }

    ctx.restore();
    ctx.shadowBlur = 0; // Reset shadow for other drawings
}

function drawCentralImage() {
    const scale = 0.5 * zoomLevel;
    const imgWidth = centralImage.width * scale;
    const imgHeight = centralImage.height * scale;
    const imgX = corePlanet.x - imgWidth / 2;
    const imgY = corePlanet.y - imgHeight / 2;

    const alpha = (zoomLevel - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM);
    ctx.globalAlpha = 1 - alpha;
    ctx.drawImage(centralImage, imgX, imgY, imgWidth, imgHeight);
    ctx.globalAlpha = 1;

    // Fading data transport lines to the image
    const lineAlpha = (1 - alpha) * 0.5;
    ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(corePlanet.x + corePlanet.radius * Math.cos(corePlanet.spinAngle), corePlanet.y + corePlanet.radius * Math.sin(corePlanet.spinAngle));
    ctx.lineTo(imgX + imgWidth / 2, imgY + imgHeight / 2);
    ctx.stroke();
}

function drawAchievements() {
    if (zoomLevel > 2.0 && achievementsData.length > 0) {
        // We'll just handle the first achievement for now
        const ach = achievementsData[0];
        const angle = -Math.PI / 2;
        const branchLength = 200;
        const startX = corePlanet.x;
        const startY = corePlanet.y;
        const endX = corePlanet.x + Math.cos(angle) * branchLength * zoomLevel;
        const endY = corePlanet.y + Math.sin(angle) * branchLength * zoomLevel;

        // Draw glowing branch line
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.restore();

        const projectorSize = 50;
        const projectorX = endX - projectorSize / 2;
        const projectorY = endY - projectorSize / 2;

        let achIcon = null;

        if (ach.status === 'completed') {
            achIcon = projectorImage;
        } else if (ach.status === 'available') {
            achIcon = lockedIcon;
            const blinkAlpha = Math.abs(Math.sin(Date.now() / 500));
            ctx.globalAlpha = blinkAlpha;
        } else if (ach.status === 'locked') {
            achIcon = lockedIcon;
        }

        if (achIcon) {
            ctx.drawImage(achIcon, projectorX, projectorY, projectorSize, projectorSize);
        }
        ctx.globalAlpha = 1;

        // Store achievement position for interaction
        const achRect = {
            x: projectorX,
            y: projectorY,
            width: projectorSize,
            height: projectorSize
        };
        hoveredAchievement = null;
        if (mouse.x > achRect.x && mouse.x < achRect.x + achRect.width &&
            mouse.y > achRect.y && mouse.y < achRect.y + achRect.height) {
            hoveredAchievement = ach;
        }
    }
}

function drawHoverTooltip() {
    if (hoveredAchievement && !activeAchievement) {
        const tooltipText = hoveredAchievement.name;
        const textMetrics = ctx.measureText(tooltipText);
        const textWidth = textMetrics.width;
        const textHeight = 16;
        const padding = 10;
        const tooltipX = mouse.x + 20;
        const tooltipY = mouse.y + 10;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(tooltipX, tooltipY, textWidth + padding * 2, textHeight + padding * 2);

        ctx.fillStyle = 'white';
        ctx.font = '14px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(tooltipText, tooltipX + padding, tooltipY + textHeight + padding);
    }
}

function drawAchievementPanel() {
    if (activeAchievement) {
        const panelWidth = 400;
        const panelHeight = 250;
        const panelX = (canvas.width - panelWidth) / 2;
        const panelY = (canvas.height - panelHeight) / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

        ctx.fillStyle = 'white';
        ctx.font = '24px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(activeAchievement.name, panelX + 20, panelY + 40);

        ctx.font = '16px Inter';
        const wrappedText = wrapText(ctx, activeAchievement.description, panelX + 20, panelY + 70, panelWidth - 40, 24);
        wrappedText.forEach((line, i) => {
            ctx.fillText(line, panelX + 20, panelY + 70 + i * 20);
        });

        // Close button
        const closeBtn = {
            x: panelX + panelWidth - 40,
            y: panelY + 10,
            width: 30,
            height: 20
        };
        ctx.fillStyle = 'red';
        ctx.fillRect(closeBtn.x, closeBtn.y, closeBtn.width, closeBtn.height);
        ctx.fillStyle = 'white';
        ctx.font = '16px Inter';
        ctx.fillText('X', closeBtn.x + closeBtn.width / 2 - 5, closeBtn.y + 15);

        // "Mark as Complete" button (only for 'available' achievements)
        if (activeAchievement.status === 'available') {
            const completeBtn = {
                x: panelX + 20,
                y: panelY + panelHeight - 50,
                width: 200,
                height: 30
            };
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(completeBtn.x, completeBtn.y, completeBtn.width, completeBtn.height);
            ctx.fillStyle = 'white';
            ctx.font = '16px Inter';
            ctx.fillText('Mark as Complete', completeBtn.x + 10, completeBtn.y + 20);
        }
    }
}

function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    const lines = [];

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = context.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line);
    return lines;
}

// --- Animation Loop ---
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawStars();
    corePlanet.spinAngle += 0.001;

    if (imagesLoaded === totalImages) {
        drawCentralImage();
        drawCorePlanet();
        drawAchievements();
        drawHoverTooltip();
        drawAchievementPanel();
    } else {
        // Show loading message
        ctx.fillStyle = 'white';
        ctx.font = '24px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Loading assets...', canvas.width / 2, canvas.height / 2);
    }

    requestAnimationFrame(animate);
}

// --- Event Handlers ---
window.addEventListener('load', () => {
    resizeCanvas();
    loadImages();
    createStars();
    playLoopingAudio(bgMusic);
    animate();

    // Check for saved achievements in localStorage, otherwise fetch from JSON
    const savedAchievements = localStorage.getItem('achievements');
    if (savedAchievements) {
        achievementsData = JSON.parse(savedAchievements);
        console.log("Loaded achievements from localStorage:", achievementsData);
    } else {
        fetch('achievements.json')
            .then(response => response.json())
            .then(data => {
                achievementsData = data;
                console.log("Achievements loaded from JSON:", achievementsData);
            })
            .catch(error => {
                console.error('Error fetching achievements:', error);
            });
    }
});

window.addEventListener('resize', resizeCanvas);

canvas.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;

    const dx = mouse.x - corePlanet.x;
    const dy = mouse.y - corePlanet.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check for hover state on planet
    if (distance < corePlanet.radius * zoomLevel) {
        if (!corePlanet.isHovered) {
            corePlanet.isHovered = true;
            corePlanet.hoverRings = [];
            playAudio(hoverSound);
        }
        if (corePlanet.hoverRings.length < 2) {
            corePlanet.hoverRings.push({
                radius: corePlanet.radius + 55,
                alpha: 1
            });
        }
    } else {
        corePlanet.isHovered = false;
    }
});

canvas.addEventListener('click', (e) => {
    const dx = e.clientX - corePlanet.x;
    const dy = e.clientY - corePlanet.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Zoom/Unzoom logic on planet click
    if (distance < corePlanet.radius * zoomLevel) {
        playAudio(zoomSound);
        if (zoomLevel === MIN_ZOOM) {
            zoomLevel = MAX_ZOOM;
            corePlanet.isZoomedIn = true;
        } else {
            zoomLevel = MIN_ZOOM;
            corePlanet.isZoomedIn = false;
        }
        return; // Exit to prevent double-clicking
    }
    
    // Check for click on close button
    if (activeAchievement) {
        const panelWidth = 400;
        const panelHeight = 250;
        const panelX = (canvas.width - panelWidth) / 2;
        const panelY = (canvas.height - panelHeight) / 2;
        const closeBtn = {
            x: panelX + panelWidth - 40,
            y: panelY + 10,
            width: 30,
            height: 20
        };

        if (mouse.x > closeBtn.x && mouse.x < closeBtn.x + closeBtn.width &&
            mouse.y > closeBtn.y && mouse.y < closeBtn.y + closeBtn.height) {
            activeAchievement = null;
            return;
        }
        
        // Check for click on "Mark as Complete" button
        if (activeAchievement.status === 'available') {
            const completeBtn = {
                x: panelX + 20,
                y: panelY + panelHeight - 50,
                width: 200,
                height: 30
            };
            if (mouse.x > completeBtn.x && mouse.x < completeBtn.x + completeBtn.width &&
                mouse.y > completeBtn.y && mouse.y < completeBtn.y + completeBtn.height) {
                // Find the achievement in the data array and update its status
                const index = achievementsData.findIndex(ach => ach.id === activeAchievement.id);
                if (index !== -1) {
                    achievementsData[index].status = 'completed';
                    activeAchievement = achievementsData[index]; // Update the active reference
                    saveAchievements();
                }
                return;
            }
        }
    }
    
    // Check for click on achievement icon
    if (zoomLevel > 2.0 && achievementsData.length > 0) {
        const ach = achievementsData[0];
        const angle = -Math.PI / 2;
        const branchLength = 200;
        const projectorSize = 50;
        const endX = corePlanet.x + Math.cos(angle) * branchLength * zoomLevel;
        const endY = corePlanet.y + Math.sin(angle) * branchLength * zoomLevel;
        const projectorX = endX - projectorSize / 2;
        const projectorY = endY - projectorSize / 2;

        const achRect = {
            x: projectorX,
            y: projectorY,
            width: projectorSize,
            height: projectorSize
        };

        if (mouse.x > achRect.x && mouse.x < achRect.x + achRect.width &&
            mouse.y > achRect.y && mouse.y < achRect.y + achRect.height) {
            if (activeAchievement && activeAchievement.id === ach.id) {
                activeAchievement = null;
            } else {
                activeAchievement = ach;
            }
            return;
        }
    }
    
    activeAchievement = null;
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    playAudio(zoomSound);
    if (e.deltaY > 0) { // Zoom out
        zoomLevel = Math.max(MIN_ZOOM, zoomLevel - ZOOM_SPEED);
    } else { // Zoom in
        zoomLevel = Math.min(MAX_ZOOM, zoomLevel + ZOOM_SPEED);
    }
    corePlanet.isZoomedIn = zoomLevel > (MIN_ZOOM + MAX_ZOOM) / 2;
});
