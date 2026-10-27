# CodeBuddy

CodeBuddy is an AI programming tutor for beginners. It helps students understand programming concepts, work out why their code doesn't behave as expected, and practise with small exercises. It explains things the way a patient teacher would: in plain language, at the learner's level, and with the reasoning behind each answer.

It started as a final school project, *„Mākslīgā intelekta programmēšanas asistents iesācējiem”* (AI programming assistant for beginners), and is built with Next.js and Anthropic's Claude models.

## Features

CodeBuddy has three modes. **Learn and Debug are connected to Claude. Practice checks answers locally, without AI.**

### Learn: understand a concept (AI-powered)

- Ask a question about any programming idea (10–2,000 characters), or start from one of six example topics: variables, if statements, loops, functions, lists and recursion.
- Choose your level (*Beginner*, *Basics* or *Comfortable*). The explanation and vocabulary adapt to it.
- The answer contains:
  - a plain-language explanation;
  - an optional short code example, with a Copy button;
  - key points to remember;
  - follow-up questions to explore next.

### Debug: fix an error (AI-powered)

- Choose a language: Python, JavaScript, Java, C++, C# or Other.
- Paste your code (up to 10,000 characters) and describe the problem (10–4,000 characters). That can be the full error message, or what you expected to happen and what happened instead.
- "Load an example" fills in a sample bug to try.
- The answer contains:
  - a **diagnosis** of the likely problem;
  - a beginner-friendly **explanation** that refers to your code;
  - **what's certain** (facts visible in your code or error), kept separate from **possible causes that aren't confirmed**;
  - **corrected code**, when there's enough information, with a Copy button that keeps indentation and line breaks exactly;
  - **changes explained**: each change and the reason for it;
  - **next steps** for checking the fix or learning the concept.
- If the code and description aren't enough, CodeBuddy says so. It lists the missing information instead of guessing, and offers no corrected code.
- Failed requests offer **Try again**, and **Start a new debug session** clears the form after an answer.
- Your code is **never run or compiled**. CodeBuddy only reads and analyses it.

### Practice: solve an exercise (checked locally)

- Four built-in beginner exercises:

  | Exercise | Language | Difficulty | Hints |
  |---|---|---|---|
  | Say hello | Python | Easy | 2 |
  | Add up a list | Python | Easy | 3 |
  | FizzBuzz | JavaScript | Medium | 3 |
  | Count the vowels | Python | Medium | 3 |

- Each exercise has a description, a requirements checklist, starter code, and hints you can open one at a time. A counter shows how many hints you've used.
- You write your solution in a code editor with line numbers. It's pre-filled with the starter code, and "Reset to starter code" restores it.
- **Drafts are kept separately for each exercise.** Switching exercises doesn't lose your work. If you're signed in, your drafts, the hints you've opened and the exercises you've solved are saved to your account (a moment after you stop typing) and come back on your next visit. Solved exercises get a ✓ in the list. Without an account, drafts last only while the page is open.
- **Check answer** checks your solution in the browser and shows:
  - a verdict: *Correct*, *Partly correct*, *Not correct yet*, or *Checks passed, run it to confirm*;
  - each requirement, marked as passed, not met or not checked, with what CodeBuddy found;
  - test cases with the expected result and, where it can be worked out, what your code gives (for example `total([]) → 1`, expected `0`);
  - one hint for what to fix next, without giving away the solution.
- **Your code is never run.** It isn't sent to a server or to the AI either. CodeBuddy reads the code as text (`src/lib/practice/`). For each exercise it recognises a few common ways of writing the solution, such as a running-total loop, an `if / else if` chain or an f-string. For those it works out the test results exactly. Code written another way still gets the requirement checks, but the verdict says it can't be confirmed without running it. It is never marked correct on a guess.
- **Limitation:** solutions outside the recognised shapes (for example `while` loops, recursion, `str.count`, or FizzBuzz built up as a string) can't be fully verified. Run them yourself and compare with the expected values shown.

### History and daily allowance

- Every Learn and Debug answer is saved to your **History** (`/history`) for 90 days. You can reopen an answer, delete one, or clear everything.
- Each student can ask **20 Learn or Debug questions in any 24 hours**. After an answer, CodeBuddy shows how many are left. Deleting history doesn't give questions back.

### Across the app

- A responsive layout: a sidebar on larger screens, and a bottom tab bar on phones.
- Light and dark themes that follow your system setting.
- Labelled form fields with inline validation messages, and a skip link to the main content.

