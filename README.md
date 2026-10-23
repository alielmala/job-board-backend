# Job Board API

REST API for a job board. Recruiters post jobs; jobseekers browse them and apply
with a PDF CV. Auth is a JWT in an httpOnly cookie, CVs live in Cloudinary and
are served back through an authorized endpoint.

The React client lives in a separate repo (`job-board-frontend`) and proxies
`/api` to this server in development.

## Stack

- Node.js + Express 5
- MongoDB + Mongoose 9
- JWT auth via httpOnly cookie (`jsonwebtoken`, `cookie-parser`)
- Cloudinary for CV storage, `multer` for uploads
- `helmet`, `cors`, `express-rate-limit`, `morgan`

## Requirements

- **Node 18 or newer.** The CV download endpoint uses global `fetch` and
  `stream.Readable.fromWeb`.
- A MongoDB database (local or Atlas).
- A Cloudinary account.

## Setup

```bash
npm install
cp .env.example .env   # then fill it in (see below)
npm run dev
```

The server listens on `http://localhost:5000` by default and prints the port on
boot. `npm start` runs it without nodemon.

### Environment variables

All of these are read at runtime; the app exits if it cannot reach MongoDB.

| Variable | Required | Notes |
| --- | --- | --- |
| `MONGO_URI` | yes | Mongoose connection string. |
| `JWT_SECRET` | yes | Signing secret for auth tokens. |
| `JWT_EXPIRES_IN` | yes | Token lifetime, e.g. `7d`. The cookie itself is fixed at 7 days. |
| `CLOUDINARY_CLOUD_NAME` | yes | |
| `CLOUDINARY_API_KEY` | yes | |
| `CLOUDINARY_API_SECRET` | yes | |
| `CORS_ORIGIN` | yes | Exact origin of the client, e.g. `http://localhost:5173`. Credentials are enabled, so a wildcard will not work. |
| `PORT` | no | Defaults to `5000`. |
| `NODE_ENV` | no | `production` switches the auth cookie to `secure` + `sameSite=none` and Morgan to `combined`. |

## Project structure

```
src/
  server.js              entry point: loads env, connects to Mongo, listens
  app.js                 express app, middleware chain, route mounting
  config/
    db.js                mongoose connection (sets sanitizeFilter globally)
    cloudinary.js        uploadCV / deleteCV against the raw resource type
  models/                User, Job, Application
  controllers/           auth, job, application
  routes/                authRouters, jobRouters, applicationRouter
  middleware/
    auth.js              protect (cookie -> req.user), restrictTo(...roles)
    upload.js            multer memory storage, PDF only, 5MB cap
    rateLimiter.js       authLimiter: 10 requests / 15 min
    errorHandler.js      maps thrown errors to JSON responses
  errors/AppError.js     AppError, NotFoundError, ValidationError, UnauthorizedError
  utils/                 generateToken, sendTokenCookie, escapeRegex
```

## Authentication and roles

`protect` reads the `token` cookie, verifies it, loads the user and assigns
`req.user`. There is no `Authorization: Bearer` support — the client never sees
the token, which is why plain `<a href>` links to the API work.

Two roles, set at registration and defaulting to `jobseeker`:

- **recruiter** — posts jobs, views applicants, decides application status
- **jobseeker** — applies to jobs, views and withdraws their own applications

`restrictTo("recruiter")` gates by role. Ownership is checked separately inside
each controller, because a recruiter must not touch another recruiter's jobs.

## API reference

All responses are JSON and include `success`. Mounted under `/api`.

### Auth — `/api/auth`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/register` | — | Body: `name`, `email`, `password`, optional `role`. Rate limited. Sets the cookie. |
| POST | `/login` | — | Body: `email`, `password`. Rate limited. Sets the cookie. |
| POST | `/logout` | — | Clears the cookie. |
| GET | `/me` | cookie | Current user. |
| PATCH | `/me` | cookie | Body: `name`, `email`. |
| PATCH | `/me/password` | cookie | Body: `currentPassword`, `newPassword`. Issues a fresh cookie. |

Register and login share a limiter of 10 requests per 15 minutes per IP.

### Jobs — `/api/jobs`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/` | — | Public listing. Open jobs only. Filters below. |
| POST | `/` | recruiter | Body: `title`, `company`, `location`, `type`, `description`. |
| GET | `/me` | recruiter | The caller's own jobs, newest first, open and closed. |
| GET | `/:id` | cookie | Single job with poster's name and email. |
| PUT | `/:id` | owner | Partial update; also accepts `isOpen` to close a posting. |
| DELETE | `/:id` | owner | Cascades to the job's applications (their Cloudinary files are left behind — see known gaps). |
| POST | `/:id/apply` | jobseeker | `multipart/form-data` with `cv` (PDF) and `coverLetter`. |
| GET | `/:id/applicants` | owner | Optional `?status=pending\|accepted\|rejected`. |

