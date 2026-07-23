// ═══════════════════════════════════════════════════════
//  GRAPH DEFINITION
// ═══════════════════════════════════════════════════════
const NODES = {
  SHA: {id:'SHA', name:'Shanghai',    x:0.82, y:0.22, lat:31.2304,  lng:121.4737},
  TOK: {id:'TOK', name:'Tokyo',       x:0.87, y:0.18, lat:35.6762,  lng:139.6503},
  SIN: {id:'SIN', name:'Singapore',   x:0.74, y:0.52, lat:1.3521,   lng:103.8198},
  COL: {id:'COL', name:'Colombo',     x:0.60, y:0.54, lat:6.9271,   lng:79.8612},
  MUM: {id:'MUM', name:'Mumbai',      x:0.56, y:0.40, lat:18.9388,  lng:72.8354},
  DUB: {id:'DUB', name:'Dubai',       x:0.50, y:0.34, lat:25.2048,  lng:55.2708},
  JED: {id:'JED', name:'Jeddah',      x:0.47, y:0.42, lat:21.4858,  lng:39.1925},
  SUE: {id:'SUE', name:'Suez',        x:0.45, y:0.33, lat:29.9668,  lng:32.5498},
  ALE: {id:'ALE', name:'Alexandria',  x:0.44, y:0.28, lat:31.2001,  lng:29.9187},
  GIB: {id:'GIB', name:'Gibraltar',   x:0.32, y:0.27, lat:36.1408,  lng:-5.3536},
  ROT: {id:'ROT', name:'Rotterdam',   x:0.38, y:0.17, lat:51.9225,  lng:4.4792},
  LON: {id:'LON', name:'London',      x:0.35, y:0.15, lat:51.5074,  lng:-0.1278},
  LAX: {id:'LAX', name:'Los Angeles', x:0.10, y:0.30, lat:33.7405,  lng:-118.2720},
};

const BASE_EDGES = [
  ['SHA','TOK', 30, 0.05],
  ['SHA','SIN', 55, 0.10],
  ['TOK','SIN', 60, 0.08],
  ['SIN','COL', 40, 0.12],
  ['SIN','MUM', 70, 0.15],
  ['COL','MUM', 35, 0.10],
  ['COL','DUB', 65, 0.30],
  ['COL','JED', 55, 0.20],
  ['MUM','DUB', 50, 0.28],
  ['MUM','JED', 60, 0.15],
  ['DUB','SUE', 45, 0.25],
  ['DUB','JED', 30, 0.22],
  ['JED','SUE', 50, 0.18],
  ['SUE','ALE', 20, 0.12],
  ['ALE','GIB', 90, 0.10],
  ['GIB','ROT', 70, 0.08],
  ['GIB','LON', 80, 0.08],
  ['ROT','LON', 25, 0.05],
  ['LAX','SIN', 95, 0.12],
  ['LAX','SHA', 90, 0.12],
];

const DISRUPTIONS = [
  {id:'D1', from:'DUB', to:'SUE', extraCost:999, label:'Dubai Storm',    icon:'🌀', active:true,  desc:'+∞ (blocked)'},
  {id:'D2', from:'MUM', to:'DUB', extraCost:60,  label:'Congestion',     icon:'🚛', active:false, desc:'+60 wt'},
  {id:'D3', from:'SUE', to:'ALE', extraCost:45,  label:'Suez Backlog',   icon:'⚓', active:false, desc:'+45 wt'},
  {id:'D4', from:'COL', to:'JED', extraCost:35,  label:'Monsoon',        icon:'🌧️', active:false, desc:'+35 wt'},
  {id:'D5', from:'GIB', to:'ROT', extraCost:25,  label:'North Sea Storm',icon:'🌬️',active:false, desc:'+25 wt'},
];

// ═══════════════════════════════════════════════════════
//  DIJKSTRA ALGORITHM
// ═══════════════════════════════════════════════════════
function buildGraph(){
  const graph = {};
  Object.keys(NODES).forEach(n => graph[n] = []);
  BASE_EDGES.forEach(([a, b, base, risk]) => {
    let w = base + risk * 25;
    DISRUPTIONS.forEach(d => {
      if((d.from===a&&d.to===b)||(d.from===b&&d.to===a)){
        if(d.active) w += d.extraCost;
      }
    });
    graph[a].push({to:b, weight:Math.round(w)});
    graph[b].push({to:a, weight:Math.round(w)});
  });
  return graph;
}

function dijkstra(src, dst){
  const graph = buildGraph();
  const dist  = {};
  const prev  = {};
  const visited = new Set();
  const steps = [];

  Object.keys(NODES).forEach(n => { dist[n] = Infinity; prev[n] = null; });
  dist[src] = 0;
  const pq = [{node:src, d:0}];
  steps.push({type:'init', node:src, dist:0});

  while(pq.length){
    pq.sort((a,b) => a.d - b.d);
    const {node: u, d: du} = pq.shift();
    if(visited.has(u)) continue;
    visited.add(u);
    steps.push({type:'settle', node:u, dist:du});
    if(u === dst) break;

    for(const {to:v, weight:w} of graph[u]){
      if(visited.has(v)) continue;
      const newD = du + w;
      steps.push({type:'relax', from:u, to:v, via:newD, old:dist[v], weight:w});
      if(newD < dist[v]){
        dist[v] = newD;
        prev[v] = u;
        pq.push({node:v, d:newD});
      }
    }
  }

  const path = [];
  let cur = dst;
  while(cur !== null){ path.unshift(cur); cur = prev[cur]; }
  if(path[0] !== src) return {path:[], dist:Infinity, steps, dist_all:dist};
  return {path, dist:dist[dst], steps, dist_all:dist};
}

