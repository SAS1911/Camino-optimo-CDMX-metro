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
    else
      line.setAttribute("stroke", "white");

    line.setAttribute("stroke-width", "3");
    svg.appendChild(line);
  });
}
