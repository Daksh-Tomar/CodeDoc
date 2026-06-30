# CodeDoc

![CodeDoc Banner](https://via.placeholder.com/1200x300.png?text=CodeDoc+-+Collaborative+Cloud+IDE)

**CodeDoc** is a powerful, modern, and collaborative cloud-based Integrated Development Environment (IDE). It empowers developers to write, execute, and collaborate on code in real-time, backed by isolated Docker containers for a secure and reproducible workspace environment.

## ✨ Features

- **Real-Time Collaboration:** Powered by **Yjs** and **WebSockets**, multiple users can edit the same document simultaneously with zero lag.
- **In-Browser IDE:** Built around the **Monaco Editor**, offering syntax highlighting, autocompletion, and an authentic VS Code-like experience.
- **Integrated Terminal:** Fully functional, real-time terminal powered by **Xterm.js** and **Socket.io**, directly connected to your isolated workspace container.
- **Isolated Workspaces:** Secure and independent environments managed by **Dockerode**, ensuring that your code execution is containerized and safe.
- **AI Integration:** Enhanced with Google GenAI capabilities to assist with code generation, debugging, and documentation.
- **Authentication:** Secure user authentication utilizing JWT and Passport.js.
- **Modern UI:** A stunning, responsive, and intuitive user interface built with Next.js, React 19, and Tailwind CSS.

---

## 🛠️ Tech Stack

This project is structured as a monorepo using **Turborepo** and includes the following core technologies:

### Frontend (`apps/web`)
- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **UI Library:** [React 19](https://react.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Editor:** [@monaco-editor/react](https://github.com/suren-atoyan/monaco-react)
- **Terminal:** [Xterm.js](https://xtermjs.org/)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Collaboration:** [Yjs](https://yjs.dev/)

### Backend (`apps/api`)
- **Framework:** [NestJS 11](https://nestjs.com/)
- **Database ORM:** [Prisma](https://www.prisma.io/)
- **Database:** PostgreSQL
- **WebSockets:** [Socket.IO](https://socket.io/)
- **Containerization:** [Dockerode](https://github.com/apocas/dockerode)
- **AI Integration:** `@google/genai`

---

## 📂 Project Structure

```text
codedoc/
├── apps/
│   ├── api/             # NestJS backend application
│   └── web/             # Next.js frontend application
├── workspaces/          # Persistent storage for user workspace files
├── turbo.json           # Turborepo configuration
└── package.json         # Root dependencies and scripts
```

---

## 🚀 Getting Started

### Prerequisites
Before you begin, ensure you have the following installed on your machine:
- **Node.js** (v20+ recommended)
- **npm** (v10+ recommended)
- **Docker** (Required for containerized workspaces)
- **PostgreSQL** (Running locally or via a cloud provider)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Daksh-Tomar/CodeDoc.git
   cd CodeDoc
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   - Navigate to `apps/api` and create a `.env` file based on `.env.example` (ensure you set `DATABASE_URL`, `JWT_SECRET`, and Google AI keys if applicable).
   - Navigate to `apps/web` and create a `.env.local` file for frontend environment variables.

4. **Database Migration**
   ```bash
   cd apps/api
   npx prisma migrate dev
   cd ../..
   ```

### Running the Application

To start both the frontend and backend in development mode concurrently, use Turborepo from the root directory:

```bash
npm run dev
```

- **Frontend:** will be available at `http://localhost:3000`
- **Backend API:** will be available at `http://localhost:3001` (or your configured port)

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/Daksh-Tomar/CodeDoc/issues). 

## 📝 License

This project is protected under the terms of the license included in the `LICENSE` file.
