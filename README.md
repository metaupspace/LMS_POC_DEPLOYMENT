# LMS Platform

A production-ready **Learning Management System** built for organizational training and development. Supports four user roles — **Admin**, **Manager**, **Coach**, and **Staff** — with a desktop-first admin dashboard and mobile-first PWA for coaches and learners.

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14+ (App Router) |
| **Language** | TypeScript (strict mode) |
| **Database** | MongoDB with Mongoose ODM |
| **Cache** | Redis (ioredis) |
| **Message Queue** | RabbitMQ (amqplib) |
| **State Management** | Redux Toolkit + RTK Query |
| **Styling** | Tailwind CSS with custom design tokens |
| **Auth** | JWT with rotating refresh tokens |
| **File Storage** | Cloudinary |
| **Email** | Nodemailer with templated emails |
| **Real-time** | Server-Sent Events (SSE) |
| **Reports** | jsPDF + ExcelJS |
| **Testing** | Vitest + Playwright |
| **Component Dev** | Storybook |
| **Infrastructure** | Docker Compose |

## Features

### Admin / Manager Dashboard (Desktop)
- User management — create, edit, offboard, and onboard staff, coaches, and managers
- Course builder — create courses with modules, video/text content, quizzes, and proof-of-work requirements
- Training session management — schedule online/offline sessions with attendance tracking via codes
- Assign coaches to courses and staff to courses/sessions
- Dashboard with KPI stats and overview metrics
- Report generation — learner progress and session attendance reports in PDF/Excel
- Notification center

### Coach PWA (Mobile)
- View assigned courses and enrolled learners
- Track per-learner module progress
- Review and approve/reject proof-of-work submissions
- Receive real-time notifications for new submissions

### Staff / Learner PWA (Mobile)
- Browse assigned courses and complete modules (video + text content)
- Take quizzes with instant scoring
- Upload proof-of-work files for coach review
- View training sessions and mark attendance via session codes
- Gamification dashboard — points, badges (Rookie/Silver/Gold/Premium), and daily streaks
- Receive real-time notifications for assignments, reviews, and badge achievements

### Cross-cutting
- Role-based access control (RBAC) on every API endpoint
- Real-time notifications via SSE with polling fallback
- Browser push notifications
- JWT auth with auto-refresh and rotating tokens
- PWA with offline support, installable on mobile
- Swagger/OpenAPI documentation at `/api-docs`

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login, onboarding
│   ├── (dashboard)/admin/   # Admin/Manager dashboard pages
│   ├── (coach)/coach/       # Coach PWA pages
│   ├── (learner)/learner/   # Staff/Learner PWA pages
│   ├── api/                 # API routes (38 endpoints)
│   └── api-docs/            # Swagger UI
├── components/
│   ├── ui/                  # Reusable UI components (16)
│   ├── shared/              # Cross-role components
│   ├── dashboard/           # Admin layout components
│   ├── coach/               # Coach-specific components
│   └── learner/             # Learner-specific components
├── hooks/                   # Custom React hooks
├── lib/
│   ├── auth/                # JWT, password hashing, RBAC middleware
│   ├── db/models/           # Mongoose models (9)
│   ├── redis/               # Redis client
│   ├── rabbitmq/            # Queue connection, producer, consumers
│   ├── cloudinary/          # File upload config
│   ├── email/               # Nodemailer + email templates
│   ├── sse/                 # SSE manager for real-time push
│   ├── swagger/             # OpenAPI spec
│   ├── validators/          # Zod schemas
│   └── utils/               # API responses, pagination, reports, etc.
├── store/
│   ├── slices/api/          # RTK Query API slices (14)
│   ├── slices/authSlice.ts  # Auth state
│   └── slices/uiSlice.ts    # UI state (modals, toasts, sidebar)
├── types/                   # TypeScript types and enums
└── i18n/                    # Internationalization
```

## Getting Started

### Prerequisites

- **Node.js** >= 20
- **Docker** and **Docker Compose**
- **Cloudinary** account (for file uploads)
- **SMTP** credentials (for email notifications)

### 1. Clone and Install

```bash
git clone <repository-url>
cd lms-platform
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
# App
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://lms_admin:lms_password@localhost:27017/lms_platform?authSource=admin

# Cache
REDIS_URL=redis://localhost:6379

# Message Queue
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# JWT Auth
JWT_ACCESS_SECRET=your-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# SMTP (Email)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASSWORD=your-password
SMTP_FROM_NAME=LMS Platform
SMTP_FROM_EMAIL=noreply@example.com

# Admin Seed
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=System Admin
```

### 3. Start Infrastructure

```bash
docker-compose up -d
```

This starts MongoDB (27017), Redis (6379), and RabbitMQ (5672 + management UI at 15672).

### 4. Seed Admin User

```bash
npm run seed
```

Creates the initial admin user with Employee ID `ADMIN001`.

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and login with the admin credentials.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run seed` | Seed admin user |
| `npm run worker` | Start RabbitMQ background worker |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix lint errors |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting |
| `npm run storybook` | Start Storybook on port 6006 |
| `npm run build-storybook` | Build static Storybook |

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login with empId + password |
| POST | `/api/auth/logout` | Logout and invalidate tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/change-password` | Change current user's password |

### Users
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/users` | Admin, Manager |
| POST | `/api/users` | Admin, Manager |
| GET | `/api/users/:id` | Admin, Manager |
| PUT | `/api/users/:id` | Admin, Manager |
| DELETE | `/api/users/:id` | Admin |
| PATCH | `/api/users/:id/offboard` | Admin, Manager |
| PATCH | `/api/users/:id/onboard` | Admin, Manager |
| POST | `/api/users/:id/reset-password` | Admin, Manager |
| GET | `/api/users/metadata` | Admin, Manager |

