const board = document.getElementById('board');
const scoreEl = document.getElementById('score');

const BOARD_HEIGHT = 900;
const DIVIDER_Y = BOARD_HEIGHT / 2;

const terrains = [];
let activeDrag = null;

const terrainWeights = {
  building: 3,
  bocage: 2,
  hedge: 1,
  forest: 1,
  hill: 1
};



/* -------- SPAWNING -------- */

document.querySelectorAll('#sidebar button[data-type]')
  .forEach(btn => {
    btn.addEventListener('click', () => spawn(btn.dataset.type));
  });

  document.getElementById('resetWeights').addEventListener('click', () => {
  const defaults = { building:3, bocage:2, hedge:1, forest:1, hill:1 };
  for (let type in defaults) {
    terrainWeights[type] = defaults[type];
    document.getElementById(type+'Slider').value = defaults[type];
    document.getElementById(type+'Val').innerText = defaults[type];
  }
  calculate();
});

  
['building','bocage','hedge','forest','hill'].forEach(type => {
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
  el.dataset.rotation = '0';

  el.style.left = '0px';
  el.style.top = '0px';

  // Default sizes
  if (type === 'hedge' || type === 'bocage') {
    el.style.width = '100px';
    el.style.height = '20px';
  } else {
    el.style.width = '100px';
    el.style.height = '100px';
  }

  makeDraggable(el);
  board.appendChild(el);
  terrains.push(el);

  calculate();
}

/* -------- ROTATION (R while dragging) -------- */

document.addEventListener('keydown', e => {
  if (!activeDrag) return;
  if (e.key.toLowerCase() !== 'r') return;

  if (
    activeDrag.classList.contains('hedge') ||
    activeDrag.classList.contains('bocage')
  ) {
    rotate(activeDrag);
  }
});

function rotate(el) {
  let rot = parseInt(el.dataset.rotation, 10);
  rot = rot === 0 ? 90 : 0;
  el.dataset.rotation = rot;
  el.style.transform = `rotate(${rot}deg)`;
}

/* -------- DRAGGING -------- */

function makeDraggable(el) {
  let ox, oy;

  el.addEventListener('mousedown', e => {
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

    // Get logical width/height (rotation-safe)
    const rot = el.dataset.rotation === '90';
    const w = rot ? el.offsetHeight : el.offsetWidth;
    const h = rot ? el.offsetWidth : el.offsetHeight;

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

/* -------- FAIRNESS -------- */

function calculate() {
  let north = 0;
  let south = 0;
  const halfBoard = BOARD_HEIGHT / 2;

  terrains.forEach(el => {
    const top = parseFloat(el.style.top);
    const height = el.offsetHeight;
    const bottom = top + height;

    // Terrain value
    let value = 1;
    for (let type in terrainWeights) {
    if (el.classList.contains(type)) {
        value = terrainWeights[type];
        break;
    }
    }
    
    // Split factor
    let northFactor = 0;
    let southFactor = 0;

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

    // Distance weighting: closer to enemy side = more valuable
    let northDistance = 1 - (top + height / 2) / halfBoard; // 1 = near divider, 0 = back edge
    let southDistance = ((top + height / 2) - DIVIDER_Y) / halfBoard;
    northDistance = Math.max(0.1, northDistance); // avoid 0
    southDistance = Math.max(0.1, southDistance);

    north += value * northFactor * northDistance;
    south += value * southFactor * southDistance;
  });

  let verdict = 'Balanced';
  if (Math.abs(north - south) >= 1) {
    verdict = north > south ? 'North Favoured' : 'South Favoured';
  }

  scoreEl.innerHTML = `
    <p><b>North:</b> ${north.toFixed(2)}</p>
    <p><b>South:</b> ${south.toFixed(2)}</p>
    <p><b>Verdict:</b> ${verdict}</p>
  `;
}
