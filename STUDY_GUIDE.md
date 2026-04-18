# STier Code Study Guide

A beginner-friendly walkthrough of every concept used in this project. Read this alongside the actual code files.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [HTML Basics](#2-html-basics)
3. [CSS Basics](#3-css-basics)
4. [JavaScript Fundamentals (script.js)](#4-javascript-fundamentals-scriptjs)
5. [Firebase (firebase-config.js)](#5-firebase-firebase-configjs)
6. [How Everything Connects](#6-how-everything-connects)
7. [Key Patterns to Learn](#7-key-patterns-to-learn)
8. [Mini Challenges](#8-mini-challenges)

---

## 1. Project Overview

```
index.html          ← Home page (gallery of published tier lists)
tiermaker.html      ← Tier list editor page
style.css           ← All visual styling
script.js           ← Core app logic (drag & drop, search, uploads, tier rows)
firebase-config.js  ← Cloud features (login, save, load, share, publish)
```

**Data flow:**
```
User drags images → stored in HTML DOM → serialized to JSON → saved to Firebase
Firebase → JSON loaded → deserialized back into HTML DOM → user sees their tier list
```

---

## 2. HTML Basics

### What is HTML?
HTML defines the **structure** of a web page. Every visible element is an HTML tag.

### Key tags used in this project:

```html
<!-- A div is a generic container — a box that holds other things -->
<div class="tier-row">...</div>

<!-- class="..." lets CSS and JS target this element -->
<!-- id="..." is a UNIQUE identifier — only one element can have a given id -->
<div id="tierlist" class="tierlist">...</div>

<!-- contenteditable="true" makes a div act like a text input -->
<div class="tier-label" contenteditable="true">S</div>

<!-- <script> loads JavaScript files -->
<script src="script.js"></script>
<!-- type="module" means it can use import/export (needed for Firebase) -->
<script type="module" src="firebase-config.js"></script>
```

### The tier list structure:
```html
<div class="tier-row">                          <!-- One row (e.g., "S tier") -->
    <div class="tier-label s">S</div>           <!-- The colored label -->
    <div class="tier-zone" data-tier="S"></div>  <!-- Where images get dropped -->
</div>
```

### `data-*` attributes:
```html
<div class="tier-zone" data-tier="S"></div>
```
`data-tier="S"` is a **custom data attribute**. It stores extra info on an element. You can read it in JS with `element.dataset.tier`.

---

## 3. CSS Basics

### What is CSS?
CSS controls how HTML elements **look** — colors, sizes, positions, animations.

### Selectors — how CSS finds elements:
```css
/* By tag name */
body { ... }

/* By class (.) */
.game-card { ... }

/* By id (#) */
#tierlist { ... }

/* Nested: "a .game-card inside a .game-card-wrapper" */
.game-card-wrapper .game-card { ... }

/* Pseudo-class: "when you hover over it" */
.game-card:hover { ... }

/* Child on hover: "show delete button when hovering the wrapper" */
.game-card-wrapper:hover .delete-image-btn { opacity: 1; }
```

### Flexbox (used everywhere in this project):
```css
.tier-row {
    display: flex;        /* Children line up in a row */
    min-height: 90px;     /* At least this tall */
}

.tier-zone {
    flex: 1;              /* Take up all remaining space */
    display: flex;
    flex-wrap: wrap;      /* Wrap to next line if too many items */
    gap: 8px;             /* Space between items */
}
```

**Flexbox cheat sheet:**
- `display: flex` → children go in a row (or column with `flex-direction: column`)
- `flex: 1` → "grow to fill available space"
- `flex-wrap: wrap` → items wrap to next line
- `justify-content: center` → center horizontally
- `align-items: center` → center vertically
- `gap: 8px` → space between flex items

### CSS Grid (used for gallery):
```css
.gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    /* Creates as many columns as fit, each at least 260px wide */
    gap: 16px;
}
```

### Transitions (smooth animations):
```css
.game-card {
    transition: transform 0.15s ease;  /* Animate changes over 0.15 seconds */
}
.game-card:hover {
    transform: scale(1.05);            /* Grow 5% bigger on hover */
}
```

### Position types:
```css
/* static (default) — normal document flow */
/* relative — stays in flow but can be offset */
/* absolute — positioned relative to nearest "relative" parent */
/* fixed — stays in place even when scrolling (used for modal, menu) */

.delete-image-btn {
    position: absolute;    /* Positioned relative to .game-card-wrapper */
    top: 4px;
    right: 4px;
}

.game-card-wrapper {
    position: relative;    /* Makes this the reference point for absolute children */
}
```

### Z-index (layering):
```css
.ham-menu { z-index: 1001; }      /* On top of everything */
.off-screen-menu { z-index: 1000; } /* Below hamburger, above content */
#projects-modal { z-index: 2000; }  /* Modals on very top */
```
Higher z-index = rendered on top. Only works on positioned elements.

---

## 4. JavaScript Fundamentals (script.js)

### Variables
```javascript
let draggedCard = null;    // "let" — value can change later
const gamePool = document.querySelector('#game-pool');  // "const" — never reassigned
```
**Rule of thumb:** Use `const` by default. Use `let` only if the value needs to change.

### Selecting elements from HTML (DOM)
```javascript
// Get ONE element (first match)
document.querySelector('.search-input')     // by class
document.getElementById('game-pool')        // by id

// Get ALL matching elements (returns a list)
document.querySelectorAll('.tier-zone')
```

### Creating elements
```javascript
const wrapper = document.createElement('div');  // Create a new <div>
wrapper.className = 'game-card-wrapper';        // Set its class
wrapper.append(img, deleteBtn);                 // Put children inside it
gamePool.appendChild(wrapper);                  // Add it to the page
```

### Event listeners — responding to user actions
```javascript
// When the user clicks the button, run this function
hamMenu.addEventListener('click', () => {
    hamMenu.classList.toggle('active');  // Add/remove the "active" class
});

// When the user types in the search box
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();  // Get what they typed
    // ...
});
```

**Common events:**
| Event | When it fires |
|-------|--------------|
| `click` | User clicks |
| `input` | User types in an input |
| `change` | User picks a file, selects an option |
| `dragstart` | User starts dragging |
| `dragover` | Something is being dragged over this element |
| `drop` | User drops something here |
| `dragend` | Drag operation finished |
| `mousedown` / `mouseup` | Mouse button pressed / released |

### Arrow functions
```javascript
// These two are the same:
function sayHello(name) { return 'Hello ' + name; }
const sayHello = (name) => { return 'Hello ' + name; };

// Short version (one expression, auto-returns):
const sayHello = (name) => 'Hello ' + name;

// No parameters:
const doSomething = () => { console.log('done'); };
```

### Template literals (backtick strings)
```javascript
// Instead of string concatenation:
'Hello ' + name + ', you are ' + age + ' years old'

// Use backticks with ${...}:
`Hello ${name}, you are ${age} years old`
```

### The `classList` API
```javascript
element.classList.add('active');      // Add a class
element.classList.remove('active');   // Remove a class
element.classList.toggle('active');   // Add if missing, remove if present
element.classList.contains('active'); // Check if it has the class (true/false)
```

### How drag & drop works in this project:

**Step 1: Make something draggable**
```javascript
img.draggable = true;

img.addEventListener('dragstart', () => {
    draggedCard = wrapper;              // Remember what we're dragging
    wrapper.classList.add('dragging');   // Make it look semi-transparent
});

img.addEventListener('dragend', () => {
    wrapper.classList.remove('dragging');
    draggedCard = null;                 // Forget it
});
```

**Step 2: Set up drop zones**
```javascript
zone.addEventListener('dragover', (e) => {
    e.preventDefault();                 // REQUIRED — allows dropping
    zone.style.outline = '2px dashed #6f89ff';  // Visual feedback
});

zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.appendChild(draggedCard);      // Move the card into this zone
});
```

**Step 3: Smart insertion (not just append to end)**
```javascript
function getDragAfterElement(zone, mouseX) {
    // Find all cards in the zone that aren't being dragged
    const cards = [...zone.querySelectorAll('.game-card-wrapper:not(.dragging)')];
    
    // Find which card the mouse is closest to (on the left side of)
    return cards.reduce((closest, card) => {
        const box = card.getBoundingClientRect();  // Get position on screen
        const offset = mouseX - box.left - box.width / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset, element: card };
        }
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}
```
This lets you insert a card between other cards, not just at the end.

### The `reduce` method (used above)
```javascript
// reduce goes through each item in an array and builds up a single result
// It's like a running total

[1, 2, 3, 4].reduce((total, num) => total + num, 0);
// Step 1: total=0, num=1 → 1
// Step 2: total=1, num=2 → 3
// Step 3: total=3, num=3 → 6
// Step 4: total=6, num=4 → 10
// Result: 10
```

### `Array.from()` and spread `[...]`
```javascript
// DOM methods return "NodeLists", not real arrays
// To use array methods like .forEach(), .map(), .filter(), convert first:

Array.from(files).forEach(file => { ... });
// OR
[...files].forEach(file => { ... });
```

### How image compression works:
```javascript
function compressImage(src, callback, maxWidth = 400) {
    const img = new Image();           // Create an invisible image
    img.onload = () => {               // When it finishes loading...
        const canvas = document.createElement('canvas');  // Create a drawing surface
        const scale = Math.min(maxWidth / img.width, 1);  // Scale down (never up)
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');       // Get drawing tools
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);  // Draw scaled image
        callback(canvas.toDataURL('image/webp', 0.8));  // Convert to compressed data URL
    };
    img.src = src;  // Start loading (triggers onload when done)
}
```

**What's a data URL?**
A data URL is the image encoded as text, like:
`data:image/webp;base64,UklGRh4AAABXRUJQVlA4...`
This lets you embed images directly in your code without separate files.

### How FileReader works:
```javascript
function addImageToPool(file) {
    const reader = new FileReader();     // Tool for reading files
    reader.onload = (e) => {             // When done reading...
        compressImage(e.target.result, (compressedSrc) => {
            // e.target.result is the file as a data URL
            const imgWrapper = createDraggableImage(compressedSrc, file.name);
            gamePool.appendChild(imgWrapper);
        });
    };
    reader.readAsDataURL(file);          // Start reading (triggers onload when done)
}
```

### Exposing functions to `window`
```javascript
// script.js loads as a regular script — its functions are "local"
// firebase-config.js loads as a module — it can't see script.js functions
// Solution: attach them to the global "window" object

window.createDraggableImage = createDraggableImage;
// Now firebase-config.js can call window.createDraggableImage(...)
```

---

## 5. Firebase (firebase-config.js)

### What is Firebase?
Firebase is Google's cloud platform. We use 4 services:
- **Auth** — Google login
- **Firestore** — Database (stores tier list data as JSON)
- **Storage** — File storage (stores uploaded images)
- **Hosting** — (using GitHub Pages instead)

### ES Modules (`import`)
```javascript
// "import" pulls in specific functions from a library
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/.../firebase-firestore.js";

// This is like saying: "from the Firestore library, give me these 3 tools"
```
This only works in `<script type="module">` tags.

### Firebase initialization
```javascript
const firebaseConfig = {
    apiKey: "...",         // Identifies your project (safe to be public)
    projectId: "stier-d1e56",
    // ... other config
};

const app = initializeApp(firebaseConfig);   // Connect to Firebase
const db = getFirestore(app);                // Get database reference
const auth = getAuth(app);                   // Get auth reference
const storage = getStorage(app);             // Get file storage reference
```

### `async` / `await` — handling things that take time
```javascript
// Problem: database calls take time. Code can't just wait.
// Solution: async/await

// OLD WAY (callbacks / .then):
getDoc(doc(db, 'tierlists', id)).then(snapshot => {
    console.log(snapshot.data());
});

// NEW WAY (async/await) — reads like normal code:
async function loadTierlist(id) {
    const snapshot = await getDoc(doc(db, 'tierlists', id));
    //                     ^^^^^ "pause here until this finishes"
    console.log(snapshot.data());
}
```

**Rules:**
- `await` can only be used inside an `async function`
- `await` pauses execution until the Promise resolves
- Always wrap in `try/catch` for error handling

### `try / catch` — error handling
```javascript
try {
    await setDoc(doc(db, 'tierlists', id), data);  // Try to save
    console.log('Success!');
} catch (err) {
    console.error('Something went wrong:', err);    // If it fails
}
```

### Promises and `Promise.all`
```javascript
// A Promise represents "something that will finish later"
// Promise.all runs multiple promises IN PARALLEL (at the same time)

const allPromises = [
    uploadImage(img1),   // starts uploading
    uploadImage(img2),   // starts uploading AT THE SAME TIME
    uploadImage(img3),   // starts uploading AT THE SAME TIME
];

await Promise.all(allPromises);  // Wait for ALL to finish
// Much faster than uploading one after another!
```

### Authentication flow
```javascript
// 1. Sign in with Google popup
async function loginWithGoogle() {
    await signInWithPopup(auth, provider);
    // A Google popup appears, user logs in, Firebase handles everything
}

// 2. Listen for auth state changes (fires on login, logout, and page load)
onAuthStateChanged(auth, (user) => {
    // user is null if logged out, or a user object if logged in
    updateAuthUI(user);
});

// 3. Check current user at any time
const user = auth.currentUser;  // null or user object
```

### Firestore (database) operations
```javascript
// WRITE — save a document
await setDoc(doc(db, 'tierlists', 'abc123'), {
    name: 'My Tier List',
    uid: user.uid,
    data: { rows: [...], poolImages: [...] }
});
// This saves to: collection "tierlists" → document "abc123"

// READ — get one document
const snapshot = await getDoc(doc(db, 'tierlists', 'abc123'));
if (snapshot.exists()) {
    const data = snapshot.data();  // { name: '...', uid: '...', data: {...} }
}

// QUERY — find documents matching a condition
const q = query(
    collection(db, 'tierlists'),
    where('published', '==', true)     // Only published ones
);
const snapshot = await getDocs(q);
snapshot.forEach(doc => {
    console.log(doc.id, doc.data());
});

// DELETE
await deleteDoc(doc(db, 'tierlists', 'abc123'));

// MERGE — update only specific fields (don't overwrite everything)
await setDoc(doc(db, 'tierlists', 'abc123'), { published: true }, { merge: true });
```

### Firebase Storage (file uploads)
```javascript
// Upload a base64 image
const storageRef = ref(storage, 'tierlists/abc123/0_image.webp');
await uploadString(storageRef, 'data:image/webp;base64,...', 'data_url');

// Get the download URL
const url = await getDownloadURL(storageRef);
// Returns something like: https://firebasestorage.googleapis.com/...
```

### Serialization — converting the page to saveable data
```javascript
function serializeTierlist() {
    // Walk through the HTML and extract all the data
    const rows = [];
    document.querySelectorAll('.tier-row').forEach(row => {
        const label = row.querySelector('.tier-label');
        const images = [];
        // ... collect image src and alt from each zone
        rows.push({ label: '...', color: '...', images: [...] });
    });
    return { rows, poolImages };
}
// Result looks like:
// {
//   rows: [
//     { label: "S", color: "rgb(255,127,127)", images: [{src: "...", alt: "..."}] },
//     { label: "A", color: "rgb(255,191,127)", images: [...] },
//   ],
//   poolImages: [ {src: "...", alt: "..."} ]
// }
```

### Deserialization — rebuilding the page from saved data
```javascript
function deserializeTierlist(data) {
    // Clear the current page
    tierlist.innerHTML = '';
    gamePool.innerHTML = '';
    
    // Rebuild each row from the JSON data
    data.rows.forEach(rowData => {
        // Create HTML elements
        // Set their properties from the saved data
        // Re-attach all event listeners (drag, color picker, etc.)
    });
}
```

### The fork system
```javascript
// When you open someone else's tier list:
window.currentTierlistId = null;              // NOT your project
window.currentTierlistForkedFrom = id;        // Remember the original

// When you click Save, since currentTierlistId is null:
const id = generateId();                      // New ID = new project
// It saves as YOUR project, with forkedFrom pointing to the original
```

---

## 6. How Everything Connects

### Page load sequence:
```
1. Browser loads HTML
2. Browser loads CSS (styles appear)
3. Browser loads script.js
4. DOMContentLoaded fires → script.js sets up everything:
   - Navigation (hamburger menu)
   - Search (Steam API)
   - File uploads
   - Drag & drop
   - Tier row features (color picker, delete, reorder)
5. Browser loads firebase-config.js (as module)
6. DOMContentLoaded fires again → firebase sets up:
   - Auth state listener
   - Button click handlers (save, share, publish)
   - Loads tier list from URL if ?id=xxx is present
   - Loads gallery on home page
```

### Save flow:
```
User clicks Save
  → saveTierlist() checks if logged in
  → coreSave() is called with an ID and name
    → serializeTierlist() reads the DOM into JSON
    → uploadBase64Images() finds any data: URLs
      → For each one: upload to Firebase Storage → get download URL
      → Replace data: URL with https:// URL in the JSON
    → generateThumbnail() draws a tiny preview on a canvas
    → uploadThumbnail() saves the preview to Storage
    → setDoc() saves everything to Firestore
  → Progress bar updates throughout
  → Button shows "Saved!" for 2 seconds
```

### Load flow:
```
User visits tiermaker.html?id=abc123
  → loadTierlistFromUrl() reads the URL parameter
  → getDoc() fetches from Firestore
  → Checks ownership:
    - Your project? Set currentTierlistId (Save overwrites)
    - Someone else's? Leave null (Save creates fork)
  → deserializeTierlist() rebuilds the page from JSON
```

---

## 7. Key Patterns to Learn

### 1. The "factory function" pattern
`createDraggableImage()` is a factory — it creates a complex element with all its event listeners, then returns it. This avoids duplicating code everywhere you need a draggable image.

### 2. The "optional chaining" operator `?.`
```javascript
const existingData = existingDoc?.exists() ? existingDoc.data() : {};
//                              ^^ If existingDoc is null/undefined, don't crash — just return undefined
```

### 3. The "nullish coalescing" operator `||`
```javascript
const name = data.name || 'Untitled';
// If data.name is falsy (null, undefined, empty string), use 'Untitled' instead
```

### 4. The "destructuring" pattern
```javascript
// Instead of:
const items = data.items;
const name = data.name;

// You can write:
const { items, name } = data;
```

### 5. The "event delegation" pattern
Instead of adding listeners to every card, add one listener to the parent:
```javascript
// initializeRowDragging adds ONE listener to the tierlist
tierlist.addEventListener('dragover', (e) => {
    const draggingRow = document.querySelector('.tier-row.dragging-row');
    // Works for all rows, even ones added later
});
```

### 6. The "callback" pattern
```javascript
compressImage(src, (compressedSrc) => {
    // This function runs LATER, when compression is done
    // "compressedSrc" is the result
});
```
Callbacks are functions you pass to another function, to be called when something finishes.

### 7. The "progress callback" pattern
```javascript
await uploadBase64Images(data, id, (done, total) => {
    //                               ^^^^^^^^^^^^ Called each time an image finishes
    showProgress(pct, `Uploading images ${done}/${total}`);
});
```

---

## 8. Mini Challenges

Try these to test your understanding! Check the code for hints.

### Easy
1. **Change the default tier colors** — Find where S/A/B/C/D/F colors are defined in CSS and change them.
2. **Change the game card height** — Find the `.game-card` height in CSS and make images bigger or smaller.
3. **Change the search minimum characters** — Find where it checks `query.length >= 3` and change it to 2.

### Medium
4. **Add a new default row** — In `tiermaker.html`, add a "G" tier row below F.
5. **Change the color picker colors** — Find `PRESET_COLORS` in `script.js` and add your own colors.
6. **Add a "Clear All" button** — Add a button that removes all images from all tiers and the pool.

### Hard
7. **Add a "Rename" button** in My Projects that lets you rename a saved tier list.
8. **Add image count** — Show how many images are in each tier zone (e.g., "S (3)").
9. **Add a confirmation before leaving** — If there are unsaved changes, ask "Are you sure?" when navigating away.

---

## Glossary

| Term | Meaning |
|------|---------|
| **DOM** | Document Object Model — the HTML as a tree of JavaScript objects |
| **Event listener** | Code that runs when something happens (click, type, drag, etc.) |
| **Callback** | A function passed to another function, to be called later |
| **Promise** | An object representing a future result (success or failure) |
| **async/await** | Syntax for working with Promises in a readable way |
| **Serialize** | Convert objects/state into a storable format (JSON) |
| **Deserialize** | Convert stored data back into objects/state |
| **Base64** | A way to encode binary data (like images) as text |
| **Data URL** | An image embedded as a base64 string: `data:image/png;base64,...` |
| **Firestore** | Firebase's NoSQL cloud database |
| **Module** | A JS file that uses `import`/`export` (loaded with `type="module"`) |
| **Fork** | Creating your own copy of someone else's work |
| **Thumbnail** | A small preview image |
| **WebP** | A modern image format — smaller files than PNG/JPEG |
| **Canvas** | An HTML element for drawing graphics programmatically |
