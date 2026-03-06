const board = document.getElementById('board');
const scoreEl = document.getElementById('score');

// Map dimensions in feet (default 6x4 feet)
let mapWidthFeet = 6;
let mapHeightFeet = 4;

// Each square is 6 inches (0.5 feet)
const SQUARE_SIZE_FEET = 0.5;
const SQUARE_SIZE_INCHES = 6;

// Calculated values
let BOARD_WIDTH = 0;
let BOARD_HEIGHT = 0;
let SQUARE_SIZE_PX = 0;
let DIVIDER_Y = 0;

const terrains = [];
let activeDrag = null;

const terrainWeights = {
  hard: 3,
  light: 1
};

// Initialize board
function initializeBoard() {
  // Calculate board dimensions (maintain aspect ratio with max size)
  const maxBoardSize = 800;
  const aspectRatio = mapWidthFeet / mapHeightFeet;

  if (aspectRatio >= 1) {
    // wider than tall
    BOARD_WIDTH = maxBoardSize;
    BOARD_HEIGHT = Math.round(maxBoardSize / aspectRatio);
  } else {
    // taller than wide
    BOARD_HEIGHT = maxBoardSize;
    BOARD_WIDTH = Math.round(maxBoardSize * aspectRatio);
  }
  
  SQUARE_SIZE_PX = BOARD_HEIGHT / (mapHeightFeet / SQUARE_SIZE_FEET);
  DIVIDER_Y = BOARD_HEIGHT / 2;
  
  // Update board style
  board.style.width = BOARD_WIDTH + 'px';
  board.style.height = BOARD_HEIGHT + 'px';
  
  // Update grid
  updateGrid();
  
  // Create or update deployment zones
  createDeploymentZones();
  
  // Recalculate
  calculate();
}

function updateGrid() {
  // Calculate grid properties
  const squaresX = mapWidthFeet / SQUARE_SIZE_FEET;
  const squaresY = mapHeightFeet / SQUARE_SIZE_FEET;
  
  // Update background grid
  board.style.backgroundSize = 
    `${SQUARE_SIZE_PX}px ${SQUARE_SIZE_PX}px`;
}

function createDeploymentZones() {
  // Remove existing deployment zones and diag line
  document.querySelectorAll('.deployment-zone, .diag-divider').forEach(z => z.remove());
  
  const deployMode = document.querySelector('input[name="deployMode"]:checked').value;
  const divider = document.getElementById('divider');
  divider.style.display = deployMode === 'quarters' ? 'none' : 'block';
  
  // 12 inches = 1 foot = 2 squares
  const deploymentDistPx = SQUARE_SIZE_PX * 2;
  // zone thickness (how deep from centre) = same as deployment distance (2 squares)
  const zoneThickness = deploymentDistPx;
  
  if (deployMode === 'longEdges') {
    // zones at the extreme edges
    const northZone = document.createElement('div');
    northZone.className = 'deployment-zone north-zone';
    northZone.style.top = '0px';
    northZone.style.left = '0px';
    northZone.style.width = BOARD_WIDTH + 'px';
    northZone.style.height = zoneThickness + 'px';
    board.appendChild(northZone);
    
    const southZone = document.createElement('div');
    southZone.className = 'deployment-zone south-zone';
    southZone.style.top = (BOARD_HEIGHT - zoneThickness) + 'px';
    southZone.style.left = '0px';
    southZone.style.width = BOARD_WIDTH + 'px';
    southZone.style.height = zoneThickness + 'px';
    board.appendChild(southZone);
  } else {
    // Quarters mode: create quarter boxes but clip out no-man's circle
    const quarterWidth = BOARD_WIDTH / 2;
    const quarterHeight = BOARD_HEIGHT / 2;
    
    const makeQuarter = (x, y, w, h, cls) => {
      const z = document.createElement('div');
      z.className = `deployment-zone ${cls}`;
      z.style.top = y + 'px';
      z.style.left = x + 'px';
      z.style.width = w + 'px';
      z.style.height = h + 'px';
      board.appendChild(z);
    };
    // only highlight one quarter per player: north gets NW, south gets SE
    makeQuarter(0,0,quarterWidth,quarterHeight,'north-zone');
    makeQuarter(quarterWidth,quarterHeight,quarterWidth,quarterHeight,'south-zone');
    
    // draw no-man's land circle on top
    const noMansLand = document.createElement('div');
    noMansLand.className = 'deployment-zone no-mans-land';
    noMansLand.style.width = (deploymentDistPx * 2) + 'px';
    noMansLand.style.height = (deploymentDistPx * 2) + 'px';
    noMansLand.style.left = (BOARD_WIDTH / 2 - deploymentDistPx) + 'px';
    noMansLand.style.top = (DIVIDER_Y - deploymentDistPx) + 'px';
    board.appendChild(noMansLand);

    // diagonal divider line (bottom-left to top-right)
    const diag = document.createElement('div');
    diag.className = 'diag-divider';
    diag.style.width = Math.hypot(BOARD_WIDTH, BOARD_HEIGHT) + 'px';
    diag.style.height = '2px';
    diag.style.position = 'absolute';
    // start at bottom-left corner
    diag.style.left = '0';
    // position at bottom-left inside board
    diag.style.top = BOARD_HEIGHT + 'px';
    diag.style.background = '#333';
    diag.style.zIndex = '100';
    // rotate around bottom-left corner
    diag.style.transformOrigin = '0 100%';
    diag.style.transform = `rotate(${-Math.atan2(BOARD_HEIGHT, BOARD_WIDTH)}rad)`;
    board.appendChild(diag);
  }
}

