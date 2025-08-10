// JavaScript (app.js)
// Responsible for drawing nodes & paths, handling hover/click, and updating states.

/* Utility helpers */
const $ = sel => document.querySelector(sel);
const create = (tag, ns = 'http://www.w3.org/2000/svg') => document.createElementNS(ns, tag);

/* Core DOM refs */
const svg = $('#chart');
const nodesGroup = $('#nodes');
const pathsGroup = $('#paths');
const tooltip = $('#tooltip');

const ambient = $('#ambient');
const hoverSound = $('#hoverSound');
const unlockSound = $('#unlockSound');

let nodesById = {};       // map id -> node object (data)
let inboundMap = {};      // map id -> array of incoming node ids (prerequisites)
let svgNodes = {};        // map id -> svg group
let svgPaths = [];        // array of path objects {line, from, to}

/* Initialize data structures and draw everything */
function init() {
  // Build maps and defaults
  ACHIEVEMENTS.forEach(n => {
    nodesById[n.id] = JSON.parse(JSON.stringify(n)); // deep-ish copy so we can mutate status
    // ensure connects array exists
    if (!Array.isArray(nodesById[n.id].connects)) nodesById[n.id].connects = [];
    inboundMap[n.id] = inboundMap[n.id] || [];
    // fill inbound map for prerequisite checking
    nodesById[n.id].connects.forEach(targetId => {
      inboundMap[targetId] = inboundMap[targetId] || [];
      inboundMap[targetId].push(n.id);
    });
  });

  // Draw path lines then nodes (so nodes appear on top)
  drawPaths();
  drawNodes();

  // Try to start background music (may be blocked by autoplay rules)
  tryPlayAmbient();

  // Global mouse move -> tooltip follow
  window.addEventListener('mousemove', (e) => {
    // If tooltip is visible, move near cursor but clamp to viewport a bit
    if (tooltip.style.display === 'block') {
      const gap = 18;
      let x = e.clientX + gap;
      let y = e.clientY - gap;
      tooltip.style.left = `${x}px`;
      tooltip.style.top = `${y}px`;
    }
  });

  // Clicking empty space should hide tooltip
  window.addEventListener('click', () => hideTooltip());
}

/* Draw path lines for every connection */
function drawPaths() {
  // Clear existing
  pathsGroup.innerHTML = '';

  // Create path element for each connection
  Object.values(nodesById).forEach(fromNode => {
    fromNode.connects.forEach(toId => {
      const toNode = nodesById[toId];
      if (!toNode) return; // skip if data inconsistent

      // Use a simple straight line, could be upgraded to curves
      const line = create('line');
      line.setAttribute('x1', fromNode.x);
      line.setAttribute('y1', fromNode.y);
      line.setAttribute('x2', toNode.x);
      line.setAttribute('y2', toNode.y);
      line.classList.add('chart-path');
      // add a small data attribute to reference nodes
      line.dataset.from = fromNode.id;
      line.dataset.to = toId;

      // append
      pathsGroup.appendChild(line);
      svgPaths.push({ line, from: fromNode.id, to: toId });
    });
  });

  // initial styling pass: apply guiding animation where source completed -> target unlocked
  refreshPaths();
}

/* Draw nodes as svg groups (circle + optional label + check) */
function drawNodes() {
  nodesGroup.innerHTML = '';

  Object.values(nodesById).forEach(node => {
    const g = create('g');
    g.classList.add('node-group');
    g.setAttribute('data-id', node.id);
    g.setAttribute('transform', `translate(${node.x}, ${node.y})`);

    // halo ring (subtle)
    const halo = create('circle');
    halo.classList.add('node-halo');
    halo.setAttribute('r', 36);
    g.appendChild(halo);

    // circle for node
    const circle = create('circle');
    circle.classList.add('node-circle');
    circle.setAttribute('r', 14);
    circle.setAttribute('cx', 0);
    circle.setAttribute('cy', 0);
    g.appendChild(circle);

    // checkmark symbol for completed state (initially hidden)
    const check = create('use');
    check.classList.add('checkmark');
    check.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#check');
    check.setAttribute('x', -12);
    check.setAttribute('y', -12);
    check.setAttribute('width', 24);
    check.setAttribute('height', 24);
    check.style.opacity = 0;
    g.appendChild(check);

    // small label - show for core planets; style controlled by CSS
    const label = create('text');
    label.classList.add('node-label');
    label.setAttribute('x', 24);
    label.setAttribute('y', 6);
    label.textContent = node.name;
    g.appendChild(label);

    // attach events based on status
    g.addEventListener('mouseenter', (ev) => onNodeHover(ev, node.id));
    g.addEventListener('mouseleave', (ev) => onNodeLeave(ev, node.id));
    g.addEventListener('click', (ev) => onNodeClick(ev, node.id));

    nodesGroup.appendChild(g);
    svgNodes[node.id] = { group: g, circle, check, label, halo };
    updateNodeVisual(node.id);
  });
}

