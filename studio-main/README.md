# EduIgnite — School Management System

A full-stack school management platform for Cameroonian schools. Built with **Next.js 15** (frontend) and **Django 4.2** (backend).

---

## Quick Start

### 1. Backend (Django)

**Prerequisites:** Python 3.11+, PostgreSQL 15, Redis 7

```bash
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements/development.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your database credentials and Firebase config

# Apply database migrations
python manage.py migrate

# Seed demo data (15 accounts + school + subjects + grades)
python manage.py seed_demo

# Start the development server
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/v1/`
API docs: `http://localhost:8000/api/docs/`

**Demo Login Credentials:**

| Role         | Matricule        | Password        |
|--------------|------------------|-----------------|
| CEO          | EDUI26CEO001     | EduIgnite@2026  |
| CTO          | EDUI26CTO001     | EduIgnite@2026  |
| School Admin | GBHS26ADM001     | Admin@2026      |
| Sub Admin    | GBHS26SUB001     | Admin@2026      |
| Teacher      | GBHS26T001       | Teacher@2026    |
| Student      | GBHS26S001       | Student@2026    |
| Parent       | GBHS26P001       | Parent@2026     |
| Bursar       | GBHS26BRS001     | Bursar@2026     |
| Librarian    | GBHS26LIB001     | Library@2026    |

---

### 2. Frontend (Next.js)

**Prerequisites:** Node.js 20+

```bash
# From the project root
npm install

# Configure environment variables
cp .env.local.example .env.local
# Edit .env.local — set NEXT_PUBLIC_API_URL and Firebase credentials

# Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`

---

### 3. Backend Environment Variables (`.env`)

```ini
SECRET_KEY=your-django-secret-key
DEBUG=True
DATABASE_URL=postgres://user:password@localhost:5432/eduignite
REDIS_URL=redis://localhost:6379/0

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_CLIENT_ID=...

# Optional: Gemini AI
GEMINI_API_KEY=...
```

### 4. Frontend Environment Variables (`.env.local`)

```ini
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8001

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

---

## Architecture

```
eduignite/
├── backend/                    # Django REST API
│   ├── apps/
│   │   ├── authentication/     # JWT + Firebase login
│   │   ├── users/              # User model, roles, seed command
│   │   ├── schools/            # School management
│   │   ├── students/           # Student profiles
│   │   ├── grades/             # Subjects, sequences, grades
│   │   ├── attendance/         # Sessions and records
│   │   ├── fees/               # Fee structures and payments
│   │   ├── library/            # Books and loans
│   │   ├── announcements/      # School announcements
│   │   ├── community/          # Blogs and testimonies
│   │   ├── chat/               # WebSocket messaging
│   │   ├── ai_features/        # Gemini AI integration
│   │   ├── platform/           # Platform-wide settings
│   │   ├── feedback/           # User feedback
│   │   ├── support/            # Support contributions
│   │   ├── orders/             # Subscription orders
│   │   └── staff_remarks/      # Staff performance notes
│   └── config/                 # Django settings, URLs, ASGI
│
└── src/                        # Next.js frontend
    ├── app/
    │   ├── dashboard/          # Protected dashboard pages
    │   │   ├── components/     # Role-specific dashboards
    │   │   ├── ai-assistant/   # AI chat interface
    │   │   ├── grades/         # Grade management
    │   │   ├── attendance/     # Attendance tracking
    │   │   ├── fees/           # Payment management
    │   │   └── ...             # Other feature pages
    │   ├── login/              # Authentication page
    │   └── layout.tsx          # Root layout with providers
    └── lib/
        ├── api/
        │   ├── client.ts       # Axios + JWT interceptor
        │   ├── endpoints.ts    # All API endpoint constants
        │   ├── services/       # 17 service modules
        │   └── types.ts        # TypeScript interfaces
        └── hooks/              # TanStack Query hooks
```

---

## User Roles

| Role         | Access Level      | Notes                              |
|--------------|-------------------|------------------------------------|
| SUPER_ADMIN  | Platform-wide     | Full system access                 |
| CEO / CTO / COO / INV / DESIGNER | Platform-wide | Executive dashboards |
| SCHOOL_ADMIN | School-wide       | Manages all school operations      |
| SUB_ADMIN    | School-wide       | Limited admin access               |
| TEACHER      | Class-specific    | Grades, attendance, assignments    |
| STUDENT      | Personal          | Grades, schedule, AI assistant     |
| PARENT       | Child-specific    | View child's academic record       |
| BURSAR       | Financial         | Payments and fee management        |
| LIBRARIAN    | Library           | Books and loan management          |

---

## Running with Docker

```bash
cd backend
docker-compose up --build

# In a separate terminal, seed the database
docker-compose exec web python manage.py migrate
docker-compose exec web python manage.py seed_demo
```

Services:
- **web** (Django) → port 8000
- **channels** (Daphne WebSocket) → port 8001
- **db** (PostgreSQL) → port 5432
- **redis** → port 6379
- **celery** (background tasks)
- **celery-beat** (scheduled tasks)
- **nginx** → port 80 (proxies to web and channels)
