"""Shelf — a personal reading tracker.

FastAPI application: serves the JSON API under /api and the static frontend
at the root.
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import database
from .models import Book, BookCreate, BookUpdate

FRONTEND_DIR = Path(__file__).parent.parent / "frontend"


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.init_db()
    yield


app = FastAPI(
    title="Shelf",
    description="A personal reading tracker.",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------

@app.get("/api/books", response_model=list[Book])
def get_books(status: str | None = None):
    """Return every book, newest last. Optionally filter by status."""
    if status is not None and status not in database.VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Unknown status filter.")
    return database.list_books(status)


@app.get("/api/books/{book_id}", response_model=Book)
def get_single_book(book_id: int):
    book = database.get_book(book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found.")
    return book


@app.post("/api/books", response_model=Book, status_code=201)
def add_book(payload: BookCreate):
    return database.create_book(title=payload.title, author=payload.author)


@app.patch("/api/books/{book_id}", response_model=Book)
def edit_book(book_id: int, payload: BookUpdate):
    fields = payload.model_dump(exclude_unset=True)
    if "status" in fields and fields["status"] is not None:
        fields["status"] = fields["status"].value
    updated = database.update_book(book_id, fields)
    if updated is None:
        raise HTTPException(status_code=404, detail="Book not found.")
    return updated


@app.delete("/api/books/{book_id}", status_code=204)
def remove_book(book_id: int):
    if not database.delete_book(book_id):
        raise HTTPException(status_code=404, detail="Book not found.")
    return None


# ---------------------------------------------------------------------------
# Frontend
# ---------------------------------------------------------------------------

@app.get("/")
def index():
    return FileResponse(FRONTEND_DIR / "index.html")


# Serve everything else (style.css, app.js, icons) as static assets.
# Mounted last so the API routes above take priority.
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
