// ============================================================================
// STier - Tier List Maker
// ============================================================================

// ============================================================================
// STATE & DOM SELECTORS
// ============================================================================

let draggedCard = null;

// ============================================================================
// UNDO / REDO HISTORY
// ============================================================================

const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 50;

function captureState() {
    const tierlist = document.getElementById('tierlist');
    const pool = document.getElementById('game-pool');
    if (!tierlist || !pool) return null;
    return { tierlistHTML: tierlist.innerHTML, poolHTML: pool.innerHTML };
}

function pushUndo() {
    const state = captureState();
    if (!state) return;
    undoStack.push(state);
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack.length = 0;
    updateUndoRedoButtons();
}

function reattachDragListeners(wrapper) {
    const img = wrapper.querySelector('img.game-card');
    const deleteBtn = wrapper.querySelector('.delete-image-btn');
    if (img) {
        img.draggable = true;
        img.addEventListener('dragstart', () => {
            draggedCard = wrapper;
            wrapper.classList.add('dragging');
        });
        img.addEventListener('dragend', () => {
            wrapper.classList.remove('dragging');
            draggedCard = null;
        });
    }
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            pushUndo();
            wrapper.remove();
        });
    }
}

function restoreState(state) {
    const tierlist = document.getElementById('tierlist');
    const pool = document.getElementById('game-pool');
    if (!tierlist || !pool) return;

    tierlist.innerHTML = state.tierlistHTML;
    pool.innerHTML = state.poolHTML;

    tierlist.querySelectorAll('.tier-row').forEach(row => {
        const label = row.querySelector('.tier-label');
        const zone = row.querySelector('.tier-zone');
        setupZoneDragHandlers(zone, false);
        addColorPicker(label);
        makeRowDraggable(label, row);
        addDeleteButton(label, row);
        autoShrinkLabel(label);
    });

    pool.querySelectorAll('.game-card-wrapper').forEach(reattachDragListeners);
    tierlist.querySelectorAll('.game-card-wrapper').forEach(reattachDragListeners);
    setupZoneDragHandlers(pool, true);
    initializeRowDragging();
}

function undo() {
    if (undoStack.length === 0) return;
    const current = captureState();
    if (current) redoStack.push(current);
    restoreState(undoStack.pop());
    updateUndoRedoButtons();
}

function redo() {
    if (redoStack.length === 0) return;
    const current = captureState();
    if (current) undoStack.push(current);
    restoreState(redoStack.pop());
    updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    if (undoBtn) undoBtn.disabled = undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}

function resetToPool() {
    pushUndo();
    const pool = document.getElementById('game-pool');
    document.querySelectorAll('.tier-zone .game-card-wrapper').forEach(wrapper => {
        pool.appendChild(wrapper);
    });
}

const hamMenu = document.querySelector('.ham-menu');
const offScreenMenu = document.querySelector('.off-screen-menu');
const searchInput = document.querySelector('.search-input');
const searchDropdown = document.getElementById('search-dropdown');
const gamePool = document.querySelector('#game-pool');
const tierZones = document.querySelectorAll('.tier-zone');

// ============================================================================
// NAVIGATION & MENU
// ============================================================================

function initializeNavigation() {
    hamMenu.addEventListener('click', () => {
        hamMenu.classList.toggle('active');
        offScreenMenu.classList.toggle('active');
    });
}

// ============================================================================
// SEARCH FUNCTIONALITY
// ============================================================================

async function searchGames(query) {
    const encodedUrl = encodeURIComponent(
        `https://store.steampowered.com/api/storesearch/?term=${query}&l=english&cc=US`
    );
    const response = await fetch(`https://corsproxy.io/?url=${encodedUrl}`);
    const data = await response.json();
    displaySearchResults(data);
}

function displaySearchResults(games) {
    searchDropdown.innerHTML = '';

    if (!games.items || games.items.length === 0) {
        return;
    }

    games.items.forEach(game => {
        const item = document.createElement('div');
        item.classList.add('search-result-item');

        const img = document.createElement('img');
        img.src = game.tiny_image;

        const name = document.createElement('span');
        name.textContent = game.name;

        item.appendChild(img);
        item.appendChild(name);
        item.addEventListener('click', () => {
            addGameToPool(game);
            searchDropdown.innerHTML = '';
            searchInput.value = '';
        });
        searchDropdown.appendChild(item);
    });
}

function initializeSearch() {
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length >= 3) {
            searchGames(query);
        } else {
            searchDropdown.innerHTML = '';
        }
    });
}

// ============================================================================
// GAME & IMAGE POOL MANAGEMENT
// ============================================================================

