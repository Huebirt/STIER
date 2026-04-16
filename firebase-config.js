// ============================================================================
// Firebase Configuration & Tier List Save/Load with Auth
// ============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getStorage, ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyAV5tvRqqxJVuqdrI_Du7x9fEvOF4wzX3c",
    authDomain: "stier-d1e56.firebaseapp.com",
    projectId: "stier-d1e56",
    storageBucket: "stier-d1e56.firebasestorage.app",
    messagingSenderId: "755978838102",
    appId: "1:755978838102:web:5d631926c272bce2975bf7",
    measurementId: "G-Y2FGTQC1WQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

// ============================================================================
// AUTH
// ============================================================================

async function loginWithGoogle() {
    try {
        await signInWithPopup(auth, provider);
    } catch (err) {
        console.error('Login error:', err);
    }
}

async function logout() {
    try {
        await signOut(auth);
    } catch (err) {
        console.error('Logout error:', err);
    }
}

function updateAuthUI(user) {
    // Update all login buttons (present on every page)
    document.querySelectorAll('.login-btn').forEach(btn => {
        if (user) {
            btn.textContent = 'Logout';
            btn.onclick = logout;
        } else {
            btn.textContent = 'Login';
            btn.onclick = loginWithGoogle;
        }
    });

    // Update user display in menu
    document.querySelectorAll('.user-display').forEach(el => {
        if (user) {
            el.textContent = user.displayName || user.email;
            el.style.display = '';
        } else {
            el.textContent = '';
            el.style.display = 'none';
        }
    });

    // Update save button visibility
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
        saveBtn.textContent = user ? 'Save' : 'Login to Save';
    }

    // Update my projects button
    const myProjectsBtn = document.getElementById('my-projects-btn');
    if (myProjectsBtn) {
        myProjectsBtn.style.display = user ? '' : 'none';
    }
}

// ============================================================================
// SERIALIZE TIER LIST → JSON
// ============================================================================

function serializeTierlist() {
    const rows = [];
    document.querySelectorAll('.tier-row').forEach(row => {
        const label = row.querySelector('.tier-label');
        const zone = row.querySelector('.tier-zone');

        const labelText = Array.from(label.childNodes)
            .filter(n => n.nodeType === Node.TEXT_NODE)
            .map(n => n.textContent)
            .join('').trim();

        const labelColor = label.style.backgroundColor || window.getComputedStyle(label).backgroundColor;

        const images = [];
        zone.querySelectorAll('.game-card-wrapper img.game-card').forEach(img => {
            images.push({ src: img.src, alt: img.alt || '' });
        });

        rows.push({ label: labelText, color: labelColor, images });
    });

    const poolImages = [];
    document.querySelectorAll('#game-pool .game-card-wrapper img.game-card').forEach(img => {
        poolImages.push({ src: img.src, alt: img.alt || '' });
    });

    return { rows, poolImages };
}

// ============================================================================
// DESERIALIZE JSON → TIER LIST
// ============================================================================

function deserializeTierlist(data) {
    const tierlist = document.getElementById('tierlist');
    const gamePool = document.getElementById('game-pool');

    tierlist.innerHTML = '';
    gamePool.innerHTML = '';

    data.rows.forEach(rowData => {
        const row = document.createElement('div');
        row.classList.add('tier-row');

        const label = document.createElement('div');
        label.classList.add('tier-label');
        label.contentEditable = 'true';
        label.textContent = rowData.label;
        label.style.backgroundColor = rowData.color;

        const zone = document.createElement('div');
        zone.classList.add('tier-zone');

        rowData.images.forEach(imgData => {
            const wrapper = window.createDraggableImage(imgData.src, imgData.alt);
            zone.appendChild(wrapper);
        });

        row.appendChild(label);
        row.appendChild(zone);
        tierlist.appendChild(row);

        window.setupZoneDragHandlers(zone, false);
        window.addColorPicker(label);
        window.makeRowDraggable(label, row);
        window.addDeleteButton(label, row);
        window.autoShrinkLabel(label);
    });

    data.poolImages.forEach(imgData => {
        const wrapper = window.createDraggableImage(imgData.src, imgData.alt);
        gamePool.appendChild(wrapper);
    });

    window.initializeRowDragging();
}

// ============================================================================
// GENERATE SHORT ID
// ============================================================================

function generateId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < length; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

// ============================================================================
// UPLOAD IMAGES TO FIREBASE STORAGE
// ============================================================================

async function uploadBase64Images(data, tierlistId) {
    let imgIndex = 0;

    async function processImage(imgObj) {
        // Skip if already a URL (Steam images, previously uploaded)
        if (!imgObj.src.startsWith('data:')) return imgObj;

        const path = `tierlists/${tierlistId}/${imgIndex++}_${Date.now()}.png`;
        const storageRef = ref(storage, path);
        await uploadString(storageRef, imgObj.src, 'data_url');
        const url = await getDownloadURL(storageRef);
        return { src: url, alt: imgObj.alt };
    }

    // Process all rows
    for (let i = 0; i < data.rows.length; i++) {
        const row = data.rows[i];
        row.images = await Promise.all(row.images.map(processImage));
    }

    // Process pool
    data.poolImages = await Promise.all(data.poolImages.map(processImage));

    return data;
}

// ============================================================================
// SAVE TO FIREBASE (requires login)
// ============================================================================

