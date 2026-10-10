# 🗺️ Bageshwar Blocks Dashboard

An interactive Web GIS dashboard for exploring the **block boundaries of Bageshwar district, Uttarakhand**. It combines a map view with charts, driven by a single GeoJSON file with Census attributes.

👉 **Live Demo:** [dashboard-bageshwar-blocks-three.vercel.app](https://dashboard-bageshwar-blocks.vercel.app/)
💻 **GitHub:** [RawatGitLab/Dashboard-Bageshwar-Blocks](https://github.com/RawatGitLab/Dashboard-Bageshwar-Blocks)

---

## ✨ Features

- 📍 Interactive block boundary map built with Leaflet
- 📈 Charts and visual summaries of block-level Census attributes
- 📂 Data-driven: everything is generated from one GeoJSON file
- 🔁 Reusable: swap the boundary file to build the same dashboard for another district
- ⚡ Fast static build, deployable on Vercel, Netlify, Render, or GitHub Pages

## 🛠️ Tech Stack

| Layer | Technology |
| --- | --- |
| UI framework | [React](https://react.dev/) |
| Build tool | [Vite](https://vitejs.dev/) |
| Mapping | [Leaflet](https://leafletjs.com/) via [react-leaflet](https://react-leaflet.js.org/) |
| Charts | [Recharts](https://recharts.org/) |
| Hosting | [Vercel](https://vercel.com/) |

## 📁 Project Structure

```
Dashboard-Bageshwar-Blocks/
├── public/
│   └── Block_Boundary.geojson   # Block boundary data (Census attributes)
├── src/                         # React components and dashboard logic
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/RawatGitLab/Dashboard-Bageshwar-Blocks.git

# Move into the project folder
cd Dashboard-Bageshwar-Blocks

# Install dependencies
npm install
```

### Run locally

```bash
npm run dev
```

Open the local URL shown in the terminal (usually `http://localhost:5173`).

### Build for production

```bash
npm run build
```

The static output is generated in the `dist/` folder.

## 🔄 Using Your Own Boundary Data

To build the dashboard for another district:

1. Replace `public/Block_Boundary.geojson` with your own file.
2. Keep the same Census attribute names so the map and charts continue to work.
3. Run `npm run dev` to preview, then `npm run build` to publish.

## ☁️ Deployment

The `dist/` output is a plain static site, so it works on:

- **Vercel**: import the repo and deploy (build command `npm run build`, output directory `dist`)
- **Netlify**: same build command and output directory
- **Render** (Static Site) or **GitHub Pages**

## 🏛️ About

This dashboard is part of a wider effort to make geospatial data accessible for district-level planning and governance in Uttarakhand, India.

Built by [RawatGitLab](https://github.com/RawatGitLab).

## 🤝 Contributing

Suggestions and improvements are welcome. Please open an issue or submit a pull request.

## 📄 License

Add a license of your choice (for example MIT) by creating a `LICENSE` file in the repository root.
