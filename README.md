# PS Studios Spring 2026 TO Campaign - Landing Page

This repository contains the codebase for the **PS Studios Spring 2026 TO Campaign** interactive landing page. The application is built using a modern, lightweight frontend stack with dynamic, multi-tenant capabilities powered by a cloud-native architecture.

---

## 🏗️ Architecture & Deployment

The application utilizes a decoupled architecture, dividing responsibilities between **Firebase** (application hosting, database, authentication) and **Cloudflare** (video streaming).

### 🔥 Firebase (Application & Data)
Firebase is the primary engine for the application's infrastructure.

- **Firebase Hosting**: The entire frontend application (located in the `public/` directory) is hosted on Firebase Hosting. This includes the main interactive landing page (`index.html`), the admin dashboard (`admin/index.html`), and all static assets (CSS, JS, images, audio).
  - **Live URL**: `https://ps-campaign-resurrection.web.app/`
- **Firebase Firestore**: The NoSQL database used to power the multi-tenant "Agency Instances". The admin dashboard allows administrators to create unique URLs (slugs) for different agencies. Firestore stores the configuration for each agency, including:
  - Agency Name & Slug (e.g., `ps-campaign-resurrection.web.app/agency-name`)
  - Custom Cloudflare Stream Video IDs (Main Video, Reel Video, Loader Video)
  - **Analytics Tracking**: Firestore also collects and aggregates custom analytics, tracking page views, video watch times, milestone completions (25%, 50%, 75%, 100%), and UI button clicks.
- **Firebase Authentication**: Secures the `/admin` dashboard. Only authenticated administrators can log in to create, duplicate, or delete agency instances and view global analytics.
- **Firebase Storage**: Configured to handle any direct asset uploads if necessary (secured via `storage.rules`).

### ☁️ Cloudflare (Video Streaming)
To ensure the highest quality and fastest delivery of high-resolution video content without buffering or massive file size constraints, all primary video content is offloaded to Cloudflare.

- **Cloudflare Stream**: Hosts the actual video files. Instead of standard MP4s, Cloudflare Stream automatically encodes the videos into multiple resolutions and delivers them using **HLS (HTTP Live Streaming)**. 
- **Integration**: The web app uses a Cloudflare Customer Subdomain (e.g., `customer-xv1aafyshr3tbknu.cloudflarestream.com`). When a user visits the site, the app pulls the specific `video.m3u8` manifest file based on the Video IDs configured in the app (or overridden via Firestore for a specific agency).

---

## 🛠️ Frontend Technologies

- **Vanilla Web Stack**: Built with plain HTML, CSS, and JavaScript. No bulky frameworks (like React or Vue) are used, ensuring the fastest possible initial load time.
- **GSAP (GreenSock)**: Used extensively for complex, scroll-linked timeline animations (e.g., the Epitaph text scroll and the Mausoleum reveal).
- **Lenis**: Provides the buttery-smooth scrolling experience across the entire site.
- **HTML5 Canvas Element**: The initial hero sequence uses a Canvas element to rapidly draw an image sequence (240+ frames) linked to the user's scroll position, creating a 3D-like zoom effect without rendering actual 3D objects in WebGL.
- **HLS.js**: A JavaScript library used to play Cloudflare's HLS video streams on browsers that do not natively support HLS (such as Chrome and Firefox on Desktop). Safari supports HLS natively.

---

## 🚀 Deployment Instructions

To deploy changes to the live site, ensure you have the Firebase CLI installed and are authenticated.

1. Open your terminal and navigate to the project root directory:
   ```bash
   cd "/Users/jpholecka2025/Movies/PS Studios Spring 2026 TO Campaign/Landing Page/Landing Page Code"
   ```

2. Run the deployment command via `npx` to ensure you are using the latest Firebase tools:
   ```bash
   npx -y firebase-tools@latest deploy --only hosting
   ```

*(Note: If you make changes to your Firestore Security Rules (`firestore.rules`) or Storage Rules (`storage.rules`), you can deploy them using `npx -y firebase-tools@latest deploy --only firestore:rules` or simply `npx -y firebase-tools@latest deploy` to deploy everything at once).*

---

## 🗂️ Project Structure

- `/public/`: Contains the actual web application that gets deployed.
  - `/public/index.html`: The main interactive landing page.
  - `/public/css/`: Stylesheets for the landing page.
  - `/public/js/app.js`: The core logic for animations, video playback, and Firebase interactions.
  - `/public/js/firebase-client.js`: Handles tracking analytics and fetching dynamic agency data from Firestore.
  - `/public/admin/`: The secure dashboard for managing agency instances.
- `firebase.json`: Configuration file dictating how Firebase Hosting behaves (e.g., rewrites, ignore rules).
- `firestore.rules`: Security rules protecting the database.
- `storage.rules`: Security rules protecting uploaded files.
