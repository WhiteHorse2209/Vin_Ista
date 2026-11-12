# Vinista — Instagram Media Studio & PDF Creator

Vinista is a lightweight, zero-login Python web application that enables users to download public Instagram Reels and Posts. It features an integrated **Post to PDF** compiler that merges all photos from any post or carousel into a single, high-resolution PDF document.

---

## 🎨 Professional Single-Viewport Design (No Scrolling & Mobile Optimized)

The application has been restructured to strictly fit within the screen viewport (**100dvh, zero page scrolling on desktop & mobile phones**), with all extra filler information removed for an ultra-clean experience:

- **Single Apple-Style Bottom Dock**: macOS/iOS floating dock with subtle physics magnification, tooltips, and active indicator dots as the **sole, elegant navigation controller** (duplicate top router removed).
- **Two-Part Side-by-Side Results**:
  - **Left Aside**: **Enlarged Autoplaying Video Player** for Reels (`autoplay muted loop`) or featured high-res photo preview for Posts.
  - **Right Aside**: Clean, uncluttered metadata panel focused on Account Identity (`@handle`), Published Date, and Format specs (caption/description boxes removed for an ultra-clean presentation).
  - **Download Down**: Bold animated download button (`Save 1080p MP4` or `Compile & Download PDF`) with bouncing download arrows, tactile feedback, and a **"New Search"** button for both Reels and Posts.
- **Custom Download Naming Convention**:
  - Files are automatically named with the structure:
    `SJ_{accountname}_{reelname}_{downloaded_time}.[mp4/pdf/zip/jpg]`
- **Intro Page Palette**: **Midnight Black** (`#070709`), **Pure White** (`#FFFFFF`), and **Vibrant Golden Yellow** (`#FFB800`).
- **Text Crispness**: 100% normal text styling across all views (strictly zero text blur, glow, or blush halos).
- **Live Digital Clock**: An elegant `HH : MM : SS` live clock in the navbar.
- **High-Tech Animated Extraction HUD**: Spinning radar sweep indicator and real-time sliding percentage counter (`0%` to `100%`).
- **Vercel Serverless Ready**: Configured with `vercel.json` and automatic `/tmp` storage routing for serverless execution.

---

## 🎨 Page Themes & Harmonized Color Palettes

| Page | Primary & Accent Palette | Aesthetic & Details |
| :--- | :--- | :--- |
| **Intro** (`/`) | **Midnight Black** (`#070709`) + **Pure White** (`#FFFFFF`) + **Vibrant Golden Yellow** (`#FFB800`) | High-contrast studio, live clock, 3-button spaced Apple Dock |
| **Reels** (`/reel`) | **Retro Violet** (`#190133`) + **Flame** (`#FF4500`) + **Pale Yellow** (`#FFF3B0`) + **Neon Cyan** (`#00F0FF`) | Compact video player preview, animated 1080p MP4 downloader |
| **Posts** (`/post`) | **Royal Blue** (`#014BAA`) + **Light Cream** (`#F8F3F0`) + **Amber Gold** (`#FFB800`) | Carousel photo extractor with integrated 1-click PDF compiler |

---

## 🚀 Key Features

1. **Apple-Style Navigation Dock**:
   - Centered floating glassmorphism dock at the bottom of the screen.
   - Generous spacing between items so magnification runs smoothly without collisions.
   - 3 clean, dedicated route actions: **Intro**, **Reels**, **Posts**.
   - Physics-based magnification on desktop mouse hover and instant touch switching on mobile.
   - Luminous active indicator dot for the current route.

2. **High-Tech Animated Extraction HUD**:
   - Spinning radar circle sweep with real-time percentage counter (`0%` to `100%`).
   - Dynamic extraction phase messages (`Connecting to Instagram...`, `Extracting media streams...`, `Processing assets...`).
   - Entrance spring animation when results are ready.

3. **Animated Download Options**:
   - **Reels**: Bouncing animated download arrow on hover with tactile click feedback (`Save MP4`).
   - **Posts & PDF**: Integrated 1-click **"Download PDF"** banner that compiles all extracted carousel photos into a single PDF document.
   - Individual photo cards with direct save buttons.
   - Optional ZIP archive download.

---

## ☁️ Deploying to Vercel

The application is pre-configured for 1-click deployment on [Vercel](https://vercel.com):

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Vinista"
   git remote add origin https://github.com/your-username/vinista.git
   git push -u origin main
   ```

2. **Import into Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new).
   - Select your `vinista` repository.
   - The included `vercel.json` automatically configures the `@vercel/python` serverless runtime and handles `/tmp` file storage.
   - Click **Deploy**!

---

## 📋 Steps to Run Locally

### Step 1: Open PowerShell or Command Prompt
Navigate to your project directory:
```powershell
cd "c:\Users\my pc\Desktop\vinista"
```

### Step 2: Activate the Virtual Environment (`venv`)
- **On PowerShell:**
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
- **On Command Prompt (cmd):**
  ```cmd
  venv\Scripts\activate.bat
  ```

### Step 3: Start the Flask Application
Run the main server:
```bash
python app.py
```
*(Or double-click `run.bat` on Windows)*

### Step 4: Open in Browser
Open your browser and visit:
👉 **http://127.0.0.1:5000**
