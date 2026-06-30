# CodeDoc Architecture

CodeDoc is a modern, cloud-based Integrated Development Environment (IDE) built for real-time collaboration. The project is structured as a monorepo using [Turborepo](https://turbo.build/).

## High-Level Overview

The system is divided into a frontend web application and a backend API service, with real-time communication facilitated by WebSockets. Workspaces are isolated using Docker containers.

### Monorepo Structure
- `apps/web`: The Next.js frontend application.
- `apps/api`: The NestJS backend application.
- `workspaces/`: Persistent storage for user workspace files.

## Frontend Architecture (`apps/web`)

The frontend is a single-page application focused on delivering a rich, VS Code-like experience in the browser.

- **Framework**: Next.js 16 (App Router) with React 19.
- **Styling**: Tailwind CSS v4.
- **State Management**: Zustand for global state.
- **Editor**: `@monaco-editor/react` provides the core code editing experience.
- **Terminal**: `xterm.js` and `xterm-addon-fit` for the integrated terminal interface.
- **Collaboration**: `yjs` (CRDTs), `y-monaco`, and `y-protocols` handle real-time synchronized editing.
- **Real-Time Communication**: `socket.io-client` connects to the backend for terminal streams and document sync.

## Backend Architecture (`apps/api`)

The backend manages users, workspaces, real-time sessions, and Docker container orchestration.

- **Framework**: NestJS 11.
- **Database**: PostgreSQL with Prisma ORM.
- **Real-Time Communication**: NestJS WebSockets (`@nestjs/websockets`) and `socket.io` for handling collaboration and terminal data streams.
- **Container Orchestration**: `dockerode` is used to spawn and manage isolated Docker containers for executing user code and providing terminal access.
- **Authentication**: JWT with Passport.js (`@nestjs/passport`, `passport-jwt`, `bcryptjs`).
- **AI Integration**: `@google/genai` for AI-assisted code generation and chatting.

## Database Schema (Prisma)

The PostgreSQL database relies on the following core entities:
- **User**: Represents a system user, with credentials and profile info.
- **Workspace**: A collaborative space owned by a User, containing Projects.
- **WorkspaceMember**: Maps Users to Workspaces with roles (`OWNER`, `ADMIN`, `EDITOR`, `VIEWER`).
- **Project**: Represents a specific project or repository within a workspace.
- **AIChatSession & AIMessage**: Stores conversational history with the AI assistant.
- **CommentThread & Comment**: Supports inline code commenting and discussions.
- **Activity & Notification**: Tracks events (file changes, member joins) and alerts users.
- **RoleRequest**: Allows users to request access or elevated privileges in a workspace.

## Key Workflows

### Real-Time Collaboration
When a user opens a document, the frontend establishes a Yjs document synchronized via WebSockets (`socket.io`). As the user types in the Monaco Editor, Yjs captures the changes as CRDT operations and broadcasts them to all other connected clients, resolving conflicts automatically.

### Integrated Terminal & Code Execution
When a workspace is activated, the backend uses `dockerode` to spin up a secure, isolated Docker container. The frontend connects an Xterm.js instance to the backend via WebSockets. The backend bridges this WebSocket connection to the Docker container's standard I/O streams, giving the user a live shell inside the container.

### AI Assistance
Users can interact with an AI assistant in the editor. Prompts are sent to the backend, which forwards them to the Google GenAI service. The backend streams or returns the response, which is then rendered in the frontend UI or directly applied to the code.
