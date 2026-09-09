# Shelf — Product Lifecycle Plan

A personal reading tracker. This document walks the product through its full
lifecycle, from the problem it solves to an AI review of the plan.

---

## Step 1. Problem

**The problem.** Readers lose track of their own reading. Books get started and
abandoned, "I'll read that next" turns into a vague mental list, and by the end
of the year it's hard to remember what was actually finished. The information
exists only in someone's head, so nothing can be seen at a glance.

**Who has it.** People who read more than a couple of books a year and want to
stay on top of it: students with reading lists, hobby readers juggling several
books at once, and anyone who keeps a "to read" pile that never shrinks.

**Why it matters.** Reading is a habit, and habits stick when progress is
visible. A reader who can see three books in progress and twelve finished is
more likely to keep going than one staring at an invisible, shapeless list.
Existing options are either too heavy (full social networks like Goodreads) or
too loose (a note in your phone). There's room for something small and personal.

---

## Step 2. Idea

**Name.** Shelf.

**Short description.** A single-page web app that shows your books as colored
spines standing on a wooden shelf. You add a book, move it between "Want to
read", "Reading", and "Finished", rate it, and jot a note — and your whole
reading life is visible in one view.

**Core benefit for the user.** Your reading, seen at a glance. Instead of a
hidden list, you get a shelf you actually recognize: the book you're reading has
a bookmark ribbon, the ones you've finished carry a small check, and the counts
at the top tell you where things stand.

---

## Step 3. MVP

**Core functions (the first version):**

1. **Add a book** — title and optional author.
2. **See the shelf** — every book as a spine, with a filter for All / Reading /
   Finished / Want to read.
3. **Change reading status** — move a book between Want to read → Reading →
   Finished.
4. **Rate a book** — one to five stars.
5. **Remove a book** — take it off the shelf.

**Deliberately NOT in the first version:**

- User accounts, log-in, or syncing across devices.
- Fetching covers and metadata automatically from an online book database.
- Reading progress by page number, and reading goals or yearly stats.
- Tags, genres, or multiple named shelves/collections.
- Social features: sharing, following, or recommendations.
- Import/export and search across a large library.

---

## Step 4. Design

**Pages / views.** Shelf is a single page. Its regions are:

- **App bar** — the Shelf name and mark, plus the "Add book" button.
- **Overview strip** — plain counts (total, reading, finished, to read) and the
  status filter.
- **The shelf** — the hero. Books stand as spines on a walnut plank; more rows
  wrap below, each with its own ledge.
- **Detail drawer** — slides in from the right when a spine is clicked: title,
  author, status control, star rating, notes, and a "Remove from shelf" button.
- **Add dialog** — a small modal with title and author fields.
- **Empty state** — an invitation to add the first book when the shelf is bare.

**Main elements on each region.** Buttons and controls are labeled in plain
language ("Add book", "Remove from shelf", "Want to read / Reading / Finished").
Every icon is a hand-drawn SVG (book, plus, bookmark, star, trash, check, close)
— no emoji. Reading books show a bookmark ribbon; finished books show a check.

**How the user interacts.**

- Click **Add book** → type a title → **Add to shelf**. The spine appears.
- **Click a spine** → the drawer opens. Change status with the segmented
  control, tap stars to rate, type a note (saved when you click away), or
  remove the book.
- **Click a filter** → the shelf narrows to that status.
- Every change is confirmed with a short toast ("Added to your shelf.",
  "Moved to reading.", "Removed from your shelf.").

**Design direction (why it looks the way it does).** The visual concept is
grounded in the subject — actual book spines on a shelf — rather than a generic
card grid. The palette is a calm "reading room": a sage-grey wall, a walnut
shelf, warm ink text, and eight varied spine colors that give the shelf its
life. Type pairs Fraunces (a soft, bookish serif) for display with Work Sans for
the interface. Motion is restrained: the spines rise onto the shelf once on
load, and the drawer slides in when you open a book — nothing animates for its
own sake. Reduced-motion, keyboard focus, and mobile layout are all handled.

---

## Step 5. Technology

- **Frontend:** HTML + CSS + vanilla JavaScript (no framework). Custom inline
  SVG icons. Google Fonts (Fraunces, Work Sans).
- **Backend:** Python + FastAPI, serving a small REST API and the static
  frontend.