function createDraggableImage(src, alt) {
    const wrapper = document.createElement('div');
    wrapper.className = 'game-card-wrapper';

    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.className = 'game-card';
    img.draggable = true;

    img.addEventListener('dragstart', () => {
        draggedCard = wrapper;
        wrapper.classList.add('dragging');
    });

    img.addEventListener('dragend', () => {
        wrapper.classList.remove('dragging');
        draggedCard = null;
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '&times;';
    deleteBtn.className = 'delete-image-btn';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        pushUndo();
        wrapper.remove();
    });

    wrapper.append(img, deleteBtn);
    return wrapper;
}

function addGameToPool(game) {
    const imgWrapper = createDraggableImage(game.tiny_image, game.name);
    gamePool.appendChild(imgWrapper);
}

function addImageToPool(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        compressImage(e.target.result, (compressedSrc) => {
            const imgWrapper = createDraggableImage(compressedSrc, file.name);
            gamePool.appendChild(imgWrapper);
        });
    };
    reader.readAsDataURL(file);
}

function compressImage(src, callback, maxWidth = 400) {
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        callback(canvas.toDataURL('image/webp', 0.8));
    };
    img.src = src;
}
// ============================================================================
// FILE UPLOAD HANDLING
// ============================================================================

function readFolder(folder) {
    const reader = folder.createReader();
    const readBatch = () => {
        reader.readEntries(entries => {
            if (entries.length === 0) return; // done
            entries.forEach(entry => {
                if (entry.isFile) {
                    entry.file(file => {
                        if (file.type.startsWith('image/')) {
                            addImageToPool(file);
                        }
                    });
                } else if (entry.isDirectory) {
                    readFolder(entry);
                }
            });
            readBatch(); // keep reading until empty
        });
    };
    readBatch();
}

function isImageFile(file) {
    if (file.type.startsWith('image/')) return true;
    const ext = file.name.toLowerCase().split('.').pop();
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico', 'avif'].includes(ext);
}

function handleFileUpload(files) {
    Array.from(files).forEach(file => {
        if (isImageFile(file)) {
            addImageToPool(file);
        }
    });
}

function initializeFileUploads() {
    const imageUpload = document.getElementById('image-upload');
    if (imageUpload) {
        imageUpload.addEventListener('change', (e) => {
            handleFileUpload(e.target.files);
        });
    }

    const folderUpload = document.getElementById('folder-upload');
    if (folderUpload) {
        folderUpload.addEventListener('change', (e) => {
            handleFileUpload(e.target.files);
        });
    }
}

// ============================================================================
// DRAG & DROP FUNCTIONALITY
// ============================================================================

function getDragAfterElement(zone, mouseX) {
    // Use .game-card-wrapper for drag targets
    const cards = [...zone.querySelectorAll('.game-card-wrapper:not(.dragging)')];
    return cards.reduce((closest, card) => {
        const box = card.getBoundingClientRect();
        const offset = mouseX - box.left - box.width / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset, element: card };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function handleDrop(zone, e, allowExternalFiles = false) {
    e.preventDefault();
    zone.style.outline = '';

    if (draggedCard) {
        pushUndo();
        const afterElement = getDragAfterElement(zone, e.clientX);
        if (afterElement) {
            zone.insertBefore(draggedCard, afterElement);
        } else {
            zone.appendChild(draggedCard);
        }
        return;
    }

    if (allowExternalFiles) {
        const items = Array.from(e.dataTransfer.items);
        items.forEach(item => {
            if (item.kind === 'file') {
                const entry = item.webkitGetAsEntry();
                if (entry.isDirectory) {
                    readFolder(entry);
                } else if (entry.isFile) {
                    entry.file(file => {
                        if (file.type.startsWith('image/')) {
                            addImageToPool(file);
                        }
                    });
                }
            }
        });
    }
}

function setupZoneDragHandlers(zone, allowExternalFiles = false) {
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.style.outline = '2px dashed #6f89ff';
    });

    zone.addEventListener('dragleave', () => {
        zone.style.outline = '';
    });

    zone.addEventListener('drop', (e) => handleDrop(zone, e, allowExternalFiles));
}

function initializeDragDrop() {
    tierZones.forEach(zone => setupZoneDragHandlers(zone, false));
    setupZoneDragHandlers(gamePool, true);
}

// ============================================================================
// EXPORT FUNCTIONALITY
// ============================================================================

