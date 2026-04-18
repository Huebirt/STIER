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
    document.querySelectorAll('.login-btn').forEach(btn => {
        if (user) {
            btn.textContent = 'Logout';
            btn.onclick = logout;
        } else {
            btn.textContent = 'Login';
            btn.onclick = loginWithGoogle;
        }
    });

    document.querySelectorAll('.user-display').forEach(el => {
        if (user) {
            el.textContent = user.displayName || user.email;
            el.style.display = '';
        } else {
            el.textContent = '';
            el.style.display = 'none';
        }
    });

    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) saveBtn.textContent = user ? 'Save' : 'Login to Save';

    ['save-as-btn', 'publish-btn', 'my-projects-btn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = !user;
    });
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
// GENERATE THUMBNAIL (canvas snapshot of tier list)
// ============================================================================

function generateThumbnail(data) {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, 400, 200);

    const rowH = Math.floor(200 / Math.max(data.rows.length, 1));
    data.rows.forEach((row, i) => {
        ctx.fillStyle = row.color || '#666';
        ctx.fillRect(0, i * rowH, 50, rowH);
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(row.label.substring(0, 3), 25, i * rowH + rowH / 2);
    });

    return canvas.toDataURL('image/webp', 0.6);
}

// ============================================================================
// UPLOAD IMAGES TO FIREBASE STORAGE
// ============================================================================

async function uploadBase64Images(data, tierlistId, onProgress) {
    let imgIndex = 0;
    let completed = 0;

    function processImage(imgObj, totalCount) {
        if (!imgObj.src.startsWith('data:')) {
            completed++;
            if (onProgress) onProgress(completed, totalCount);
            return Promise.resolve(imgObj);
        }

        const path = `tierlists/${tierlistId}/${imgIndex++}_${Date.now()}.webp`;
        const storageRef = ref(storage, path);
        return uploadString(storageRef, imgObj.src, 'data_url')
            .then(() => getDownloadURL(storageRef))
            .then(url => {
                completed++;
                if (onProgress) onProgress(completed, totalCount);
                return { src: url, alt: imgObj.alt };
            });
    }

    const allPromises = [];
    let totalCount = 0;
    data.rows.forEach(row => { totalCount += row.images.length; });
    totalCount += data.poolImages.length;

    data.rows.forEach(row => {
        row.images.forEach((imgObj, i) => {
            const p = processImage(imgObj, totalCount).then(result => { row.images[i] = result; });
            allPromises.push(p);
        });
    });

    data.poolImages.forEach((imgObj, i) => {
        const p = processImage(imgObj, totalCount).then(result => { data.poolImages[i] = result; });
        allPromises.push(p);
    });

    await Promise.all(allPromises);
    return data;
}

async function uploadThumbnail(tierlistId, base64) {
    if (!base64.startsWith('data:')) return base64;
    const path = `thumbnails/${tierlistId}.webp`;
    const storageRef = ref(storage, path);
    await uploadString(storageRef, base64, 'data_url');
    return getDownloadURL(storageRef);
}

// ============================================================================
// PROGRESS BAR HELPER
// ============================================================================

function getProgressHelpers() {
    const el = document.getElementById('save-progress');
    const bar = el?.querySelector('.save-progress-bar');
    const text = el?.querySelector('.save-progress-text');
    return {
        show(pct, msg) {
            if (!el) return;
            el.style.display = '';
            bar.style.width = pct + '%';
            text.textContent = msg;
        },
        hide() {
            if (el) el.style.display = 'none';
        }
    };
}

// ============================================================================
// CORE SAVE (shared by Save, Save As, Publish)
// ============================================================================

