# SuperNotes 📝

SuperNotes is a fast, lightweight, and scalable hand-drawn whiteboard & diagramming application built with **React**, **Rough.js**, and an embedded **SQLite** database.

---

## 📁 Project Structure

The project is structured into clear **backend** and **frontend** directories:

```
supernotes/
├── backend/
│   ├── server.js          # Node.js HTTP server & REST API endpoints
│   ├── db.js              # SQLite database storage layer (node:sqlite)
│   ├── supernotes.db      # Embedded SQLite database (preserves notes & trash)
│   └── package.json       # Backend metadata & scripts
├── frontend/
│   ├── src/
│   │   ├── components/    # Canvas, Header, Sidebar, Toolbar, StatusBar, TrashPanel
│   │   ├── hooks/         # useFileManager (API sync), useHistory (undo/redo stack)
│   │   ├── utils/         # elements, renderer (Rough.js), math geometry
│   │   ├── App.jsx        # Root application state & shortcuts
│   │   └── main.jsx       # React DOM entry point
│   ├── css/
│   │   └── styles.css     # CSS themes, dark mode variables, and layout
│   ├── index.html         # HTML template with Google Fonts (Caveat, Kalam, etc.)
│   ├── vite.config.mjs    # Vite configuration & /api proxy to backend
│   └── package.json       # Frontend scripts and React dependencies
├── package.json           # Root convenience scripts for dev, build, and start
└── README.md
```

---

## 🚀 Getting Started

### ⚡ Single Command to Start Both (Development with HMR)
Starts the SQLite backend API (`http://localhost:5050`) and the Vite React frontend (`http://localhost:3000`) simultaneously with one command:
```bash
npm run dev
```

### 📦 Run Production Server (Backend + Compiled Frontend)
Serves the backend API and the compiled React production app on port `5050`:
```bash
npm start
```

### 🛠️ Individual Services (Optional)
- **Backend only:** `npm run backend`
- **Frontend only:** `npm run frontend`
- **Build production bundle:** `npm run build`

### 3. Build Frontend for Production
```bash
npm run build
```

---

## ✨ Features

- **Shapes & Drawing:** Freehand pencil, rectangle, rounded rectangle, ellipse, diamond, line, bendable arrows (with quadratic curve control point & tangent arrowhead), and stretchable text boxes.
- **Typography:** Google Handwriting fonts (*Caveat*, *Kalam*, *Indie Flower*, *Patrick Hand*) and Monospace (*Fira Code*).
- **Text Formatting:** Bold (`Ctrl+B`), Italic (`Ctrl+I`), and Underline (`Ctrl+U`) with live canvas rendering.
- **Dark Mode:** Seamless light/dark mode switch, persisted in `localStorage`.
- **Collapsible Sidebar:** Toggle sidebar with `Ctrl+\` or header button.
- **File & Trash Management:** SQLite persistence, autosave, 30-day trash TTL countdown (`29d left`), file recycle/restore, and JSON export/import.
- **Undo / Redo:** Full session rollback history stack.
- **Copy & Paste:** Clipboard support (`Ctrl+C`, `Ctrl+V`).