function isInDeploymentZone(el, side) {
  const deployMode = document.querySelector('input[name="deployMode"]:checked').value;
  const deploymentDistPx = SQUARE_SIZE_PX * 2; // 12 inches = 2 squares
  
  const left = parseFloat(el.style.left);
  const top = parseFloat(el.style.top);
  const width = el.offsetWidth;
  const height = el.offsetHeight;
  const centerX = left + width / 2;
  const centerY = top + height / 2;
  const bottom = top + height;
  
  // long edges: zones near top/bottom borders
  if (deployMode === 'longEdges') {
    const topZoneY = deploymentDistPx;
    const bottomZoneY = BOARD_HEIGHT - deploymentDistPx;
    if (side === 'north') {
      return centerY <= topZoneY;
    } else {
      return centerY >= bottomZoneY;
    }
  } else {
    // quarters mode (north = NW, south = SE)
    // no-man's land circle
    const centerDist = Math.hypot(centerX - BOARD_WIDTH / 2, centerY - DIVIDER_Y);
    if (centerDist < deploymentDistPx) return false;
    
    if (side === 'north') {
      return centerY < DIVIDER_Y && centerX < BOARD_WIDTH / 2;
    } else {
      return centerY > DIVIDER_Y && centerX > BOARD_WIDTH / 2;
    }
  }
}

// Handle map size updates
document.getElementById('updateMapSize').addEventListener('click', () => {
  const newWidth = parseFloat(document.getElementById('mapWidth').value);
  const newHeight = parseFloat(document.getElementById('mapHeight').value);
  
  if (newWidth > 0 && newHeight > 0) {
    const scaleX = newWidth / mapWidthFeet;
    const scaleY = newHeight / mapHeightFeet;
    
    mapWidthFeet = newWidth;
    mapHeightFeet = newHeight;
    
    // Scale all terrain objects
    terrains.forEach(el => {
      const left = parseFloat(el.style.left);
      const top = parseFloat(el.style.top);
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      
      el.style.left = (left * scaleX) + 'px';
      el.style.top = (top * scaleY) + 'px';
      el.style.width = (width * scaleX) + 'px';
      el.style.height = (height * scaleY) + 'px';
    });
    
    initializeBoard();
  }
});

// Handle deployment mode changes
document.querySelectorAll('input[name="deployMode"]').forEach(radio => {
  radio.addEventListener('change', () => {
    createDeploymentZones();
    calculate();
  });
});

// Initialize on load
initializeBoard();