/* Update node visuals according to its status (locked/unlocked/completed) */
function updateNodeVisual(nodeId) {
  const node = nodesById[nodeId];
  const s = svgNodes[nodeId];
  if (!s || !node) return;

  // Reset classes
  s.group.classList.remove('node-locked', 'node-unlocked', 'node-completed');

  if (node.status === 'locked') {
    s.group.classList.add('node-locked');
    s.check.style.opacity = 0;
    s.group.style.cursor = 'not-allowed';
    s.circle.setAttribute('r', 12);
    s.halo.style.opacity = 0.08;
  } else if (node.status === 'unlocked') {
    s.group.classList.add('node-unlocked');
    s.check.style.opacity = 0;
    s.group.style.cursor = 'pointer';
    s.circle.setAttribute('r', 14);
    s.halo.style.opacity = 0.18;
  } else if (node.status === 'completed') {
    s.group.classList.add('node-completed');
    s.check.style.opacity = 1;
    s.group.style.cursor = 'default';
    s.circle.setAttribute('r', 15);
    s.halo.style.opacity = 0.28;
  }
  // After changing nodes, some paths might need their guiding animation updated
  refreshPaths();
}

/* Refresh path styles: if source.completed && target.unlocked -> guiding animation */
function refreshPaths() {
  svgPaths.forEach(p => {
    const fromStatus = nodesById[p.from].status;
    const toStatus = nodesById[p.to].status;
    // If the from is completed and the to is unlocked => guiding
    if (fromStatus === 'completed' && toStatus === 'unlocked') {
      p.line.classList.add('path-guiding');
      p.line.style.stroke = 'rgba(98,211,255,0.85)';
      p.line.style.strokeWidth = 3;
      p.line.style.filter = 'url(#glow)';
    } else {
      p.line.classList.remove('path-guiding');
      p.line.style.stroke = 'rgba(150,170,200,0.10)';
      p.line.style.strokeWidth = 2;
      p.line.style.filter = 'none';
    }
  });
}

/* Try to play ambient audio; handle browser autoplay blocking gracefully */
function tryPlayAmbient() {
  if (!ambient) return;
  ambient.volume = 0.14;
  ambient.play().then(() => {
    // playing
  }).catch(e => {
    // Autoplay blocked; log and wait for user interaction (hover/click) to resume
    console.info('Ambient audio playback was blocked. It will start after user interaction.');
  });
}

/* Hover handler: show tooltip and play hover sound for unlocked/completed */
let hoverCooldown = 0;
function onNodeHover(ev, nodeId) {
  const node = nodesById[nodeId];
  if (!node) return;

  // only show tooltip on unlocked/completed
  if (node.status === 'locked') return;

  // display tooltip
  tooltip.innerHTML = `<strong>${escapeHtml(node.name)}</strong><div style="margin-top:6px;font-size:13px;color:#c9d6e8">${escapeHtml(node.description)}</div>`;
  tooltip.style.display = 'block';
  tooltip.setAttribute('aria-hidden', 'false');

  // play ambient if not already playing (in case autoplay was blocked)
  tryPlayAmbient();

  // play hover blip with small cooldown to avoid spam
  const now = Date.now();
  if (now - hoverCooldown > 250) {
    hoverCooldown = now;
    try { hoverSound.currentTime = 0; hoverSound.volume = 0.45; hoverSound.play(); } catch(e) { /*ignored*/ }
  }
}

/* Hover leave: hide tooltip */
function onNodeLeave(ev, nodeId) {
  hideTooltip();
}

function hideTooltip(){
  tooltip.style.display = 'none';
  tooltip.setAttribute('aria-hidden', 'true');
}

/* Click handler: transitioning unlocked -> completed and unlocking new nodes if prerequisites met */
function onNodeClick(ev, nodeId) {
  const node = nodesById[nodeId];
  if (!node) return;
  // Only respond to unlocked nodes
  if (node.status !== 'unlocked') return;

  // Transition to completed
  node.status = 'completed';
  updateNodeVisual(nodeId);

  // Play unlock sound
  try { unlockSound.currentTime = 0; unlockSound.volume = 0.9; unlockSound.play(); } catch(e){}

  // For each node this node connects to, check if all inbound prerequisites are completed.
  // If yes, change that target node from locked -> unlocked.
  node.connects.forEach(targetId => {
    const target = nodesById[targetId];
    if (!target) return;
    // if already unlocked/completed, skip
    if (target.status !== 'locked') return;
    const incoming = inboundMap[targetId] || [];
    // Determine if all incoming prerequisites are completed
    const allDone = incoming.every(pid => nodesById[pid] && nodesById[pid].status === 'completed');
    if (allDone) {
      target.status = 'unlocked';
      updateNodeVisual(targetId);
      // small flourish: play hover sound to indicate newly available (optional)
      try { hoverSound.currentTime = 0; hoverSound.volume = 0.55; hoverSound.play(); } catch(e){}
    }
  });

  // Also refresh paths to highlight any new guiding ones
  refreshPaths();
}

/* Small helper to escape HTML for tooltip content */
function escapeHtml(unsafe) {
  return String(unsafe).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* INITIALIZE on DOM ready */
document.addEventListener('DOMContentLoaded', () => {
  init();
});