async function coreSave(id, name, isNew) {
    const user = auth.currentUser;
    const progress = getProgressHelpers();

    progress.show(5, 'Preparing...');
    let data = serializeTierlist();

    data = await uploadBase64Images(data, id, (done, total) => {
        const pct = Math.round(10 + (done / Math.max(total, 1)) * 80);
        progress.show(pct, `Uploading images ${done}/${total}`);
    });

    progress.show(92, 'Generating thumbnail...');
    const thumbBase64 = generateThumbnail(data);
    const thumbnailUrl = await uploadThumbnail(id, thumbBase64);

    progress.show(95, 'Saving to database...');

    const existingDoc = !isNew ? await getDoc(doc(db, 'tierlists', id)) : null;
    const existingData = existingDoc?.exists() ? existingDoc.data() : {};

    await setDoc(doc(db, 'tierlists', id), {
        data: data,
        name: name,
        uid: user.uid,
        authorName: user.displayName || user.email || 'Anonymous',
        thumbnail: thumbnailUrl,
        published: existingData.published || false,
        forkedFrom: window.currentTierlistForkedFrom || existingData.forkedFrom || null,
        createdAt: isNew ? new Date().toISOString() : (existingData.createdAt || new Date().toISOString()),
        updatedAt: new Date().toISOString()
    });

    window.currentTierlistId = id;
    window.currentTierlistName = name;
    window.currentTierlistCreatedAt = existingData.createdAt || new Date().toISOString();
    window.currentTierlistForkedFrom = null;

    progress.show(100, 'Saved!');
    return id;
}

// ============================================================================
// SAVE (overwrite current)
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
    const progress = getProgressHelpers();

    try {
        const id = window.currentTierlistId || generateId();
        const isNew = !window.currentTierlistId;

        let name = window.currentTierlistName || '';
        if (isNew) {
            name = prompt('Name your tier list:', 'My Tier List') || 'My Tier List';
        }

        await coreSave(id, name, isNew);

        saveBtn.textContent = 'Saved!';
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
            progress.hide();
        }, 2000);

    } catch (err) {
        console.error('Error saving tier list:', err);
        saveBtn.textContent = 'Error!';
        progress.hide();
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }, 2000);
    }
}

// ============================================================================
// SAVE AS (new copy)
// ============================================================================

async function saveAsTierlist() {
    const user = auth.currentUser;
    if (!user) {
        await loginWithGoogle();
        if (!auth.currentUser) return;
    }

    const name = prompt('Save as new name:', (window.currentTierlistName || 'My Tier List') + ' (copy)');
    if (!name) return;

    const saveAsBtn = document.getElementById('save-as-btn');
    const originalText = saveAsBtn.textContent;
    saveAsBtn.textContent = 'Saving...';
    saveAsBtn.disabled = true;
    const progress = getProgressHelpers();

    try {
        const newId = generateId();
        await coreSave(newId, name, true);

        history.pushState(null, '', `tiermaker.html?id=${newId}`);

        saveAsBtn.textContent = 'Saved!';
        setTimeout(() => {
            saveAsBtn.textContent = originalText;
            saveAsBtn.disabled = false;
            progress.hide();
        }, 2000);

    } catch (err) {
        console.error('Error saving as:', err);
        saveAsBtn.textContent = 'Error!';
        progress.hide();
        setTimeout(() => {
            saveAsBtn.textContent = originalText;
            saveAsBtn.disabled = false;
        }, 2000);
    }
}

// ============================================================================
// PUBLISH (make public for home page gallery)
// ============================================================================

async function publishTierlist() {
    const user = auth.currentUser;
    if (!user) {
        await loginWithGoogle();
        if (!auth.currentUser) return;
    }

    if (!window.currentTierlistId) {
        await saveTierlist();
        if (!window.currentTierlistId) return;
    }

    const publishBtn = document.getElementById('publish-btn');
    const originalText = publishBtn.textContent;

    try {
        const snapshot = await getDoc(doc(db, 'tierlists', window.currentTierlistId));
        const isPublished = snapshot.exists() && snapshot.data().published;

        if (isPublished) {
            if (!confirm('This tier list is already published. Unpublish it?')) return;
            await setDoc(doc(db, 'tierlists', window.currentTierlistId), { published: false }, { merge: true });
            publishBtn.textContent = 'Publish';
            return;
        }

        if (!confirm('Publish this tier list? Other users will see it on the home page and can fork their own version.')) return;

        publishBtn.textContent = 'Publishing...';
        publishBtn.disabled = true;

        await coreSave(window.currentTierlistId, window.currentTierlistName, false);
        await setDoc(doc(db, 'tierlists', window.currentTierlistId), { published: true }, { merge: true });

        publishBtn.textContent = 'Published!';
        setTimeout(() => {
            publishBtn.textContent = 'Unpublish';
            publishBtn.disabled = false;
        }, 2000);

    } catch (err) {
        console.error('Error publishing:', err);
        publishBtn.textContent = 'Error!';
        setTimeout(() => {
            publishBtn.textContent = originalText;
            publishBtn.disabled = false;
        }, 2000);
    }
}