/* -------- SPAWNING -------- */

document.querySelectorAll('#sidebar button[data-type]')
  .forEach(btn => {
    btn.addEventListener('click', () => spawn(btn.dataset.type));
  });

  document.getElementById('resetWeights').addEventListener('click', () => {
  const defaults = { hard: 3, light: 1 };
  for (let type in defaults) {
    terrainWeights[type] = defaults[type];
    document.getElementById(type+'Slider').value = defaults[type];
    document.getElementById(type+'Val').innerText = defaults[type];
  }
  calculate();
});

  
['hard','light'].forEach(type => {
  const slider = document.getElementById(type+'Slider');
  const display = document.getElementById(type+'Val');

  slider.addEventListener('input', () => {
    terrainWeights[type] = parseFloat(slider.value);
    display.innerText = slider.value;
    calculate(); // recalc immediately
  });
});

function spawn(type) {
  const el = document.createElement('div');
  el.className = `terrain ${type}`;
  el.dataset.type = type;

  el.style.left = '0px';
  el.style.top = '0px';

  // Default sizes (in pixels, based on SQUARE_SIZE_PX)
  const defaultSize = SQUARE_SIZE_PX * 2;
  el.style.width = defaultSize + 'px';
  el.style.height = defaultSize + 'px';

  // Add delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.innerHTML = '×';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    el.remove();
    terrains.splice(terrains.indexOf(el), 1);
    calculate();
  });
  el.appendChild(deleteBtn);

  // Add corner resize handles
  const corners = ['nw', 'sw', 'se'];
  corners.forEach(corner => {
    const handle = document.createElement('div');
    handle.className = `resize-handle ${corner}`;
    handle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      makeResizable(el, corner, e);
    });
    el.appendChild(handle);
  });

  makeDraggable(el);
  board.appendChild(el);
  terrains.push(el);

  calculate();
}


/* -------- DRAGGING -------- */

function makeDraggable(el) {
  let ox, oy;

  el.addEventListener('mousedown', e => {
    // Don't drag if clicking a handle or delete button
    if (e.target.classList.contains('resize-handle') || e.target.classList.contains('delete-btn')) {
      return;
    }

    activeDrag = el;
    ox = e.offsetX;
    oy = e.offsetY;

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', stop);
  });

  function move(e) {
    const boardRect = board.getBoundingClientRect();

    let x = e.clientX - boardRect.left - ox;
    let y = e.clientY - boardRect.top - oy;

    const w = el.offsetWidth;
    const h = el.offsetHeight;

    // Clamp
    x = Math.max(0, Math.min(x, board.clientWidth - w));
    y = Math.max(0, Math.min(y, board.clientHeight - h));

    el.style.left = x + 'px';
    el.style.top = y + 'px';

    calculate();
  }

  function stop() {
    activeDrag = null;
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', stop);
  }
}

/* -------- RESIZING -------- */

function makeResizable(el, corner, startEvent) {
  const startX = startEvent.clientX;
  const startY = startEvent.clientY;
  const startLeft = parseFloat(el.style.left);
  const startTop = parseFloat(el.style.top);
  const startWidth = el.offsetWidth;
  const startHeight = el.offsetHeight;

  function move(e) {
    const boardRect = board.getBoundingClientRect();
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newLeft = startLeft;
    let newTop = startTop;
    let newWidth = startWidth;
    let newHeight = startHeight;

    // Handle corner resizing
    if (corner.includes('w')) {
      newLeft = startLeft + dx;
      newWidth = startWidth - dx;
    }
    if (corner.includes('e')) {
      newWidth = startWidth + dx;
    }
    if (corner.includes('n')) {
      newTop = startTop + dy;
      newHeight = startHeight - dy;
    }
    if (corner.includes('s')) {
      newHeight = startHeight + dy;
    }

    // Minimum size
    newWidth = Math.max(30, newWidth);
    newHeight = Math.max(30, newHeight);

    // Maximum size (can't exceed board)
    newWidth = Math.min(newWidth, board.clientWidth);
    newHeight = Math.min(newHeight, board.clientHeight);

    // Clamp to board
    newLeft = Math.max(0, Math.min(newLeft, board.clientWidth - newWidth));
    newTop = Math.max(0, Math.min(newTop, board.clientHeight - newHeight));

    el.style.left = newLeft + 'px';
    el.style.top = newTop + 'px';
    el.style.width = newWidth + 'px';
    el.style.height = newHeight + 'px';

    calculate();
  }

  function stop() {
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', stop);
  }

  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', stop);
}

