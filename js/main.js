// js/main.js

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    
    // UIManager handles the lifecycle, starting with the setup menu
    const uiManager = new UIManager(canvas, null);
    uiManager.audio = new GameAudio();
    document.getElementById('modeSelection').insertAdjacentHTML('beforeend', uiManager.audio.controls());
    uiManager.campaign = new CampaignManager(uiManager);

    // Initial canvas sizing before game starts
    function initialResize() {
        if (uiManager.renderer) { uiManager.renderer.resize(); return; }
        const container = canvas.parentElement;
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        uiManager.render();
    }
    initialResize();
    window.addEventListener('resize', initialResize);
});