## Technology stack

| Area | Technology (version from `package.json`) |
|---|---|
| Framework | [Next.js](https://nextjs.org) `16.4.3` (App Router, Turbopack) |
| UI | [React](https://react.dev) `19.3.0` |
| Language | [TypeScript](https://www.typescriptlang.org) `^5` (strict mode) |
| Styling | [Tailwind CSS](https://tailwindcss.com) `^4` via `@tailwindcss/turbopack` |
| AI | [`@anthropic-ai/sdk`](https://www.npmjs.com/package/@anthropic-ai/sdk) `1.3.0` (Claude Messages API with structured JSON output) |
| Tests | [Vitest](https://vitest.dev) `4.1.12` |
| Linting | ESLint `^9` with `eslint-config-next` `16.4.3` |
| Fonts | Geist, Geist Mono and Fraunces through `next/font` |

## Prerequisites

- **Node.js 22 or newer.** Next.js 16 itself runs on Node 20.9+, but Node 20 has reached end-of-life and `@supabase/supabase-js` warns that it will drop Node 20 support. Use a current LTS release (Node 22 or 24).
- **npm.** The repository includes a `package-lock.json`.
- **An Anthropic API key** from the [Claude Console](https://platform.claude.com), for the AI features. Requests to Claude are billed to your Anthropic account. Without a key, the app still runs, but Learn and Debug report that the tutor isn't set up.
- **A Supabase project** from [supabase.com](https://supabase.com), for sign-in. The free plan is enough. Choose an EU region (for example Frankfurt) if your users are in the EU.

## Getting started

```bash
git clone https://github.com/5ee5/codebuddy.git
cd codebuddy
npm install
cp .env.example .env.local
```

Open `.env.local` and replace the placeholder values (see [Environment variables](#environment-variables)).

### Set up sign-in (Supabase)

Learn and Debug are only for signed-in users. Students create their own account at `/signup` with a **class code** you give them, or you create accounts yourself in Supabase.

1. In your Supabase project, open **Project Settings → API**. Copy the **Project URL** into `SUPABASE_URL` and the **publishable key** (called the `anon` key in older projects) into `SUPABASE_PUBLISHABLE_KEY`.
2. Open **Authentication → Sign In / Providers**. Turn off **Allow new users to sign up**, and leave the **Email** provider on.
3. To let students sign up themselves, copy the **secret key** (**Project Settings → API Keys**) into `SUPABASE_SECRET_KEY`, and choose a class code of at least 8 characters for `CODEBUDDY_SIGNUP_CODE`. Share the code with your class. To change it, edit `.env.local` and restart the server.
4. To create an account yourself instead, open **Authentication → Users → Add user → Create new user**. Enter the learner's email and a starting password, tick **Auto Confirm User**, and give them the password. They can change it on the **Account** page after signing in.

5. Optional, **Sign in with GitHub**. Students who connect GitHub on their Account page can then sign in with it. New students still need the class code first. To switch it on:
   1. On GitHub, go to **Settings → Developer settings → OAuth Apps → New OAuth App**. Use your site's address as the homepage URL, and `https://<your-project-ref>.supabase.co/auth/v1/callback` as the callback URL. Create a client secret.
   2. In Supabase, open **Authentication → Sign In / Providers → GitHub**, switch it on and paste the Client ID and secret.
   3. In the same place, turn on **Allow manual linking**, so students can connect GitHub to their existing account.
   4. Open **Authentication → URL Configuration** and add `https://<your-site>/**` (and `http://localhost:3000/**` for development) to **Redirect URLs**. The `**` matters: CodeBuddy's return address includes `?next=…`, and without the wildcard Supabase rejects it and sends people to the Site URL instead. Supabase ignores entries with a plain IP address (such as `http://192.168.1.10:3000/**`), so test GitHub sign-in through `localhost` or your real domain, not a LAN address.

   The GitHub buttons appear by themselves once the provider is on (CodeBuddy checks every few minutes).

Keep public sign-up switched off in Supabase (step 2). CodeBuddy creates sign-up accounts itself with the secret key, and only when the class code is right, so the code can't be skipped by calling Supabase directly.

### Set up emails (optional)

With emails set up, new students must confirm their email address before their account works, and "Forgot your password?" sends a reset link. Without them, accounts are created already confirmed and no email is ever sent.

CodeBuddy sends these emails itself through [Resend](https://resend.com), so Supabase's own email settings and templates aren't used.

1. Create a free Resend account. Under **Domains**, add your domain and copy the DNS records it shows (DKIM and SPF on a `send.` subdomain) into your DNS provider, for example Cloudflare. Wait until Resend shows the domain as **Verified**.
2. Under **API Keys**, create a key with **Sending access**. Put it in `RESEND_API_KEY`.
3. Set `EMAIL_FROM` to a sender on that domain, such as `CodeBuddy <noreply@your-domain>`, and `CODEBUDDY_SITE_URL` to the site's public address, such as `https://codebuddy.example`.
4. Restart the server. `SUPABASE_SECRET_KEY` must be set too: CodeBuddy uses it to create the one-time links.

Email links open `/auth/confirm`, which asks for one click before using the link. School mail systems often open links automatically to scan them, and that would otherwise use up the one-time link. Links always point to `CODEBUDDY_SITE_URL`, never to an address taken from the request, so a forged `Host` header can't redirect someone's reset link.

### Create the database tables

History, the daily allowance and Practice progress are stored in your Supabase database. The SQL is in `supabase/migrations/`. Run each file once, in order:

1. In Supabase, open **SQL Editor → New query**.
2. Paste `20261026130000_ai_requests_and_practice_progress.sql` and click **Run**.
3. Paste `20261026130100_delete_old_ai_requests.sql` and click **Run**. It schedules the nightly deletion of history older than 90 days. If it fails with a permissions error, enable **pg_cron** under **Database → Extensions** and run it again.

(With the [Supabase CLI](https://supabase.com/docs/guides/cli), `supabase link` and then `supabase db push` does the same.)

**Run the SQL before you start the new version of the app.** Learn and Debug check each student's allowance in the database, and if the tables don't exist they refuse to call Claude.

### Run it

Start the development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000). If port 3000 is in use, the terminal shows the address Next.js picked instead. Restart the dev server after you change `.env.local`.

`.env.local` is ignored by Git and must never be committed.

## Environment variables

The first four variables are **server-only and required** for Learn and Debug; the others are optional. Never prefix them with `NEXT_PUBLIC_`, because that would expose them to the browser. (The Supabase key is designed to be public, but CodeBuddy never needs it in the browser, so it stays on the server too.)

| Variable | Required | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key. It's used only on the server to call Claude. |
| `ANTHROPIC_MODEL` | Yes | The Claude model ID used by Learn and Debug. There is no built-in default. `.env.example` suggests `claude-sonnet-5-5`; see Anthropic's [models overview](https://platform.claude.com/docs/en/about-claude/models/overview) for current IDs. |
| `SUPABASE_URL` | Yes | Your Supabase project URL, for example `https://abcdefgh.supabase.co`. |
| `SUPABASE_PUBLISHABLE_KEY` | Yes | Your Supabase project's publishable (`anon`) key. Never use the secret `service_role` key here. |
| `RESEND_API_KEY` | No | Resend API key for sign-up confirmation and password-reset emails. Needs `EMAIL_FROM` and `CODEBUDDY_SITE_URL` too. |
| `EMAIL_FROM` | No | The sender of those emails, e.g. `CodeBuddy <noreply@your-domain>`; the domain must be verified in Resend. |
| `CODEBUDDY_SITE_URL` | No | The public address used in email links, e.g. `https://codebuddy.example` (no path). |
| `DEV_ORIGINS` | No | Development only: other hostnames allowed to open `npm run dev`, such as your LAN address (`192.168.1.10`), comma-separated, without `http://` or a port. |
| `CODEBUDDY_SIGNUP_CODE` | No | The class code students enter at `/signup`, at least 8 characters. Without it (or with `SUPABASE_SECRET_KEY` missing), sign-up is closed. |
| `SUPABASE_SECRET_KEY` | No | Your Supabase project's **secret** key (`sb_secret_…`, or the legacy `service_role` key). It's used only to create accounts at sign-up and to let students delete their own account. Without it, both say they aren't set up. It bypasses every access rule, so keep it in `.env.local` only. |

```bash
# .env.local (placeholders only)
ANTHROPIC_API_KEY=your-anthropic-api-key
ANTHROPIC_MODEL=claude-sonnet-5-5
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
SUPABASE_SECRET_KEY=your-supabase-secret-key   # optional, for sign-up and account deletion
CODEBUDDY_SIGNUP_CODE=your-class-code           # optional, opens /signup
RESEND_API_KEY=your-resend-api-key              # optional, with the next two: emails
EMAIL_FROM=CodeBuddy <noreply@your-domain>
CODEBUDDY_SITE_URL=https://codebuddy.example
```

If any variable is missing, the pages still load. Learn and Debug then answer with a "not set up" message instead of calling Claude, and signing in says it isn't set up.

## Available routes

### Pages

| Route | Description |
|---|---|
| `/` | Home page: an introduction, the three modes and what's currently live |
| `/learn` | Learn mode (AI-powered) |
| `/debug` | Debug mode (AI-powered) |
| `/practice` | Practice mode (answers checked locally, not connected to the AI) |
| `/login` | Sign in with email and password |
| `/signup` | Create an account with the class code |
| `/auth/callback` | Where GitHub sign-in and "Connect GitHub" return to |
| `/account` | Shows who is signed in; connect GitHub, change password, sign out, delete the account |
| `/history` | Your saved Learn and Debug answers from the last 90 days |
| `/history/<id>` | One saved answer |
| `/privacy` | What is stored, who processes it, for how long, and how to delete it |
| `/goodbye` | Shown after an account is deleted |
| `/forgot-password` | Request a password-reset email |
| `/auth/confirm` | Where links in emails open; asks for one click before using the link |
| `/reset-password` | Choose a new password after a reset link |

`/learn`, `/debug`, `/account` and `/history` need a signed-in user. Visitors who aren't signed in are sent to `/login` and brought back afterwards. Home and Practice are open to everyone.

Unknown paths show a custom "page not found" page.

### API endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/learn` | Answers a Learn question |
| `POST /api/debug` | Diagnoses a Debug submission |

Both endpoints:
- accept JSON only;
- accept requests from the app's own pages only, not from other websites;
- require a signed-in user. The session is a cookie that the browser sends automatically, and the server verifies it with Supabase.

Responses are JSON, either an answer or an error with a short, user-friendly message. If something fails, the error message never includes provider details, stack traces or secrets. There is no API endpoint for Practice.

## Development and quality checks

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Type-check the project (there's no separate npm script for this) |
| `npm test` | Run the Vitest test suite once |
| `npx vitest` | Run Vitest in watch mode |
| `npm run build` | Create a production build |
| `npm start` | Serve the production build (run `npm run build` first) |

The tests run in Node and replace the Anthropic client with a mock. **They don't need an API key and never spend credits.** They cover:
- request and response validation;
- the API routes' security checks and error handling;
- the browser client;
- the daily allowance and history in the API routes (with the database faked);
- Practice progress checks, and that the database's exercise list and limit match the code;
- code formatting and copying;
- the answer views and the Debug session state.

## Architecture overview

```
src/
├── app/                  Pages (App Router) and API route handlers
│   ├── api/learn/        POST /api/learn
│   ├── api/debug/        POST /api/debug
│   ├── learn/ debug/ practice/   Mode pages
│   ├── login/ account/   Sign-in and account pages
│   ├── history/          Saved Learn and Debug answers
│   └── page.tsx, layout.tsx, not-found.tsx, globals.css
├── proxy.ts              Refreshes the sign-in session; sends signed-out visitors to /login
├── components/           UI: app shell, navigation, mode workspaces, answer views
│   ├── auth/             Sign-in and password forms, the user menu
│   ├── workspace/        Learn, Debug and Practice forms (client components)
│   └── ui/               Reusable pieces: code editor, code block, copy button, fields
├── lib/
│   ├── assistant/        Shared request/response types, validation and the browser client
│   ├── auth/             Supabase sign-in: session helpers, Server Actions, protected paths
│   ├── db/               Database access: daily allowance, history, Practice progress, table types
│   ├── server/           Server-only code: configuration, request checks, usage cap, Claude calls, prompts
│   ├── practice/         Practice answer checker: reads code as text, never runs it
│   ├── modes.ts          The three modes (labels, descriptions, sections)
│   ├── exercises.ts      Practice exercises
│   └── languages.ts      Supported programming languages
└── test/                 Small helpers for the test suite
supabase/
└── migrations/           SQL for the database tables, access rules and functions
```

- **Browser:** each workspace validates input with the same rules the server uses, then sends the request to its API route. Answers are checked against the expected format again before they're shown.
- **Server:** each API route checks, in order:
  1. that the request comes from the app itself;
  2. the request type and size;
  3. that the server configuration is complete;
  4. that a user is signed in;
  5. the request fields;
  6. a shared usage cap;
  7. the student's daily allowance, in the database.

  Only then does it call Claude. The answer is then saved to the student's history. The model's reply must match a strict JSON format, and anything that doesn't match is rejected instead of shown.
- **Sign-in:** pages use Server Actions to sign in, sign out and change passwords, so the browser never talks to Supabase directly. `src/proxy.ts` refreshes the session on each request and redirects signed-out visitors away from protected pages. That's only for navigation: the API routes check the user again before any paid call.
- **Database:** tables for Learn and Debug requests (`ai_requests`) and Practice progress (`practice_progress`). Row-level security lets each student see only their own rows. Students can't write `ai_requests` directly: the functions `claim_ai_request`, `record_ai_answer` and `clear_ai_history` do, so the daily limit can't be bypassed or reset. CodeBuddy talks to the database as the signed-in student, never with an admin key.
- **Server-only boundary:** the Anthropic and Supabase settings are read only in `src/lib/server/` and `src/lib/auth/`, whose modules are marked `server-only`. They never reach the browser bundle.

## Security and limitations

- **AI answers can be wrong.** Treat explanations and corrected code as suggestions. Read them, run the code yourself, and check the result.
- **Code is never executed.** CodeBuddy sends Debug code to Claude for analysis only, and Practice answers are checked by reading them in the browser. Nothing is run or compiled, and the app says so in Debug answers and Practice results.
- **Submitted text goes to Anthropic.** Learn questions and Debug code and descriptions are sent to the Anthropic API for processing. Don't paste secrets or private data into the forms.
- **API key:** it's kept on the server and is never sent to the browser, logged or returned in responses.
- **Accounts:** sign-in uses Supabase Auth with email and password. Accounts come from sign-up with the class code, or are created by you in Supabase.
  - Sign-up allows about 10 wrong class codes per network address per hour, and 60 new accounts per hour in total. Both limits are kept in memory and reset when the server restarts.
  - With emails set up, new accounts only work once the email address is confirmed. Without them, addresses aren't verified: a student who mistypes theirs can still sign in with it, but nothing is ever sent to it.
  - "Forgot your password?" and "Send it again" give the same reply whether or not the account exists, and allow 20 requests per network address per hour.
  - GitHub sign-in only works for GitHub accounts already connected to a CodeBuddy account (or with the same email). Because public sign-up is off, Supabase refuses to create new accounts through GitHub, so the class code can't be skipped that way.
  - The session cookie is `httpOnly` and `SameSite=Lax`, so page scripts can't read it and other websites can't use it to send requests. The API routes also reject requests from other origins.
  - Over plain HTTP, for example on a local network, passwords and session cookies can be read from network traffic. Serve the app over HTTPS.
- **Usage cap:** each student can ask 20 questions in any 24 hours (enforced in the database). On top of that, the server allows a limited number of AI requests per hour and at the same time, shared by all users.
  - The cap is kept in memory, so it resets when the server restarts and isn't shared between multiple server instances.
  - Requests are never retried automatically, to avoid unexpected charges.
- **Stored data:** Learn questions, Debug code and descriptions, and the answers are stored in Supabase for 90 days. Practice drafts and progress are kept until the account is deleted. The `/privacy` page explains this to students; keep it in step with the code.
- **Account deletion:** students can delete their own account on the Account page after entering their password again. It removes the account, history and Practice progress at once. The Supabase secret key is used only in `src/lib/auth/admin.ts`, for this and for sign-up.
- **Not production-ready.** The app hasn't been reviewed for public deployment.

## Project status and future work

**Current state:**
- Learn and Debug are fully working with Claude.
- Practice offers exercises, hints and an editor, and checks answers locally with requirement checks and test cases. It gives no AI feedback.
- Learn and Debug need a signed-in user. Students sign up with a class code, or you create accounts in Supabase.
- Signed-in students get a 90-day history of Learn and Debug answers, a daily allowance of 20 questions, and saved Practice progress.

**Known limitations and possible improvements** (planned or under consideration, not implemented):
- Full verification for every Practice solution. This would need a real sandbox, such as Pyodide or a JavaScript interpreter in an isolated worker or iframe with time limits and no network access, or an isolated server-side runner.
- AI feedback for Practice solutions. The response format is already defined in the code, but nothing produces it yet.
- A "download my data" button (for now, students ask by email, as the privacy page says).
- A teacher view of students' progress.
- Streaming AI answers, so long Debug answers appear progressively instead of after a wait.