### Courses
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/courses` | All roles |
| POST | `/api/courses` | Admin, Manager |
| GET | `/api/courses/:id` | All roles |
| PATCH | `/api/courses/:id` | Admin, Manager |
| DELETE | `/api/courses/:id` | Admin, Manager |
| POST | `/api/courses/:id/assign` | Admin, Manager |
| GET | `/api/courses/:id/modules` | All roles |
| GET | `/api/courses/:id/analytics` | Admin, Manager, Coach |

### Modules & Quizzes
| Method | Endpoint | Access |
|---|---|---|
| GET/POST | `/api/modules` | Admin, Manager |
| GET/PUT/DELETE | `/api/modules/:id` | Admin, Manager |
| GET/POST | `/api/quizzes` | Admin, Manager |
| GET/PUT/DELETE | `/api/quizzes/:id` | Admin, Manager |
| POST | `/api/quizzes/:id/attempt` | Staff |

### Training Sessions
| Method | Endpoint | Access |
|---|---|---|
| GET/POST | `/api/sessions` | Admin, Manager |
| GET/PUT/DELETE | `/api/sessions/:id` | Admin, Manager |
| GET/POST | `/api/sessions/:id/attendance-code` | Admin, Manager, Coach |
| POST | `/api/sessions/:id/mark-attendance` | All roles |

### Progress & Gamification
| Method | Endpoint | Access |
|---|---|---|
| GET/POST | `/api/progress` | All roles |
| GET | `/api/progress/:userId` | All roles |
| GET | `/api/gamification/:userId` | All roles |
| GET/POST | `/api/gamification/streak` | All roles |

### Proof of Work
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/proof-of-work` | All roles |
| POST | `/api/proof-of-work/upload` | Staff |
| POST | `/api/proof-of-work/:id/review` | Coach |

### Notifications
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/notifications` | All roles |
| PATCH | `/api/notifications/:id/read` | All roles |
| GET | `/api/notifications/stream` | All roles (SSE) |

### Reports & Dashboard
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/dashboard/stats` | Admin, Manager |
| GET | `/api/reports/learner-progress` | Admin, Manager |
| GET | `/api/reports/session-attendance` | Admin, Manager |

### File Upload
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/upload` | All roles |

## Gamification System

| Component | Points |
|---|---|
| Video completion | 30 pts |
| Quiz pass | 30 pts |
| Proof of Work approved | 30 pts |
| Module max | 100 pts (video + quiz + PoW) |
| Module completion threshold | 60 pts |

| Badge | Threshold |
|---|---|
| Rookie | 1,000 pts |
| Silver | 2,000 pts |
| Gold | 3,000 pts |
| Premium | 5,000 pts |

Daily streaks are tracked based on course activity (video watch, quiz attempt, or proof upload).

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Next.js    │────▶│   MongoDB   │     │   Redis     │
│  App Router  │────▶│  (Mongoose) │     │  (Cache +   │
│  + API Routes│     └─────────────┘     │   Sessions) │
└──────┬───────┘                         └─────────────┘
       │
       │ publishToQueue()
       ▼
┌─────────────┐     ┌─────────────────────────┐
│  RabbitMQ   │────▶│  Consumer (instrumentation│
│  (Queues)   │     │  hook / standalone worker)│
└─────────────┘     └───────────┬─────────────┘
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
              Save to DB   Push via SSE  Send Email
              (Notification) (sseManager) (Nodemailer)
```

**Real-time flow:** API route publishes to RabbitMQ → Consumer saves notification to DB + pushes to SSE manager → Browser EventSource receives event → RTK Query refetches → Bell icon updates.

**Auth flow:** Login → JWT access token (15 min) + refresh token (7 days) → Stored in Redux + localStorage → Auto-refresh on 401 via RTK Query base query wrapper.

## Design System

The UI follows a custom design system documented in `public/design-system/LMS_Design_System_Documentation.pdf`.

| Token | Value |
|---|---|
| **Font** | Poppins (Google Fonts) |
| **Primary** | `#FF7A1A` (orange) |
| **Icons** | lucide-react (1.5-2px stroke) |
| **Spacing** | 8-point grid (4/8/16/24/32/48px) |
| **Border Radius** | 4/8/12px |

All design tokens are configured in `tailwind.config.ts`.

## Docker Deployment

### Full Stack with Docker Compose

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

The `Dockerfile` uses a multi-stage build with Next.js `standalone` output for minimal image size. Runs as non-root user on port 3000.

## Contributing

1. Branch from `dev` for features, `main` for hotfixes
2. Follow existing code patterns — Zod validation, `withAuth` RBAC, standardized API responses
3. Run `npm run lint:fix && npm run format` before committing
4. Add Storybook stories for new UI components

## License

Proprietary. All rights reserved.
