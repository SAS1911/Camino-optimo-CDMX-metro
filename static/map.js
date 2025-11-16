// =========================
// GLOBAL VARIABLES
// =========================

let startStation = null;
let endStation = null;
let stations = {};

let mapContainer = document.getElementById("overlay");
let resultDiv = document.getElementById("result");
let stepsDiv = document.getElementById("steps");

const MAP_WIDTH = 396;
const MAP_HEIGHT = 443;

// =========================
// LOAD STATIONS FROM JSON
// =========================

fetch("/static/lines.json")
  .then(r => r.json())
  .then(data => drawStations(data));

function drawStations(data) {
  console.log("Drawing stations...");

  for (const [line, info] of Object.entries(data)) {
    const color = info.color;

    for (const [name, pos] of Object.entries(info.stations)) {
      const [xr, yr] = pos;

      // Convertir a pixeles exactos según la imagen
      const x = xr * MAP_WIDTH;
      const y = yr * MAP_HEIGHT;

      stations[name] = { x, y, line, color };

      const btn = document.createElement("div");
      btn.className = "station-btn";
      btn.style.left = x + "px";
      btn.style.top = y + "px";
      btn.style.backgroundColor = color;
      btn.title = name;

      btn.addEventListener("click", () => selectStation(name));

      mapContainer.appendChild(btn);
    }
  }

  console.log("Stations drawn:", Object.keys(stations).length);
}

// =========================
// STATION SELECTION
// =========================

function selectStation(name) {
  if (!startStation) {
    startStation = name;
    highlightStation(name, "#00ff00");
    resultDiv.textContent = `Origen: ${name}`;
  } else if (!endStation) {
    endStation = name;
    highlightStation(name, "#ff0000");
    resultDiv.textContent += ` → Destino: ${name}`;
    calculateRoute();
  } else {
    resetSelection();
    selectStation(name);
  }
}

function highlightStation(name, color) {
  document.querySelectorAll(".station-btn").forEach(btn => {
    if (btn.title === name) {
      btn.style.borderColor = color;
      btn.style.boxShadow = `0 0 10px ${color}`;
    }
  });
}

function resetSelection() {
  startStation = null;
  endStation = null;
  resultDiv.textContent = "";
  stepsDiv.innerHTML = "";
  document.getElementById("route-line").innerHTML = "";

  document.querySelectorAll(".station-btn").forEach(btn => {
    btn.style.borderColor = "white";
    btn.style.boxShadow = "none";
  });
}

// =========================
// CALCULATE ROUTE
// =========================

function calculateRoute() {
  fetch("/route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ start: startStation, end: endStation })
  })
    .then(r => r.json())
    .then(data => {
      drawRoute(data.steps);
      showSteps(data.steps);
      resultDiv.textContent += ` — Tiempo total: ${data.distance} min`;
    });
}

// =========================
// DRAW ROUTE
// =========================

function drawRoute(steps) {
  const svg = document.getElementById("route-line");
  svg.innerHTML = "";

  steps.forEach(step => {
    const a = stations[step.from];
    const b = stations[step.to];

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

    line.setAttribute("x1", a.x);
    line.setAttribute("y1", a.y);
    line.setAttribute("x2", b.x);
    line.setAttribute("y2", b.y);

    if (step.type === "rail")
      line.setAttribute("stroke", "#ff3333");
    else if (step.type === "transfer")
      line.setAttribute("stroke", "yellow");
    else if (step.type === "walk")
      line.setAttribute("stroke", "#33aaff");
    else if (step.type === "boarding")
      line.setAttribute("stroke", "white");

    line.setAttribute("stroke-width", "3");
    svg.appendChild(line);
  });
}

// =========================
// SHOW STEP LIST
// =========================

function showSteps(steps) {
  stepsDiv.innerHTML = "";

  steps.forEach(step => {
    const div = document.createElement("div");
    div.textContent = `${step.from} → ${step.to} : ${step.time} min (${step.type})`;
    stepsDiv.appendChild(div);
  });
}

console.log("map.js loaded successfully");