
const hamMenu = document.querySelector('.ham-menu')
const offScreenMenu = document.querySelector(".off-screen-menu")
hamMenu.addEventListener('click', () => {
    hamMenu.classList.toggle('active');
    offScreenMenu.classList.toggle('active');
})

let allGames = [];

async function searchGames(query) {
    const response = await fetch(`https://corsproxy.io/?url=${encodeURIComponent('https://store.steampowered.com/api/storesearch/?term=' + query + '&l=english&cc=US')}`);
    const data = await response.json();
    console.log(data);
}

const searchInput = document.querySelector('.search-input');

searchInput.addEventListener('input', (e) => {
    const query = e.target.value;
    if (query.length >= 3) {
        searchGames(query);
    }
});