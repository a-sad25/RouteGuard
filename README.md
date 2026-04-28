# RouteGuard
# 🛡️ RouteGuard AI

### Real-Time Supply Chain Intelligence with AI + Dijkstra Optimization

RouteGuard AI is an interactive web-based system that visualizes global supply chain routes, detects disruptions, and computes optimal rerouting using **Dijkstra’s Algorithm**, enhanced with **AI insights (Gemini)** and **Google Maps visualization**.

---

## 🚀 Live Demo

🌐 (https://route-guard-alpha.vercel.app/)

---

## 🧠 Core Features

### 📡 Live Dashboard

* Real-time shipment monitoring
* Risk classification (Low / Medium / High)
* Alerts for disruptions (storms, congestion, delays)

### 🗺️ Google Maps Integration

* Global port network visualization
* Real-time route rendering
* Disruption-aware edge coloring

### 🧮 Dijkstra Route Optimizer

* Computes shortest/safest paths across **13-node logistics network**
* Dynamic edge weights based on:

  * Distance
  * Risk factor
  * Disruptions
  * Weather impact

### 🤖 AI Chat Assistant (Gemini)

* Natural language queries
* Route suggestions
* Risk predictions
* Logistics insights

### 📊 Analytics & Insights

* Risk trends visualization (Chart.js)
* AI-generated recommendations
* Performance metrics

---

## 🏗️ System Architecture

```
Browser (Frontend)
   ↓
Google Maps API + Gemini API
```

> ⚠️ This is a **frontend-only MVP prototype** (no backend).

---

## 🛠️ Tech Stack

* HTML5, CSS3, JavaScript
* Canvas API (custom graph rendering)
* Chart.js (analytics)
* Google Maps JavaScript API
* Google Gemini API

---

## 🧠 Algorithm Used

### Dijkstra’s Algorithm

The system models ports as nodes and routes as weighted edges.

**Edge Weight Formula:**

```
weight = base_distance
       + (risk_factor × 25)
       + disruption_cost
```

* Blocked routes → ∞ weight
* Ensures optimal rerouting under disruptions

---

## 🌍 Network Model

* 13 Global Ports (Shanghai, Singapore, Dubai, London, etc.)
* 28+ Routes (edges)
* Real-world inspired logistics topology

---

## 🔐 API Setup Instructions

### 1. Gemini API Key

1. Go to: https://aistudio.google.com/app/apikey
2. Generate API key

Enter in UI:

```
Top bar → GEMINI → Paste key → SAVE
```

---

### 2. Google Maps API Key

1. Go to: https://console.cloud.google.com/apis/credentials
2. Create API key
3. Enable **Maps JavaScript API** and Directions API

Enter in UI:

```
Top bar → MAPS → Paste key → SAVE
```

---

---

## ▶️ How to Run

No installation needed.

### Option 1:

* Open `index.html` in browser

### Option 2 (recommended):

* Use Live Server (VS Code)

---

## 📁 Project Structure

```
routeguard-ai/
│
├── index.html   (Main UI + logic)
├── README.md
```

---

## ⚠️ Limitations

* API keys are used client-side (not secure for production)
* Dependent on API quotas
* No persistent backend or database

---

## 🔮 Future Improvements

* 🔐 Secure backend for API handling
* 📡 Real-time logistics data integration
* 🤖 Advanced predictive ML models
* 📱 Mobile-friendly UI
* ☁️ Cloud deployment with scalability

---

## 💰 Estimated Cost

* MVP: $0 – $20/month (within free tiers)
* Scales with API usage

---

## 🧑‍💻 Team

**Compiletime Terror**

---

## 🏆 Use Cases

* Logistics & shipping companies
* Supply chain risk monitoring
* Disaster response routing
* Smart transportation systems

---

## ⭐ Acknowledgements

* Google Maps Platform
* Google Gemini API
* Chart.js

---

## 💡 Note

This project is built as a **hackathon prototype** to demonstrate:

* AI + algorithms integration
* Real-time visualization
* Intelligent decision-making systems

---

### 🚀 “Smarter Routes. Safer Deliveries. Powered by AI.”
