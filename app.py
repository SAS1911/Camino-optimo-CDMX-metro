# app.py
from flask import Flask, render_template, request, jsonify
import json, os
import networkx as nx
from collections import defaultdict
import math

app = Flask(__name__)

# ===============================
# CONFIG
# ===============================

IMG_W = 396
IMG_H = 443

WALK_SPEED = 20
BOARD_TIME  = 2
TIME_BETWEEN_STATIONS = 2
TIME_TRANSFER = 5

# ===============================
# LOAD JSON
# ===============================

BASE_DIR = os.path.dirname(__file__)
with open(os.path.join(BASE_DIR, "static", "lines.json"), "r", encoding="utf-8") as f:
    LINES = json.load(f)

# ===============================
# BUILD GRAPH
# ===============================

G = nx.Graph()

for line_name, info in LINES.items():
    stations = list(info["stations"].keys())

    for i, st in enumerate(stations):

        # Convert relative → pixels
        xr, yr = info["stations"][st]
        px = xr * IMG_W
        py = yr * IMG_H

        node = (st, line_name)
        G.add_node(node, station=st, line=line_name, pos=(px, py))

        # Connect consecutive stations in same line
        if i > 0:
            prev = (stations[i - 1], line_name)
            G.add_edge(prev, node,
                       weight=TIME_BETWEEN_STATIONS,
                       type="rail",
                       line=line_name)

# Map station -> multiple nodes (lines)
station_to_nodes = defaultdict(list)
for node in G.nodes():
    station_to_nodes[node[0]].append(node)

# Transfers
for st, nodes in station_to_nodes.items():
    if len(nodes) > 1:
        for i in range(len(nodes)):
            for j in range(i + 1, len(nodes)):
                G.add_edge(nodes[i], nodes[j],
                           weight=TIME_TRANSFER, type="transfer")

# ===============================
# DISTANCES
# ===============================

def pixel_distance(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])

def walking_time(a, b):
    return pixel_distance(a, b) / WALK_SPEED

def station_pixel_position(st):
    xs = ys = 0
    for node in station_to_nodes[st]:
        x, y = G.nodes[node]["pos"]
        xs += x
        ys += y
    return xs / len(station_to_nodes[st]), ys / len(station_to_nodes[st])

# ===============================
# A* ROUTING
# ===============================

def find_best_path(origin, destination):

    origin_pos = station_pixel_position(origin)
    dest_pos   = station_pixel_position(destination)

    walk_direct = walking_time(origin_pos, dest_pos)

    # Build temporary graph
    SRC, TGT = ("SRC", "SRC"), ("TGT", "TGT")
    Gtmp = G.copy()
    Gtmp.add_node(SRC)
    Gtmp.add_node(TGT)

    # Enter metro
    for n in station_to_nodes[origin]:
        Gtmp.add_edge(SRC, n, weight=BOARD_TIME, type="boarding")

    for n in station_to_nodes[destination]:
        Gtmp.add_edge(n, TGT, weight=0)

    # Heuristic
    def h(a, b):
        if a in (SRC, TGT):
            return 0
        pa = Gtmp.nodes[a]["pos"]
        return walking_time(pa, dest_pos)

    try:
        raw_path = nx.astar_path(Gtmp, SRC, TGT, heuristic=h, weight="weight")
    except:
        return None

    # Steps
    steps = []
    for a, b in zip(raw_path[:-1], raw_path[1:]):
        if a in (SRC, TGT) or b in (SRC, TGT):
            continue

        st1, _ = a
        st2, _ = b

        t = Gtmp[a][b]["weight"]
        step_type = Gtmp[a][b].get("type", "rail")

        steps.append({
            "from": st1,
            "to": st2,
            "time": round(t, 2),
            "type": step_type
        })

    metro_time = sum(s["time"] for s in steps)

    return {
        "steps": steps,
        "distance": round(metro_time, 2),
        "walk_direct": round(walk_direct, 2)
    }


# ===============================
# API ROUTES
# ===============================

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/route", methods=["POST"])
def route():

    data = request.get_json()
    start = data.get("start")
    end   = data.get("end")

    result = find_best_path(start, end)

    if result is None:
        return jsonify({"error": "Ruta no encontrada"}), 404

    # 👇👇👇 OPTION A — WALK DIRECT IF FASTER
    if result["walk_direct"] < result["distance"]:
        walk = result["walk_direct"]
        return jsonify({
            "steps": [{
                "from": start,
                "to": end,
                "time": round(walk, 2),
                "type": "walk"
            }],
            "distance": round(walk, 2),
            "walk_direct": round(walk, 2)
        })

    return jsonify(result)

# ===============================
# RUN
# ===============================

if __name__ == "__main__":
    app.run(debug=True)