- **Database:** SQLite (a single file, no server to run).
- **Testing:** pytest with FastAPI's TestClient.
- **Runtime:** Uvicorn (ASGI server), all inside a local virtual environment.

---

## Step 6. Development

The MVP was built in these stages:

1. **Database** — SQLite schema for a `books` table and a small data-access
   layer (`backend/database.py`).
2. **Models** — Pydantic request/response models with validation
   (`backend/models.py`).
3. **Backend + API** — FastAPI app exposing the endpoints (`backend/main.py`):
   - `GET /api/books` — list, with optional `?status=` filter (**display**).
   - `POST /api/books` — **add** a book.
   - `PATCH /api/books/{id}` — **change status**, rating, or notes.
   - `DELETE /api/books/{id}` — **remove** a book.
   - `GET /api/books/{id}` — read a single book (used for error handling).
4. **Frontend** — the shelf, drawer, add dialog, filters, and toasts
   (`frontend/`), talking to the API with `fetch`.
5. **Feature wiring** — add, display, status change, rating, delete.
6. **Setup launcher** — `setup.bat` to install and run on localhost with one
   double-click.

---

## Step 7. Testing

The test suite lives in `tests/test_api.py` (run with `pytest`). It covers the
required scenarios and more — **12 tests, all passing**:

1. **Add a valid book** → returns 201, appears on the shelf with a spine color.
2. **Add an empty book** (blank title) → rejected with 422; nothing is added.
3. **Add with no title field at all** → rejected with 422.
4. **Change status** → PATCH sets the book to "reading".
5. **Act on a book that doesn't exist** → GET / PATCH / DELETE on a bad id all
   return 404.
6. Delete a book → returns 204 and the shelf is empty again.
7. Set a valid rating (4 stars) → accepted.
8. Set an out-of-range rating (9) → rejected with 422.
9. Titles and authors are trimmed of surrounding whitespace.
10. Filter the shelf by status → only matching books are returned.
11. An unknown status filter → rejected with 400.
12. A fresh shelf starts empty.

---

## Step 8. Feedback

Imagining five people used Shelf for a week:

**Three problems they might find:**

1. **No cover images.** A wall of colored spines is charming, but people
   recognize their books by the cover — without one it takes a second to find a
   specific title.
2. **Data lives in one browser.** Because there's no account, the shelf doesn't
   follow you to your phone or a second computer.
3. **Long titles get cut on the spine.** A narrow spine truncates a long title,
   so two similarly-named books can look alike until you open them.

**Three improvements they might suggest:**

1. **Search books online while adding** — type a title, pick the right edition,
   and pull in the author and cover automatically.
2. **Reading progress** — track the current page and show a small progress bar
   on books you're reading.
3. **A yearly summary** — "You finished 24 books this year" with a simple
   breakdown, to make the habit feel rewarding.

---

## Step 9. AI — analysis of the plan

An AI review of the plan above:

**Strengths.**
- The scope is honestly small. The MVP list is five real actions, and the
  "not in the first version" list is specific rather than aspirational — a
  common failure of student projects is smuggling half the roadmap into v1.
- The problem and audience are concrete, and the design is grounded in the
  subject (real spines on a shelf) instead of a generic dashboard, which gives
  the product a memorable identity.
- The technology matches the scope: SQLite and a single FastAPI process are the
  right weight for a personal, single-user tool — no premature infrastructure.

**Risks and gaps.**
- **Single-user, single-browser** is the biggest limitation. It's the correct
  MVP call, but the moment a user likes the app they'll want it on their phone,
  so accounts + sync is the most likely "version 2" and should be designed for
  early (the data model is already clean enough to add a `user_id`).
- **No cover art** weakens the core "recognize your books at a glance" promise.
  A cheap win is to let the user pick a spine color or add an emoji-free initial,
  ahead of full cover fetching.
- **No confirmation on delete.** Removing a book is one click with no undo; an
  "Undo" on the toast would prevent accidental loss.

**Suggested priorities for the next iteration.**
1. Add an **Undo** to the delete toast (cheap, high value).
2. Add **reading progress** for books in progress (directly serves the habit).
3. Plan **accounts + sync** as the first larger feature, since it unblocks the
   most-wanted improvement.

**Overall.** The plan is coherent end-to-end: the problem justifies the idea,
the MVP is disciplined, the design is distinctive and subject-driven, and the
build is tested. It is a realistic, shippable small product rather than an
over-scoped prototype.
