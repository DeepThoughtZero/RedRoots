// js/utils/Constants.js

const CONSTANTS = {
    // Player Colors (Neon aesthetic)
    PLAYER_COLORS: [
        { main: '#00FFFF', bg: 'rgba(0, 255, 255, 0.1)', shadow: 'rgba(0, 255, 255, 0.5)' }, // P1: Cyan
        { main: '#FF00FF', bg: 'rgba(255, 0, 255, 0.1)', shadow: 'rgba(255, 0, 255, 0.5)' }, // P2: Pink
        { main: '#39FF14', bg: 'rgba(57, 255, 20, 0.1)', shadow: 'rgba(57, 255, 20, 0.5)' }, // P3: Green
        { main: '#FFFF00', bg: 'rgba(255, 255, 0, 0.1)', shadow: 'rgba(255, 255, 0, 0.5)' }  // P4: Yellow
    ],
    NEUTRAL_COLOR: '#9ca3af', // gray-400
    DEAD_CELL_COLOR: 'rgba(0,0,0,0)', 
    GRID_LINE_COLOR: 'rgba(255,255,255,0.05)',
    BURN_LINE_COLOR: 'rgba(239, 68, 68, 0.5)', // Red laser
    CAMP_BG_OPACITY: 0.2,
    
    // Cell/Map logic
    OWNER_NONE: null,
    OWNER_NEUTRAL: -1,
    OWNER_ROCK: -3,
    
    // Game Phases
    PHASE_SETUP: 'SETUP',
    PHASE_PLACEMENT: 'PLACEMENT',
    PHASE_SIMULATION: 'SIMULATION',
    PHASE_GAMEOVER: 'GAMEOVER',

    // Base Budget (fallback, now mostly taken from config)
    BASE_BUDGET_PER_ROUND: 300,

    // Patterns definition (offsets [row, col])
    PATTERNS: {
        'cell': { name: 'Einzelzelle', pattern: [[0, 0]] },
        'block': { name: 'Block', pattern: [[0,0], [0,1], [1,0], [1,1]] },
        'blinker': { name: 'Blinker', pattern: [[0,0], [0,1], [0,2]] },
        'glider': { name: 'Gleiter', pattern: [[0, 1], [1, 2], [2, 0], [2, 1], [2, 2]] },
        'lwss': { name: 'Raumschiff', pattern: [[0, 1], [0, 4], [1, 0], [2, 0], [2, 4], [3, 0], [3, 1], [3, 2], [3, 3]] },
        'r_pentomino': { name: 'R-Pentomino', pattern: [[0, 1], [0, 2], [1, 0], [1, 1], [2, 1]] },
        'herschel': { name: 'Herschel', pattern: [[0, 1], [0, 2], [1, 0], [1, 2], [2, 2], [2, 3], [2, 4]] },
        'pulsar_quadrant': { name: 'Pulsar-Teil', pattern: [[0,2], [0,3], [0,4], [2,0], [3,0], [4,0], [2,5], [3,5], [4,5], [5,2], [5,3], [5,4]]},
        'glider_gun': {
            name: 'Gleiter-Kanone',
            pattern: [[0,24],[1,22],[1,24],[2,12],[2,13],[2,20],[2,21],[2,34],[2,35],[3,11],[3,15],[3,20],[3,21],[3,34],[3,35],[4,0],[4,1],[4,10],[4,16],[4,20],[4,21],[5,0],[5,1],[5,10],[5,14],[5,16],[5,17],[5,22],[5,24],[6,10],[6,16],[6,24],[7,11],[7,15],[8,12],[8,13]]
        }
    }
};

// Calculate cost dynamically based on number of cells
Object.values(CONSTANTS.PATTERNS).forEach(p => {
    p.cost = p.pattern.length;
});
