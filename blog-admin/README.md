# Blog Admin Panel

A production-ready Blog Management Admin Panel built with Node.js, Express,
MongoDB (Mongoose), and server-rendered EJS. Includes JWT authentication with
role-based access (Admin / Editor), a full blog CRUD workflow (drafts,
scheduling, soft delete, duplication), categories/tags, comment moderation, a
drag-and-drop media manager, site settings, and SEO-friendly public blog
pages.

## Tech Stack

- **Backend:** Node.js, Express, MongoDB/Mongoose, JWT, bcrypt, Multer + Sharp,
  AWS S3, express-validator, Helmet, CORS, Morgan, dotenv
- **Frontend:** EJS (server-rendered), Tailwind CSS, vanilla JavaScript,
  SunEditor (rich text), Chart.js (dashboard)

## Folder Structure

```
blog-admin/
├── server/
│   ├── config/        # env loader, MongoDB connection
│   ├── controllers/    # request handlers (JSON API + page rendering)
│   ├── middleware/      # auth, CSRF, rate limiting, upload, error handling
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express routers
│   ├── services/        # shared query/aggregation logic
│   ├── uploads/          # uploaded media (gitignored)
│   ├── utils/            # slugify, tokens, email, reading time
│   ├── app.js
│   ├── server.js
│   └── seed.js
├── client/
│   ├── css/            # admin.css, public.css
│   ├── js/               # per-page vanilla JS (fetch-based, no jQuery)
│   ├── images/
│   └── views/             # EJS templates (admin + public blog)
└── package.json
```

## Getting Started

### 1. Prerequisites

- Node.js 18+
- A MongoDB connection — either:
  - Local MongoDB Community Server (`mongodb://127.0.0.1:27017`), or
  - A MongoDB Atlas connection string

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in real values:

```bash
cp .env.example .env
```

At minimum, set:

- `MONGO_URI` — your MongoDB connection string
- `JWT_SECRET` / `SESSION_SECRET` — long random strings (generate with
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

Email sending (password reset) is optional — if `SMTP_HOST` is left blank,
reset links are logged to the console instead of emailed, which is fine for
local development.

### 4. Seed the database

Creates a default admin user, a sample category/tag, and one published post:

```bash
npm run seed
```

Default login (change immediately after first login via **My Profile**):

- **Email:** value of `SEED_ADMIN_EMAIL` in `.env` (default `admin@embtel.com`)
- **Password:** value of `SEED_ADMIN_PASSWORD` in `.env` (default `Admin@12345`)

### 5. Run the app

```bash
npm run dev     # nodemon, auto-restarts on file changes
npm start        # plain node, for production
```

- Admin panel: http://localhost:5000/admin/login
- Public blog: http://localhost:5000/blog

## Roles

- **Admin** — full access, including Settings, user management, permanent
  delete, and category/tag deletion.
- **Editor** — can create/edit/publish/schedule/soft-delete blogs, manage
  comments and media, but cannot access Settings, manage users, or
  permanently delete content.

## Security Notes

- Passwords hashed with bcrypt (cost factor 12).
- JWT stored in an httpOnly cookie; a separate readable `csrfToken` cookie
  implements double-submit-cookie CSRF protection on all state-changing
  requests (see `server/middleware/csrf.js`).
- `express-mongo-sanitize` + `hpp` guard against NoSQL injection and HTTP
  parameter pollution; the `xss` package sanitizes rich text/user input on
  the way in.
- Rate limiting is tighter on `/api/login`, `/api/forgot-password`, and
  `/api/reset-password/:token` to blunt credential stuffing.
- `.env` is gitignored — never commit real secrets. `.env.example` should only
  ever contain placeholder values.

## REST API

All JSON endpoints live under `/api`. Examples:

```
POST   /api/login
POST   /api/logout
GET    /api/blogs?search=&status=&category=&tag=&featured=&sort=&page=&limit=
GET    /api/blog/:id
POST   /api/blog
PUT    /api/blog/:id
DELETE /api/blog/:id            # soft delete
PATCH  /api/blog/:id/restore
DELETE /api/blog/:id/permanent  # admin only
POST   /api/blog/:id/duplicate
PATCH  /api/blog/:id/pin
GET    /api/categories | POST /api/category | PUT/DELETE /api/category/:id
GET    /api/tags       | POST /api/tag       | PUT/DELETE /api/tag/:id
GET    /api/comments   | PATCH /api/comment/:id/{approve,reject,spam}
POST   /api/comments                          # public submission
POST   /api/media/upload | GET /api/media | DELETE /api/media/:id
GET    /api/settings | PUT /api/settings      # admin only
```

State-changing requests require the `x-csrf-token` header to match the
`csrfToken` cookie (handled automatically by `client/js/csrf.js` /
`client/js/admin.js` in the browser).

## Notes on scope

- **Website Visitors** on the dashboard is a placeholder chart — wire it up
  to your real analytics provider (e.g. Google Analytics Reporting API) when
  ready.
- Image uploads are compressed/resized via Sharp before being stored in S3;
  SVGs pass through untouched. Requires `AWS_S3_BUCKET` and friends set in
  `.env` — see `.env.example`.
- The rich text editor is SunEditor (MIT licensed, self-hosted from
  `/suneditor`, no API key or account of any kind required).
