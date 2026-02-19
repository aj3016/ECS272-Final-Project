## 🚀 Important Steps Before Running

Before starting the project locally, please complete the following setup:

### 1️ Create a Mapbox Account
Sign up at: https://www.mapbox.com/

### 2️ Copy Your Public Access Token
After logging in:
- Go to your Mapbox dashboard
- Copy your **Public Access Token**

### 3️ Create a `.env` File
In the root directory of this project (same level as `package.json`), create a file named:

.env

### 4️ Add Your Mapbox Token
Inside the `.env` file, add:

VITE_MAPBOX_TOKEN=YOUR_PUBLIC_ACCESS_TOKEN


Replace `YOUR_PUBLIC_ACCESS_TOKEN` with your actual Mapbox public key.

> ⚠️ Do not include quotes or a semicolon.

### 5️ Run the Development Server

After saving the `.env` file, restart your terminal and run:

```bash
npm run dev