// ═══════════════════════════════════════════════════════
//  CANVAS RENDERER (fallback when no Maps key)
// ═══════════════════════════════════════════════════════
const canvas = document.getElementById('dijkCanvas');
const ctx    = canvas.getContext('2d');
let canvasW = 0, canvasH = 0;
let currentPath   = [];
let settledNodes  = new Set();
let frontierNodes = new Set();
let currentNode   = null;
let relaxedEdges  = new Map();
let optimalEdges  = new Set();
let animSteps     = [];
let animIdx       = 0;
let animTimer     = null;
let dijkResult    = null;
let distMap       = {};

const colorAccent = '#00f0ff';
const colorGreen  = '#00e5a0';
const colorAmber  = '#ffb020';
const colorRed    = '#ff3860';

function resizeCanvas(){
  const wrap = canvas.parentElement;
  canvasW = wrap.clientWidth;
  canvasH = wrap.clientHeight;
  canvas.width  = canvasW;
  canvas.height = canvasH;
  drawGraph();
}

function nodePos(n){ return {x: NODES[n].x * canvasW, y: NODES[n].y * canvasH}; }
function edgeKey(a, b){ return [a,b].sort().join('-'); }

function getEdgeWeight(a, b){
  const graph = buildGraph();
  const e = graph[a]?.find(e => e.to === b);
  return e ? e.weight : null;
}
function isEdgeBlocked(a, b){
  const w = getEdgeWeight(a, b);
  return w !== null && w >= 1000;
}

function drawGraph(){
  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.strokeStyle = 'rgba(22,32,48,0.5)';
  ctx.lineWidth = 0.5;
  for(let x=0; x<canvasW; x+=40){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvasH); ctx.stroke(); }
  for(let y=0; y<canvasH; y+=40){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvasW,y); ctx.stroke(); }

  BASE_EDGES.forEach(([a, b]) => {
    const pa = nodePos(a), pb = nodePos(b);
    const key = edgeKey(a, b);
    const blocked  = isEdgeBlocked(a, b);
    const isOptimal= optimalEdges.has(key);
    const isRelaxed= relaxedEdges.has(key);

    if(isOptimal){
      ctx.strokeStyle = 'rgba(136,68,255,0.25)'; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      ctx.strokeStyle = '#8844ff'; ctx.lineWidth = 3; ctx.setLineDash([]);
    } else if(blocked){
      ctx.strokeStyle = 'rgba(255,56,96,0.6)'; ctx.lineWidth = 2; ctx.setLineDash([6,4]);
    } else if(isRelaxed){
      ctx.strokeStyle = 'rgba(0,229,160,0.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = 'rgba(30,48,72,0.8)'; ctx.lineWidth = 1; ctx.setLineDash([]);
    }
    ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
    ctx.setLineDash([]);

    const mx = (pa.x + pb.x)/2, my = (pa.y + pb.y)/2;
    const w = getEdgeWeight(a, b);
    if(w !== null){
      const label = w >= 1000 ? '∞' : String(w);
      ctx.font = '9px IBM Plex Mono'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(label).width + 8;
      ctx.fillStyle = blocked ? 'rgba(255,56,96,0.2)' : isOptimal ? 'rgba(136,68,255,0.25)' : 'rgba(4,8,15,0.85)';
      ctx.beginPath(); ctx.roundRect(mx - tw/2, my - 7, tw, 14, 3); ctx.fill();
      ctx.fillStyle = blocked ? '#ff3860' : isOptimal ? '#c0a0ff' : isRelaxed ? '#00e5a0' : '#4a6580';
      ctx.fillText(label, mx, my);
    }
    if(blocked){
      ctx.strokeStyle = '#ff3860'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(mx-6, my-6); ctx.lineTo(mx+6, my+6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx+6, my-6); ctx.lineTo(mx-6, my+6); ctx.stroke();
    }
  });

  Object.keys(NODES).forEach(nid => {
    const p = nodePos(nid);
    const isSettled  = settledNodes.has(nid);
    const isFrontier = frontierNodes.has(nid);
    const isCurrent  = currentNode === nid;
    const isPath     = currentPath.includes(nid);
    const hasDist    = distMap[nid] !== undefined && distMap[nid] !== Infinity;

    let fillColor = '#0c1422', strokeColor = '#1e3048', radius = 18, glowColor = null;
    if(isCurrent){ fillColor='rgba(0,240,255,0.15)'; strokeColor=colorAccent; glowColor=colorAccent; radius=22; }
    else if(isPath){ fillColor='rgba(136,68,255,0.2)'; strokeColor='#8844ff'; glowColor='#8844ff'; radius=20; }
    else if(isSettled){ fillColor='rgba(0,229,160,0.12)'; strokeColor=colorGreen; }
    else if(isFrontier){ fillColor='rgba(255,176,32,0.12)'; strokeColor=colorAmber; }

    const isDisrupted = DISRUPTIONS.some(d => d.active && (d.from===nid||d.to===nid));
    if(isDisrupted && !isPath && !isCurrent){ strokeColor='rgba(255,56,96,0.7)'; fillColor='rgba(255,56,96,0.06)'; }

    if(glowColor){ ctx.shadowColor = glowColor; ctx.shadowBlur = isCurrent ? 20 : 12; }
    ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI*2);
    ctx.fillStyle = fillColor; ctx.fill();
    ctx.strokeStyle = strokeColor; ctx.lineWidth = isCurrent||isPath ? 2 : 1.5; ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.font = `${isCurrent||isPath?'600 ':'500 '}11px DM Sans`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = isCurrent ? colorAccent : isPath ? '#c0a0ff' : isSettled ? colorGreen : isFrontier ? colorAmber : '#7a9ab5';
    ctx.fillText(nid, p.x, p.y - (hasDist ? 4 : 0));

    if(hasDist && distMap[nid] < Infinity){
      ctx.font = '9px IBM Plex Mono';
      ctx.fillStyle = isCurrent ? colorAccent : isPath ? '#c0a0ff' : '#4a6580';
      ctx.fillText(distMap[nid], p.x, p.y + 7);
    }
  });
}

