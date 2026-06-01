# 🚀 NexusLearn

<div align="center">
  <img src="public/favicon.png" alt="NexusLearn Logo" width="120" />
  <h3>The Next-Generation Interactive Learning Platform</h3>
  <p>Empowering learners with AI-driven insights, 3D visualizations, and interactive coding experiences.</p>

  <p>
    <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version 1.0.0" />
    <img src="https://img.shields.io/badge/React-19.0-61DAFB.svg?style=flat&logo=react&logoColor=black" alt="React 19" />
    <img src="https://img.shields.io/badge/Vite-6.2-646CFF.svg?style=flat&logo=vite&logoColor=white" alt="Vite 6" />
    <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6.svg?style=flat&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License MIT" />
  </p>
</div>

---

## ✨ Key Features

- 🧠 **AI-Powered Insights**: Integrates `@google/genai` to provide personalized learning guidance, intelligent feedback, and content generation.
- 💻 **Interactive Code Editor**: In-browser coding support with syntax highlighting via `react-simple-code-editor` and `prismjs`. Read and write code seamlessly.
- 🎨 **Immersive 3D Visuals**: Leveraging `three.js`, `@react-three/fiber`, and `@react-three/drei` for engaging, interactive 3D learning components.
- 📊 **Data Visualization**: Rich, dynamic charts using `recharts` for tracking learning progress and analytics.
- 🔐 **Secure Authentication**: Robust user management backed by `Firebase`, custom `JWT` implementation, and `bcryptjs`.
- ☁️ **Cloud Storage**: Integrated with `Cloudinary` and `Firebase Admin` for reliable media and asset management.
- ⚡ **Lightning Fast UI**: Built with React 19, animated with `motion`, and styled with the highly optimized `Tailwind CSS v4`.

## 🛠️ Technology Stack

| Frontend | Backend & Services | Utilities & Styling |
| :--- | :--- | :--- |
| **React 19** | **Express.js** | **Tailwind CSS v4** |
| **Vite** | **Node.js** | **Lucide React** (Icons) |
| **React Router** | **Firebase** (Auth & DB) | **Motion** (Animations) |
| **Three.js / R3F** | **Cloudinary** (Media) | **PrismJS** (Syntax) |
| **Recharts** | **Google GenAI** | **React Markdown** |

## 🚀 Getting Started

Follow these instructions to get a local copy up and running.

### Prerequisites

Ensure you have the following installed on your machine:
- **[Node.js](https://nodejs.org/)** (v18 or higher recommended)
- **npm** (comes with Node.js) or **yarn** / **pnpm**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Saikrishna1124/NexusLearn.git
   cd NexusLearn
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Create a `.env.local` file in the root directory and configure the necessary API keys and credentials:
   ```env
   # Google Gemini AI
   GEMINI_API_KEY=your_gemini_api_key_here

   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   # Firebase / Authentication (Add your config variables)
   # JWT_SECRET=your_jwt_secret
   # ...
   ```
   *(Note: Ensure you never commit your `.env.local` to version control!)*

4. **Run the Development Server:**
   This project uses `tsx` to run the Express backend seamlessly with the Vite frontend during development.
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) (or the port specified in your terminal) to view it in the browser.

## 📦 Scripts

- `npm run dev` - Starts the development server using `tsx server.ts`.
- `npm run build` - Builds the application for production using Vite.
- `npm run preview` - Locally preview the production build.
- `npm run lint` - Runs TypeScript compiler checks without emitting files.
- `npm run clean` - Removes the `dist` directory.

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  Made with ❤️ by the NexusLearn Team.
</div>
