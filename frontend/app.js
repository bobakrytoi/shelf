/* Shelf — frontend logic. Talks to the API, renders the shelf, and
   drives the drawer, the add modal, and the toasts. */

const API = "/api/books";

const STATUS_LABELS = {
  want_to_read: "Want to read",
  reading: "Reading",
  finished: "Finished",
};

const state = {
  books: [],          // every book, always the full set
  filter: "all",      // current shelf filter
  openId: null,       // book shown in the drawer, if any
};

/* --------------------------- helpers ---------------------------- */

const $ = (sel) => document.querySelector(sel);

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// A spine's size is stable per book: width follows the title length,
// height varies a little so the shelf doesn't look like a fence.
function spineWidth(title) {
  return 34 + Math.min(title.length, 24) * 0.85;
}
function spineHeight(book) {
  return 188 + (hash(book.title + book.id) % 46);
}

async function api(path, options) {
  const res = await fetch(path, options);
  if (res.status === 204) return null;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.detail || "Something went wrong.");
  return body;
}

let toastTimer;
function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2600);
}

/* ---------------------------- render ---------------------------- */

function render() {
  renderStats();
  renderShelf();
}

function renderStats() {
  const by = (s) => state.books.filter((b) => b.status === s).length;
  $("#stat-total").textContent = state.books.length;
  $("#stat-reading").textContent = by("reading");
  $("#stat-finished").textContent = by("finished");
  $("#stat-want").textContent = by("want_to_read");
}

function renderShelf() {
  const shelf = $("#shelf");
  const empty = $("#empty");

  const visible =
    state.filter === "all"
      ? state.books
      : state.books.filter((b) => b.status === state.filter);

  shelf.innerHTML = "";

  if (state.books.length === 0) {
    empty.hidden = false;
    shelf.hidden = true;
    return;
  }
  empty.hidden = true;
  shelf.hidden = false;

  visible.forEach((book, i) => shelf.appendChild(spineEl(book, i)));
}

function spineEl(book, index) {
  const slot = document.createElement("div");
  slot.className = "slot";

  const spine = document.createElement("button");
  spine.type = "button";
  spine.className = "spine";
  if (book.status === "reading") spine.classList.add("is-reading");
  if (book.status === "finished") spine.classList.add("is-finished");

  spine.style.setProperty("--c", book.spine_color);
  spine.style.setProperty("--w", `${spineWidth(book.title)}px`);
  spine.style.setProperty("--h", `${spineHeight(book)}px`);
  spine.style.setProperty("--i", index);

  const authorLine = book.author ? `, by ${book.author}` : "";
  spine.setAttribute(
    "aria-label",
    `${book.title}${authorLine}. ${STATUS_LABELS[book.status]}. Open details.`
  );

  const title = document.createElement("span");
  title.className = "spine-title";
  title.textContent = book.title;
  spine.appendChild(title);

  if (book.author) {
    const author = document.createElement("span");
    author.className = "spine-author";
    author.textContent = book.author;
    spine.appendChild(author);
  }

  if (book.status === "finished") {
    const check = document.createElement("span");
    check.className = "spine-check";
    check.innerHTML = '<svg class="ic"><use href="#i-check"/></svg>';
    spine.appendChild(check);
  }

  spine.addEventListener("click", () => openDrawer(book.id));
  slot.appendChild(spine);
  return slot;
}

/* ---------------------------- drawer ---------------------------- */

let lastFocus = null;

function openDrawer(id) {
  const book = state.books.find((b) => b.id === id);
  if (!book) return;
  state.openId = id;
  lastFocus = document.activeElement;

  $("#d-spine").style.setProperty("--c", book.spine_color);
  $("#d-title").textContent = book.title;
  $("#d-author").textContent = book.author || "Author unknown";

  document.querySelectorAll("#d-status .seg").forEach((seg) => {
    seg.setAttribute("aria-checked", String(seg.dataset.status === book.status));
  });

  paintStars(book.rating);
  $("#d-notes").value = book.notes || "";

  $("#scrim").hidden = false;
  $("#drawer").hidden = false;
  $("#d-close").focus();
}

function closeDrawer() {
  $("#drawer").hidden = true;
  $("#scrim").hidden = true;
  state.openId = null;
  if (lastFocus) lastFocus.focus();
}

