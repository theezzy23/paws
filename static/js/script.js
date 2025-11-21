document.addEventListener('DOMContentLoaded', () => {
    const cardStack = document.getElementById('card-stack');
    const mainContent = document.getElementById('main-content');
    const summaryView = document.getElementById('summary-view');
    const likedGrid = document.getElementById('liked-grid');
    const likedCountSpan = document.getElementById('liked-count');
    const btnLike = document.getElementById('btn-like');
    const btnDislike = document.getElementById('btn-dislike');
    const btnRestart = document.getElementById('btn-restart');

    let cats = [];
    let currentIndex = 0;
    let likedCats = [];
    let dislikedCats = [];

    // Configuration
    const SWIPE_THRESHOLD = 100; // Pixels to trigger swipe
    const ROTATION_MAX = 20; // Max rotation in degrees

    // Initialize
    init();

    function init() {
        fetchCats();
        setupControls();
    }

    async function fetchCats() {
        try {
            // Fetch 10 random cats
            // Generate a random skip to get different cats each time (assuming ~1000+ cute cats exist)
            const randomSkip = Math.floor(Math.random() * 500);
            const response = await fetch(`https://cataas.com/api/cats?tags=cute&limit=10&skip=${randomSkip}`);
            const data = await response.json();

            // Cataas API returns objects with id. URL is https://cataas.com/cat/{id}
            cats = data.map(cat => ({
                id: cat.id,
                url: `https://cataas.com/cat/${cat.id}?width=500`
            }));

            renderStack();
        } catch (error) {
            console.error('Error fetching cats:', error);
            cardStack.innerHTML = '<div class="loading-indicator">Failed to load cats. Refresh to try again.</div>';
        }
    }

    function renderStack() {
        cardStack.innerHTML = '';

        if (currentIndex >= cats.length) {
            showSummary();
            return;
        }

        // Render current card
        createCard(cats[currentIndex], true);

        // Render next card (background)
        if (currentIndex + 1 < cats.length) {
            createCard(cats[currentIndex + 1], false);
        }

        // Preload next few images
        preloadImages();
    }

    function preloadImages() {
        // Preload the next 3 images
        for (let i = currentIndex + 2; i < currentIndex + 5 && i < cats.length; i++) {
            const img = new Image();
            img.src = cats[i].url;
        }
    }

    function createCard(cat, isTop) {
        const card = document.createElement('div');
        card.classList.add('card');
        if (isTop) {
            card.style.zIndex = 10;
            setupGestures(card);
        } else {
            card.style.zIndex = 5;
            card.style.transform = 'scale(0.95) translateY(10px)';
            card.style.opacity = '0.8';
        }

        const img = document.createElement('img');
        img.src = cat.url;
        img.alt = 'Cute cat';
        img.draggable = false;

        // Overlays
        const likeOverlay = document.createElement('div');
        likeOverlay.classList.add('card-overlay', 'like');
        likeOverlay.innerText = 'LIKE';

        const dislikeOverlay = document.createElement('div');
        dislikeOverlay.classList.add('card-overlay', 'dislike');
        dislikeOverlay.innerText = 'NOPE';

        card.appendChild(img);
        card.appendChild(likeOverlay);
        card.appendChild(dislikeOverlay);
        cardStack.appendChild(card);
    }

    function setupGestures(card) {
        let isDragging = false;
        let startX = 0;
        let currentX = 0;

        const onDragStart = (e) => {
            isDragging = true;
            startX = getClientX(e);
            card.style.transition = 'none';
        };

        const onDragMove = (e) => {
            if (!isDragging) return;
            e.preventDefault(); // Prevent scrolling on mobile
            currentX = getClientX(e);
            const deltaX = currentX - startX;
            const rotation = deltaX * 0.1; // 10px move = 1deg rotation

            card.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`;

            // Opacity of overlays
            const likeOverlay = card.querySelector('.like');
            const dislikeOverlay = card.querySelector('.dislike');

            const opacity = Math.min(Math.abs(deltaX) / (SWIPE_THRESHOLD * 0.8), 1);

            if (deltaX > 0) {
                likeOverlay.style.opacity = opacity;
                dislikeOverlay.style.opacity = 0;
            } else {
                likeOverlay.style.opacity = 0;
                dislikeOverlay.style.opacity = opacity;
            }
        };

        const onDragEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            const deltaX = currentX - startX;

            if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
                const direction = deltaX > 0 ? 1 : -1;
                swipeCard(direction);
            } else {
                resetCard(card);
            }
        };

        // Mouse events
        card.addEventListener('mousedown', onDragStart);
        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup', onDragEnd);

        // Touch events
        card.addEventListener('touchstart', onDragStart);
        document.addEventListener('touchmove', onDragMove, { passive: false });
        document.addEventListener('touchend', onDragEnd);
    }

    function getClientX(e) {
        return e.touches ? e.touches[0].clientX : e.clientX;
    }

    function resetCard(card) {
        card.style.transition = 'transform 0.3s ease';
        card.style.transform = 'translateX(0) rotate(0)';
        card.querySelector('.like').style.opacity = 0;
        card.querySelector('.dislike').style.opacity = 0;
    }

    function swipeCard(direction) {
        const card = cardStack.querySelector('.card'); // The top card
        if (!card) return;

        // 1 = Right (Like), -1 = Left (Dislike)
        const endX = direction * window.innerWidth * 1.5;
        const rotation = direction * 30;

        card.style.transition = 'transform 0.5s ease';
        card.style.transform = `translateX(${endX}px) rotate(${rotation}deg)`;

        // Record result
        const currentCat = cats[currentIndex];
        if (direction === 1) {
            likedCats.push(currentCat);
        } else {
            dislikedCats.push(currentCat);
        }

        // Wait for animation then remove
        setTimeout(() => {
            currentIndex++;
            renderStack();
        }, 300);
    }

    function setupControls() {
        btnLike.addEventListener('click', () => swipeCard(1));
        btnDislike.addEventListener('click', () => swipeCard(-1));

        btnRestart.addEventListener('click', () => {
            currentIndex = 0;
            likedCats = [];
            dislikedCats = [];
            summaryView.classList.add('hidden');
            fetchCats(); // Fetch new cats or restart same? Let's fetch new.
        });
    }

    function showSummary() {
        summaryView.classList.remove('hidden');
        likedCountSpan.innerText = likedCats.length;
        likedGrid.innerHTML = '';

        likedCats.forEach(cat => {
            const img = document.createElement('img');
            img.src = cat.url;
            img.alt = 'Liked cat';
            likedGrid.appendChild(img);
        });
    }
});