async function saveTierlist() {
    const user = auth.currentUser;
    if (!user) {
        await loginWithGoogle();
        if (!auth.currentUser) return;
    }

    const saveBtn = document.getElementById('save-btn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;

    try {
        const id = window.currentTierlistId || generateId();
        const isNew = !window.currentTierlistId;

        let name = window.currentTierlistName || '';
        if (isNew) {
            name = prompt('Name your tier list:', 'My Tier List') || 'My Tier List';
        }

        let data = serializeTierlist();

        // Upload any base64 images to Storage, replace with URLs
        data = await uploadBase64Images(data, id);

        await setDoc(doc(db, 'tierlists', id), {
            data: data,
            name: name,
            uid: user.uid,
            createdAt: isNew ? new Date().toISOString() : (window.currentTierlistCreatedAt || new Date().toISOString()),
            updatedAt: new Date().toISOString()
        });

        window.currentTierlistId = id;
        window.currentTierlistName = name;

        saveBtn.textContent = 'Saved!';
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }, 2000);

    } catch (err) {
        console.error('Error saving tier list:', err);
        saveBtn.textContent = 'Error!';
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }, 2000);
    }
}

// ============================================================================
// SHARE (copies link to clipboard, saves first if needed)
// ============================================================================

async function shareTierlist() {
    const shareBtn = document.getElementById('share-btn');

    // Save first if not saved yet
    if (!window.currentTierlistId) {
        await saveTierlist();
        if (!window.currentTierlistId) return; // save failed or cancelled
    }

    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${window.currentTierlistId}`;

    try {
        await navigator.clipboard.writeText(shareUrl);
        shareBtn.title = 'Link Copied!';
        shareBtn.classList.add('shared');
        setTimeout(() => {
            shareBtn.title = 'Share';
            shareBtn.classList.remove('shared');
        }, 2000);
    } catch (err) {
        // Fallback: prompt with the URL
        prompt('Copy this link:', shareUrl);
    }
}

// ============================================================================
// LOAD FROM FIREBASE (via URL param)
// ============================================================================

async function loadTierlistFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;

    try {
        const snapshot = await getDoc(doc(db, 'tierlists', id));
        if (snapshot.exists()) {
            const docData = snapshot.data();
            window.currentTierlistId = id;
            window.currentTierlistName = docData.name || '';
            window.currentTierlistCreatedAt = docData.createdAt;
            deserializeTierlist(docData.data);
        } else {
            console.warn('Tier list not found:', id);
        }
    } catch (err) {
        console.error('Error loading tier list:', err);
    }
}

// ============================================================================
// MY PROJECTS MODAL
// ============================================================================

async function showMyProjects() {
    const user = auth.currentUser;
    if (!user) return;

    // Remove existing modal
    const existing = document.getElementById('projects-modal');
    if (existing) { existing.remove(); return; }

    const modal = document.createElement('div');
    modal.id = 'projects-modal';
    modal.innerHTML = `
        <div class="projects-modal-backdrop"></div>
        <div class="projects-modal-content">
            <div class="projects-modal-header">
                <h2>My Tier Lists</h2>
                <button class="projects-modal-close">&times;</button>
            </div>
            <div class="projects-modal-body">
                <p>Loading...</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Close handlers
    modal.querySelector('.projects-modal-backdrop').addEventListener('click', () => modal.remove());
    modal.querySelector('.projects-modal-close').addEventListener('click', () => modal.remove());

    try {
        const q = query(
            collection(db, 'tierlists'),
            where('uid', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        const body = modal.querySelector('.projects-modal-body');

        if (snapshot.empty) {
            body.innerHTML = '<p>No saved tier lists yet.</p>';
            return;
        }

        // Sort by updatedAt client-side
        const docs = [];
        snapshot.forEach(docSnap => docs.push(docSnap));
        docs.sort((a, b) => (b.data().updatedAt || '').localeCompare(a.data().updatedAt || ''));

        body.innerHTML = '';
        docs.forEach(docSnap => {
            const data = docSnap.data();
            const item = document.createElement('div');
            item.className = 'project-item';

            const name = document.createElement('span');
            name.className = 'project-name';
            name.textContent = data.name || 'Untitled';

            const date = document.createElement('span');
            date.className = 'project-date';
            date.textContent = new Date(data.updatedAt).toLocaleDateString();

            const actions = document.createElement('div');
            actions.className = 'project-actions';

            const openBtn = document.createElement('button');
            openBtn.textContent = 'Open';
            openBtn.className = 'project-open-btn';
            openBtn.addEventListener('click', () => {
                window.location.href = `teirmaker.html?id=${docSnap.id}`;
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'project-delete-btn';
            deleteBtn.addEventListener('click', async () => {
                if (confirm(`Delete "${data.name || 'Untitled'}"?`)) {
                    await deleteDoc(doc(db, 'tierlists', docSnap.id));
                    item.remove();
                    if (body.children.length === 0) {
                        body.innerHTML = '<p>No saved tier lists yet.</p>';
                    }
                }
            });

            actions.append(openBtn, deleteBtn);
            item.append(name, date, actions);
            body.appendChild(item);
        });

    } catch (err) {
        console.error('Error loading projects:', err);
        modal.querySelector('.projects-modal-body').innerHTML = '<p>Error loading projects.</p>';
    }
}

// ============================================================================
// INIT
// ============================================================================

window.currentTierlistId = null;
window.currentTierlistName = null;
window.currentTierlistCreatedAt = null;

document.addEventListener('DOMContentLoaded', () => {
    // Auth state listener
    onAuthStateChanged(auth, (user) => {
        updateAuthUI(user);
    });

    // Save button
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveTierlist);
    }

    // My Projects button
    const myProjectsBtn = document.getElementById('my-projects-btn');
    if (myProjectsBtn) {
        myProjectsBtn.addEventListener('click', showMyProjects);
    }

    // Share button
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', shareTierlist);
    }

    // Load shared tier list if ?id= is in URL
    loadTierlistFromUrl();
});
