"""SQLite data access for Shelf.

The database lives next to this file by default, but the path can be
overridden with the SHELF_DB environment variable so the test suite can run
against a throwaway database.
"""

import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_DB_PATH = Path(__file__).parent / "shelf.db"

# Curated spine colors. Book covers are colorful, so the shelf gets its variety
# here. New books rotate through the palette to keep neighboring spines distinct.
SPINE_COLORS = [
    "#B0503C",  # brick
    "#C8992E",  # mustard
    "#2E7D6F",  # teal
    "#3A4A6B",  # navy
    "#6C4A6E",  # plum
    "#5A6B4A",  # olive
    "#A85A4A",  # clay
    "#417B9C",  # steel blue
]

VALID_STATUSES = ("want_to_read", "reading", "finished")


def _db_path() -> str:
    return os.environ.get("SHELF_DB", str(DEFAULT_DB_PATH))


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(_db_path())
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS books (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                title       TEXT    NOT NULL,
                author      TEXT    NOT NULL DEFAULT '',
                status      TEXT    NOT NULL DEFAULT 'want_to_read',
                rating      INTEGER NOT NULL DEFAULT 0,
                notes       TEXT    NOT NULL DEFAULT '',
                spine_color TEXT    NOT NULL,
                created_at  TEXT    NOT NULL
            )
            """
        )
        conn.commit()


def _row_to_dict(row: sqlite3.Row) -> dict:
    return {key: row[key] for key in row.keys()}


def list_books(status: str | None = None) -> list[dict]:
    query = "SELECT * FROM books"
    params: tuple = ()
    if status:
        query += " WHERE status = ?"
        params = (status,)
    query += " ORDER BY created_at ASC, id ASC"
    with get_connection() as conn:
        rows = conn.execute(query, params).fetchall()
    return [_row_to_dict(row) for row in rows]


def get_book(book_id: int) -> dict | None:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM books WHERE id = ?", (book_id,)).fetchone()
    return _row_to_dict(row) if row else None


def _next_spine_color(conn: sqlite3.Connection) -> str:
    count = conn.execute("SELECT COUNT(*) FROM books").fetchone()[0]
    return SPINE_COLORS[count % len(SPINE_COLORS)]


def create_book(title: str, author: str = "", status: str = "want_to_read",
                rating: int = 0, notes: str = "") -> dict:
    created_at = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        spine_color = _next_spine_color(conn)
        cursor = conn.execute(
            """
            INSERT INTO books (title, author, status, rating, notes, spine_color, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (title, author, status, rating, notes, spine_color, created_at),
        )
        conn.commit()
        book_id = cursor.lastrowid
    return get_book(book_id)


def update_book(book_id: int, fields: dict) -> dict | None:
    allowed = {"title", "author", "status", "rating", "notes"}
    updates = {key: value for key, value in fields.items()
               if key in allowed and value is not None}
    if not updates:
        return get_book(book_id)

    assignments = ", ".join(f"{key} = ?" for key in updates)
    params = list(updates.values()) + [book_id]
    with get_connection() as conn:
        cursor = conn.execute(
            f"UPDATE books SET {assignments} WHERE id = ?", params
        )
        conn.commit()
        if cursor.rowcount == 0:
            return None
    return get_book(book_id)


def delete_book(book_id: int) -> bool:
    with get_connection() as conn:
        cursor = conn.execute("DELETE FROM books WHERE id = ?", (book_id,))
        conn.commit()
        return cursor.rowcount > 0
