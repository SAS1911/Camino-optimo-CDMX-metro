let origin = null, destination = null;
let routeElements = [];

fetch('/data').then(r => r.json()).then(data => {
  for (const line in data) {
    const color = data[line].color;
    for (const [st, pos] of Object.entries(data[line].stations)) {
      const [x, y] = pos;
      createStationButton(st, x, y, color);
    }
  }
});

function createStationButton(name, x, y, color) {
  const btn = document.createElement('div');
  btn.className = 'station-btn';
  btn.style.backgroundColor = color;
  btn.style.left = `${x * 100}%`;
  btn.style.top = `${y * 100}%`;
  btn.title = name;
  btn.addEventListener('click', () => onStationClick(name, btn));
  document.getElementById('map-container').appendChild(btn);
}

function onStationClick(station, btn) {
  if (!origin) {
    origin = station;
    btn.classList.add('marker-origin');
    document.getElementById('sel-origin').innerText = station;
  } else if (!destination && station !== origin) {
    destination = station;
    btn.classList.add('marker-dest');
    document.getElementById('sel-dest').innerText = station;
    document.getElementById('btn-calc').disabled = false;
  } else {
    clearRoute();
    origin = station;
    btn.classList.add('marker-origin');
    document.getElementById('sel-origin').innerText = station;
  }
}

document.getElementById('btn-clear').addEventListener('click', clearRoute);
document.getElementById('btn-calc').addEventListener('click', calculateRoute);

function clearRoute() {
  document.querySelectorAll('.station-btn').forEach(b => b.classList.remove('marker-origin', 'marker-dest', 'marker-route'));
  origin = null;
  destination = null;
  document.getElementById('sel-origin').innerText = '—';
  document.getElementById('sel-dest').innerText = '—';
  document.getElementById('btn-calc').disabled = true;
  document.getElementById('info-route').innerText = '';
  routeElements.forEach(e => e.remove());
  routeElements = [];
}

function calculateRoute() {
  fetch('/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin, destination })
  })
  .then(r => r.json())
  .then(data => {
    if (data.error) { alert(data.error); return; }
    drawRoute(data.path);
    document.getElementById('info-route').innerText = `Tiempo estimado: ${data.total} min`;
  });
}

function drawRoute(path) {
  const svg = document.getElementById('overlay');
  const pts = path.map(p => [p.pos[0] * 800, p.pos[1] * 800]);
  const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  poly.setAttribute("points", pts.map(p => p.join(",")).join(" "));
  poly.setAttribute("stroke", "#e11d48");
  poly.setAttribute("stroke-width", "6");
  poly.setAttribute("fill", "none");
  poly.setAttribute("stroke-linecap", "round");
  poly.setAttribute("stroke-linejoin", "round");
  svg.appendChild(poly);
  routeElements.push(poly);
  path.forEach(p => {
    document.querySelectorAll('.station-btn').forEach(b => {
      if (b.title === p.station) b.classList.add('marker-route');
    });
  });
}