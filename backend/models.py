"""Pydantic request/response models for the Shelf API."""

from enum import Enum

from pydantic import BaseModel, Field, field_validator


class Status(str, Enum):
    want_to_read = "want_to_read"
    reading = "reading"
    finished = "finished"


class BookCreate(BaseModel):
    title: str = Field(..., description="The book title. Required.")
    author: str = Field(default="", description="The author. Optional.")

    @field_validator("title", "author")
    @classmethod
    def strip_whitespace(cls, value: str) -> str:
        return value.strip()

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str) -> str:
        if not value:
            raise ValueError("Title cannot be empty.")
        return value


class BookUpdate(BaseModel):
    title: str | None = None
    author: str | None = None
    status: Status | None = None
    rating: int | None = Field(default=None, ge=0, le=5)
    notes: str | None = None

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("Title cannot be empty.")
        return value.strip() if value is not None else value


class Book(BaseModel):
    id: int
    title: str
    author: str
    status: Status
    rating: int
    notes: str
    spine_color: str
    created_at: str