// ============================================================================
// SHARE (copies link to clipboard, saves first if needed)
// ============================================================================

async function shareTierlist() {
    const shareBtn = document.getElementById('share-btn');

    if (!window.currentTierlistId) {
        await saveTierlist();
        if (!window.currentTierlistId) return;
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
            const user = auth.currentUser;
            const isOwner = user && docData.uid === user.uid;

            if (isOwner) {
                window.currentTierlistId = id;
                window.currentTierlistName = docData.name || '';
                window.currentTierlistCreatedAt = docData.createdAt;
            } else {
                // Viewing someone else's — Save will create a fork
                window.currentTierlistId = null;
                window.currentTierlistName = docData.name || '';
                window.currentTierlistForkedFrom = id;
            }

            deserializeTierlist(docData.data);

            const publishBtn = document.getElementById('publish-btn');
            if (publishBtn && isOwner) {
                publishBtn.textContent = docData.published ? 'Unpublish' : 'Publish';
            }
        } else {
            console.warn('Tier list not found:', id);
        }
    } catch (err) {
        console.error('Error loading tier list:', err);
    }
}

// ============================================================================
// MY PROJECTS MODAL (with thumbnails & preview)
// ============================================================================

async function showMyProjects() {
    const user = auth.currentUser;
    if (!user) return;

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

    modal.querySelector('.projects-modal-backdrop').addEventListener('click', () => modal.remove());
    modal.querySelector('.projects-modal-close').addEventListener('click', () => modal.remove());

    try {
        const q = query(collection(db, 'tierlists'), where('uid', '==', user.uid));
        const snapshot = await getDocs(q);
        const body = modal.querySelector('.projects-modal-body');

        if (snapshot.empty) {
            body.innerHTML = '<p>No saved tier lists yet.</p>';
            return;
        }

        const docs = [];
        snapshot.forEach(docSnap => docs.push(docSnap));
        docs.sort((a, b) => (b.data().updatedAt || '').localeCompare(a.data().updatedAt || ''));

        body.innerHTML = '';
        docs.forEach(docSnap => {
            const data = docSnap.data();
            const card = document.createElement('div');
            card.className = 'project-card';

            const thumb = document.createElement('div');
            thumb.className = 'project-thumb';
            if (data.thumbnail) {
                thumb.style.backgroundImage = `url(${data.thumbnail})`;
            }

            const previewChips = document.createElement('div');
            previewChips.className = 'project-preview-chips';
            const allImages = [
                ...(data.data?.rows || []).flatMap(r => r.images || []),
                ...(data.data?.poolImages || [])
            ];
            allImages.slice(0, 6).forEach(img => {
                const chip = document.createElement('img');
                chip.src = img.src;
                chip.alt = img.alt || '';
                chip.className = 'preview-chip';
                previewChips.appendChild(chip);
            });

            const info = document.createElement('div');
            info.className = 'project-info';

            const name = document.createElement('div');
            name.className = 'project-name';
            name.textContent = data.name || 'Untitled';

            const meta = document.createElement('div');
            meta.className = 'project-meta';
            const dateStr = new Date(data.updatedAt).toLocaleDateString();
            const status = data.published ? ' · Published' : '';
            meta.textContent = dateStr + status;

            const actions = document.createElement('div');
            actions.className = 'project-actions';

            const openBtn = document.createElement('button');
            openBtn.textContent = 'Open';
            openBtn.className = 'project-open-btn';
            openBtn.addEventListener('click', () => {
                window.location.href = `tiermaker.html?id=${docSnap.id}`;
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'project-delete-btn';
            deleteBtn.addEventListener('click', async () => {
                if (confirm(`Delete "${data.name || 'Untitled'}"?`)) {
                    await deleteDoc(doc(db, 'tierlists', docSnap.id));
                    card.remove();
                    if (body.children.length === 0) {
                        body.innerHTML = '<p>No saved tier lists yet.</p>';
                    }
                }
            });

            actions.append(openBtn, deleteBtn);
            info.append(name, meta);
            card.append(thumb, previewChips, info, actions);
            body.appendChild(card);
        });

    } catch (err) {
        console.error('Error loading projects:', err);
        modal.querySelector('.projects-modal-body').innerHTML = '<p>Error loading projects.</p>';
    }
}

// ============================================================================
// HOME PAGE GALLERY (published tier lists)
// ============================================================================

async function loadGallery() {
    const gallery = document.getElementById('gallery');
    if (!gallery) return;

    try {
        const q = query(
            collection(db, 'tierlists'),
            where('published', '==', true)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            gallery.innerHTML = '<p class="gallery-empty">No published tier lists yet. Be the first to publish one!</p>';
            return;
        }

        const docs = [];
        snapshot.forEach(docSnap => docs.push(docSnap));
        docs.sort((a, b) => (b.data().updatedAt || '').localeCompare(a.data().updatedAt || ''));

        gallery.innerHTML = '';
        docs.forEach(docSnap => {
            const data = docSnap.data();
            const card = document.createElement('div');
            card.className = 'gallery-card';

            const thumb = document.createElement('div');
            thumb.className = 'gallery-thumb';
            if (data.thumbnail) {
                thumb.style.backgroundImage = `url(${data.thumbnail})`;
            }

            const chips = document.createElement('div');
            chips.className = 'gallery-chips';
            const allImages = [
                ...(data.data?.rows || []).flatMap(r => r.images || []),
                ...(data.data?.poolImages || [])
            ];
            allImages.slice(0, 8).forEach(img => {
                const chip = document.createElement('img');
                chip.src = img.src;
                chip.alt = img.alt || '';
                chip.className = 'gallery-chip';
                chips.appendChild(chip);
            });

            const info = document.createElement('div');
            info.className = 'gallery-info';

            const title = document.createElement('div');
            title.className = 'gallery-title';
            title.textContent = data.name || 'Untitled';

            const author = document.createElement('div');
            author.className = 'gallery-author';
            author.textContent = `by ${data.authorName || 'Anonymous'}`;

            info.append(title, author);

            card.addEventListener('click', () => {
                window.location.href = `tiermaker.html?id=${docSnap.id}`;
            });

            card.append(thumb, chips, info);
            gallery.appendChild(card);
        });

    } catch (err) {
        console.error('Error loading gallery:', err);
        gallery.innerHTML = '<p class="gallery-empty">Could not load published tier lists.</p>';
    }
}

// ============================================================================
// INIT
// ============================================================================

window.currentTierlistId = null;
window.currentTierlistName = null;
window.currentTierlistCreatedAt = null;
window.currentTierlistForkedFrom = null;

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        updateAuthUI(user);
        if (user && window.location.pathname.includes('tiermaker')) {
            const params = new URLSearchParams(window.location.search);
            const id = params.get('id');
            if (id && !window.currentTierlistId) {
                getDoc(doc(db, 'tierlists', id)).then(snapshot => {
                    if (snapshot.exists() && snapshot.data().uid === user.uid) {
                        window.currentTierlistId = id;
                        window.currentTierlistName = snapshot.data().name;
                        window.currentTierlistCreatedAt = snapshot.data().createdAt;
                        const publishBtn = document.getElementById('publish-btn');
                        if (publishBtn) publishBtn.textContent = snapshot.data().published ? 'Unpublish' : 'Publish';
                    }
                });
            }
        }
    });

    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) saveBtn.addEventListener('click', saveTierlist);

    const saveAsBtn = document.getElementById('save-as-btn');
    if (saveAsBtn) saveAsBtn.addEventListener('click', saveAsTierlist);

    const publishBtn = document.getElementById('publish-btn');
    if (publishBtn) publishBtn.addEventListener('click', publishTierlist);

    const myProjectsBtn = document.getElementById('my-projects-btn');
    if (myProjectsBtn) myProjectsBtn.addEventListener('click', showMyProjects);

    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) shareBtn.addEventListener('click', shareTierlist);

    if (window.location.pathname.includes('tiermaker')) {
        loadTierlistFromUrl();
    }

    if (document.getElementById('gallery')) {
        loadGallery();
    }
});