async function downloadTierlist() {
    const filename = prompt('Save as:', window.currentTierlistName || 'tierlist');
    if (!filename) return;

    const rows = document.querySelectorAll('.tier-row');
    if (rows.length === 0) return;

    // Measure dimensions
    const labelW = 120;
    const imgH = 80;
    const imgW = 100;
    const padding = 8;
    const borderW = 2;

    // Calculate row heights based on content
    const rowData = [];
    rows.forEach(row => {
        const label = row.querySelector('.tier-label');
        const imgs = row.querySelectorAll('.tier-zone img.game-card');
        const imgsPerRow = Math.max(Math.floor((1200 - labelW) / (imgW + padding)), 1);
        const imgRows = Math.max(Math.ceil(imgs.length / imgsPerRow), 1);
        const rowH = Math.max(imgRows * (imgH + padding) + padding, 90);
        rowData.push({ label, imgs, rowH, imgsPerRow });
    });

    const totalH = rowData.reduce((sum, r) => sum + r.rowH + borderW, 0) + borderW;
    const totalW = 1200;

    const canvas = document.createElement('canvas');
    canvas.width = totalW;
    canvas.height = totalH;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, totalW, totalH);

    // Outer border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = borderW;
    ctx.strokeRect(0, 0, totalW, totalH);

    let y = borderW;

    for (const rd of rowData) {
        // Label background
        const color = rd.label.style.backgroundColor || window.getComputedStyle(rd.label).backgroundColor;
        ctx.fillStyle = color || '#666';
        ctx.fillRect(borderW, y, labelW, rd.rowH);

        // Label text
        const text = Array.from(rd.label.childNodes)
            .filter(n => n.nodeType === Node.TEXT_NODE)
            .map(n => n.textContent).join('').trim();
        ctx.fillStyle = '#333';
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, borderW + labelW / 2, y + rd.rowH / 2);

        // Label right border
        ctx.fillStyle = '#000';
        ctx.fillRect(borderW + labelW, y, borderW, rd.rowH);

        // Draw images — directly from DOM elements (already loaded)
        let ix = labelW + borderW + padding;
        let iy = y + padding;
        let col = 0;
        rd.imgs.forEach(img => {
            if (col >= rd.imgsPerRow) {
                col = 0;
                ix = labelW + borderW + padding;
                iy += imgH + padding;
            }
            try {
                ctx.drawImage(img, ix, iy, imgW, imgH);
            } catch (e) { /* skip tainted */ }
            ix += imgW + padding;
            col++;
        });

        // Row bottom border
        y += rd.rowH;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, y, totalW, borderW);
        y += borderW;
    }

    // Download
    const link = document.createElement('a');
    link.download = filename.endsWith('.png') ? filename : filename + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

function initializeExport() {
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadTierlist);
    }
}

// ============================================================================
// TIER ROW MANAGEMENT
// ============================================================================

function rgbToHex(rgb) {
    const result = rgb.match(/\d+/g);
    if (!result) return '#cccccc';
    return '#' + result.slice(0, 3).map(x =>
        parseInt(x).toString(16).padStart(2, '0')
    ).join('');
}

const PRESET_COLORS = [
    '#ff7f7f', '#ffbf7f', '#ffff7f', '#7fff7f', '#7fbfff', '#bf7fff',
    '#ff4444', '#ff8800', '#ffcc00', '#00cc44', '#0088ff', '#8800ff',
    '#ffffff', '#cccccc', '#888888', '#444444', '#000000', '#ff69b4'
];

function addColorPicker(label) {
    label.addEventListener('click', () => {
        if (window.getSelection().toString()) return;

        const existing = document.getElementById('color-picker-popup');
        if (existing) {
            existing.remove();
            return;
        }

        const picker = document.createElement('div');
        picker.id = 'color-picker-popup';

        PRESET_COLORS.forEach(color => {
            const swatch = document.createElement('div');
            swatch.classList.add('color-swatch');
            swatch.style.backgroundColor = color;
            swatch.addEventListener('click', (e) => {
                e.stopPropagation();
                label.style.backgroundColor = color;
                picker.remove();
            });
            picker.appendChild(swatch);
        });

        const box = label.getBoundingClientRect();
        picker.style.top = `${box.bottom + window.scrollY + 6}px`;
        picker.style.left = `${box.left + window.scrollX}px`;

        document.body.appendChild(picker);

        setTimeout(() => {
            document.addEventListener('click', function handler(e) {
                if (!picker.contains(e.target) && e.target !== label) {
                    picker.remove();
                    document.removeEventListener('click', handler);
                }
            });
        }, 0);
    });
}

