# Modern App (Express to Next.js Modernization)

A modern full-stack web application rebuilt using Next.js 16 (App Router), React 19, Tailwind CSS v4, and MongoDB Native Driver with Zod schema validation.

---

## Prerequisites

- **Node.js**: v20+ recommended
- **npm**: v10+
- **Docker**: Required to run the local MongoDB service

---

## Quick Start & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start MongoDB Database

The application connects to a MongoDB instance at `mongodb://localhost:27017/noobjs_dev`.

To start a MongoDB container using Docker:

```bash
docker run -d --name mongodb -p 27017:27017 --restart unless-stopped mongo:7
```

**Helpful Docker Management Commands:**
- Verify MongoDB is running:
  ```bash
  docker ps
  ```
- If the container is stopped (e.g., after a system reboot):
  ```bash
  docker start mongodb
  ```
- View MongoDB logs:
  ```bash
  docker logs -f mongodb
  ```
- Stop the container:
  ```bash
  docker stop mongodb
  ```

---

### 3. Environment Variables

Create or verify `.env.local` in the project root:

```env
MONGODB_URI=mongodb://localhost:27017/noobjs_dev
PORT=3001
NEXTAUTH_URL=http://localhost:3001
AUTH_SECRET=modernization-secret-token-development-key-32chars
NEXTAUTH_SECRET=modernization-secret-token-development-key-32chars
```

---

### 4. Running the Development Server

Start Next.js on port `3001`:

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

> [!NOTE]
> **Running over VS Code Remote SSH / Virtual Machine:**
> - Next.js binds to `0.0.0.0:3001`. In VS Code, check the **Ports** tab (next to Terminal) to ensure port **`3001`** is forwarded to your local machine.
> - MongoDB port `27017` does **not** need to be forwarded or exposed externally; Next.js communicates with MongoDB locally inside the VM via `127.0.0.1`.

---

### 5. Building for Production

```bash
npm run build
npm run start
```

---

### 6. Running Tests

Run the test suite using Vitest:

```bash
# Run all unit and integration tests
npm test

# Run a specific test file
npx vitest run tests/api/articles.test.ts
```

---

## Tech Stack Overview

- **Framework**: Next.js 16 (Turbopack, App Router, Server Actions)
- **Frontend**: React 19, Tailwind CSS v4, Lucide Icons, Shadcn / Base UI
- **Data Layer**: MongoDB Native Driver (`mongodb` v7.x), Zod 4
- **Auth**: NextAuth.js v5 beta (`next-auth`), bcrypt
- **Testing**: Vitest 5, Testing Library, node-mocks-http
