# Event Management System - Setup Guide

## Prerequisites
- Node.js (v14 or higher)
- MongoDB (Running locally or hosted)

## 1. Backend Setup (Server)

1.  Navigate to the `server` directory:
    ```bash
    cd server
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  **Configure Environment (`.env`)**:
    - Open the `.env` file in the `server` folder.
    - Set your `MONGO_URI`.
    - If you are running MongoDB locally, the default is already set:
      ```
      MONGO_URI=mongodb://localhost:27017/event_management
      ```
    - **Your Action**: If you are using MongoDB Atlas (cloud), replace this value with your connection string.
      - Example: `MONGO_URI=mongodb+srv://user:pass@cluster0.mongodb.net/myDatabase?retryWrites=true&w=majority`

4.  Start the server:
    ```bash
    node index.js
    ```
    - You should see: `Server started on port 5000` and `MongoDB Connected...`.

## 2. Frontend Setup (Client)

1.  Open a new terminal and navigate to the `client` directory:
    ```bash
    cd client
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
    - Open `http://localhost:5173` (or the port shown) in your browser.

## 3. How to Use

1.  **Add a Profile**: Creating events requires profiles. Click `+ Add Profile` in the top right to create users (e.g., "User A", "User B").
2.  **Create an Event**:
    - Select one or more Profiles.
    - Give the event a Title and Description.
    - Choose the **Timezone** the event is happening in (e.g., "America/New_York").
    - Pick the Start and End dates/times.
    - Click `Create Event`.
3.  **View Events**:
    - Select a "Current Profile" from the dropdown (optional, filters list).
    - Use the **"View in:"** dropdown on the right side to change the *viewing* timezone.
    - Notice how all event times shift automatically to reflect the selected timezone.