function autoShrinkLabel(label) {
    label.addEventListener('input', () => {
        // Get only the text content, excluding the delete button
        const text = Array.from(label.childNodes)
            .filter(node => node.nodeType === Node.TEXT_NODE)
            .map(node => node.textContent)
            .join('')
            .trim();
        const length = text.length;

        if (length <= 2) {
            label.style.fontSize = '2rem';
        } else if (length <= 5) {
            label.style.fontSize = '1.2rem';
        } else if (length <= 10) {
            label.style.fontSize = '0.85rem';
        } else {
            label.style.fontSize = '0.65rem';
        }
    });
}

function addDeleteButton(label, row) {
    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('delete-tier-btn');
    deleteBtn.innerHTML = '&times;';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        pushUndo();
        const pool = document.getElementById('game-pool');
        const cards = [...row.querySelectorAll('.game-card-wrapper')];
        cards.forEach(card => pool.appendChild(card));
        row.remove();
    });
    label.appendChild(deleteBtn);
}

function makeRowDraggable(label, row) {
    label.addEventListener('mousedown', () => {
        row.draggable = true;
    });

    label.addEventListener('mouseup', () => {
        row.draggable = false;
    });

    row.addEventListener('dragstart', (e) => {
        if (!row.draggable) return;
        row.classList.add('dragging-row');
        draggedCard = null;
        e.dataTransfer.effectAllowed = 'move';
    });

    row.addEventListener('dragend', () => {
        row.classList.remove('dragging-row');
        row.draggable = false;
    });
}

function initializeRowDragging() {
    const tierlist = document.getElementById('tierlist');
    if (!tierlist) return;

    tierlist.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggingRow = document.querySelector('.tier-row.dragging-row');
        if (!draggingRow) return;

        const rows = [...tierlist.querySelectorAll('.tier-row:not(.dragging-row)')];
        const afterRow = rows.find(row => {
            const box = row.getBoundingClientRect();
            return e.clientY < box.top + box.height / 2;
        });

        if (afterRow) {
            tierlist.insertBefore(draggingRow, afterRow);
        } else {
            tierlist.appendChild(draggingRow);
        }
    });
}

function addNewRow() {
    pushUndo();
    const tierlist = document.getElementById('tierlist');
    const newRow = document.createElement('div');
    newRow.classList.add('tier-row');

    const label = document.createElement('div');
    label.classList.add('tier-label');
    label.contentEditable = 'true';
    label.innerText = 'New';
    label.style.backgroundColor = '#cccccc';

    const zone = document.createElement('div');
    zone.classList.add('tier-zone');

    newRow.appendChild(label);
    newRow.appendChild(zone);
    tierlist.appendChild(newRow);

    setupZoneDragHandlers(zone, false);
    addColorPicker(label);
    makeRowDraggable(label, newRow);
    addDeleteButton(label, newRow);
    autoShrinkLabel(label);
    label.focus();
}

// ============================================================================
// EXPOSE FUNCTIONS FOR FIREBASE MODULE
// ============================================================================

window.createDraggableImage = createDraggableImage;
window.setupZoneDragHandlers = setupZoneDragHandlers;
window.addColorPicker = addColorPicker;
window.makeRowDraggable = makeRowDraggable;
window.addDeleteButton = addDeleteButton;
window.autoShrinkLabel = autoShrinkLabel;
window.initializeRowDragging = initializeRowDragging;
window.pushUndo = pushUndo;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeSearch();
    if (gamePool) {
        initializeFileUploads();
        initializeDragDrop();
        initializeExport();
    }

    document.querySelectorAll('.tier-row').forEach(row => {
        const label = row.querySelector('.tier-label');
        addColorPicker(label);
        makeRowDraggable(label, row);
        addDeleteButton(label, row);
        autoShrinkLabel(label);
    });

    initializeRowDragging();

    const addRowBtn = document.getElementById('add-row-btn');
    if (addRowBtn) {
        addRowBtn.addEventListener('click', addNewRow);
    }

    const undoBtn = document.getElementById('undo-btn');
    if (undoBtn) undoBtn.addEventListener('click', undo);

    const redoBtn = document.getElementById('redo-btn');
    if (redoBtn) redoBtn.addEventListener('click', redo);

    const resetPoolBtn = document.getElementById('reset-pool-btn');
    if (resetPoolBtn) resetPoolBtn.addEventListener('click', resetToPool);

    updateUndoRedoButtons();

    // Ctrl+Z / Ctrl+Shift+Z (or Cmd on Mac)
    document.addEventListener('keydown', (e) => {
        const mod = e.metaKey || e.ctrlKey;
        if (mod && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undo();
        } else if (mod && e.key === 'z' && e.shiftKey) {
            e.preventDefault();
            redo();
        } else if (mod && e.key === 'y') {
            e.preventDefault();
            redo();
        }
    });
});