// ═══════════════════════════════════════════════════════
//  GOOGLE MAPS INTEGRATION
// ═══════════════════════════════════════════════════════
let MAPS_KEY = '';
let GEMINI_KEY = '';
let dashGoogleMap = null;
let routeGoogleMap = null;
let mapsLoaded = false;
let mapsLoading = false;
let dashMapInitialized = false;
let routeMapInitialized = false;

// Stored polylines/markers for route map
let routeMapMarkers = [];
let routeMapPolylines = [];
let optimalPolyline = null;

const MAP_STYLE = [
  {elementType:'geometry',stylers:[{color:'#0a1628'}]},
  {elementType:'labels.text.fill',stylers:[{color:'#4a6580'}]},
  {elementType:'labels.text.stroke',stylers:[{color:'#04080f'}]},
  {featureType:'administrative',elementType:'geometry',stylers:[{color:'#1e3048'}]},
  {featureType:'administrative.country',elementType:'labels.text.fill',stylers:[{color:'#7a9ab5'}]},
  {featureType:'landscape',elementType:'geometry',stylers:[{color:'#0c1422'}]},
  {featureType:'poi',stylers:[{visibility:'off'}]},
  {featureType:'road',stylers:[{visibility:'off'}]},
  {featureType:'transit',stylers:[{visibility:'off'}]},
  {featureType:'water',elementType:'geometry',stylers:[{color:'#04080f'}]},
  {featureType:'water',elementType:'labels.text.fill',stylers:[{color:'#1e3048'}]},
];

