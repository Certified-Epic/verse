// Example graph using vis-network
const nodes = new vis.DataSet([
  { id: 1, label: 'Run Marathon', group: 'Physical' },
  { id: 2, label: 'Build Website', group: 'Technical' },
  { id: 3, label: 'Memorize Pi', group: 'Intellectual' },
  { id: 4, label: 'Paint Portrait', group: 'Creative' },
  { id: 5, label: 'Visit 50 Countries', group: 'Exploration' }
]);

const edges = new vis.DataSet([
  { from: 1, to: 5 },
  { from: 2, to: 4 },
  { from: 3, to: 1 },
  { from: 4, to: 3 },
  { from: 5, to: 2 }
]);

const container = document.getElementById('network');
const data = { nodes: nodes, edges: edges };
const options = {
  groups: {
    Physical: { color: { background: '#e74c3c', border: '#c0392b' } },
    Technical: { color: { background: '#3498db', border: '#2980b9' } },
    Intellectual: { color: { background: '#f1c40f', border: '#f39c12' } },
    Creative: { color: { background: '#9b59b6', border: '#8e44ad' } },
    Exploration: { color: { background: '#2ecc71', border: '#27ae60' } }
  },
  nodes: {
    shape: 'box',
    font: { face: 'Press Start 2P', size: 12 },
    borderWidth: 2,
  },
  edges: {
    width: 2,
    color: { color: '#000000' },
    arrows: { to: { enabled: false } }
  },
  layout: {
    improvedLayout: true,
    hierarchical: false
  },
  physics: {
    enabled: true,
    stabilization: { iterations: 200 }
  }
};

new vis.Network(container, data, options);