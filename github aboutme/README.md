# Fay's Customs Officer Portfolio

A modern, responsive, and interactive portfolio website designed for a Customs Officer specializing in Trade Compliance & Tariff Classification, with a focus on tech integration (AI learning) and personal interests (sourdough baking).

## 🚀 Live Local Preview

The local development server is running. You can view it by opening this link in your browser:
**[http://127.0.0.1:8080](http://127.0.0.1:8080)**

---

## 📁 Project Structure

- **[index.html](file:///C:/Users/patch/Desktop/AGY/index.html)**: Main HTML structure, metadata, interactive widgets, timeline, and layouts.
- **[styles.css](file:///C:/Users/patch/Desktop/AGY/styles.css)**: Sleek, modern dark-themed stylesheet with custom fonts (Outfit & Inter), glassmorphism design variables, and scroll animations.
- **[app.js](file:///C:/Users/patch/Desktop/AGY/app.js)**: Client-side logic for the interactive **AHTN Classification Assistant**, the step-by-step General Interpretative Rules (GIR) Wizard, scroll events, active link tracking, and contact form handling.
- **`assets/`**:
  - `compliance_tech_hero.png`: Futuristic abstract trade/data nodes background.
  - `artisan_sourdough.png`: Close-up photograph of artisan sourdough bread.

---

## 🌐 How to Publish to GitHub Pages

Deploying your portfolio to the web for free is straightforward using GitHub Pages. Follow these steps:

### Step 1: Initialize Git and Commit Your Files
Open your terminal (PowerShell or Git Bash) in this project folder and run:
```bash
# Initialize a local Git repository
git init

# Add all files to the staging area
git add .

# Create your initial commit
git commit -m "feat: initial release of customs officer portfolio"
```

### Step 2: Create a GitHub Repository
1. Go to your [GitHub Account](https://github.com) (which was set up in the previous conversation).
2. Click the **New** button to create a new repository.
3. **Repository Name**: 
   - If you want the site to be at `https://<your-username>.github.io/`, name your repository exactly: `<your-username>.github.io`
   - If you name it something else (e.g., `customs-portfolio`), the site will be at `https://<your-username>.github.io/customs-portfolio/`.
4. Leave it **Public** (required for free GitHub Pages).
5. Do **not** initialize it with a README, `.gitignore`, or license (since you already have your files ready).
6. Click **Create repository**.

### Step 3: Link and Push Your Files
Copy the commands shown on your GitHub repository page under "…or push an existing repository from the command line" and run them in your local terminal:
```bash
# Rename the default branch to main
git branch -M main

# Link your local repository to the remote GitHub repository
git remote add origin https://github.com/<your-username>/<your-repo-name>.git

# Push your code to GitHub
git push -u origin main
```

### Step 4: Enable GitHub Pages
*If you named your repository `<your-username>.github.io`, it will publish automatically. If you named it something else, do the following:*
1. Go to your repository on GitHub.
2. Click on the **Settings** tab.
3. On the left sidebar under the "Code and automation" section, click on **Pages**.
4. Under **Build and deployment** > **Source**, make sure **Deploy from a branch** is selected.
5. Under **Branch**, select `main` and `/ (root)` folder, then click **Save**.

Within 1–2 minutes, GitHub will build your site. You will see the live site URL displayed at the top of the Pages settings page!
