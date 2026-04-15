// ============================================================================
// STier - Tier List Maker
// ============================================================================

// ============================================================================
// STATE & DOM SELECTORS
// ============================================================================

let draggedCard = null;

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
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';

    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.classList.add('game-card');
    img.draggable = true;

    img.addEventListener('dragstart', () => {
        draggedCard = wrapper;
        img.style.opacity = '0.5';
    });

    img.addEventListener('dragend', () => {
        img.style.opacity = '1';
        draggedCard = null;
    });

    // Add delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '×';
    deleteBtn.className = 'delete-image-btn';
    deleteBtn.style.position = 'absolute';
    deleteBtn.style.top = '2px';
    deleteBtn.style.right = '2px';
    deleteBtn.style.background = 'rgba(0,0,0,0.5)';
    deleteBtn.style.color = 'white';
    deleteBtn.style.border = 'none';
    deleteBtn.style.borderRadius = '50%';
    deleteBtn.style.width = '20px';
    deleteBtn.style.height = '20px';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.display = 'flex';
    deleteBtn.style.alignItems = 'center';
    deleteBtn.style.justifyContent = 'center';
    deleteBtn.style.fontSize = '1rem';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        wrapper.remove();
    });

    wrapper.appendChild(img);
    wrapper.appendChild(deleteBtn);
    return wrapper;
}

function addGameToPool(game) {
    const imgWrapper = createDraggableImage(game.tiny_image, game.name);
    gamePool.appendChild(imgWrapper);
}

function addImageToPool(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const imgWrapper = createDraggableImage(e.target.result, file.name);
        gamePool.appendChild(imgWrapper);
    };
    reader.readAsDataURL(file);
}
// ============================================================================
// FILE UPLOAD HANDLING
// ============================================================================

function readFolder(folder) {
    const reader = folder.createReader();
    reader.readEntries(entries => {
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
    });
}

function handleFileUpload(files) {
    Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
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
    const cards = [...zone.querySelectorAll('.game-card:not(.dragging)')];

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

function downloadTierlist() {
    const element = document.getElementById('tierlist');
    // Wait for all images in the tierlist to load
    const images = element.querySelectorAll('img');
    const promises = Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
            img.onload = img.onerror = resolve;
        });
    });

    Promise.all(promises).then(() => {
        html2canvas(element, { useCORS: true }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'tierlist.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    });
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
        const length = label.innerText.trim().length;
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
    deleteBtn.textContent = '✕';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pool = document.getElementById('game-pool');
        const cards = [...row.querySelectorAll('.game-card')];
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
});