/* -------- FAIRNESS -------- */

function calculate() {
  let north = 0;
  let south = 0;
  const halfBoard = BOARD_HEIGHT / 2;
  const boardArea = BOARD_WIDTH * BOARD_HEIGHT;

  const deployMode = document.querySelector('input[name="deployMode"]:checked').value;
  const deploymentDistPx = SQUARE_SIZE_PX * 2; // 12 inches = two squares

  terrains.forEach(el => {
    const top = parseFloat(el.style.top);
    const height = el.offsetHeight;
    const width = el.offsetWidth;
    const bottom = top + height;
    const left = parseFloat(el.style.left);
    const right = left + width;

    // Terrain value (weight based on type)
    let value = 1;
    for (let type in terrainWeights) {
      if (el.classList.contains(type)) {
        value = terrainWeights[type];
        break;
      }
    }
    
    // Size factor (larger buildings contribute more)
    const area = width * height;
    const sizeFactor = area / boardArea;
    
    // Deployment zone boost (1.5x multiplier if in deployment zone)
    let northDeployBoost = 1;
    let southDeployBoost = 1;
    if (isInDeploymentZone(el, 'north')) {
      northDeployBoost = 1.5;
    }
    if (isInDeploymentZone(el, 'south')) {
      southDeployBoost = 1.5;
    }
    
    // Split factor
    let northFactor = 0;
    let southFactor = 0;

    if (deployMode === 'quarters') {
      // use distance from the diagonal line to determine fairness
      const cx = left + width / 2;
      const cy = top + height / 2;
      const m = BOARD_HEIGHT / BOARD_WIDTH;
      const normalDist = Math.abs(m * cx + cy - BOARD_HEIGHT) / Math.sqrt(m*m + 1);
      const maxDist = BOARD_HEIGHT / Math.sqrt(m*m + 1); // at NW or SE corner
      const norm = Math.min(1, normalDist / maxDist);
      if (cy < -m * cx + BOARD_HEIGHT) {
        northFactor = norm;
        southFactor = 0;
      } else {
        southFactor = norm;
        northFactor = 0;
      }
    } else {
      // horizontal split
      if (bottom <= DIVIDER_Y) {
        northFactor = 1;
      } else if (top >= DIVIDER_Y) {
        southFactor = 1;
      } else {
        const northPortion = (DIVIDER_Y - top) / height;
        const southPortion = (bottom - DIVIDER_Y) / height;
        northFactor = northPortion;
        southFactor = southPortion;
      }
    }

    // Distance weighting: closer to enemy side = more valuable
    let northDistance, southDistance;
    if (deployMode === 'quarters') {
      northDistance = 1;
      southDistance = 1;
    } else {
      northDistance = 1 - (top + height / 2) / halfBoard;
      southDistance = ((top + height / 2) - DIVIDER_Y) / halfBoard;
      northDistance = Math.max(0.1, northDistance);
      southDistance = Math.max(0.1, southDistance);
    }

    north += value * northFactor * northDistance * (1 + sizeFactor) * northDeployBoost;
    south += value * southFactor * southDistance * (1 + sizeFactor) * southDeployBoost;
  });

  let verdict = 'Balanced';
  if (Math.abs(north - south) >= 0.3) {
    verdict = north > south ? 'Blue Favoured' : 'Red Favoured';
  }

  scoreEl.innerHTML = `
    <p><b>Blue:</b> ${north.toFixed(3)}</p>
    <p><b>Red:</b> ${south.toFixed(3)}</p>
    <p><b>Verdict:</b> ${verdict}</p>
  `;
}
