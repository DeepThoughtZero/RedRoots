// js/core/AIEvolver.js

class AIEvolver {
    constructor(gameState) {
        this.gameState = gameState;
        this.generation = parseInt(localStorage.getItem('redroots_ai_gen') || '0');
        this.populationSize = 4; // 1 Reference + 3 Evolving variants
        this.genomes = this.loadGenomes();
        
        // Force update Reference (Slot 0) to latest logic
        this.genomes[0].params = {
            r_pentomino_weight: 0.5,
            diehard_weight: 0.5,
            acorn_weight: 1.0,
            b_heptomino_weight: 0.9,
            switch_engine_weight: 0.8,
            rabbits_weight: 0.4,
            lidka_weight: 0.5,
            lwss_weight: 0.3,
            glider_gun_weight: 0.2,
            glider_weight: 0.1,
            block_weight: 0.3,
            random_rotation_chance: 1.0,
            expansion_weight: 1.0
        };
        
        this.currentGenomeIndex = 0; // Always use all 4 genomes every game
    }

    loadGenomes() {
        const saved = localStorage.getItem('redroots_ai_genomes');
        if (saved) return JSON.parse(saved);
        
        // Initial population
        const initial = [];
        // Slot 0: The Eternal Reference (Standard Hard AI)
        initial.push({
            id: 0,
            isReference: true,
            fitness: 0,
            params: {
                r_pentomino_weight: 0.8,
                lwss_weight: 0.3,
                glider_gun_weight: 0.2,
                glider_weight: 0.1,
                block_weight: 0.5,
                random_rotation_chance: 1.0, // Spread in all directions
                expansion_weight: 1.0        // Maximize distribution on the field
            }
        });

        // Slots 1-3: Evolving candidates
        for (let i = 1; i < this.populationSize; i++) {
            initial.push({
                id: i,
                isReference: false,
                fitness: 0,
                params: {
                    r_pentomino_weight: Math.random() * 0.5,
                    diehard_weight: Math.random(),
                    acorn_weight: 0.5 + Math.random() * 0.5, // High start
                    b_heptomino_weight: 0.5 + Math.random() * 0.5, // High start
                    switch_engine_weight: 0.4 + Math.random() * 0.6, // High start
                    rabbits_weight: Math.random(),
                    lidka_weight: Math.random(),
                    lwss_weight: Math.random(),
                    glider_gun_weight: Math.random() * 0.5, // Guns are expensive
                    glider_weight: Math.random(),
                    block_weight: Math.random() * 0.5,
                    random_rotation_chance: Math.random(),
                    expansion_weight: Math.random()
                }
            });
        }
        return initial;
    }

    saveGenomes() {
        localStorage.setItem('redroots_ai_genomes', JSON.stringify(this.genomes));
        localStorage.setItem('redroots_ai_gen', this.generation.toString());
    }

    mutate(genomeParams) {
        const mutated = { ...genomeParams };
        const keys = Object.keys(mutated);
        // Mutate 2 random parameters per step for faster change
        for (let i = 0; i < 2; i++) {
            const key = keys[Math.floor(Math.random() * keys.length)];
            const variance = (Math.random() * 0.4) - 0.2; // +/- 20%
            mutated[key] = Math.max(0, Math.min(1.0, mutated[key] + variance));
        }
        return mutated;
    }

    recordResult(playerStats) {
        console.group(`--- Evolution Cycle ${this.generation + 1} ---`);
        
        // Calculate fitness for this game
        playerStats.forEach(stat => {
            const proximityBonus = Math.max(0, 200 - stat.minDistanceToEnemyCamp);
            const fitness = stat.territoryCount * 1.0 + proximityBonus + (stat.won ? 500 : 0);
            
            const genome = this.genomes.find(g => g.assignedToPlayer === stat.pId);
            if (genome) {
                genome.lastFitness = fitness;
                console.log(`${genome.isReference ? '[REF]' : '[EVO]'} Player ${stat.pId} (Genome ${genome.id}): Fit: ${fitness.toFixed(1)} ${stat.won ? '🏆' : ''}`);
            }
        });

        // Evolution Logic (Option B):
        // 1. Find best among Evolving genomes (1-3)
        const contenders = this.genomes.filter(g => !g.isReference);
        contenders.sort((a, b) => b.lastFitness - a.lastFitness);
        const bestContender = contenders[0];

        // 2. Report if Contender beat Reference
        const reference = this.genomes.find(g => g.isReference);
        if (bestContender.lastFitness > reference.lastFitness) {
            console.log(`%c✨ GENIAL: Mutation ${bestContender.id} hat die Referenz geschlagen!`, "color: #00ff00; font-weight: bold;");
        } else {
            console.log("%cReference remains superior.", "color: #ffaa00;");
        }

        // 3. Mutate: The best contender becomes the new parent for the next 3
        const newParentParams = bestContender.params;
        this.generation++;
        
        // Update all contenders for next game
        for (let i = 1; i < this.populationSize; i++) {
            this.genomes[i].params = (i === 1) ? newParentParams : this.mutate(newParentParams);
            this.genomes[i].fitness = 0; // Reset trial fitness
        }

        console.log("New Genomes for next game:", contenders.map(c => c.params));
        console.groupEnd();

        this.saveGenomes();
    }
}
