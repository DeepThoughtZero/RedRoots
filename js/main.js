// js/main.js

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    
    // UIManager handles the lifecycle, starting with the setup menu
    const uiManager = new UIManager(canvas, null);

    // Initial canvas sizing before game starts
    function initialResize() {
        const container = canvas.parentElement;
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    }
    initialResize();
    window.addEventListener('resize', initialResize);
});
