# 💍 Wedding Dress Rankings

A full-stack web app to rank and manage your favourite wedding dresses.

## Features

- **Browse** your dress list in a sortable table
- **Add** new dresses with image, name, price, link, rank, and comments
- **Edit** any dress in a modal form
- **Delete** dresses you no longer want to track
- **Sort** by rank, name, price, or date added

## Tech Stack

| Layer    | Technology              |
|----------|-------------------------|
| Frontend | React + Vite            |
| Backend  | Node.js + Express       |
| Database | SQLite (better-sqlite3) |

## Getting Started

```bash
# Install dependencies
npm install
npm install --prefix backend
npm install --prefix frontend

# Run both frontend & backend together
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api/dresses

## API Endpoints

| Method | Path                 | Description         |
|--------|----------------------|---------------------|
| GET    | /api/dresses         | List all dresses    |
| POST   | /api/dresses         | Create a dress      |
| PUT    | /api/dresses/:id     | Update a dress      |
| DELETE | /api/dresses/:id     | Delete a dress      |

Query params for GET: `sortBy` (rank|name|price|created_at) and `order` (asc|desc)
