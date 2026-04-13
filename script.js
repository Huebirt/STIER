const hamMenu = document.querySelector('.ham-menu')
const offScreenMenu = document.querySelector(".off-screen-menu")
hamMenu.addEventListener('click', () => {
    hamMenu.classList.toggle('active');
    offScreenMenu.classList.toggle('active');
})

let allGames = [];
let draggedCard = null;

async function searchGames(query) {
    const response = await fetch(`https://corsproxy.io/?url=${encodeURIComponent('https://store.steampowered.com/api/storesearch/?term=' + query + '&l=english&cc=US')}`);
    const data = await response.json();
    showResults(data);
}

const searchInput = document.querySelector('.search-input');

searchInput.addEventListener('input', (e) => {
    const query = e.target.value;
    if (query.length >= 3) {
        searchGames(query);
    } else {
        document.getElementById('search-dropdown').innerHTML = '';
    }
});

function addGameToPool(game) {
    const img = document.createElement('img');
    img.src = game.tiny_image;
    img.alt = game.name;
    img.classList.add('game-card');
    img.draggable = true;

    img.addEventListener('dragstart', () => {
        draggedCard = img;
        img.style.opacity = '0.5';
    });

    img.addEventListener('dragend', () => {
        img.style.opacity = '1';
        draggedCard = null;
    });

    const pool = document.querySelector('#game-pool');
    pool.appendChild(img);
}

function addImageToPool(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.alt = file.name;
        img.classList.add('game-card');
        img.draggable = true;

        img.addEventListener('dragstart', () => {
            draggedCard = img;
            img.style.opacity = '0.5';
        });

        img.addEventListener('dragend', () => {
            img.style.opacity = '1';
            draggedCard = null;
        });

        gamePool.appendChild(img);
    };
    reader.readAsDataURL(file);
}

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

function showResults(games) {
    const dropdown = document.getElementById('search-dropdown');
    dropdown.innerHTML = '';

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
            document.getElementById('search-dropdown').innerHTML = '';
            searchInput.value = '';
        });
        dropdown.appendChild(item);
    });
}

const tierZones = document.querySelectorAll('.tier-zone');
const gamePool = document.querySelector('#game-pool');

tierZones.forEach(zone => {
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.style.outline = '2px dashed #6f89ff';
    });

    zone.addEventListener('dragleave', () => {
        zone.style.outline = '';
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.style.outline = '';
        if (draggedCard) {
            zone.appendChild(draggedCard);
        }
    });
});

gamePool.addEventListener('dragover', (e) => {
    e.preventDefault();
    gamePool.style.outline = '2px dashed #6f89ff';
});

gamePool.addEventListener('dragleave', () => {
    gamePool.style.outline = '';
});

gamePool.addEventListener('drop', (e) => {
    e.preventDefault();
    gamePool.style.outline = '';

    if (draggedCard) {
        gamePool.appendChild(draggedCard);
        return;
    }

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
});

const imageUpload = document.getElementById('image-upload');
imageUpload.addEventListener('change', (e) => {
    Array.from(e.target.files).forEach(file => {
        if (file.type.startsWith('image/')) {
            addImageToPool(file);
        }
    });
});

const folderUpload = document.getElementById('folder-upload');
folderUpload.addEventListener('change', (e) => {
    Array.from(e.target.files).forEach(file => {
        if (file.type.startsWith('image/')) {
            addImageToPool(file);
        }
    });
});