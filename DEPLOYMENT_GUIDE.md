# 🚀 MERN Deployment Guide (The "Easy" Way)

We will deploy the Backend to **Render** (free) and the Frontend to **Netlify** (free).

---

## Phase 1: Preparation (GitHub)
**Before anything else, your code must be on GitHub.**

1.  Initialize Git in your root folder (`c:\Project\assignment`):
    ```bash
    git init
    # Create a .gitignore file if you haven't already!
    echo "node_modules" > .gitignore
    echo ".env" >> .gitignore
    ```
2.  Commit everything:
    ```bash
    git add .
    git commit -m "Deployment Ready"
    ```
3.  Create a new repository on GitHub (e.g., `mern-event-dashboard`).
4.  Push your code:
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/mern-event-dashboard.git
    git branch -M main
    git push -u origin main
    ```

---

## Phase 2: Database (MongoDB Atlas)
**Allow Cloud Access**
1.  Go to your MongoDB Atlas Dashboard.
2.  Click **"Network Access"** (Sidebar).
3.  Click **"Add IP Address"**.
4.  Button: **"Allow Access from Anywhere"** (`0.0.0.0/0`).
5.  Confirm. (This ensures Render and Netlify can reach your DB).

---

## Phase 3: Backend Deployment (Render.com)
1.  Sign up/Login to [Render.com](https://render.com/).
2.  Click **"New +"** -> **"Web Service"**.
3.  Connect your GitHub repository.
4.  **Settings**:
    *   **Name**: `event-api` (or similar).
    *   **Root Directory**: `server` (IMPORTANT: Your backend is in the server folder).
    *   **Runtime**: Node.
    *   **Build Command**: `npm install`.
    *   **Start Command**: `node index.js`.
5.  **Environment Variables** (Scroll down):
    *   Key: `MONGO_URI`
    *   Value: (Paste your connection string from `.env`)
    *   Key: `PORT`
    *   Value: `5000` (Render might ignore this and assign its own, which is fine).
6.  Click **"Create Web Service"**.
7.  Wait for it to go live. **Copy the URL** (e.g., `https://event-api.onrender.com`).

---

## Phase 4: Frontend Deployment (Netlify)
1.  **Update API URL**:
    *   Open `client/src/pages/Dashboard.jsx`.
    *   Replace `http://localhost:5000` with your NEW Render Backend URL (e.g., `https://event-api.onrender.com`).
    *   *Tip: For a professional setup, we usually use environment variables, but for this quick assignment, replacing it directly is fastest.*
    *   **Push this change to GitHub** (`git add .`, `git commit`, `git push`).
2.  Sign up/Login to [Netlify.com](https://www.netlify.com/).
3.  Click **"Add new site"** -> **"Import from existing project"**.
4.  Choose **GitHub** and select your repo.
5.  **Settings**:
    *   **Base directory**: `client`
    *   **Build command**: `npm run build`
    *   **Publish directory**: `client/dist` (Vite uses `dist`, Create-React-App uses `build`).
6.  Click **"Deploy"**.

---

## Phase 5: Verification
1.  Open your Netlify link.
2.  Try creating an event.
3.  If it creates successfully, your Frontend is talking to your Backend, and your Backend is writing to MongoDB!
