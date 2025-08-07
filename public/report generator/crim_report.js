// crim_report.js

// Simple CRIM analysis using row-length tuple positions
const crimGrundyMemo = new Map();
function crimGrundy(position) {
  if (position === '[]') return 0;
  if (crimGrundyMemo.has(position)) return crimGrundyMemo.get(position);
  const posArray = JSON.parse(position); // sorted desc
  const childrenStates = new Set();
  const width = posArray.length > 0 ? posArray[0] : 0;
  // Remove any row
  for (let i = 0; i < posArray.length; i++) {
    const nextPos = [...posArray];
    nextPos.splice(i, 1);
    childrenStates.add(JSON.stringify(nextPos.sort((a, b) => b - a)));
  }
  // Remove any column
  for (let j = 0; j < width; j++) {
    const nextPos = posArray.map(len => (len > j ? len - 1 : len)).filter(len => len > 0);
    childrenStates.add(JSON.stringify(nextPos.sort((a, b) => b - a)));
  }
  const childValues = new Set();
  for (const state of childrenStates) childValues.add(crimGrundy(state));
  let g = 0; while (childValues.has(g)) g++;
  crimGrundyMemo.set(position, g);
  return g;
}

function crimPerformAnalysis(partition) {
  const pos = JSON.stringify([...partition].filter(n => n > 0).sort((a, b) => b - a));
  const g = crimGrundy(pos);
  const width = partition.length > 0 ? partition[0] : 0;
  const rowMoves = partition.length;
  const colMoves = width;
  return {
    gValue: g,
    pnStatus: g > 0 ? 'N-Position' : 'P-Position',
    // For CRIM, uptimality/depth not implemented yet; omit in card when undefined
    reachableMoves: String(rowMoves + colMoves),
    optimalMoves: (() => {
      if (g === 0) return 'N/A (P-position)';
      // Try rows
      for (let i = 0; i < partition.length; i++) {
        const nextPos = [...partition];
        nextPos.splice(i, 1);
        if (crimGrundy(JSON.stringify(nextPos.sort((a, b) => b - a))) === 0) return `ROW ${i}`;
      }
      // Try columns
      for (let j = 0; j < width; j++) {
        const nextPos = partition.map(len => (len > j ? len - 1 : len)).filter(len => len > 0);
        if (crimGrundy(JSON.stringify(nextPos.sort((a, b) => b - a))) === 0) return `COL ${j}`;
      }
      return 'None found';
    })()
  };
}

// Misere value for CRIM: 1=win, 0=loss (binary, not a nimber)
const crimMisereMemo = new Map();
function crimMisereValue(position) {
  if (position === '[]') return 1;
  if (crimMisereMemo.has(position)) return crimMisereMemo.get(position);
  const posArray = JSON.parse(position);
  const width = posArray.length > 0 ? posArray[0] : 0;
  // Rows
  for (let i = 0; i < posArray.length; i++) {
    const nextPos = [...posArray];
    nextPos.splice(i, 1);
    if (crimMisereValue(JSON.stringify(nextPos.sort((a, b) => b - a))) === 0) {
      crimMisereMemo.set(position, 1); return 1;
    }
  }
  // Cols
  for (let j = 0; j < width; j++) {
    const nextPos = posArray.map(len => (len > j ? len - 1 : len)).filter(len => len > 0);
    if (crimMisereValue(JSON.stringify(nextPos.sort((a, b) => b - a))) === 0) {
      crimMisereMemo.set(position, 1); return 1;
    }
  }
  crimMisereMemo.set(position, 0); return 0;
}

function crimCreateReportCard(stateStr, analysis) {
  const card = document.createElement('div');
  card.className = 'report-card';
  const pnClass = analysis.pnStatus === 'N-Position' ? 'n-position' : 'p-position';
  const valueLabel = analysis.valueLabel || 'Grundy Value (g)';
  let content = `
    <div class="report-header">
      <h3>[${stateStr}]</h3>
      <span class="p-n-status ${pnClass}">${analysis.pnStatus}</span>
    </div>
    <p><span class="label">${valueLabel}:</span> <span class="value">${analysis.gValue}</span></p>
  `;
  const addRow = (label, value) => {
    if (value !== undefined && value !== 'N/A') {
      content += `<p><span class=\"label\">${label}:</span> <span class=\"value\">${value}</span></p>`;
    }
  };
  addRow('Reachable Moves', analysis.reachableMoves);
  if (analysis.optimalMoves !== undefined && analysis.optimalMoves !== 'N/A') {
    content += `
      <div class="optimal-moves-container">
        <span class="label">Optimal Moves:</span>
        <div class="optimal-moves-list">${analysis.optimalMoves}</div>
      </div>
    `;
  }
  card.innerHTML = content;
  return card;
}

function crimCreateErrorCard(stateStr, errorMessage) {
  const card = document.createElement('div');
  card.className = 'report-card';
  card.innerHTML = `
    <div class="report-header">
      <h3>[${stateStr}]</h3>
      <span class="p-n-status p-position">Error</span>
    </div>
    <p>Could not analyze this state.</p>
    <p><span class="label">Reason:</span> <span class="value">${errorMessage}</span></p>
  `;
  return card;
}

window.CrimReport = {
  parseInput(rawInput) {
    return rawInput.split('\n').map(s => s.trim()).filter(Boolean);
  },
  render(container, inputText, mode = 'normal') {
    container.innerHTML = '';
    crimGrundyMemo.clear();
    crimMisereMemo.clear();
    const states = this.parseInput(inputText);
    if (states.length === 0) {
      container.innerHTML = '<p>Please enter at least one valid game state.</p>';
      return;
    }
    states.forEach(stateStr => {
      try {
        const partition = stateStr.split(/\s+/).map(Number);
        if (partition.some(isNaN)) throw new Error(`Invalid characters in state: "${stateStr}"`);
        let analysis;
        if (mode === 'misere') {
          const pos = JSON.stringify([...partition].filter(n => n > 0).sort((a, b) => b - a));
          const val = crimMisereValue(pos);
          const width = partition.length > 0 ? partition[0] : 0;
          analysis = {
            valueLabel: 'Misere Value',
            gValue: val,
            pnStatus: val === 1 ? 'N-Position' : 'P-Position',
            reachableMoves: String(partition.length + width),
            optimalMoves: (() => {
              // Find one winning move
              // Rows
              for (let i = 0; i < partition.length; i++) {
                const nextPos = [...partition]; nextPos.splice(i, 1);
                if (crimMisereValue(JSON.stringify(nextPos.sort((a, b) => b - a))) === 0) return `ROW ${i}`;
              }
              // Cols
              for (let j = 0; j < width; j++) {
                const nextPos = partition.map(len => (len > j ? len - 1 : len)).filter(len => len > 0);
                if (crimMisereValue(JSON.stringify(nextPos.sort((a, b) => b - a))) === 0) return `COL ${j}`;
              }
              return 'No winning moves found.';
            })()
          };
        } else {
          analysis = crimPerformAnalysis(partition);
        }
        container.appendChild(crimCreateReportCard(stateStr, analysis));
      } catch (e) {
        container.appendChild(crimCreateErrorCard(stateStr, e.message));
      }
    });
  }
};