function paintStars(value) {
  document.querySelectorAll("#d-rating .star").forEach((star) => {
    star.classList.toggle("is-on", Number(star.dataset.value) <= value);
  });
}

function currentBook() {
  return state.books.find((b) => b.id === state.openId);
}

async function patchOpenBook(fields, message) {
  const book = currentBook();
  if (!book) return;
  try {
    const updated = await api(`${API}/${book.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    Object.assign(book, updated);
    render();
    if (message) toast(message);
  } catch (err) {
    toast(err.message);
  }
}

/* ----------------------------- add ------------------------------ */

function openAdd() {
  $("#add-scrim").hidden = false;
  $("#add-modal").hidden = false;
  $("#f-title").value = "";
  $("#f-author").value = "";
  hideTitleError();
  $("#f-title").focus();
}

function closeAdd() {
  $("#add-modal").hidden = true;
  $("#add-scrim").hidden = true;
}

function hideTitleError() {
  $("#f-title-error").hidden = true;
  $("#f-title").classList.remove("has-error");
}

async function submitAdd(event) {
  event.preventDefault();
  const title = $("#f-title").value.trim();
  const author = $("#f-author").value.trim();

  if (!title) {
    $("#f-title-error").hidden = false;
    $("#f-title").classList.add("has-error");
    $("#f-title").focus();
    return;
  }

  try {
    const book = await api(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, author }),
    });
    state.books.push(book);
    render();
    closeAdd();
    toast("Added to your shelf.");
  } catch (err) {
    toast(err.message);
  }
}

/* -------------------------- interactions ------------------------ */

function wireEvents() {
  $("#open-add").addEventListener("click", openAdd);
  $("#empty-add").addEventListener("click", openAdd);
  $("#add-close").addEventListener("click", closeAdd);
  $("#add-cancel").addEventListener("click", closeAdd);
  $("#add-scrim").addEventListener("click", closeAdd);
  $("#add-form").addEventListener("submit", submitAdd);
  $("#f-title").addEventListener("input", hideTitleError);

  $("#d-close").addEventListener("click", closeDrawer);
  $("#scrim").addEventListener("click", closeDrawer);

  // Filters
  document.querySelectorAll("#filters .filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.filter = btn.dataset.status;
      document.querySelectorAll("#filters .filter").forEach((f) => {
        const active = f === btn;
        f.classList.toggle("is-active", active);
        f.setAttribute("aria-selected", String(active));
      });
      renderShelf();
    });
  });

  // Status segment
  document.querySelectorAll("#d-status .seg").forEach((seg) => {
    seg.addEventListener("click", () => {
      const status = seg.dataset.status;
      patchOpenBook({ status }, `Moved to ${STATUS_LABELS[status].toLowerCase()}.`);
      document.querySelectorAll("#d-status .seg").forEach((s) =>
        s.setAttribute("aria-checked", String(s === seg))
      );
    });
  });

  // Rating
  document.querySelectorAll("#d-rating .star").forEach((star) => {
    star.addEventListener("click", () => {
      const value = Number(star.dataset.value);
      paintStars(value);
      patchOpenBook({ rating: value });
    });
  });
  $("#d-rating-clear").addEventListener("click", () => {
    paintStars(0);
    patchOpenBook({ rating: 0 });
  });

  // Notes save on blur
  $("#d-notes").addEventListener("change", () => {
    patchOpenBook({ notes: $("#d-notes").value.trim() }, "Notes saved.");
  });

  // Delete
  $("#d-delete").addEventListener("click", async () => {
    const book = currentBook();
    if (!book) return;
    try {
      await api(`${API}/${book.id}`, { method: "DELETE" });
      state.books = state.books.filter((b) => b.id !== book.id);
      closeDrawer();
      render();
      toast("Removed from your shelf.");
    } catch (err) {
      toast(err.message);
    }
  });

  // Escape closes whatever is open
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("#add-modal").hidden) closeAdd();
    else if (!$("#drawer").hidden) closeDrawer();
  });
}

/* ------------------------------ boot ---------------------------- */

async function boot() {
  wireEvents();
  try {
    state.books = await api(API);
    render();
  } catch (err) {
    toast("Couldn't load your shelf. Refresh to try again.");
  }
}

boot();
