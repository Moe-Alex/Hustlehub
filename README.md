# HustleHub+ - Secure Freelance Marketplace Platform
### Part 3: DevSecOps, Monitoring and Finalisation (React, Node.js, Express, MongoDB, Docker, GitHub Actions)

**Module:** Information Systems 3D INSY7314

**Members:**

ST10450571 - Erin Sarjoo

ST10453511 - Moegammad Alexander

ST10434391 - Nkosana Mavunhla

**Demonstration video:** PASTE_PART_3_VIDEO_LINK_HERE

**Repository used for the pipeline and static analysis:** PASTE_REPOSITORY_OR_FORK_LINK_HERE (if a fork was used because SonarQube could not connect to the Classroom50 repository, the fork contains every commit of this project)

---

## Where to find each Part 3 requirement

| Part 3 requirement | Where it is in this README | Main files |
|---|---|---|
| Tax estimation and income dashboard | [4. Tax Estimation and Income Dashboard](#4-tax-estimation-and-income-dashboard) | `hustlehub-backend/utils/tax.js`, `config/taxTables.js`, `hustlehub-frontend/src/pages/IncomePage.jsx` |
| CI/CD pipeline | [13. CI/CD Pipeline](#13-cicd-pipeline) | `.github/workflows/ci.yml` |
| Static code analysis | [13.3 Static analysis](#133-static-analysis) | `eslint.config.js` (both apps), `sonar-project.properties` |
| Docker and Docker Compose | [11.3 Run everything with Docker](#113-run-everything-with-docker) | `docker-compose.yml`, `hustlehub-backend/Dockerfile`, `hustlehub-frontend/Dockerfile` |
| Logging and cloud monitoring | [5. Logging and Monitoring](#5-logging-and-monitoring) | `hustlehub-backend/utils/structuredLogger.js`, `lokiTransport.js`, `docs/grafana/` |
| Our own security features (marked **OWN FEATURE**) | [6.2 Our own security features](#62-our-own-security-features-part-3) | `utils/accountLockout.js`, `controllers/authController.js`, `InactivityGuard.jsx` |
| Security review | [7. Security Review](#7-security-review) | - |
| Testing evidence | [12. Testing](#12-testing) and [16. Screenshots and Evidence](#16-screenshots-and-evidence) | `hustlehub-backend/tests`, `postman`, `e2e` |
| References and attribution | [17. Attribution and Use of AI Assistance](#17-attribution-and-use-of-ai-assistance), [18. Reference List](#18-reference-list) | - |

### Team contributions in Part 3

| Member | Main work |
|---|---|
| Nkosana Mavunhla | Backend: tax engine and SARS tables, structured logging and the Loki transport, account lockout and revocable sessions, backend tests |
| Erin Sarjoo | Frontend: income and tax dashboard with charts, inactivity sign-out, frontend tests; this README and the architecture diagram |
| Moegammad Alexander | DevOps: Dockerfiles and Docker Compose, GitHub Actions pipeline, ESLint and SonarQube setup, Grafana Cloud dashboard, browser tests, demo video |

The commit history on GitHub shows the individual contributions.

---

## 1. Project Overview

**HustleHub+** is a secure freelance marketplace. **Freelancers** list services ("gigs"), **clients** browse and request them, and every booking request creates a transaction record. A freelancer must **accept** a request before work starts, and only completed work counts as income. Freelancers can then see what they have earned, how much income tax they may owe under the South African tax tables, and where their money comes from.

The platform handles credentials, bookings and income data, so security is a design requirement from the start, not a later addition.

### Who uses it

| Role | What they can do |
|---|---|
| **Client** | Browse and search gigs, send a booking request, see their own bookings and payments. A client can never accept, reject or complete a booking, including their own. |
| **Freelancer** | Create, edit and delete their own gigs, see booking requests they received, accept or reject them, mark accepted work completed, and see income, estimated tax and take-home pay on a dashboard. |
| **Admin** | See every user, booking and transaction, and remove any gig for moderation. Admins cannot book gigs or create gigs. |

Admins cannot register through the app. The first admin is created with `npm run seed:admin`.

### How the project grew

1. **Part 1 - Secure foundations:** Express API, registration and login, bcrypt, JWT, HTTPS, validation, safe errors, Postman tests.
2. **Part 2 - Secure stack:** MongoDB Atlas, gigs, bookings, transactions, role-based access control, a React frontend, rate limiting, Helmet and a Content Security Policy, Newman API tests and Vitest frontend tests, and the booking approval workflow.
3. **Part 3 - DevSecOps (this version):** the final application plus everything needed to build, test, scan, ship and watch it.

### What is new in Part 3

- **Tax engine:** the flat 15% estimate was replaced by the real progressive South African method (tax brackets, age rebates, tax years from 1 March), with the logic explained and unit tested. See section 4.
- **Income and tax dashboard:** tax year, age group and business expenses controls, four headline figures, a monthly income chart, a "where your income goes" chart and a step-by-step tax working. See section 4.
- **Structured logging with cloud monitoring:** every login, booking, transaction, security event and error is logged as JSON, written locally and sent to **Grafana Cloud (Loki)**, with a ready-made dashboard. See section 5.
- **Three of our own security features** that are not required by the brief: account lockout, revocable sessions (real logout) and inactivity sign-out. See section 6.2.
- **Docker:** both applications have Dockerfiles, and Docker Compose starts the database, API and website together. See section 11.3.
- **CI/CD pipeline:** GitHub Actions lints, tests, builds, audits, scans and runs the whole stack in Docker with browser tests, and fails when anything fails. See section 13.
- **Static analysis:** ESLint with security rules in both apps and SonarQube in the pipeline. See section 13.3.
- **Security review:** threats mapped to controls and tests. See section 7.
- **Earlier feedback:** all Part 2 feedback is kept in place (booking approval workflow, accurate documentation) and this README now has in-text references and a reference list.

---

## 2. Architecture

![HustleHub+ Part 2 system architecture](Diagram/HustleHub%20Part%202%20System%20Architecture.drawio.png)

*The diagram above is the application architecture. Its editable source is `Diagram/HustleHub Part 2 System Architecture.drawio`. The Part 1 diagram is kept in the same folder for comparison. Part 3 does not change how the application is structured: it adds the tax engine, logging, three security features and the container and pipeline layers, which are drawn in section 5.3 (logging), section 11.3 (Docker) and section 13.1 (pipeline). In Docker, an nginx container replaces the Vite server shown below.*

The same flow as a simpler diagram:

```mermaid
flowchart LR
    Browser["Browser - React app served over HTTPS"]
    subgraph Frontend["Vite server - frontend"]
        Static["Static files with strict CSP"]
        Proxy["Proxy for /api"]
    end
    subgraph Backend["Node.js and Express API - HTTPS"]
        Sec["Helmet, CSP, CORS"]
        San["Sanitise body and query"]
        Rate["Rate limiters"]
        Authn["JWT check and role check"]
        Val["Validation"]
        Ctrl["Controllers"]
        Err["Central error handler"]
    end
    DB[("MongoDB Atlas")]

    Browser --> Static
    Browser -->|"fetch /api"| Proxy
    Proxy -->|"HTTPS"| Sec
    Sec --> San --> Rate --> Authn --> Val --> Ctrl
    Ctrl --> DB
    Ctrl -.->|"errors"| Err
```

### Trust boundaries

- **Browser to servers:** everything is untrusted input. The browser can never decide a price, a role or an owner.
- **API to database:** only the API holds the database credentials (in `.env`, never committed).
- The React app hides links and pages a role should not see, but that is only convenience. **Every rule is enforced again on the API.**

### Request flow through the API

1. The request arrives over HTTPS and is given a **request id**. When it finishes, its outcome is logged (section 5).
2. **Helmet** adds security headers, including a Content Security Policy. **CORS** checks the origin.
3. The JSON body is read (maximum 10 KB).
4. The **sanitiser** removes keys that start with `$` or contain `.` (NoSQL injection) and strips HTML tags from every text value (scripting attacks). Passwords are left untouched.
5. A **general rate limiter** runs for every `/api` call.
6. The route's own limiter runs if it has one (login, register, bookings, gig changes).
7. **`protect`** checks the JWT signature, algorithm and expiry, reloads the user from MongoDB and checks the token has **not been revoked** by a logout.
8. **`requireRole`** checks the user's role is allowed on that route.
9. **express-validator** checks every field. Invalid input is rejected with `400` and field-level messages.
10. The **controller** does the work. It also checks ownership, for example that a gig belongs to the freelancer editing it.
11. Any error goes to one **central handler** that logs the details on the server (and in Grafana Cloud) and sends the client a short, safe message.

---

## 3. Data Flow Diagrams

### 3.1 Register

```mermaid
sequenceDiagram
    actor U as User
    participant R as React app
    participant A as Express API
    participant D as MongoDB

    U->>R: Fill in username, email, password, role
    R->>R: Check the fields in the browser
    R->>A: POST /api/auth/register
    A->>A: Limit, sanitise, validate
    A->>D: Does this email or username exist
    D-->>A: No
    A->>A: Hash password with bcrypt, 12 rounds
    A->>D: Save user with the hash
    D-->>A: Saved
    A-->>R: 201 with id, username, email, role
    R-->>U: Account created, please log in
```

1. The user enters a username, email, password and chooses **client** or **freelancer**. The React form checks the same rules as the server so mistakes are caught immediately.
2. The browser sends `POST /api/auth/register` over HTTPS.
3. The API applies the **registration rate limit** (20 per hour per address), strips NoSQL operators and HTML, then validates: username 3-30 letters, numbers or underscores; a valid email; a password of 8-72 characters with upper case, lower case, a number and a special character; a role of only `client` or `freelancer`. **`admin` is rejected here**, so nobody can promote themselves.
4. The API checks the email and the lower-cased username are unused. If one is taken it answers `409`.
5. The password is hashed with **bcrypt using 12 rounds**. The plain password is never stored or logged.
6. The user is saved. The hash is stored with `select: false`, so it is never returned by any query by default.
7. The response contains only `id`, `username`, `email` and `role`. The frontend sends the user to the login page.

### 3.2 Login and token issue

```mermaid
sequenceDiagram
    actor U as User
    participant R as React app
    participant A as Express API
    participant D as MongoDB

    U->>R: Enter email and password
    R->>A: POST /api/auth/login
    A->>A: Limit failed attempts per address, sanitise, validate
    A->>D: Is this email locked?
    alt Locked (OWN FEATURE 1)
        A-->>R: 429 account locked, retryAfterSeconds
    else Not locked
        A->>D: Find user by email, include hash
        D-->>A: User or nothing
        A->>A: bcrypt compare, using a dummy hash if no user
        alt Wrong email or wrong password
            A->>D: Count the failure, lock after 5
            A-->>R: 401 Invalid email or password
        else Correct
            A->>D: Clear the failure counter
            A->>A: Sign JWT with id, username, role, token version, 1 hour expiry
            A-->>R: 200 with token and user
            R->>R: Keep token in sessionStorage
        end
    end
    A->>A: Log the outcome (auth.login.success, failure or blocked)
```

1. The user enters their email and password.
2. The API applies the **login rate limit**: 10 *failed* attempts per 15 minutes per address. Successful logins do not count, so real users are not locked out, but password guessing is throttled.
3. The input is sanitised and validated. Both fields must be real strings, so a request like `{"email": {"$gt": ""}}` is rejected with `400` before it reaches the database.
4. **Account lockout (OWN FEATURE 1):** if this email already has 5 recent wrong passwords, the API answers `429` straight away, before any password is checked.
5. The API looks the user up by email and compares the password with `bcrypt.compare`.
6. If the email does not exist, the API still runs `bcrypt.compare` against a dummy hash. Both failure cases take the same time, return the same message and are counted in the same way, so an attacker cannot learn which emails are registered.
7. On success the API clears the failure counter and signs a **JWT** containing only `id`, `username`, `role` and the user's **token version**, using HS256 and the secret from `.env`. It expires after 1 hour.
8. The browser keeps the token in `sessionStorage` and sends it as `Authorization: Bearer <token>` on every later request.
9. Every outcome is logged with the email masked and the request id (section 5).

### 3.3 A protected request (how roles are enforced)

```mermaid
sequenceDiagram
    participant R as React app
    participant A as Express API
    participant D as MongoDB

    R->>A: Request with Authorization Bearer token
    A->>A: Verify signature, algorithm HS256, expiry
    A->>D: Load the user by id from the token
    D-->>A: User and current role
    A->>A: Is the role allowed on this route
    A->>A: Validate input
    A->>D: Query only this user's records
    D-->>A: Data
    A-->>R: 200 JSON
```

1. `protect` rejects a missing, malformed, expired or tampered token with `401`. The algorithm is pinned to HS256, so unsigned tokens (`alg: none`) are refused.
2. It then **reloads the user from MongoDB**. A deleted account, or a changed role, takes effect immediately instead of when the token expires. It also compares the token's version with the user's current version, so a token from before a **logout** is refused (OWN FEATURE 2).
3. `requireRole('freelancer')` and similar checks return `403` for roles that are not allowed.
4. Controllers add ownership rules. A freelancer who edits a gig they do not own gets `403`. Bookings and transactions are always queried with the user's own id, so another user's booking looks exactly like one that does not exist (`404`).

### 3.4 Booking a gig: request, accept or reject, complete

A booking is a **request** until the freelancer decides on it. The client cannot confirm their own booking.

```mermaid
stateDiagram-v2
    [*] --> pending: Client sends a request
    pending --> accepted: Freelancer accepts
    pending --> rejected: Freelancer rejects
    accepted --> completed: Freelancer marks the work done
    rejected --> [*]
    completed --> [*]
```

| Booking status | Transaction status | Counts as income? |
|---|---|---|
| `pending` | `pending` | No |
| `accepted` | `pending` | No |
| `rejected` | `cancelled` | No |
| `completed` | `completed` | Yes |

```mermaid
sequenceDiagram
    actor C as Client
    actor F as Freelancer
    participant R as React app
    participant A as Express API
    participant D as MongoDB

    C->>R: Open a gig and press Send booking request
    R->>A: POST /api/bookings with gigId and notes
    A->>A: Token, client role, booking limit, validation
    A->>D: Find the gig
    D-->>A: Gig with its real price
    A->>D: Create booking (status pending) using the gig price
    A->>D: Create transaction (status pending) with reference TXN-xxxx
    A-->>R: 201 with booking and transaction
    R-->>C: Request sent, waiting for the freelancer
    F->>R: Open Bookings received and press Accept
    R->>A: PATCH /api/bookings/:id/accept
    A->>D: Update only if pending and owned by this freelancer
    A-->>R: 200 accepted
    F->>R: Press Mark completed when the work is done
    R->>A: PATCH /api/bookings/:id/complete
    A->>D: Update only if accepted, and mark the transaction completed
    A-->>R: 200 completed
```

1. Only users with the **client** role can create a booking. The **booking limit** is 5 per 10 minutes for each user.
2. The request contains only a `gigId` and optional notes. **The price and the status are never taken from the request.** The price is read from the gig stored in MongoDB, and the status always starts as `pending` (a `status` sent by the client is ignored).
3. The API creates the **booking** and then the **transaction** (`amount`, `currency: ZAR`, a random `TXN-` reference, client, freelancer, gig). If the transaction cannot be saved, the booking is deleted again, so a booking never exists without its transaction.
4. `PATCH /api/bookings/:id/accept` and `/reject` are for the **freelancer who owns the booking** only. A client or admin gets `403`. A freelancer who does not own the booking gets `404`, the same as a booking that does not exist.
5. Each status change is one database update that includes the required current status. A booking that is not in the right state gets `409` (for example, accepting twice, rejecting an accepted booking, or completing a booking that was never accepted), and two requests at the same moment cannot both succeed.
6. Rejecting cancels the transaction. Completing marks it `completed`.
7. The booking and transaction keep a copy of the gig title and price. Editing or deleting the gig later never changes the history.
8. The freelancer's **income** is the sum of their **completed** transactions only, counted in the tax year in which the work was completed. `GET /api/transactions/income` returns income, taxable income, the tax working and take-home pay (section 4). The admin overview also counts only completed transactions in its value figure.
9. Each step is logged (`booking.created`, `transaction.created`, `booking.accepted`, `booking.completed`, `transaction.completed` and so on).

### 3.5 Logout and session revocation (OWN FEATURE 2)

```mermaid
sequenceDiagram
    actor U as User
    participant R as React app
    participant A as Express API
    participant D as MongoDB

    U->>R: Press Log out (or the inactivity timer runs out)
    R->>A: POST /api/auth/logout with the token
    A->>A: protect: token valid and version matches
    A->>D: Raise the user's tokenVersion by 1
    A-->>R: 200 Logged out
    R->>R: Delete the token from sessionStorage
    Note over A: Any copy of the old token now fails the version check
    R->>A: (a stolen copy of the old token is used)
    A-->>R: 401 Your session has ended
```

1. The browser sends the token to `POST /api/auth/logout`. The call is best effort: if the server cannot be reached, the browser still deletes its copy.
2. The API raises the user's `tokenVersion`. Every token carries the version it was issued with, so **all tokens issued earlier stop working**, on every device.
3. The event is logged as `auth.logout`, and later use of an old token as `security.token.revoked`.

---

## 4. Tax Estimation and Income Dashboard

### 4.1 How South African income tax is calculated

South Africa taxes individuals with a **progressive** system: income is cut into slices ("brackets"), and each slice is taxed at its own rate. Only the part of the income that falls inside a bracket is taxed at that bracket's rate, so earning more never reduces take-home pay. After the tax on the slices is added up, a **rebate** is subtracted. The rebate depends on age, and everyone gets the primary rebate (SARS n.d.). The tax year runs from **1 March to the end of February**, and SARS calls the year that ends in February 2027 the "2027 tax year" (SARS n.d.). The app labels it **2026/27**.

Rates for the 2026/27 tax year (1 March 2026 to 28 February 2027), as published by SARS (n.d.):

| Taxable income (R) | Tax rate on this slice |
|---|---|
| 0 - 245 100 | 18% |
| 245 101 - 383 100 | 26% |
| 383 101 - 530 200 | 31% |
| 530 201 - 695 800 | 36% |
| 695 801 - 887 000 | 39% |
| 887 001 - 1 878 600 | 41% |
| 1 878 601 and above | 45% |

| Rebate | Amount for 2026/27 (R) | Who gets it |
|---|---|---|
| Primary | 17 820 | Everyone |
| Secondary | 9 765 | Aged 65 and older (added to the primary rebate) |
| Tertiary | 3 249 | Aged 75 and older (added to the other two) |

The tables for 2026/27 and the previous year (2025/26) are stored in one data file, `hustlehub-backend/config/taxTables.js`. When SARS publishes new figures, only that file changes. If no table exists for the current tax year (for example in March 2027, before a new table is added) the app uses the newest table it has instead of failing.

### 4.2 What the app does with it

Everything is calculated on the **server** (`hustlehub-backend/utils/tax.js` and `controllers/transactionController.js`), so the browser can never change a figure.

1. **Income earned** is the sum of the freelancer's **completed** transactions in the chosen tax year. Pending and cancelled transactions are never counted, and are shown separately as "pending". The date used is the day the work was marked completed, converted to South African time, so a payment completed late on 28 February lands in the right tax year.
2. **Taxable income** is income earned minus the **business expenses** the freelancer enters (never below zero).
3. **Tax before rebates** is worked out slice by slice from the table above.
4. The **rebate** for the chosen **age group** (under 65, 65 to 74, 75 and older) is subtracted, and the result cannot go below zero. This gives the **estimated tax**.
5. **Take-home after tax** is taxable income minus the estimated tax. The page also shows the **effective rate** (tax as a share of taxable income) and the **marginal rate** (the rate on the next rand earned).

**Worked example.** A freelancer under 65 has R500 000 of taxable income in 2026/27:

| Slice | Amount in the slice | Rate | Tax |
|---|---|---|---|
| R0 - R245 100 | R245 100 | 18% | R44 118 |
| R245 100 - R383 100 | R138 000 | 26% | R35 880 |
| R383 100 - R500 000 | R116 900 | 31% | R36 239 |
| **Tax before rebate** | | | **R116 237** |
| Primary rebate | | | - R17 820 |
| **Estimated tax** | | | **R98 417** |

A person under 65 pays no tax at all below **R99 000** (R17 820 divided by 18%), which matches the threshold published by SARS (n.d.). The unit tests check this example, the thresholds, the age rebates and the tax-year boundaries.

**Assumptions, stated on the dashboard itself:** the figure is an estimate for illustration, not tax advice. It assumes gig income is the only income and does not include medical credits, retirement contributions or other deductions. Freelancers who earn outside a salary are normally provisional taxpayers who pay in two instalments a year, which the dashboard also reminds them.

### 4.3 The income dashboard

The **Income** page (freelancers only) shows:

- **Controls:** tax year, age group and business expenses, with an "Update estimate" button.
- **Four headline figures:** income earned, taxable income, estimated tax (with the effective rate) and take-home after tax, plus a note for any pending income that is not counted yet.
- **Income by month chart:** a column chart of the 12 months of the chosen tax year, from March to February.
- **Where your income goes:** a stacked bar of take-home pay, estimated tax and business expenses, with amounts and percentages.
- **How your tax was worked out:** the bracket table for that person, showing the income in each slice, the tax on it, the rebate and the final estimate, so the maths can be checked by hand.
- **Income by gig:** each gig's bookings and income, with an inline bar.

The charts are drawn with plain SVG (no charting library, so no extra dependency to keep patched), every chart has a hidden data table for screen readers, and nothing uses inline styles, so the strict Content Security Policy still applies.

**Endpoint:** `GET /api/transactions/income?taxYear=2027&ageGroup=under65&expenses=0`. `taxYear` is the year the tax year ends in. All three parameters are validated, and operator-style input such as `expenses[$gt]=0` is rejected with `400`.

**Tests:** 12 unit tests for the tax engine, 7 new Newman requests for the endpoint (age rebate, expenses, a year with no income and invalid input) on top of the updated income assertions and 10 frontend tests for the page.

---

## 5. Logging and Monitoring

### 5.1 What is logged, and why

Logging has two jobs here. It gives an **audit trail** (who did what, and when) and it gives **early warning** of attacks and faults (a burst of failed logins, a spike of server errors). Following the OWASP Logging Cheat Sheet (OWASP Foundation n.d.), we log authentication successes and failures, access-control failures and server errors, and we keep passwords and tokens out of the logs.

Each log line is one JSON object with a timestamp, level, event name, category and the details of that event. Event names are `category.action`, so they can be searched and charted.

| Category | Events | Why it is logged |
|---|---|---|
| **Logins and accounts** | `auth.register.success`, `auth.register.blocked`, `auth.login.success`, `auth.login.failure` (with the reason), `auth.login.blocked` (account locked), `auth.logout` | Shows who accessed the system, and reveals password guessing |
| **Bookings** | `booking.created`, `booking.accepted`, `booking.rejected`, `booking.completed` | Business audit trail for every status change |
| **Transactions** | `transaction.created`, `transaction.completed`, `transaction.cancelled` | Money-related records must be traceable |
| **Gigs** | `gig.created`, `gig.updated`, `gig.deleted` | Who changed or removed a listing |
| **Security** | `security.rate_limit.exceeded`, `security.account.locked`, `security.token.rejected`, `security.token.revoked`, `security.access.forbidden`, `access.denied` | Attempts to get around the rules |
| **Errors** | `error.request` (level `error` for server faults, `warn` for client mistakes) | Faults are found from the logs, not from users complaining. Stack traces stay in the logs and are never sent to the client |
| **System** | `system.startup`, `system.shutdown`, `system.database.connected`, `system.startup.failed` | Shows restarts and failed starts |
| **Requests** | `http.request` (method, route pattern, status, duration, user id) | Traffic and error-rate charts. The route pattern (`/api/gigs/:id`) keeps one chart line per endpoint |

Every request gets a unique **request id**, sent back to the caller in the `X-Request-Id` header and written on every log line for that request, so one action can be followed through the logs.

### 5.2 What is never logged

All log fields pass through `utils/redact.js` before anything is written or sent. Any field whose name looks like a secret (password, token, authorization, cookie, key, JWT, connection string) is replaced with `[REDACTED]`, credentials inside URLs and bearer tokens inside text are scrubbed, long text is cut to 500 characters, and email addresses are **masked** (`m***@example.com`) so the logs show which account was targeted without storing the full address. Unit tests prove that passwords and tokens never reach the output, and a check of the logs held in Loki after a full test run (259 lines) found no passwords, tokens or full email addresses.

### 5.3 Where the logs go

```mermaid
flowchart LR
    API["Express API<br/>logger.info / warn / error"] --> Redact["Redact secrets<br/>mask emails"]
    Redact --> Console["Console (JSON in production and Docker)"]
    Redact --> File["logs/events.log<br/>local audit file"]
    Redact --> Batch["Queue and batch<br/>retry, bounded size"]
    Batch -->|"HTTPS + access token"| Loki[("Grafana Cloud Loki")]
    Loki --> Dash["Grafana dashboard<br/>and alerts"]
```

1. **Console** - readable text in development, JSON in production and in Docker (`docker compose logs api`).
2. **`logs/events.log`** - a local JSON-lines audit file (switched off in Docker with `LOG_TO_FILE=false`, because container output is already collected).
3. **Grafana Cloud Loki** - the cloud logging platform. It is enabled only when `LOKI_URL`, `LOKI_USER` and `LOKI_TOKEN` are set. Lines are sent with Loki's push API (Grafana Labs n.d.), which takes JSON with a `streams` array of labels and `[nanosecond timestamp, line]` pairs.

The Loki sender (`utils/lokiTransport.js`) is written so that **logging can never break or slow the app**: lines are queued and sent in batches of 100 or every 2 seconds, a network failure or a `429`/`5xx` answer is retried up to three times, a rejected request (wrong credentials, `4xx`) is dropped with one warning a minute, the queue is capped at 2 000 lines (oldest dropped first), the timer never keeps the process alive, and on shutdown the remaining lines are flushed. Credentials are only sent over HTTPS (plain HTTP is accepted only for `localhost` testing). The access token comes from the environment and is never written in the code. Seven unit tests run the sender against a fake Loki server, including the retry, drop and queue-limit behaviour, and the whole flow was also run against a real Loki container.

### 5.4 Setting up Grafana Cloud

1. Create a free Grafana Cloud account and stack.
2. In the stack, open **Connections > Data sources > Loki** (or the stack's **Loki > Details** page) and copy the **URL** (for example `https://logs-prod-XXX.grafana.net`) and the **User** number.
3. Under **Administration > Cloud access policies**, create an access policy with the **`logs:write`** scope and add a token to it. Copy the token once; it is shown only once.
4. Put the three values in `hustlehub-backend/.env` (or the root `.env` for Docker). **Never commit them.**

   ```
   LOKI_URL=https://logs-prod-XXX.grafana.net
   LOKI_USER=123456
   LOKI_TOKEN=glc_xxxxxxxxxxxxxxxx
   ```
5. Start the API and use the app. Within a few seconds `system.startup` appears in **Explore** with the query `{app="hustlehub"}`.
6. Import the dashboard: **Dashboards > New > Import**, upload `docs/grafana/hustlehub-dashboard.json`, and choose your Loki data source.

### 5.5 The dashboard

`docs/grafana/hustlehub-dashboard.json` builds a dashboard called **HustleHub+ - Security and Activity** with 11 panels, and every query in it was run against a real Loki instance before it was committed:

| Panel | What it answers |
|---|---|
| Successful logins, Failed logins, Accounts locked, Server errors (4 numbers) | Is anything wrong right now? |
| Login outcomes over time | A rising red bar of failures is password guessing |
| Security events over time | Rate limits, rejected or revoked tokens, wrong-role attempts, lockouts |
| Bookings and transactions | Business activity: created, accepted, rejected, completed, paid |
| HTTP requests by status | Traffic and error rate per status code |
| Security events, Errors, Bookings and transactions (3 log panels) | The latest matching log lines, for investigation |

Example LogQL queries used for the evidence screenshots:

```
{app="hustlehub"} | json | event="auth.login.failure"
sum by (event) (count_over_time({app="hustlehub"} | json [1h]))
{app="hustlehub", category=~"booking|transaction"}
{app="hustlehub", level="error"}
```

Evidence screenshots of the dashboard and of these queries are in section 16.

---

## 6. Security Features

### 6.1 Features required by the module (Parts 1 and 2)

| Area | What we do | Where |
|---|---|---|
| Passwords | bcrypt, 12 rounds, never returned. Passwords are limited to 72 characters because bcrypt ignores anything longer. | `controllers/authController.js` |
| Tokens | JWT with HS256 pinned, 1 hour expiry, minimal payload, secret of at least 32 characters required at startup. | `controllers/authController.js`, `middleware/authMiddleware.js`, `config/config.js` |
| Authentication | Every gig, booking, transaction and admin route requires a valid JWT. | `routes/*.js` |
| Role-based access | `requireRole` on routes, ownership checks in controllers, queries scoped to the user's id. | `middleware/authMiddleware.js`, `controllers/*.js` |
| Privilege escalation | `admin` cannot be chosen at registration. Gig owner and price are never read from the request. | `middleware/validationMiddleware.js`, `controllers/gigController.js` |
| Validation | express-validator on every body, query and id. Every text field must be a real string. | `middleware/validationMiddleware.js` |
| Sanitisation | NoSQL operators and HTML removed from body and query. Search text is regex-escaped. Mongoose `sanitizeFilter` is on. | `middleware/sanitizeMiddleware.js`, `utils/escapeRegex.js`, `config/db.js` |
| Rate limiting | General, login (failed only), register, booking, gig writes. Clear 429 message with how long to wait. | `middleware/rateLimiters.js` |
| Security headers | Helmet, a Content Security Policy that blocks everything, no framing, no referrer, no caching of API responses (see Express.js n.d. for the recommendation). | `middleware/securityHeaders.js` |
| CORS | Only the frontend origins in `CLIENT_ORIGIN` may call the API from a browser. | `middleware/securityHeaders.js` |
| HTTPS | The API serves HTTPS itself, the Vite server uses the same certificate, and in Docker nginx serves the site over TLS 1.2 and 1.3. | `server.js`, `vite.config.js`, `hustlehub-frontend/docker/nginx.conf.template` |
| Safe errors | One central handler. Stack traces, file paths and database messages stay in the server log. | `middleware/errorMiddleware.js` |
| Frontend | React escapes all text, no `dangerouslySetInnerHTML`, strict CSP, token cleared when the tab closes. | `hustlehub-frontend/src` |
| Dependencies | `npm audit` reports 0 vulnerabilities for every package file and runs on every push. | `package.json`, `.github/workflows/ci.yml` |

#### Content Security Policy

The API only returns JSON, so its policy is: `default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`. Nothing from an API response can load a script, style, image or frame.

The React app (production build, and the nginx container) uses: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`. Fonts are self-hosted and the build contains no inline scripts, so no `unsafe-inline` is needed. The development server (`npm run dev`) must allow inline scripts and websockets for hot reloading, so it uses a looser policy. Run `npm start` or Docker to see the strict one.

### 6.2 Our own security features (Part 3)

> **OWN FEATURES.** The three features below were designed and built by our team for Part 3. They are **not** part of the minimum security list in the Part 1 and Part 2 briefs (hashing, JWT, validation, RBAC, rate limiting, HTTPS, headers). Each one is integrated into the working app, logged, documented and tested. Section 6.3 adds pipeline security features.

#### OWN FEATURE 1 - Account lockout (backend)

**Problem.** The per-address rate limiter stops one computer from guessing passwords quickly, but an attacker who spreads guesses across many addresses is never limited. Express.js (n.d.) recommends throttling login attempts by user as well as by address.

**What it does.** After **5 wrong passwords** for the same email, logins for that email are refused for **15 minutes**, **even with the correct password**. The locked response is `429` with `retryAfterSeconds` and a `Retry-After` header, and the website shows "Too many failed attempts for this account. It is locked for 15 minutes." A correct login clears the counter.

**Design decisions.**

- **No account enumeration.** The counter is keyed on the email *typed*, not on whether an account exists. An unknown email locks in exactly the same way and returns an identical response, so the lock cannot be used to find out which emails are registered. A Newman test checks that both responses have the same shape.
- **The check comes before the password check**, so a locked account gives a guesser no information at all.
- **The lock always ends.** Records live in a small `LoginAttempt` collection with a MongoDB TTL index, so nothing is kept forever and an attacker cannot lock a victim out permanently.
- **Atomic counting.** The counter uses one `$inc` update, so simultaneous guesses are all counted.
- **Settings** `LOCKOUT_MAX_ATTEMPTS` and `LOCKOUT_MINUTES` are in `.env`.
- Logged as `auth.login.failure`, `security.account.locked` and `auth.login.blocked` (with the email masked).

**Trade-off.** Someone could deliberately lock another person's account for 15 minutes by guessing wrong passwords. This is a known cost of lockouts (see section 15), and the short, self-ending lock keeps it small.

**Files:** `models/LoginAttempt.js`, `utils/accountLockout.js`, `controllers/authController.js`. **Tests:** Newman folder "08c - Account lockout" (7 requests) and a Playwright browser test.

#### OWN FEATURE 2 - Revocable sessions and real logout (backend and frontend)

**Problem.** A JWT is valid until it expires, so logging out in the browser only deleted the token locally: a copied or stolen token kept working for up to an hour. This was listed as a known limitation in Part 2.

**What it does.** Every user has a `tokenVersion` number, and every token carries the version it was issued with (`tv`). The `protect` middleware rejects a token whose version no longer matches. The new `POST /api/auth/logout` endpoint raises the user's version, which **ends every session of that user on every device at once**. The Log out button now calls this endpoint, and the same call is used by the inactivity sign-out. A revoked token gets `401 "Your session has ended"` and is logged as `security.token.revoked`.

**Design decisions.** The version is never returned by the API. If the server cannot be reached while logging out, the person is still logged out in the browser. A `401` caused by logging out is handled silently, so it does not show an "expired" message. The cost is one extra field comparison per request, because the user was already being loaded from the database on every request.

**Trade-off.** Logging out on one device logs the user out everywhere, which is the safe default and is stated in the code and here.

**Files:** `models/User.js`, `controllers/authController.js`, `middleware/authMiddleware.js`, `routes/authRoutes.js`, `hustlehub-frontend/src/context/AuthContext.jsx`. **Tests:** Newman folder "08b - Revocable sessions" (10 requests), 5 frontend tests, and a Playwright test that copies the token, logs out in the browser and proves the copy returns `401`.

#### OWN FEATURE 3 - Inactivity sign-out with a warning (frontend)

**Problem.** A person who walks away from a shared or public computer leaves a logged-in session behind. People handling payment and income data should be signed out automatically.

**What it does.** After **15 minutes** with no mouse, keyboard, touch or scroll activity the person is signed out (and the session is revoked on the server, using feature 2). **One minute before**, a dialog asks "Are you still there?" with a countdown, a **Stay signed in** button and a **Log out now** button. The login page then explains why ("You were signed out because you were inactive for a while").

**Design decisions.** Only a deliberate click keeps the session going once the warning shows, so a stray mouse movement cannot hide it. The deadline is stored as a clock time and checked every second, so it is still correct after a laptop has been asleep and timers were paused. The dialog is keyboard accessible (`alertdialog`, focus on the safe button) and uses no inline styles, so it works under the strict CSP.

**Files:** `src/components/InactivityGuard.jsx`, `src/utils/session.js`, `src/components/Layout.jsx`. **Tests:** 8 Vitest tests with a fake clock (warning, countdown, expiry, activity resets, no hiding by mouse movement, stay signed in, log out now, sleeping laptop).

### 6.3 Pipeline and operations security features (Part 3)

These also go beyond the brief and are marked as our own features:

- **Secret and vulnerability scanning in the pipeline.** Trivy scans the repository for committed secrets, vulnerable dependencies and Dockerfile misconfigurations, and scans both built Docker images, and `npm audit` runs on every package file. Any high or critical finding fails the build. Dependabot opens pull requests for new versions of dependencies, GitHub Actions and Docker base images (`.github/dependabot.yml`).
- **No secrets in the repository or the images.** `docker-compose.yml` has no secret values: it reads them from `.env` with `${NAME:?message}`, so Compose refuses to start if one is missing. The pipeline creates fresh random secrets for every run. Containers run as an unprivileged user.
- **Secret-safe logging.** Automatic redaction of secrets and masked email addresses in every log line (section 5.2).
- **Request tracing.** A request id on every response and log line.

---

## 7. Security Review

This review was done on the final code. It follows the OWASP Top 10:2021 categories (OWASP Foundation 2021) and the four areas named in the brief: injection, cross-site scripting, authentication weaknesses and access control. Each row names the threat, how the code defends against it, and the test that proves it.

### 7.1 Threats, controls and evidence

| Threat | How it could happen here | Controls in place | Proof |
|---|---|---|---|
| **Injection - NoSQL** (A03) | `{"email": {"$gt": ""}}` in login, `?expenses[$gt]=0` in a query string, operator keys in a gig body | The sanitiser deletes keys starting with `$` or containing `.`. Validators require real strings and numbers. Mongoose `sanitizeFilter` is on. Search text is regex-escaped. Prices, owners and statuses are never read from input. | Newman: operator injection in register, login and income returns `400`; unit and Vitest tests |
| **Injection - regex (ReDoS)** (A03) | A search such as `(a+)+$` | `escapeRegex` runs on all search text. | Newman: "Search text is matched literally, not as a regex" |
| **Cross-site scripting** (A03) | A gig title such as `<img src=x onerror=...>` | The server strips HTML tags. React escapes everything it renders and `dangerouslySetInnerHTML` is never used. The web CSP allows scripts only from the site itself (`script-src 'self'`) and the API CSP is `default-src 'none'`. | Newman: script tags are stripped; Vitest `GigCard` test (injected markup stays plain text); Playwright test checks the CSP header |
| **Broken authentication - password guessing** (A07) | Automated login attempts, including spread over many addresses | Per-address login limiter (10 failures per 15 minutes) and **account lockout** (OWN FEATURE 1). bcrypt with 12 rounds makes each guess slow. | Newman folders 08c and 09; Playwright lockout test |
| **Broken authentication - account enumeration** (A07) | Telling "no such user" apart from "wrong password" by message or timing | One generic message, a dummy bcrypt comparison for unknown emails so timing matches, and lockout that behaves identically for unknown emails. | Newman: unknown email returns the same body; lockout shape test |
| **Broken authentication - token weaknesses** (A07) | Forged, unsigned, tampered, expired or stolen tokens | HS256 pinned (the `alg: none` trick is refused), signature and expiry checked, minimal payload, user reloaded from the database on every request, **server-side revocation on logout** (OWN FEATURE 2), **inactivity sign-out** (OWN FEATURE 3). | Newman: `alg: none`, tampered and garbage tokens return `401`; revoked-token tests |
| **Broken access control** (A01) | A client calling a freelancer route, editing someone else's gig, reading someone else's booking, accepting their own booking | `protect` and `requireRole` on every route, ownership checks in controllers, queries scoped to the user id, other users' records return `404` (not `403`) so existence is not revealed. | Newman folders 02, 03, 04, 05 (403 and 404 cases); Playwright test (a client cannot open the Income page) |
| **Insecure design / tampering with money** (A04, A08) | Sending a lower price or a `completed` status in a booking | Price is read from the stored gig; status always starts `pending`; each status change is one atomic database update that requires the current status (`409` otherwise); tax is calculated only on the server. | Newman booking-workflow folder |
| **Cryptographic failures** (A02) | Passwords or traffic read in transit or at rest | bcrypt hashes, HTTPS on the API, TLS 1.2/1.3 on nginx, secrets only in environment variables. | Newman header tests; Playwright HTTPS test |
| **Security misconfiguration** (A05) | Leaky errors, open CORS, missing headers, containers running as root, secrets in images | Helmet and a CSP, an origin allow-list, one safe error handler, `server_tokens off` in nginx, non-root containers, `.dockerignore` files that keep `.env` and certificates out of images, Trivy misconfiguration scan, Compose refuses to start with missing secrets. | Newman headers and CORS folder; pipeline scan |
| **Vulnerable and outdated components** (A06) | A known-bad package in the dependency tree | `npm audit` and Trivy in the pipeline, Dependabot, lockfiles installed with `npm ci`. Three advisories were found and fixed during this part (see 13.3). | Pipeline run |
| **Software and data integrity** (A08) | A tampered dependency or build step | Lockfiles, `npm ci`, pinned action versions, pinned Newman versions, images built from the repository in the pipeline. | Pipeline run |
| **Logging and monitoring failures** (A09) | An attack that nobody notices | Structured logs for logins, bookings, transactions, security events and errors, sent to Grafana Cloud with a dashboard. Secrets are redacted. | Section 5; Grafana screenshots |
| **Denial of service** | Huge bodies, floods of requests | Body limit of 10 KB, general, login, register, booking and gig-write rate limiters, and `TRUST_PROXY_HOPS` so limits see the real visitor address behind nginx. | Newman rate-limit folders |
| **CSRF** | A malicious site makes the browser send a request | The token is kept in `sessionStorage` and sent in a header by our own code, so the browser never attaches it automatically. There are no authentication cookies. | Design (section 8) |
| **Sensitive data in logs** | Passwords or tokens written to logs | Redaction by field name and by pattern, email masking, no request bodies logged. | Unit tests; Loki check |
| **Secrets in the repository** | A password or key committed by mistake | `.env` ignored by git, Trivy secret scan on every run, no secret values in any workflow, Compose or Dockerfile. | Pipeline run |
| **SSRF** (A10) | The server fetching a URL chosen by an attacker | Not applicable: the API never requests user-supplied URLs. Its only outbound request is to `LOKI_URL`, which comes from the server's own environment and must be HTTPS. | Code review |

### 7.2 Residual risks

Section 15 lists what is still not covered (for example, a payment gateway, refresh tokens, and the fact that a self-signed certificate is used locally).

---

## 8. Why We Chose These Techniques

| Decision | What we chose | What we did not choose, and why |
|---|---|---|
| Authentication | **JWT bearer tokens** | **Server-side sessions** store a session record for every login and must look it up on every request. That needs a shared session store once there is more than one server, and cookie sessions need extra CSRF protection. JWTs are checked with the secret alone, work the same for the React app and Postman, and scale without shared state. The cost is that a token cannot normally be cancelled before it expires, so we keep it short (1 hour), reload the user on every request (deleted accounts and changed roles take effect straight away) and added a **token version** that a logout raises, which cancels every older token (section 6.2). |
| Password hashing | **bcrypt, 12 rounds** | **SHA-256 or MD5** are fast, which helps attackers. **argon2id** is also excellent, but needs a native build that often fails on student Windows machines. bcrypt is slow on purpose, salts every password, and its cost can be raised over time. We use `bcryptjs` (pure JavaScript, no native build). |
| Token storage in the browser | **sessionStorage** | **localStorage** keeps the token after the browser closes. **httpOnly cookies** cannot be read by scripts, but they are sent automatically, which brings CSRF risk, and they behave awkwardly across the two local servers. With sessionStorage the token disappears when the tab closes, the browser never attaches it automatically (so CSRF does not apply), and a strict CSP plus React's escaping reduce the XSS risk. |
| Database | **MongoDB Atlas with Mongoose** | A relational database would also work. MongoDB is the "M" in MERN, stores gigs naturally as documents, and Mongoose schemas give a second layer of validation. |
| Validation | **express-validator** | **Joi or Zod** are good schema libraries, but express-validator is built for Express, and does validation and sanitising in one chain per field. |
| NoSQL injection | **Remove `$` keys, require strings, Mongoose `sanitizeFilter`** | Relying on only one layer. Three independent layers mean one mistake does not become a breach. |
| Rate limit storage | **In memory** | **Redis** is needed when several servers share limits. This project runs one API container, so in-memory is simpler and has no extra service to run. Lockout counters, which must survive a restart, are stored in MongoDB instead. |
| Failed-login limit | **Count failed attempts only, per address and per email** | Counting every login would lock out normal users. A per-address limit alone does not stop guesses spread across many addresses, which is why account lockout was added. |
| Others' bookings | **Return 404, not 403** | A `403` tells an attacker the booking exists. A `404` reveals nothing. |
| Gig deletion | **Hard delete, with a copy of the title and price kept in bookings** | **Soft delete** leaves hidden records forever. Copying the details keeps history correct without them. |
| Frontend to API | **Vite proxy** (`/api`) | Calling the API directly means the browser must accept a second self-signed certificate and every request becomes cross-origin. The proxy keeps one origin and a strict `connect-src 'self'`. CORS is still locked down for any direct calls. |
| Money | **Numbers rounded to 2 decimals, in rand** | **Integer cents** is the safer production choice. For this scope, prices are validated to R1 - R100 000 and rounded on the server. |
| API test runner | **Newman through `npx`** | Installing Newman in the project adds dozens of dependency warnings that cannot be fixed upstream. Using `npx` with a pinned version keeps `npm audit` at zero for the application. |
| Tax calculation | **A data file of SARS tables and one pure function on the server** | Doing the sums in the browser would let a user change the figures. A flat rate (used in Part 2) is wrong for almost everyone. Keeping the rates in a data file means a new tax year is a data change, not a code change. |
| Charts | **Plain SVG drawn by our own components** | A charting library adds a large dependency to keep patched and often needs inline styles that the strict CSP blocks. Two simple charts do not need one, and each has a hidden data table for screen readers. |
| Logging format | **JSON lines with event names** | Plain text lines are hard to search and chart. JSON with `category.action` events can be filtered and counted in Grafana. |
| Cloud logging platform | **Grafana Cloud (Loki)** | It is the platform named in the module manual, has a free tier, and its push API is a simple HTTPS call, so no agent has to be installed and the sender is a small, testable class. |
| Web container | **nginx serving a build, as an unprivileged user** | Running the Vite preview server in production is not intended. nginx is small, fast, can be run without root and sets the same security headers. |
| Browser tests | **Playwright** | It drives a real browser, waits for the page automatically, and runs the same way locally and in the pipeline. |
| Static analysis | **ESLint with security rules plus SonarQube** | ESLint gives fast feedback on every file in seconds and runs locally. SonarQube adds quality gates, coverage and history. Together they catch more than either alone. |

---

## 9. Role Permissions

| Action | Client | Freelancer | Admin | Not logged in |
|---|---|---|---|---|
| Register and log in | Yes | Yes | Log in only | Yes |
| Log out (ends all of their own sessions) | Yes | Yes | Yes | No (401) |
| Browse and view gigs | Yes | Yes | Yes | No (401) |
| Create a gig | No (403) | Yes | No (403) | No (401) |
| Edit a gig | No (403) | Only their own (403 otherwise) | No (403) | No (401) |
| Delete a gig | No (403) | Only their own (403 otherwise) | Any gig | No (401) |
| Book a gig | Yes | No (403) | No (403) | No (401) |
| View bookings | Their own | Ones they received | All | No (401) |
| Accept or reject a booking request | No (403) | Only their own (404 otherwise) | No (403) | No (401) |
| Mark an accepted booking completed | No (403) | Only their own (404 otherwise) | No (403) | No (401) |
| View transactions | Their own payments | Their own earnings | All | No (401) |
| View income summary and tax estimate | No (403) | Yes | No (403) | No (401) |
| View users and platform summary | No (403) | No (403) | Yes | No (401) |

---

## 10. API Reference

Base URL: `https://localhost:5000`. Every response has `success` and either `data` or `message`. Send the token as `Authorization: Bearer <token>`.

| Method | Endpoint | Who | Rate limit | Description |
|---|---|---|---|---|
| GET | `/api/health` | Anyone | none | Liveness check |
| POST | `/api/auth/register` | Anyone | 20 per hour per address | Create a client or freelancer account |
| POST | `/api/auth/login` | Anyone | 10 failed per 15 minutes per address, and account lockout after 5 wrong passwords | Log in and receive a JWT |
| POST | `/api/auth/logout` | Logged in | general | End the session on the server (raises the token version, so every earlier token stops working) |
| GET | `/api/auth/profile` | Logged in | general | Own profile |
| GET | `/api/gigs` | Logged in | general | Active gigs. Query: `q`, `category`, `minPrice`, `maxPrice`, `sort` (`newest`, `price_asc`, `price_desc`), `page`, `limit` |
| GET | `/api/gigs/mine` | Freelancer | general | All of the freelancer's own gigs |
| GET | `/api/gigs/:id` | Logged in | general | One gig |
| POST | `/api/gigs` | Freelancer | 30 per 15 minutes per user | Create a gig |
| PUT | `/api/gigs/:id` | Freelancer (owner) | 30 per 15 minutes per user | Update a gig |
| DELETE | `/api/gigs/:id` | Freelancer (owner) or admin | 30 per 15 minutes per user | Delete a gig |
| POST | `/api/bookings` | Client | 5 per 10 minutes per user | Send a booking request (status `pending`) and create its pending transaction |
| GET | `/api/bookings` | Logged in | general | Bookings for the user's role |
| GET | `/api/bookings/:id` | Client or freelancer on it, or admin | general | One booking |
| PATCH | `/api/bookings/:id/accept` | Freelancer (owner) | general | Accept a `pending` booking (`409` otherwise) |
| PATCH | `/api/bookings/:id/reject` | Freelancer (owner) | general | Reject a `pending` booking and cancel its transaction (`409` otherwise) |
| PATCH | `/api/bookings/:id/complete` | Freelancer (owner) | general | Mark an `accepted` booking completed (`409` otherwise) |
| GET | `/api/transactions` | Logged in | general | Transactions for the user's role |
| GET | `/api/transactions/income` | Freelancer | general | Tax-year income summary. Query: `taxYear`, `ageGroup` (`under65`, `65to74`, `75plus`), `expenses`. Returns income, taxable income, the tax working per bracket, rebate, estimated tax, take-home, income per month and per gig |
| GET | `/api/admin/users` | Admin | general | All users (no password data) |
| GET | `/api/admin/summary` | Admin | general | Platform totals |

The general limit is 300 requests per 15 minutes per address for all `/api` routes.

### Example: create a gig

```json
POST /api/gigs
{
  "title": "Logo design",
  "description": "I will design a clean, modern logo for your business.",
  "category": "Design",
  "price": 450,
  "deliveryDays": 3
}
```

Success (`201`):

```json
{
  "success": true,
  "message": "Gig created.",
  "data": {
    "id": "6650f1c2a1b2c3d4e5f60718",
    "title": "Logo design",
    "category": "Design",
    "price": 450,
    "deliveryDays": 3,
    "isActive": true,
    "freelancer": { "id": "6650f0a1a1b2c3d4e5f60001", "username": "Moe_Alex" }
  }
}
```

### Example: request a booking

```json
POST /api/bookings
{ "gigId": "6650f1c2a1b2c3d4e5f60718", "notes": "Please use blue tones." }
```

Success (`201`) returns both records. Note `amount` comes from the gig, not the request, and the status is `pending` whatever the client sends:

```json
{
  "success": true,
  "message": "Booking request sent. The freelancer must accept it before work starts.",
  "data": {
    "booking": { "id": "...", "gigTitle": "Logo design", "price": 450, "status": "pending" },
    "transaction": { "id": "...", "reference": "TXN-62D255A6F6", "amount": 450, "currency": "ZAR", "status": "pending" }
  }
}
```

### Common errors

| Status | Meaning | Example body |
|---|---|---|
| 400 | Validation failed | `{ "success": false, "message": "Validation failed.", "errors": [{ "field": "price", "message": "Price must be a number between R1 and R100 000." }] }` |
| 401 | Missing, invalid, expired or revoked token | `{ "success": false, "message": "Not authorised. Token is invalid or has expired." }` |
| 403 | Role or ownership not allowed | `{ "success": false, "message": "You can only modify your own gigs." }` |
| 404 | Not found, or not yours | `{ "success": false, "message": "Booking not found." }` |
| 409 | Duplicate | `{ "success": false, "message": "An account with that email already exists." }` |
| 413 | Body over 10 KB | `{ "success": false, "message": "Request body is too large." }` |
| 429 | Rate limited, or account locked | `{ "success": false, "message": "You are booking too quickly. Please wait before making another booking.", "retryAfterSeconds": 600 }` and `{ "success": false, "message": "Too many failed attempts for this account. It is locked for 15 minutes.", "retryAfterSeconds": 900 }` |
| 500 | Unexpected | `{ "success": false, "message": "An unexpected error occurred. Please try again later." }` |

---

## 11. Running the Project

There are two ways to run HustleHub+. Use **local development** to work on the code, and **Docker** to run the whole finished stack with one command.

### 11.1 Prerequisites

- **Node.js 22.12 or newer** (check with `node -v`) and npm
- **OpenSSL** (included with Git Bash on Windows) for the local HTTPS certificate
- A **MongoDB Atlas** account (the free tier is enough) for local development
- **Docker Desktop** (Docker Compose included) for the container route
- Optional: a free **Grafana Cloud** account for cloud logging (section 5.4)

### 11.2 Local development

**Step 1 - Set up MongoDB Atlas**

1. Create a free cluster in MongoDB Atlas.
2. **Database Access:** add a database user with a password.
3. **Network Access:** add your current IP address.
4. **Connect > Drivers:** copy the connection string. Replace the password placeholder, and add the database name before the `?`, for example `.../hustlehub?retryWrites=true&w=majority`. If the password contains special characters, URL-encode them.

**Step 2 - Run the backend**

```bash
cd hustlehub-backend
npm install

# create your settings file, then open .env and fill in every value
cp .env.example .env
# generate a JWT secret and paste it into JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# create the HTTPS certificate (answers do not matter for local use)
mkdir certs
openssl req -nodes -new -x509 -keyout certs/key.pem -out certs/cert.pem -days 365

# create the first administrator from ADMIN_* in .env
npm run seed:admin

# start the API
npm run dev
```

You should see `system.database.connected` and `HustleHub+ backend listening securely on https://localhost:5000`. To send logs to Grafana Cloud as well, fill in `LOKI_URL`, `LOKI_USER` and `LOKI_TOKEN` in `.env` first (section 5.4).

**Step 3 - Run the frontend**

Open a second terminal:

```bash
cd hustlehub-frontend
npm install
npm run dev
```

Open **https://localhost:5173**. The browser warns about the self-signed certificate: choose **Advanced**, then **Proceed to localhost**. You only need to do this once. To see the strict Content Security Policy that the production build uses, run `npm start` instead (it builds, then serves the build on the same address).

### 11.3 Run everything with Docker

Three containers are started (Docker Compose, Docker Inc. n.d.): **mongo** (the database, not reachable from outside Docker), **api** (the Express API over HTTPS) and **web** (nginx serving the built React app over HTTPS and forwarding `/api` to the API).

```mermaid
flowchart LR
    Browser["Browser"] -->|"HTTPS :8443"| Web["web<br/>nginx + React build<br/>non-root"]
    Web -->|"HTTPS, private network"| Api["api<br/>Node 22 + Express<br/>non-root, health check"]
    Api --> Mongo[("mongo 7<br/>private network only<br/>volume mongo-data")]
    Api -.->|"HTTPS (optional)"| Loki[("Grafana Cloud Loki")]
    Tools["Newman / Postman"] -->|"127.0.0.1:5000"| Api
```

```bash
# 1. Create the settings file and fill in the three secrets (never commit .env)
cp .env.docker.example .env
#    MONGO_ROOT_PASSWORD  - letters and digits only
#    JWT_SECRET           - at least 32 characters:
#                           node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
#    ADMIN_PASSWORD       - for the admin account
#    (optional) LOKI_URL, LOKI_USER and LOKI_TOKEN for Grafana Cloud

# 2. Build the images and start everything, waiting until all three are healthy
docker compose up --build -d --wait

# 3. Create the admin account
docker compose run --rm api npm run seed:admin

# 4. Open https://localhost:8443  (accept the self-signed certificate warning)
docker compose ps          # shows all three containers as healthy
docker compose logs -f api # the structured JSON logs
docker compose down        # stop (add -v to also delete the database volume)
```

What the Docker setup does for security and reliability:

- **Multi-stage build for the web image:** the React app is built in one stage and only the finished files are copied into a small nginx image.
- **Non-root:** the API runs as the `node` user and nginx runs as an unprivileged user (`nginx-unprivileged`).
- **No secrets in images or in `docker-compose.yml`.** `.dockerignore` keeps `.env`, certificates and logs out of the images, and Compose stops with a clear message if a required secret is missing.
- **Self-signed certificates are created when a container first starts**, never baked into an image. To use real certificates, mount them at the paths in the entrypoint scripts.
- **Health checks** on all three containers, and `depends_on` waits for healthy dependencies (database, then API, then web).
- **Database access:** the MongoDB container needs a password and has no published port.
- **Same security headers** as the development build (the CSP, `X-Frame-Options` and others), set in `hustlehub-frontend/docker/nginx.conf.template`.
- `TRUST_PROXY_HOPS=1` lets the API see real visitor addresses behind nginx, so rate limiting and lockouts apply per visitor and not to nginx as a whole.
- The API is also published on `127.0.0.1:5000` (this computer only), so Postman and Newman can test it directly.

In the pipeline, the same `docker compose up` runs on a clean machine and the Playwright browser tests are run against it (section 13).

### 11.4 Environment variables

All settings are read in one place, `hustlehub-backend/config/config.js`. No value is ever hard-coded.

| Variable | Needed | Purpose |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string. In Docker it is built for you. |
| `JWT_SECRET` | Yes | At least 32 characters. |
| `JWT_EXPIRES_IN` | No (`1h`) | Token lifetime. |
| `PORT`, `NODE_ENV` | No | Server port and mode. |
| `CLIENT_ORIGIN` | No | Allowed website addresses for CORS. |
| `SSL_KEY_PATH`, `SSL_CERT_PATH` | No | HTTPS certificate files. |
| `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | For `seed:admin` | The first administrator. |
| `LOCKOUT_MAX_ATTEMPTS`, `LOCKOUT_MINUTES` | No (`5`, `15`) | Account lockout (OWN FEATURE 1). |
| `RATE_LIMIT_*` | No | Rate limit overrides. |
| `TRUST_PROXY_HOPS` | No (`0`) | Reverse proxies in front of the API (`1` in Docker). |
| `LOG_LEVEL`, `LOG_TO_FILE`, `LOG_FORMAT`, `LOG_ENVIRONMENT` | No | Logging behaviour. |
| `LOKI_URL`, `LOKI_USER`, `LOKI_TOKEN` | For cloud logging | Grafana Cloud Loki. Leave empty to log locally only. |
| `MONGO_ROOT_PASSWORD`, `WEB_PORT`, `API_PORT` | Docker | Used by `docker-compose.yml`. |

### 11.5 Try it

1. Register a **freelancer**, log in, and create a gig under **My gigs**.
2. Log out. Register a **client**, log in, open the gig and press **Send booking request**. The booking shows as **Pending** under **My bookings**, and there is no way for the client to confirm it.
3. Log in as the freelancer again. Open **Bookings received**, press **Accept** (or **Reject**), then press **Mark completed**.
4. Open **Income**: the completed booking now appears in the figures, charts and tax working. Try the age group and business expenses controls.
5. Enter a wrong password five times to see the account lockout, or leave the page open to see the inactivity warning.
6. Log in with the admin account and open **Admin**.

**Upgrading older data:** bookings made before the approval workflow have the old status `confirmed`. Run `npm run migrate:bookings` once in `hustlehub-backend` to turn them into `accepted`. It is safe to run more than once, and it is not needed on a fresh database.

---

## 12. Testing

Every layer of the application has automated tests, and all of them run in the pipeline.

| Layer | Tool | What it covers | Latest result |
|---|---|---|---|
| Backend unit tests | Node's built-in test runner (`node:test`) | Tax engine (12), log redaction (5), Loki sender (7), structured logger (6) | **30 tests, 0 failed**. Together with the Newman API tests below, the backend has about 96% line coverage |
| Backend integration tests | Postman collection run by Newman | Every endpoint, roles, ownership, validation, injection, tokens, rate limits, lockout, sessions, headers, CORS | **165 requests, 416 assertions, 0 failed** |
| Frontend unit and integration tests | Vitest and Testing Library | Pages, forms, routing by role, API client, charts, income page, sessions, inactivity sign-out | **85 tests in 15 files, 0 failed** (about 81% line coverage across all source files) |
| End-to-end browser tests | Playwright (Chromium) against the Docker stack | Register, log in, create a gig, book, accept, complete, income and tax page, role access, logout revocation, account lockout, admin | **9 tests, 0 failed** |
| Static analysis | ESLint with security rules, SonarQube | Whole codebase | See section 13.3 |

### 12.1 Backend

```bash
cd hustlehub-backend
npm run test:unit      # unit tests
npm run test:coverage  # unit tests, then the Newman API tests, with one combined coverage report
npm run test:api       # Newman API tests only (same as npm test)
npm run lint           # static analysis
```

The Newman collection `hustlehub-backend/postman/HustleHub.postman_collection.json` has **165 requests in 12 folders**, each with automated assertions. It covers success and failure cases for every endpoint. For the booking workflow it checks that:

- a new booking is `pending` and a client-supplied status is ignored;
- a client, an admin and a visitor with no token cannot accept, reject or complete (`403` / `401`);
- a freelancer who does not own the booking gets `404`, and a malformed or unknown id gets `400` / `404`;
- wrong-order transitions are refused with `409`;
- income, the transaction status and the admin value figure only count a booking once it is completed, and a rejected booking leaves a cancelled transaction.

New in Part 3, the collection also checks the tax figures (age rebate, expenses, empty years, invalid and operator input), the revocable-session flow (logout, old tokens refused on every device, a fresh login works) and the account lockout (including that unknown emails lock identically).

`npm run test:api` empties a separate database called `hustlehub_test` (it refuses to run on any database whose name does not contain "test", or on your real one), creates a test admin with a random password, starts the API on port 5055, runs the collection and writes reports to `hustlehub-backend/newman/reports/` (`newman-report.html` and `newman-report.json`). It exits with an error if any assertion fails. For the test run the lockout is set to 2 wrong passwords and the per-address login limit to 16, so the lockout requests fit within the same run as the rate-limit folder.

To run the collection by hand in Postman, import the collection and `HustleHub.postman_environment.json`, set `adminEmail` and `adminPassword` to your `ADMIN_*` values, turn off SSL certificate verification, and run the folders in order. The login rate-limit folder is last. Restart the API before running it again, because its counters live in memory.

### 12.2 Frontend

```bash
cd hustlehub-frontend
npm test               # Vitest
npm run test:coverage  # with a coverage report
npm run lint
```

- `GigCard` renders server text as plain text (an injected `<img onerror>` stays harmless text).
- `GigForm` shows an error for each invalid field, blocks submission, then submits cleaned numbers.
- `LoginPage` and `RegisterPage` validate in the browser, call the API with the typed values, show server errors, and send each role to its own home page.
- `Navbar` shows the right links for each role, and `ProtectedRoute` redirects logged-out visitors and blocks the wrong role.
- `GigsPage`, `GigDetailPage`, `BookingsPage` cover browsing, booking requests, and the accept, reject and complete buttons.
- `IncomePage` (10 tests) checks the figures, controls, charts, tax working, pending note and error states, and the formatting helpers are tested separately.
- `AuthContext` (5 tests) checks that logging out ends the session on the server, still works offline, and that a `401` does not try to revoke again.
- `InactivityGuard` (8 tests, fake clock) checks the warning, countdown, expiry, activity resets and the sleeping-laptop case.
- The API client adds the token, explains `429` with a wait time, never shows raw `500` messages and treats an expired token differently from a wrong password.

### 12.3 End-to-end browser tests

```bash
docker compose up --build -d --wait
docker compose run --rm api npm run seed:admin
cd e2e
npm install
npx playwright install chromium
E2E_ADMIN_EMAIL=admin@example.com E2E_ADMIN_PASSWORD=<your admin password> npx playwright test
```

The tests (`e2e/tests/hustlehub.spec.js`, written with Playwright; Playwright n.d.) follow the journeys from the brief in a real browser and generate random passwords on every run, so no password is written in the code. The login limiter is in memory, so restart the API container (`docker compose restart api`) before running them a second time within 15 minutes.

---

## 13. CI/CD Pipeline

### 13.1 Overview

The pipeline is one GitHub Actions workflow, `.github/workflows/ci.yml` (GitHub n.d.). It starts **automatically** on every push and pull request (and can be started by hand), every run can be inspected in the **Actions** tab, and test reports and coverage are attached to each run as downloadable artifacts.

```mermaid
flowchart LR
    Push["push / pull request"] --> B["backend<br/>lint, unit tests,<br/>Newman API tests"]
    Push --> F["frontend<br/>lint, Vitest,<br/>production build"]
    Push --> A["dependency-audit<br/>npm audit x3"]
    Push --> T["trivy-scan<br/>vulnerabilities, secrets,<br/>misconfiguration"]
    Push --> D["docker-e2e<br/>build images, compose up,<br/>Playwright tests, image scan"]
    B --> S["sonarqube<br/>static analysis +<br/>quality gate"]
    F --> S
    B --> G{"pipeline-gate"}
    F --> G
    A --> G
    T --> G
    D --> G
    S --> G
    G -->|"all green"| OK["Success"]
    G -->|"anything red"| FAIL["Failure"]
```

| Job | What it does | Fails when |
|---|---|---|
| **backend** | Installs dependencies with `npm ci`, starts a MongoDB service container, creates a throw-away JWT secret and certificate, runs ESLint, then the unit tests and the Newman API tests together with a coverage report that also measures the API server while Newman calls it, and uploads the coverage and the Newman HTML report | A lint error or warning, a failing unit test, a failing Newman assertion |
| **frontend** | `npm ci`, ESLint, Vitest with coverage, then the production build, and uploads the coverage and the built site | A lint error, a failing test, a failed build |
| **dependency-audit** | `npm audit --audit-level=high` for the backend, frontend and end-to-end packages | A high or critical known vulnerability |
| **trivy-scan** | Trivy scans the repository for vulnerable dependencies, committed secrets and Dockerfile misconfigurations (Aqua Security 2026) | A high or critical finding |
| **docker-e2e** | Creates a `.env` of random secrets for this run, builds both images, starts the **whole stack with Docker Compose**, waits until all containers are healthy, creates the admin, runs the **Playwright browser tests** against the containers, then scans both built images with Trivy | An image that does not build, a container that is not healthy, a failing browser test, a vulnerable image |
| **sonarqube** | Runs SonarQube static analysis on the code and the coverage from the first two jobs and waits for the **quality gate** (SonarSource n.d.) | Missing Sonar settings, or a failed quality gate |
| **pipeline-gate** | The single overall result. It runs even if other jobs failed and fails unless **every** job succeeded | Any other job did not succeed |

**Why it can be trusted to fail.** No step uses `continue-on-error`, so a failing step fails its job, and the final gate job fails if any job did not succeed, including a job that was skipped or cancelled. The SonarQube job stops with an error message, instead of silently skipping, when its settings are missing. A pipeline run with a deliberately broken test is shown in section 16 to prove the red result.

**Other good practices in the workflow:** minimal `permissions: contents: read`; actions pinned to released versions and updated by Dependabot; `npm ci` for reproducible installs; concurrency settings that cancel superseded runs; timeouts on every job; container logs printed when the Docker job fails; and the `docker compose down -v` cleanup always runs.

### 13.2 Secrets and settings

**No secret is written anywhere in the repository.** The pipeline uses two kinds of GitHub settings (**Settings > Secrets and variables > Actions**):

| Name | Type | Purpose |
|---|---|---|
| `SONAR_TOKEN` | Secret | Token created in SonarQube / SonarCloud |
| `SONAR_HOST_URL` | Secret | The SonarQube server address (for SonarCloud, `https://sonarcloud.io`) |
| `SONAR_PROJECT_KEY` | Variable | The SonarQube project key |
| `SONAR_ORGANIZATION` | Variable | The SonarCloud organisation key |

The database password, JWT secret and admin password used while the pipeline runs are generated fresh for each run with `openssl rand`, masked in the log, and discarded afterwards. The Grafana Cloud settings (`LOKI_*`) are only needed on the computer that runs the app, not in the pipeline.

### 13.3 Static analysis

Static analysis runs in two layers, both inside the pipeline.

**Layer 1 - ESLint with security rules.** Both applications have an ESLint configuration (`eslint.config.js`) with the recommended rules and **`eslint-plugin-security`**, which flags risky patterns (object injection, unsafe regular expressions, non-literal file paths, `eval` and similar). The frontend also uses the React Hooks rules. `npm run lint` runs with `--max-warnings 0`, so even a warning fails the pipeline.

The first run found issues, and each one was reviewed by hand instead of being switched off:

| Finding | What we did |
|---|---|
| **25 warnings in the API** (23 in the code and 2 in test files: object injection sinks, non-literal file paths, a non-literal regular expression) | Reviewed one by one. **The log redaction function copied user-supplied keys into a new object with `obj[key] = ...`, which is unsafe for a key such as `__proto__`. It was rewritten with `Object.fromEntries`**, which cannot change an object's prototype. The remaining ones are false positives where the key or path comes from a fixed list, the server's own configuration, or a value that was validated first (for example the sort option is checked against a fixed list, and the search text is escaped by `escapeRegex`). Each one has an `eslint-disable-next-line` comment **with the reason written next to it**, so a reviewer can check it. |
| **9 warnings in the web app** | Two real hardening fixes: `StatusBadge` and `homeFor` now use `Object.hasOwn`, so a value such as `constructor` cannot pick up a built-in property. The others are fixed-name lookups, each documented in the same way. |
| **3 errors in the web app** (React Hooks rules) | The inactivity timer called `Date.now()` while rendering, which was moved into an effect, and a data hook that resets its loading flag is documented as the standard fetch-on-change pattern. An unused variable rule was adjusted for JSX component names. |
| **Dependency advisories (`npm audit`)** | **`body-parser` (high, denial of service via a compressed request body) and `qs` (moderate) in the API's dependencies, and `undici` (high, development-only, used by the test environment) in the web app.** The Express team published the same `body-parser` fix (Express.js 2026). All three were updated with `npm audit fix`, and both applications now report **0 vulnerabilities**. The old request logger package `morgan` was also removed because it was replaced by our structured request logger. |

**Layer 2 - SonarQube.** The `sonarqube` job analyses the API, the web app and the browser tests with the settings in `sonar-project.properties`, uses the backend and frontend coverage reports, and **fails the pipeline if the quality gate fails** (SonarSource n.d.). The result is in section 16:

| Measure | Result |
|---|---|
| Quality gate | PASTE_RESULT_FROM_SONARQUBE (Passed) |
| Security (vulnerabilities) | PASTE_RESULT_FROM_SONARQUBE |
| Reliability (bugs) | PASTE_RESULT_FROM_SONARQUBE |
| Maintainability (code smells) | PASTE_RESULT_FROM_SONARQUBE |
| Security hotspots reviewed | PASTE_RESULT_FROM_SONARQUBE |
| Coverage | PASTE_RESULT_FROM_SONARQUBE |
| Duplications | PASTE_RESULT_FROM_SONARQUBE |

**Issues SonarQube reported and how they were fixed:** PASTE_ONE_LINE_PER_ISSUE_FIXED (issue, file, fix). If it reported no security issues, say so here.

---

## 14. Project Structure

Repository root:

- `README.md` - this file
- `docker-compose.yml`, `.env.docker.example` - the whole stack in containers
- `.github/workflows/ci.yml` - the CI/CD pipeline; `.github/dependabot.yml` - automatic dependency updates
- `sonar-project.properties` - SonarQube settings (no secrets)
- `Diagram/` - architecture diagrams (draw.io source and PNG export)
- `docs/screenshots/` - screenshots of the running application
- `docs/evidence/` - test, pipeline, static analysis, Docker and logging evidence
- `docs/grafana/` - the importable Grafana dashboard
- `e2e/` - Playwright end-to-end tests
- `hustlehub-backend/` - the Express API
- `hustlehub-frontend/` - the React app

Inside `hustlehub-backend/`:

- `server.js` - connects to MongoDB, then starts the HTTPS server
- `app.js` - middleware order and route wiring
- `Dockerfile`, `docker-entrypoint.sh`, `.dockerignore` - the API container
- `config/` - `config.js` (environment settings and rate limits), `db.js`, `constants.js`, `taxTables.js` (SARS tables)
- `models/` - `User.js`, `Gig.js`, `Booking.js`, `Transaction.js`, `LoginAttempt.js`
- `controllers/` - `authController.js`, `gigController.js`, `bookingController.js`, `transactionController.js`, `adminController.js`
- `routes/` - one file per resource
- `middleware/` - `authMiddleware.js`, `validationMiddleware.js`, `sanitizeMiddleware.js`, `rateLimiters.js`, `securityHeaders.js`, `errorMiddleware.js`, `requestLogger.js`
- `utils/` - `tax.js`, `accountLockout.js`, `logger.js`, `structuredLogger.js`, `lokiTransport.js`, `redact.js`, `wait.js`, `pagination.js`, `escapeRegex.js`, `money.js`
- `tests/` - unit tests (`tax`, `redact`, `lokiTransport`, `structuredLogger`)
- `scripts/` - `seedAdmin.js`, `run-newman.js`, `migrateBookingStatuses.js`
- `postman/` - the collection and environment files
- `eslint.config.js` - static analysis rules

Inside `hustlehub-frontend/`:

- `Dockerfile`, `docker/` (nginx template and certificate script), `.dockerignore` - the web container
- `vite.config.js` - HTTPS, `/api` proxy, Content Security Policy, test and coverage setup
- `src/api/client.js` - all API calls
- `src/context/AuthContext.jsx` - login state, logout and session handling
- `src/components/` - shared pieces (`Navbar`, `ProtectedRoute`, `InactivityGuard`, `GigCard`, `GigForm`, and the `charts/` folder)
- `src/pages/` - one file per screen, including `IncomePage.jsx` (the tax dashboard)
- `src/utils/` - formatting, validation and session helpers
- `src/styles/index.css` - styles
- `src/**/*.test.js(x)` - the automated tests
- `eslint.config.js` - static analysis rules

---

## 15. Known Limitations and Next Steps

- **No payment gateway.** Bookings record a transaction in the database that stays pending until the work is completed. A real provider would be added behind the same transaction records.
- **The tax figure is an estimate.** It follows the SARS brackets and age rebates, but it does not include medical tax credits, retirement contributions, interest exemptions or provisional-tax instalment rules, and it assumes gig income is the only income. The tables must be updated each year.
- **Account lockout can be abused.** Someone who knows an email can lock that account for 15 minutes by guessing. The lock is short and always ends. A production system might add CAPTCHA or notify the owner by email.
- **Logging out ends all sessions of the user,** on every device. This is deliberate, but a per-device session list would be friendlier.
- **Tokens still live for one hour** unless the user logs out. Refresh tokens would allow shorter lifetimes.
- **Rate limits and lockout counters:** lockout counters are stored in MongoDB and survive restarts, but the per-address rate limits are in memory, which suits one API container. Several containers would need Redis.
- **Self-signed certificates** are used locally and in Docker, so browsers show a warning. A public deployment would use a trusted certificate, for example from Let's Encrypt.
- **Money** is stored as rand with 2 decimals. Integer cents would be more robust in production.
- **Deployment:** the project is delivered as containers and is not hosted on a public server, which the brief makes optional.

---

## 16. Screenshots and Evidence

Every feature in this README has evidence. Screenshots of the application were taken from the production build, which uses the strict Content Security Policy.

### 16.1 Authentication, client and freelancer screens

| | |
|---|---|
| ![Register page showing validation messages](docs/screenshots/01-register-validation.png) | ![Login page](docs/screenshots/02-login.png) |
| *Register page showing validation messages* | *Login page* |
| ![Browse gigs as a client](docs/screenshots/03-browse-gigs.png) | ![A gig with the booking request box](docs/screenshots/04-gig-detail-booking.png) |
| *Browse gigs as a client* | *A gig with the booking request box* |
| ![Booking request sent, with the pending transaction reference](docs/screenshots/05-booking-requested.png) | ![The client's My bookings page](docs/screenshots/06-client-bookings.png) |
| *Booking request sent, with the pending transaction reference* | *The client's My bookings page, showing a Pending request* |
| ![The client's Payments page](docs/screenshots/07-client-payments.png) | ![The freelancer's My gigs table](docs/screenshots/08-my-gigs.png) |
| *The client's Payments page, with each payment's status* | *The freelancer's My gigs table* |
| ![Create gig form rejecting invalid input](docs/screenshots/09-gig-form-validation.png) | ![Bookings received, with Accept, Reject and Mark completed](docs/screenshots/10-freelancer-bookings.png) |
| *Create gig form rejecting invalid input* | *Bookings received, with Accept, Reject and Mark completed* |

### 16.2 Tax estimation and income dashboard

| | |
|---|---|
| ![Income dashboard with figures and charts](docs/screenshots/11-income.png) | ![The step-by-step tax working](docs/screenshots/16-income-tax-working.png) |
| *Income dashboard: tax year, age group and expenses controls, four headline figures, monthly chart and the split of income* | *"How your tax was worked out": each bracket, the rebate and the estimated tax* |

### 16.3 Admin, access control and our own security features

| | |
|---|---|
| ![Admin overview and user list](docs/screenshots/12-admin.png) | ![A client blocked from a freelancer page](docs/screenshots/13-forbidden.png) |
| *Admin overview and user list* | *A client blocked from a freelancer page* |
| ![The message shown when the booking rate limit is reached](docs/screenshots/14-rate-limit.png) | ![Response headers including the Content Security Policy](docs/screenshots/15-csp-headers.png) |
| *The message shown when the booking rate limit is reached* | *Response headers including the Content Security Policy* |
| ![Account locked after repeated wrong passwords (OWN FEATURE 1)](docs/screenshots/17-account-lockout.png) | ![Inactivity warning dialog (OWN FEATURE 3)](docs/screenshots/18-inactivity-warning.png) |
| *OWN FEATURE 1: the account lockout message* | *OWN FEATURE 3: the inactivity warning with its countdown* |

### 16.4 Test evidence

| | |
|---|---|
| ![Backend unit tests](docs/evidence/unit-tests-terminal.png) | ![Newman results](docs/evidence/newman-terminal.png) |
| *Backend unit tests: 30 passed, with coverage* | *Newman: 165 requests and 416 assertions, none failed* |
| ![Vitest results](docs/evidence/vitest-terminal.png) | ![Playwright results](docs/evidence/playwright-results.png) |
| *Vitest: 85 tests in 15 files passed* | *Playwright browser tests against the Docker stack: 9 passed* |

The full Newman HTML report is in [`docs/evidence/newman-report.html`](docs/evidence/newman-report.html).

![Newman HTML report](docs/evidence/newman-report.png)

### 16.5 Pipeline evidence

![A successful pipeline run with every job green](docs/evidence/pipeline-run-success.png)

*A successful run of the CI workflow: every job and the final pipeline gate are green.*

![The pipeline failing on a deliberately broken test](docs/evidence/pipeline-failure-demo.png)

*Proof that the pipeline fails correctly: a test was broken on purpose, the job turned red and the pipeline gate reported failure. The change was reverted afterwards.*

![The Docker job running the whole stack](docs/evidence/pipeline-docker-job.png)

*The `docker-e2e` job: both images are built, Docker Compose starts the database, API and website, and the browser tests run against them.*

### 16.6 Static analysis evidence

| | |
|---|---|
| ![SonarQube quality gate passed](docs/evidence/sonarqube-quality-gate.png) | ![SonarQube overview with security, reliability and maintainability ratings](docs/evidence/sonarqube-overview.png) |
| *SonarQube quality gate result* | *SonarQube overview: security, reliability, maintainability, coverage and duplications* |
| ![ESLint reporting no problems in both applications](docs/evidence/eslint-clean.png) | ![SonarQube issue list after the fixes](docs/evidence/sonarqube-issues.png) |
| *ESLint with the security rules: no problems in the API or the web app* | *SonarQube issues and their status* |

### 16.7 Docker evidence

| | |
|---|---|
| ![docker compose ps showing three healthy containers](docs/evidence/docker-compose-ps.png) | ![The built Docker images](docs/evidence/docker-images.png) |
| *`docker compose ps`: mongo, api and web are all healthy* | *The two images built from the Dockerfiles* |

### 16.8 Cloud logging evidence (Grafana Cloud)

![The Grafana Cloud dashboard](docs/evidence/grafana-dashboard.png)

*The "HustleHub+ - Security and Activity" dashboard in Grafana Cloud, fed by the running application.*

| | |
|---|---|
| ![Login events in Grafana Explore](docs/evidence/grafana-login-events.png) | ![Booking and transaction events in Grafana Explore](docs/evidence/grafana-booking-transaction-events.png) |
| *Login successes and failures (`auth.login.*`)* | *Booking and transaction events* |
| ![Error and security events in Grafana Explore](docs/evidence/grafana-security-errors.png) | ![Event counts by type](docs/evidence/grafana-event-counts.png) |
| *Security events and errors, including lockouts and rate limits* | *Event counts by type* |

---

## 17. Attribution and Use of AI Assistance

**Our own work.** The design and the code of HustleHub+ are the team's own work, built on the libraries and sources below. The tax engine, logging system, Loki sender, account lockout, revocable sessions, inactivity sign-out, income dashboard, Docker files, pipeline and tests are original to this project.

**Sources used and how.**

| Source | Used for |
|---|---|
| South African Revenue Service tax tables (SARS n.d.) | The brackets, rebates and thresholds in `config/taxTables.js` (the source is also written in that file) |
| Loki HTTP API documentation (Grafana Labs n.d.) | The JSON payload format and endpoint used by `utils/lokiTransport.js` |
| OWASP Logging Cheat Sheet (OWASP Foundation n.d.) | Which events to log and which data to keep out of logs |
| OWASP Top 10:2021 (OWASP Foundation 2021) | The structure of the security review |
| Express security best practices (Express.js n.d.) | Login throttling, Helmet and dependency checks |
| SonarQube and GitHub Actions documentation (SonarSource n.d.; GitHub n.d.) | The shape of the pipeline and the SonarQube job |
| Docker Compose documentation (Docker Inc. n.d.) | The structure of `docker-compose.yml` |
| Playwright documentation (Playwright n.d.) | The structure of the browser tests |

**Open-source packages (used under their licences):** Express, Mongoose, jsonwebtoken, bcryptjs, helmet, cors, express-rate-limit, express-validator, dotenv, React, React Router, Vite, Vitest, Testing Library, ESLint, eslint-plugin-security, Newman, Playwright, and the Docker images `node`, `mongo` and `nginxinc/nginx-unprivileged`. Their exact versions are in the `package.json` and lock files, and the Trivy and SonarQube tools are used through their official GitHub Actions.

**Use of AI assistance.** Anthropic's Claude was used as a coding and writing assistant during Part 3, for example to draft code, tests, configuration and parts of this document. The team reviewed, ran and tested the results, made the design decisions, set up the accounts and services, and remains responsible for everything submitted. All behaviour described in this README was checked by running the application and its tests.

---

## 18. Reference List

Aqua Security (2026) *trivy-action v0.36.0 release*. Available at: https://github.com/aquasecurity/trivy-action/releases/tag/v0.36.0 (Accessed 7 November 2026).

Docker Inc. (n.d.) *Docker Compose*. Available at: https://docs.docker.com/compose/ (Accessed 7 November 2026).

Express.js (n.d.) *Production best practices: security*. Available at: https://expressjs.com/en/advanced/best-practice-security/ (Accessed 7 November 2026).

Express.js (2026) *October 2026 security releases*. Available at: https://expressjs.com/en/blog/2026-10-31-security-releases/ (Accessed 7 November 2026).

GitHub (n.d.) *Understanding GitHub Actions*. Available at: https://docs.github.com/en/actions/get-started/understand-github-actions (Accessed 7 November 2026).

Grafana Labs (n.d.) *Loki HTTP API*. Available at: https://grafana.com/docs/loki/next/reference/loki-http-api/ (Accessed 7 November 2026).

OWASP Foundation (2021) *OWASP Top 10:2021*. Available at: https://top10.owasp.org/2021/A00_2021_Introduction/index.html (Accessed 7 November 2026).

OWASP Foundation (n.d.) *Logging Cheat Sheet*. Available at: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html (Accessed 7 November 2026).

Playwright (n.d.) *Installation*. Available at: https://playwright.dev/docs/intro (Accessed 7 November 2026).

SARS (n.d.) *Rates of tax for individuals*. Available at: https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/ (Accessed 7 November 2026).

SonarSource (n.d.) *Adding analysis to GitHub Actions workflow*. Available at: https://docs.sonarsource.com/sonarqube/latest/devops-platform-integration/github-integration/adding-analysis-to-github-actions-workflow (Accessed 7 November 2026).