function loadGoogleMaps(key){
  if(mapsLoaded || mapsLoading) return;
  mapsLoading = true;
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=onMapsLoaded`;
  script.async = true;
  script.onerror = () => {
    mapsLoading = false;
    showToast('⚠️ Google Maps failed to load. Check your API key.', colorRed);
    document.getElementById('mapsStatus').textContent = 'ERROR';
  };
  document.head.appendChild(script);
}

window.onMapsLoaded = function(){
  mapsLoaded = true;
  mapsLoading = false;
  setMapsStatus(true);
  document.getElementById('dashMapNoKey').style.display = 'none';
  initDashMap();
};

function initDashMap(){
  if(dashMapInitialized || !mapsLoaded) return;
  dashMapInitialized = true;

  dashGoogleMap = new google.maps.Map(document.getElementById('dashMap'), {
    zoom: 3,
    center: {lat: 25, lng: 50},
    styles: MAP_STYLE,
    disableDefaultUI: true,
    zoomControl: true,
    gestureHandling: 'cooperative',
  });

  // Draw all edges as polylines
  BASE_EDGES.forEach(([a, b, , risk]) => {
    const pa = NODES[a], pb = NODES[b];
    const disrupted = DISRUPTIONS.find(d => d.active && ((d.from===a&&d.to===b)||(d.from===b&&d.to===a)));
    const color = disrupted ? '#ff3860' : risk > 0.2 ? '#ffb020' : '#1e4060';
    const line = new google.maps.Polyline({
      path: [{lat:pa.lat,lng:pa.lng},{lat:pb.lat,lng:pb.lng}],
      geodesic: true,
      strokeColor: color,
      strokeOpacity: disrupted ? 0.8 : 0.4,
      strokeWeight: disrupted ? 2 : 1,
      map: dashGoogleMap,
    });
    if(disrupted){
      const icon = document.createElement('div');
      icon.innerHTML = DISRUPTIONS.find(d=>d.active&&((d.from===a&&d.to===b)||(d.from===b&&d.to===a)))?.icon||'';
    }
  });

  // Draw node markers
  Object.values(NODES).forEach(n => {
    const disrupted = DISRUPTIONS.some(d => d.active && (d.from===n.id||d.to===n.id));
    const color = disrupted ? '#ff3860' : '#00f0ff';
    const marker = new google.maps.Marker({
      position: {lat:n.lat, lng:n.lng},
      map: dashGoogleMap,
      title: n.name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: color,
        fillOpacity: 0.85,
        strokeColor: disrupted ? '#ff3860' : '#00f0ff',
        strokeWeight: 2,
      },
      label: {
        text: n.id,
        color: '#ffffff',
        fontSize: '9px',
        fontFamily: 'IBM Plex Mono',
        fontWeight: '600',
      },
    });

    const infoWin = new google.maps.InfoWindow({
      content: `<div style="background:#0c1422;color:#ddeeff;padding:8px 12px;border-radius:6px;font-family:'IBM Plex Mono',monospace;font-size:11px;min-width:120px">
        <div style="font-weight:700;color:#00f0ff;margin-bottom:4px">${n.name}</div>
        <div style="color:#4a6580">ID: ${n.id}</div>
        ${disrupted?'<div style="color:#ff3860;margin-top:4px">⚠️ DISRUPTION ACTIVE</div>':''}
      </div>`,
    });

    marker.addListener('click', () => infoWin.open(dashGoogleMap, marker));
  });
}

function initRouteMap(){
  if(routeMapInitialized || !mapsLoaded) return;
  routeMapInitialized = true;

  // Show map, hide canvas
  document.getElementById('routeMapContainer').style.display = 'block';
  canvas.style.display = 'none';

  routeGoogleMap = new google.maps.Map(document.getElementById('routeMapDiv'), {
    zoom: 3,
    center: {lat: 25, lng: 50},
    styles: MAP_STYLE,
    disableDefaultUI: true,
    zoomControl: true,
    gestureHandling: 'cooperative',
  });

  drawRouteMapBase();
}

function drawRouteMapBase(){
  if(!routeGoogleMap) return;

  // Clear old
  routeMapPolylines.forEach(p => p.setMap(null));
  routeMapMarkers.forEach(m => m.setMap(null));
  routeMapPolylines = [];
  routeMapMarkers = [];
  if(optimalPolyline){ optimalPolyline.setMap(null); optimalPolyline = null; }

  // Draw all edges
  BASE_EDGES.forEach(([a, b, , risk]) => {
    const pa = NODES[a], pb = NODES[b];
    const disrupted = DISRUPTIONS.find(d => d.active && ((d.from===a&&d.to===b)||(d.from===b&&d.to===a)));
    const isOpt = optimalEdges.has(edgeKey(a,b));
    const color = isOpt ? '#8844ff' : disrupted ? '#ff3860' : risk > 0.2 ? '#ffb020' : '#1e4060';
    const line = new google.maps.Polyline({
      path: [{lat:pa.lat,lng:pa.lng},{lat:pb.lat,lng:pb.lng}],
      geodesic: true,
      strokeColor: color,
      strokeOpacity: isOpt ? 1 : disrupted ? 0.8 : 0.35,
      strokeWeight: isOpt ? 4 : disrupted ? 2 : 1,
      map: routeGoogleMap,
    });
    routeMapPolylines.push(line);
  });

  // Draw optimal path glow
  if(currentPath.length > 1){
    const pathCoords = currentPath.map(id => ({lat:NODES[id].lat, lng:NODES[id].lng}));
    const glow = new google.maps.Polyline({
      path: pathCoords,
      geodesic: true,
      strokeColor: '#8844ff',
      strokeOpacity: 0.18,
      strokeWeight: 16,
      map: routeGoogleMap,
    });
    routeMapPolylines.push(glow);
    optimalPolyline = new google.maps.Polyline({
      path: pathCoords,
      geodesic: true,
      strokeColor: '#c0a0ff',
      strokeOpacity: 0.9,
      strokeWeight: 3,
      map: routeGoogleMap,
    });
    routeMapPolylines.push(optimalPolyline);
  }

  // Draw markers
  Object.values(NODES).forEach(n => {
    const isInPath = currentPath.includes(n.id);
    const isSrc    = n.id === srcNode && currentPath.length > 0;
    const isDst    = n.id === dstNode && currentPath.length > 0;
    const disrupted= DISRUPTIONS.some(d => d.active && (d.from===n.id||d.to===n.id));
    let fillColor  = disrupted ? '#ff3860' : isInPath ? '#c0a0ff' : '#00f0ff';
    let scale      = isInPath ? 11 : 8;
    if(isSrc) fillColor = '#00f0ff';
    if(isDst) fillColor = '#00e5a0';

    const m = new google.maps.Marker({
      position: {lat:n.lat, lng:n.lng},
      map: routeGoogleMap,
      title: n.name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale,
        fillColor,
        fillOpacity: 0.9,
        strokeColor: fillColor,
        strokeWeight: isInPath ? 3 : 2,
      },
      label: {
        text: n.id,
        color: '#ffffff',
        fontSize: '9px',
        fontFamily: 'IBM Plex Mono',
        fontWeight: '600',
      },
      zIndex: isInPath ? 10 : 1,
    });

    const d_val = distMap[n.id];
    const distStr = (d_val !== undefined && d_val < Infinity) ? `<div style="color:#00e5a0;margin-top:3px">dist: ${d_val}</div>` : '';
    const infoWin = new google.maps.InfoWindow({
      content: `<div style="background:#0c1422;color:#ddeeff;padding:8px 12px;border-radius:6px;font-family:'IBM Plex Mono',monospace;font-size:11px">
        <div style="font-weight:700;color:${fillColor};margin-bottom:3px">${n.name} (${n.id})</div>
        ${distStr}
        ${disrupted?'<div style="color:#ff3860;margin-top:3px">⚠️ DISRUPTION ACTIVE</div>':''}
        ${isInPath?'<div style="color:#8844ff;margin-top:3px">★ ON OPTIMAL PATH</div>':''}
      </div>`,
    });
    m.addListener('click', () => infoWin.open(routeGoogleMap, m));
    routeMapMarkers.push(m);
  });

  // Fit bounds to path if we have one
  if(currentPath.length > 1){
    const bounds = new google.maps.LatLngBounds();
    currentPath.forEach(id => bounds.extend({lat:NODES[id].lat, lng:NODES[id].lng}));
    routeGoogleMap.fitBounds(bounds, {top:60, bottom:40, left:40, right:40});
  }
}

// ═══════════════════════════════════════════════════════
//  RUN DIJKSTRA
// ═══════════════════════════════════════════════════════
let srcNode = 'SHA', dstNode = 'LON';

function runDijkstra(){
  clearAnimation();
  settledNodes.clear(); frontierNodes.clear(); relaxedEdges.clear();
  optimalEdges.clear(); currentNode = null; currentPath = []; distMap = {}; dijkResult = null;

  srcNode = document.getElementById('srcSelect').value;
  dstNode = document.getElementById('dstSelect').value;
  if(srcNode === dstNode){ showToast('⚠️ Origin and destination must differ', colorAmber); return; }

  dijkResult = dijkstra(srcNode, dstNode);
  animSteps  = dijkResult.steps;
  animIdx    = 0;

  document.getElementById('resultSection').style.display = 'none';
  document.getElementById('traceStatus').textContent = '— running…';
  document.getElementById('traceBox').innerHTML = '';

  runDijkstraAnimation();
}

function runDijkstraAnimation(){
  clearAnimation();
  if(!dijkResult){ runDijkstra(); return; }
  animIdx = 0;
  animTimer = setInterval(stepAnimation, 80);
}

function stepAnimation(){
  if(animIdx >= animSteps.length){ clearAnimation(); finishDijkstra(); return; }
  const step = animSteps[animIdx++];
  applyStep(step);
  if(!mapsLoaded) drawGraph();
}

function applyStep(step){
  const traceBox = document.getElementById('traceBox');
  if(step.type === 'init'){
    distMap[step.node] = 0; frontierNodes.add(step.node); currentNode = step.node;
    appendTrace(`Init: dist[${step.node}] = 0`, 'active');
  } else if(step.type === 'settle'){
    settledNodes.add(step.node); frontierNodes.delete(step.node);
    currentNode = step.node; distMap[step.node] = step.dist;
    appendTrace(`Settle ${step.node} → dist=${step.dist}`, 'settled');
  } else if(step.type === 'relax'){
    const key = edgeKey(step.from, step.to);
    if(step.via < step.old){
      relaxedEdges.set(key, step.via); distMap[step.to] = step.via; frontierNodes.add(step.to);
      appendTrace(`Relax ${step.from}→${step.to}: ${step.old===Infinity?'∞':step.old} → ${step.via} (+${step.weight})`, 'current');
    } else {
      appendTrace(`Skip  ${step.from}→${step.to}: ${step.via} ≥ ${step.old===Infinity?'∞':step.old}`, '');
    }
  }
  traceBox.scrollTop = traceBox.scrollHeight;
}

function appendTrace(text, cls){
  const box = document.getElementById('traceBox');
  const div = document.createElement('div');
  div.className = 'trace-step' + (cls ? ' '+cls : '');
  div.textContent = '> ' + text;
  box.appendChild(div);
}

function finishDijkstra(){
  if(!dijkResult) return;
  document.getElementById('traceStatus').textContent = '— complete';
  currentNode = null; settledNodes.clear();

  if(dijkResult.path.length < 2){
    appendTrace('NO PATH FOUND — all routes blocked!', 'active');
    showToast('⚠️ No path found — all routes blocked!', colorRed);
    if(!mapsLoaded) drawGraph();
    return;
  }

  for(let i=0; i<dijkResult.path.length-1; i++){
    optimalEdges.add(edgeKey(dijkResult.path[i], dijkResult.path[i+1]));
  }
  currentPath = dijkResult.path;
  appendTrace(`OPTIMAL: ${dijkResult.path.join(' → ')} = ${dijkResult.dist}`, 'settled');

  if(mapsLoaded){
    drawRouteMapBase();
  } else {
    drawGraph();
  }

  showResult(dijkResult);
  showToast(`✅ ${dijkResult.path.join('→')} = ${dijkResult.dist} units`, colorGreen);
}

function showResult(result){
  document.getElementById('resultSection').style.display = 'block';
  const pathCard = document.getElementById('pathCard');
  const graph = buildGraph();
  let html = '', cumCost = 0;
  result.path.forEach((n, i) => {
    const isLast = i === result.path.length - 1;
    let segW = 0;
    if(i > 0){
      const prev = result.path[i-1];
      const e = graph[prev]?.find(e => e.to === n);
      segW = e ? e.weight : 0;
      cumCost += segW;
    }
    const col = n === srcNode ? colorAccent : isLast ? colorGreen : '#8844ff';
    html += `<div class="path-row">
      <div class="path-node-dot" style="background:${col}"></div>
      <div class="path-node-name">${NODES[n].name}</div>
      ${i>0?`<div class="path-node-cost">+${segW} = ${cumCost}</div>`:`<div class="path-node-cost" style="color:${colorAccent}">START</div>`}
    </div>`;
  });
  pathCard.innerHTML = html;

  const hops = result.path.length - 1;
  const costSaved = Math.round(result.dist * 43.2 / 100) * 100;
  document.getElementById('metricsGrid').innerHTML = `
    <div class="metric-box"><div class="metric-val" style="color:${colorAccent}">${result.dist}</div><div class="metric-lbl">TOTAL WEIGHT</div></div>
    <div class="metric-box"><div class="metric-val" style="color:#8844ff">${hops}</div><div class="metric-lbl">HOPS</div></div>
    <div class="metric-box"><div class="metric-val" style="color:${colorGreen}">$${(costSaved/1000).toFixed(1)}K</div><div class="metric-lbl">EST. SAVING</div></div>
  `;
}

function clearAnimation(){ if(animTimer){ clearInterval(animTimer); animTimer = null; } }

function resetVisualization(){
  clearAnimation();
  settledNodes.clear(); frontierNodes.clear(); relaxedEdges.clear();
  optimalEdges.clear(); currentNode = null; currentPath = []; distMap = {}; dijkResult = null;
  document.getElementById('resultSection').style.display = 'none';
  document.getElementById('traceBox').innerHTML = '<div style="color:var(--muted)">Select origin and destination, then run Dijkstra…</div>';
  document.getElementById('traceStatus').textContent = '— waiting';
  if(mapsLoaded){ drawRouteMapBase(); } else { drawGraph(); }
}

// ═══════════════════════════════════════════════════════
//  DISRUPTION TOGGLES
// ═══════════════════════════════════════════════════════
function buildDisruptionList(){
  const el = document.getElementById('disruptionList');
  el.innerHTML = '';
  DISRUPTIONS.forEach(d => {
    const div = document.createElement('div');
    div.className = 'disruption-toggle' + (d.active ? ' active' : '');
    div.innerHTML = `
      <div class="dt-icon">${d.icon}</div>
      <div class="dt-info"><div class="dt-name">${d.label}</div><div class="dt-edge">${d.from} ↔ ${d.to}</div></div>
      <div class="dt-cost">${d.desc}</div>
      <div class="toggle-sw ${d.active ? 'on' : ''}"></div>
    `;
    div.onclick = () => toggleDisruption(d.id);
    el.appendChild(div);
  });
}

function toggleDisruption(id){
  const d = DISRUPTIONS.find(x => x.id === id);
  if(!d) return;
  d.active = !d.active;
  buildDisruptionList();
  if(mapsLoaded){ drawRouteMapBase(); } else { drawGraph(); }
  if(dijkResult) runDijkstra();
  showToast(`${d.active?'🔴 Disruption ACTIVE':'🟢 Disruption CLEARED'}: ${d.label}`, d.active ? colorRed : colorGreen);
}

// ═══════════════════════════════════════════════════════
//  SELECTS
// ═══════════════════════════════════════════════════════
let selectsBuilt = false;
function buildSelects(){
  if(selectsBuilt) return;
  selectsBuilt = true;
  const src = document.getElementById('srcSelect');
  const dst = document.getElementById('dstSelect');
  Object.keys(NODES).forEach(n => {
    src.appendChild(new Option(`${n} — ${NODES[n].name}`, n));
    dst.appendChild(new Option(`${n} — ${NODES[n].name}`, n));
  });
  src.value = 'SHA';
  dst.value = 'LON';
}

// ═══════════════════════════════════════════════════════
//  UI HELPERS
// ═══════════════════════════════════════════════════════
function setMapsStatus(on){
  const dot = document.getElementById('mapsDot');
  const lbl = document.getElementById('mapsLabel');
  const stat= document.getElementById('mapsStatus');
  dot.style.background = on ? colorGreen : 'var(--muted)';
  dot.style.boxShadow  = on ? '0 0 5px '+colorGreen : 'none';
  lbl.style.color      = on ? colorGreen : 'var(--muted)';
  stat.style.color     = on ? colorGreen : 'var(--muted)';
  stat.textContent     = on ? 'LIVE' : 'OFFLINE';
}

function setGeminiStatus(on){
  const dot = document.getElementById('geminiDot');
  const lbl = document.getElementById('geminiLabel');
  const stat= document.getElementById('geminiStatus');
  dot.style.background = on ? colorGreen : 'var(--muted)';
  dot.style.boxShadow  = on ? '0 0 5px '+colorGreen : 'none';
  lbl.style.color      = on ? colorGreen : 'var(--muted)';
  stat.style.color     = on ? colorGreen : 'var(--muted)';
  stat.textContent     = on ? 'LIVE' : 'OFFLINE';
  // update chat status badge
  const dot2 = document.getElementById('chatStatusDot');
  const txt2 = document.getElementById('chatStatusText');
  dot2.style.background = on ? colorGreen : 'var(--muted)';
  txt2.textContent = on ? 'ONLINE' : 'NO KEY';
  txt2.style.color  = on ? colorGreen : 'var(--muted)';
}

function saveKeys(){
  const mk = document.getElementById('mapsKeyInput').value.trim();
  const gk = document.getElementById('geminiKeyInput').value.trim();
  if(mk){
    MAPS_KEY = mk;
    localStorage.setItem('rg_maps_key', mk);
    loadGoogleMaps(mk);
  }
  if(gk){
    GEMINI_KEY = gk;
    localStorage.setItem('rg_gemini_key', gk);
    setGeminiStatus(true);
  }
  if(mk || gk) showToast('✅ Keys saved!', colorGreen);
}

function focusMapsKey(){
  document.getElementById('mapsKeyInput').focus();
  document.getElementById('mapsKeyInput').scrollIntoView({behavior:'smooth'});
}

// Load saved keys
(function(){
  const mk = localStorage.getItem('rg_maps_key');
  const gk = localStorage.getItem('rg_gemini_key');
  if(mk){ MAPS_KEY = mk; document.getElementById('mapsKeyInput').value = mk; loadGoogleMaps(mk); }
  if(gk){ GEMINI_KEY = gk; document.getElementById('geminiKeyInput').value = gk; setGeminiStatus(true); }
})();

function tick(){ document.getElementById('clock').textContent = new Date().toUTCString().slice(17,25)+' UTC'; }
tick(); setInterval(tick, 1000);

function switchScreen(id){
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const nav = document.querySelector(`[data-screen="${id}"]`);
  if(nav) nav.classList.add('active');
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const sc = document.getElementById(`screen-${id}`);
  if(sc) sc.classList.add('active');

  if(id === 'routes'){
    buildSelects();
    buildDisruptionList();
    setTimeout(() => {
      if(mapsLoaded){
        initRouteMap();
      } else {
        resizeCanvas();
        drawGraph();
      }
    }, 80);
  }
}

document.querySelectorAll('[data-screen]').forEach(n => {
  n.addEventListener('click', () => switchScreen(n.dataset.screen));
});

window.addEventListener('resize', () => {
  if(document.getElementById('screen-routes').classList.contains('active') && !mapsLoaded){
    resizeCanvas();
  }
});

let toastTimer = null;
function showToast(msg, bg=colorGreen){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = bg.startsWith('var') ? getComputedStyle(document.documentElement).getPropertyValue(bg.slice(4,-1)).trim() : bg;
  t.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.display = 'none'; }, 3400);
}

// ═══════════════════════════════════════════════════════
//  DASHBOARD WIDGETS
// ═══════════════════════════════════════════════════════
const SHIPMENTS = [
  {id:'SHP-4821', origin:'Shanghai',    dest:'London',     cargo:'Electronics', eta:'Apr 28', risk:87, status:'HIGH RISK'},
  {id:'SHP-3392', origin:'Mumbai',      dest:'New York',   cargo:'Textiles',    eta:'Apr 30', risk:62, status:'WARNING'},
  {id:'SHP-2210', origin:'Rotterdam',   dest:'Chicago',    cargo:'Auto Parts',  eta:'May 2',  risk:18, status:'ON TRACK'},
  {id:'SHP-5503', origin:'Tokyo',       dest:'Dubai',      cargo:'Machinery',   eta:'May 1',  risk:34, status:'ON TRACK'},
  {id:'SHP-6671', origin:'Los Angeles', dest:'Singapore',  cargo:'Pharma',      eta:'Apr 29', risk:73, status:'WARNING'},
  {id:'SHP-1145', origin:'Hamburg',     dest:'Sydney',     cargo:'Chemicals',   eta:'May 5',  risk:9,  status:'ON TRACK'},
];

function riskCls(r){ return r>70?'rh':r>40?'rm':'rl'; }
function riskCol(r){ return r>70?colorRed:r>40?colorAmber:colorGreen; }
function stCol(s)  { return s==='HIGH RISK'?colorRed:s==='WARNING'?colorAmber:colorGreen; }

function animCount(el, target){
  let cur=0; const step=target/40;
  const iv=setInterval(()=>{ cur=Math.min(cur+step,target); el.textContent=Math.round(cur).toLocaleString(); if(cur>=target)clearInterval(iv); },25);
}
animCount(document.getElementById('s1'),2847);
animCount(document.getElementById('s2'),23);

[8,12,9,23,18,15,23].forEach(v => {
  const b=document.createElement('div'); b.className='sp-bar';
  b.style.height=(v/23*100)+'%';
  b.style.background=v>20?'rgba(255,56,96,.7)':'rgba(0,240,255,.4)';
  document.getElementById('riskSpark').appendChild(b);
});

new Chart(document.getElementById('trendChart'),{
  type:'line',
  data:{
    labels:['00','04','08','12','16','20','Now'],
    datasets:[
      {label:'Risk',data:[12,8,15,28,23,31,26],borderColor:'#ff3860',backgroundColor:'rgba(255,56,96,0.1)',fill:true,tension:.4,borderWidth:1.5,pointRadius:2,pointBackgroundColor:'#ff3860'},
      {label:'Reroutes',data:[1,0,2,5,4,4,2],borderColor:'#4285f4',backgroundColor:'transparent',tension:.4,borderWidth:1.5,borderDash:[4,2],pointRadius:2,pointBackgroundColor:'#4285f4'}
    ]
  },
  options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#4a6580',font:{size:8}},grid:{color:'#0c1422'}},y:{ticks:{color:'#4a6580',font:{size:8}},grid:{color:'#0c1422'}}}}
});

[
  {r:'Dubai Corridor', c:'🌀 Cyclone Warning',   i:'HIGH'},
  {r:'Suez Canal',     c:'🌬️ Strong Winds 45kt', i:'MED'},
  {r:'Pacific Route',  c:'☀️ Clear Conditions',  i:'LOW'},
  {r:'North Sea',      c:'🌧️ Heavy Rain System', i:'MED'},
].forEach(w => {
  const cls=w.i==='HIGH'?'rh':w.i==='MED'?'rm':'rl';
  const d=document.createElement('div'); d.className='weather-row';
  d.innerHTML=`<div><div class="wr-name">${w.r}</div><div class="wr-cond">${w.c}</div></div><span class="rbadge ${cls}">${w.i}</span>`;
  document.getElementById('weatherList').appendChild(d);
});

const tbody = document.getElementById('shipmentTbody');
SHIPMENTS.forEach(s => {
  const tr=document.createElement('tr');
  tr.innerHTML=`
    <td class="id-cell">${s.id}</td>
    <td>${s.origin} → ${s.dest}</td>
    <td style="color:var(--muted2)">${s.cargo}</td>
    <td style="font-family:var(--mono);font-size:10px">${s.eta}</td>
    <td><div class="risk-bar-wrap"><div class="risk-bar"><div class="risk-fill" style="width:${s.risk}%;background:${riskCol(s.risk)}"></div></div><span class="rbadge ${riskCls(s.risk)}">${s.risk}%</span></div></td>
    <td><span class="status-lbl" style="color:${stCol(s.status)}"><span class="sdot" style="background:${stCol(s.status)}"></span>${s.status}</span></td>
    <td><button class="act-btn ${s.risk>50?'danger':'info'}" onclick="switchScreen('routes')">${s.risk>50?'🧮 Dijkstra':'📍 Track'}</button></td>
  `;
  tbody.appendChild(tr);
});

function filterChip(el, type){
  document.querySelectorAll('#filterChips .chip').forEach(c=>c.classList.remove('on'));
  el.classList.add('on');
  document.querySelectorAll('#shipmentTbody tr').forEach((tr,i)=>{
    const r=SHIPMENTS[i];
    const show=type==='all'||(type==='high'&&r.risk>70)||(type==='warn'&&r.risk>40&&r.risk<=70)||(type==='safe'&&r.risk<=40);
    tr.style.display=show?'':'none';
  });
}

// ═══════════════════════════════════════════════════════
//  GEMINI AI CHAT — Fixed & Robust
// ═══════════════════════════════════════════════════════
const SYSTEM_PROMPT = `You are RouteGuard AI, a maritime supply chain intelligence assistant with Dijkstra-powered routing.

NETWORK (13 ports):
- SHA=Shanghai (31.23°N, 121.47°E)
- TOK=Tokyo (35.68°N, 139.65°E)
- SIN=Singapore (1.35°N, 103.82°E)
- COL=Colombo (6.93°N, 79.86°E)
- MUM=Mumbai (18.94°N, 72.84°E)
- DUB=Dubai (25.20°N, 55.27°E) ← STORM ACTIVE
- JED=Jeddah (21.49°N, 39.19°E)
- SUE=Suez (29.97°N, 32.55°E)
- ALE=Alexandria (31.20°N, 29.92°E)
- GIB=Gibraltar (36.14°N, -5.35°E)
- ROT=Rotterdam (51.92°N, 4.48°E)
- LON=London (51.51°N, -0.13°E)
- LAX=Los Angeles (33.74°N, -118.27°E)

CURRENT STATUS:
- DUB-SUE edge BLOCKED (cyclone, weight=∞)
- 23 active routes monitored, Risk Index: 69/100
- Optimal SHA→LON path (Dubai blocked): SHA→SIN→COL→JED→SUE→ALE→GIB→LON, weight=142

EDGE WEIGHTS (base+risk_penalty):
SHA-TOK:31, SHA-SIN:56, TOK-SIN:60, SIN-COL:43, SIN-MUM:74, COL-MUM:38, COL-JED:69, MUM-JED:75, JED-SUE:59, SUE-ALE:23, ALE-GIB:93, GIB-ROT:72, GIB-LON:82, ROT-LON:26

Be concise (max 180 words). Use port IDs. State path weights and hops. If asked about routing, compute the path step by step.`;

let chatHistory = [];
let isSending = false;

async function sendMessage(){
  if(isSending) return;
  const inp = document.getElementById('chatInput');
  const text = inp.value.trim();
  if(!text) return;

  isSending = true;
  document.getElementById('sendBtn').disabled = true;
  addChatMsg('user', text);
  inp.value = '';
  inp.style.height = '42px';

  chatHistory.push({role:'user', parts:[{text}]});
  showTypingIndicator();

  if(!GEMINI_KEY){
    await new Promise(r => setTimeout(r, 600));
    removeTypingIndicator();
    addChatMsg('ai', '⚙️ Please save your Gemini API key in the header to enable live AI responses. The key is stored locally in your browser.');
    isSending = false;
    document.getElementById('sendBtn').disabled = false;
    return;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
    const body = {
      system_instruction: { parts: [{text: SYSTEM_PROMPT}] },
      contents: chatHistory,
      generationConfig: { maxOutputTokens: 512, temperature: 0.7 }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body)
    });

    removeTypingIndicator();

    if(!res.ok){
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `HTTP ${res.status}`;
      addChatMsg('ai', `❌ **Gemini API Error:** ${errMsg}\n\nCheck that your API key is valid and has the Gemini API enabled.`);
      chatHistory.pop(); // remove failed user message
      isSending = false;
      document.getElementById('sendBtn').disabled = false;
      return;
    }

    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if(!reply){
      const finishReason = data?.candidates?.[0]?.finishReason || 'unknown';
      addChatMsg('ai', `⚠️ No response generated (reason: ${finishReason}). Please try again.`);
      chatHistory.pop();
    } else {
      chatHistory.push({role:'model', parts:[{text: reply}]});
      addChatMsg('ai', reply);
    }

  } catch(e){
    removeTypingIndicator();
    addChatMsg('ai', `⚠️ **Connection error:** ${e.message}\n\nCheck your internet connection and API key.`);
    chatHistory.pop();
  }

  isSending = false;
  document.getElementById('sendBtn').disabled = false;
}

function addChatMsg(role, text){
  const wrap = document.getElementById('chatMessages');
  const isAi = role === 'ai';
  const div = document.createElement('div');
  div.className = `msg${isAi ? '' : ' user-msg'}`;

  // Format markdown-ish text
  const formatted = text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,'<em>$1</em>')
    .replace(/`(.*?)`/g,'<code style="background:rgba(0,240,255,.1);padding:1px 5px;border-radius:3px;font-family:IBM Plex Mono;font-size:10px">$1</code>')
    .replace(/\n/g,'<br/>');

  const now = new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
  div.innerHTML = `
    ${isAi ? '<div class="msg-avatar ai-av">✦</div>' : ''}
    <div>
      <div class="msg-bubble">${formatted}</div>
      <div class="msg-meta">${isAi ? 'Gemini 2.5 Flash' : 'You'} · ${now}</div>
    </div>
    ${!isAi ? '<div class="msg-avatar user-av">👤</div>' : ''}
  `;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function showTypingIndicator(){
  const wrap = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'msg';
  div.id = 'typingMsg';
  div.innerHTML = `<div class="msg-avatar ai-av">✦</div><div><div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div></div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function removeTypingIndicator(){
  document.getElementById('typingMsg')?.remove();
}

function sendQuick(text){
  if(isSending) return;
  document.getElementById('chatInput').value = text;
  sendMessage();
}

// Auto-resize textarea
document.getElementById('chatInput').addEventListener('input', function(){
  this.style.height = '42px';
  this.style.height = Math.min(this.scrollHeight, 80) + 'px';
});

// Enter to send, Shift+Enter for newline
document.getElementById('chatInput').addEventListener('keydown', e => {
  if(e.key === 'Enter' && !e.shiftKey){
    e.preventDefault();
    sendMessage();
  }
});
