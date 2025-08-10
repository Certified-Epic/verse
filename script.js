/* CSS (styles.css) */

/* Page reset & background */
:root{
  --bg-color: #05060a;
  --muted: #6e7788;
  --accent: #62d3ff;
  --complete: #7cffb2;
  --glow1: rgba(98,211,255,0.18);
  --glow2: rgba(124,255,178,0.15);
}

*{box-sizing:border-box;margin:0;padding:0}
html,body,#starfield{height:100%;width:100%}
body{
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
  background: radial-gradient(ellipse at center, rgba(255,255,255,0.02) 0%, transparent 30%), var(--bg-color);
  color:#e6eef6;
  overflow:hidden;
}

/* Starfield container with slow zooming animation */
#starfield{
  position:relative;
  display:flex;
  align-items:center;
  justify-content:center;
  background: linear-gradient(180deg, rgba(10,12,20,0.6), rgba(2,3,7,0.85));
  min-height:100vh;
  animation: slowZoom 60s linear infinite;
  isolation:isolate;
}

/* subtle moving star texture using pseudo-element */
#starfield::before{
  content:"";
  position:absolute;inset:0;
  background-image:
    radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px),
    radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1px);
  background-size: 800px 800px, 1200px 1200px;
  opacity:0.9;
  transform-origin:center;
  animation: starDrift 120s linear infinite;
  mix-blend-mode:screen;
  z-index:0;
}

@keyframes slowZoom{
  0% { transform: scale(1); }
  50% { transform: scale(1.03); }
  100% { transform: scale(1); }
}
@keyframes starDrift{
  0% { transform: translate(0,0); }
  50% { transform: translate(-60px,30px); }
  100% { transform: translate(0,0); }
}

/* SVG sits above background */
#chart{
  position:relative;
  width:100%;
  height:100vh;
  z-index:1;
  pointer-events: all;
}

/* Tooltip */
#tooltip{
  position: absolute;
  z-index: 10;
  background: rgba(6,10,20,0.9);
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.06);
  font-size: 14px;
  max-width: 300px;
  pointer-events: none;
  transform: translate(-50%, -120%);
  box-shadow: 0 8px 30px rgba(0,0,0,0.6);
  display:none;
}

/* Path styles */
#paths line{
  stroke: rgba(150,170,200,0.12);
  stroke-width: 2;
  stroke-linecap: round;
  transition: stroke 300ms, filter 300ms;
}

/* Animated guiding path (source completed -> target unlocked) */
.path-guiding{
  stroke: linear-gradient(90deg,#62d3ff,#7cffb2); /* not used by svg, kept for dev reference */
  stroke-width: 3;
  stroke: rgba(98,211,255,0.85);
  filter: url(#glow);
  animation: pathPulse 2s linear infinite;
  stroke-dasharray: 8 6;
}

@keyframes pathPulse{
  0% { stroke-opacity: 0.6; filter: drop-shadow(0 0 0px rgba(98,211,255,0.0)); }
  50% { stroke-opacity: 1; filter: drop-shadow(0 0 14px rgba(98,211,255,0.7)); }
  100% { stroke-opacity: 0.6; filter: drop-shadow(0 0 0px rgba(98,211,255,0.0)); }
}

/* Node groups */
.node-group { cursor: default; }
.node-circle{
  transition: r 180ms, fill 180ms, opacity 180ms, transform 200ms;
  transform-origin:center;
}

/* locked: dim grey */
.node-locked .node-circle{
  fill: rgba(180,190,200,0.08);
  stroke: rgba(180,190,200,0.06);
  r: 14;
  opacity:0.6;
}
.node-locked { cursor:not-allowed; }

/* unlocked: bright with pulsing glow */
.node-unlocked .node-circle{
  fill: white;
  stroke: rgba(98,211,255,0.6);
  r: 14;
  filter: none;
  animation: pulse 2.2s ease-in-out infinite;
}
@keyframes pulse{
  0% { transform: scale(1); filter: drop-shadow(0 0 0px rgba(98,211,255,0)); }
  50% { transform: scale(1.12); filter: drop-shadow(0 0 16px rgba(98,211,255,0.18)); }
  100% { transform: scale(1); filter: drop-shadow(0 0 0px rgba(98,211,255,0)); }
}

/* completed: strong color + checkmark */
.node-completed .node-circle{
  fill: var(--complete);
  stroke: rgba(124,255,178,0.8);
  r: 15;
  filter: url(#glow);
  transform: scale(1.06);
}
.node-completed .checkmark{
  opacity:1;
  transform-origin:center;
  transform: translate(-12px, -12px) scale(1.0);
  fill: rgba(0,0,0,0.9);
}
.node-completed .checkmark path{
  fill: rgba(0,0,0,0.92);
}

/* subtle label next to core planets */
.node-label{
  font-size: 13px;
  fill: rgba(230,238,246,0.9);
  font-weight:600;
  text-shadow: none;
  pointer-events:none;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.6));
}

/* small translucent halo for planets */
.node-halo{
  fill: none;
  stroke: rgba(98,211,255,0.08);
  stroke-width: 28;
  opacity: 0.22;
  filter: blur(8px);
}

/* Responsive tweak: hide labels on small screens */
@media (max-width:800px){
  .node-label{ display:none; }
  #tooltip{ font-size:13px; }
}