`type` must be one of `full-time`, `part-time`, `contract`, `internship`.
Applying to a closed job returns `JOB_CLOSED`; applying twice returns
`DUPLICATE_APPLICATION`, enforced by a unique index on `(job, applicant)`.

### Applications — `/api/applications`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/my` | jobseeker | The caller's applications with their jobs populated. |
| GET | `/:id/cv` | applicant or job owner | Streams the CV as a PDF download. |
| PATCH | `/:id/status` | job owner | Body: `status` — `pending`, `accepted` or `rejected`. |
| DELETE | `/:id` | applicant | Withdraw. Only allowed while `status` is `pending`. |

## Job search and filtering

`GET /api/jobs` accepts:

| Param | Behaviour |
| --- | --- |
| `search` | Case-insensitive **substring** match across `title`, `company` and `description`. Whitespace splits it into terms (max 8) and every term must match at least one field, so `node mongo` narrows the results. |
| `location` | Case-insensitive substring match. |
| `type` | Exact match against the enum. |
| `salary_min` | See the known gaps below — this currently matches nothing. |
| `sort` | One of `createdAt`, `updatedAt`, `title`, `company`, optionally prefixed with `-`. Defaults to `-createdAt`. Anything else is ignored. |
| `page` | Defaults to 1. |
| `limit` | Defaults to 10, capped at 50. |

```bash
curl "http://localhost:5000/api/jobs?search=fr&type=full-time&sort=-createdAt"
```

The response carries `jobs`, `count`, `page`, `limit`, `total` and `pages`.

## Errors

`errorHandler` is the single exit point. Express 5 forwards rejected promises
automatically, so controllers `throw` and never need a try/catch wrapper.

```json
{ "success": false, "message": "Job not found", "code": "NOT_FOUND" }
```

Thrown `AppError`s pass through their own status and `code`. Mongoose validation
errors become 400, duplicate keys 409, bad ObjectIds 400 `INVALID_ID`, and
Multer failures 400. Anything unrecognized is logged and returned as a generic
500, so internal messages never reach the client.

Codes in use: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`,
`INVALID_ID`, `EMAIL_IN_USE`, `DUPLICATE_KEY`, `JOB_CLOSED`,
`DUPLICATE_APPLICATION`, `CV_UNAVAILABLE`, `RATE_LIMITED`, `LIMIT_FILE_SIZE`,
`INTERNAL_SERVER_ERROR`.

## Two conventions that will bite you

**Query operators need `mongoose.trusted()`.** `db.js` sets
`mongoose.set("sanitizeFilter", true)` globally. That protects against query
injection, but it also rewrites any `{ $gte: ... }` you put in a filter into
`{ $eq: { $gte: ... } }`, which silently matches nothing, and it throws outright
on `$text`, `$where`, `$expr` and `$jsonSchema`. When you add a filter that uses
an operator, wrap it:

```js
filter.salary = mongoose.trusted({ $gte: Number(salary_min) });
```

`$and` and `$or` are recursed into rather than rewritten, so nested clauses
built from regexes are fine as-is. Always coerce user input with `String()` or
`Number()` first — Express parses `?location[$ne]=x` into an object, and an
object reaching `.replace()` or `.startsWith()` is a 500.

**CV `public_id`s deliberately have no file extension.** Cloudinary blocks
public delivery of PDFs on free plans, and the restriction is matched on the
delivery URL's extension. Adding `.pdf` to `public_id` makes every CV URL return
`401 deny or ACL failure`. The filename is supplied instead by the
`Content-Disposition` header in `GET /api/applications/:id/cv`, which also sets
an RFC 5987 `filename*` so Arabic filenames survive. Do not "fix" the missing
extension.

## Known gaps

- **`salary` is not in the Job schema.** `createJob` reads it from the body and
  passes it to `Job.create`, where Mongoose's strict mode discards it. The
  `salary_min` filter therefore matches nothing, and no job has ever stored a
  salary. Adding the field is a schema decision that hasn't been made yet.
- **Withdrawn applications leak Cloudinary files.** The `deleteOne` hook in
  `models/Application.js` checks `this.cv?.publicId`, but the field is
  `public_id`, so `deleteCV` never runs.
- **`originalName` is missing on older applications.** The schema had the field
  misspelled, so Mongoose dropped it on write. Those CVs download as `cv.pdf`.
- **The text index on `Job` is unused.** `models/Job.js` still declares a text
  index over `title`, `company` and `description`, but search moved to regex
  matching. It costs write time and storage and can be dropped.
- **Search cannot use an index.** An unanchored regex scans the collection. Fine
  at current scale; Atlas Search with an `autocomplete` index is the upgrade
  path.
- **No tests.** `npm test` is still the placeholder.
