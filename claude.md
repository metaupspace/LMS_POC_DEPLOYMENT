# LMS Platform

## Project Overview
Production-ready Learning Management System with 4 roles: Admin, Manager, Coach, Staff.

## Tech Stack
- Next.js 14+ (App Router) — frontend and backend
- MongoDB with Mongoose
- Redis for caching and session management
- RabbitMQ for async job processing
- Redux Toolkit + RTK Query
- Tailwind CSS
- TypeScript (strict mode)
- Cloudinary for file uploads
- JWT auth with rotating refresh tokens
- Docker for infrastructure

## Design System
- **MUST follow** the design system in `public/design-system/LMS_Design_System_Documentation.pdf`
- **UI reference screenshots** in `public/design-system/ui-references/` — match these exactly
- Font: Poppins (Google Fonts)
- Primary color: #FF7A1A (orange)
- Icons: lucide-react (line-style, 1.5-2px stroke)
- 8-point grid spacing system
- All design tokens defined in tailwind.config.ts

## Gamification System
- Module = 100 points max (Video: 30pts, Quiz: 30pts, Proof of Work: 30pts)
- Module completes at 60 points (video + quiz). Proof of Work is optional bonus.
- Badge tiers: Rookie (1000pts), Silver (2000pts), Gold (3000pts), Premium (5000pts)
- Streak: daily course activity based

## Key Conventions
- All API routes use Zod validation
- RBAC middleware on every endpoint: `withAuth(handler, ['admin', 'manager'])`
- Standardized API responses: `{ success, data, message, error, pagination }`
- Soft delete pattern: status field with 'active', 'offboarded', 'deleted'
- RTK Query for all frontend API calls
- Mobile-first PWA for Coach and Staff interfaces
- Desktop-first dashboard for Admin and Manager

## Project Structure
- `src/app/api/` — API routes
- `src/app/(dashboard)/admin/` — Admin/Manager web dashboard (URL: /admin/*)
- `src/app/(coach)/coach/` — Coach PWA (URL: /coach/*)
- `src/app/(learner)/learner/` — Staff/Learner PWA (URL: /learner/*)
- `src/app/(auth)/` — Auth pages (URL: /login, /onboarding)
- `src/lib/` — Shared libraries (db, auth, redis, rabbitmq, validators)
- `src/store/` — Redux store and RTK Query slices
- `src/components/` — React components (ui/, dashboard/, coach/, learner/, shared/)
- `public/design-system/` — Design system PDF + UI reference screenshots

## Commands
- `docker-compose up -d` — Start MongoDB, Redis, RabbitMQ
- `npm run dev` — Start Next.js dev server
- `npm run build` — Production build
- `npm run seed` — Seed admin user