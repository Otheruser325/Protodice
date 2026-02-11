import ErrorHandler from '../ErrorManager.js';
import { DEBUG_MODE } from '../DebugManager.js';

/**
 * Loads and renders sprite actors from JSON sprite definitions.
 * Supports defences, monsters, puddles, and projectiles.
 */
export default class SpriteFactory {
    static spriteData = {};
    static spriteAnimations = {};

    static _resolveFolder(type) {
        const t = String(type || '').trim().toLowerCase();
        switch (t) {
            case 'defence':
                return 'DefenceSprites';
            case 'monster':
                return 'MonsterSprites';
            case 'puddle':
                return 'PuddleSprites';
            case 'projectile':
                return 'ProjectileSprites';
            default:
                if (!type) return 'Sprites';
                return `${type}Sprites`;
        }
    }

    static _normalizeName(name) {
        if (!name) return '';
        const raw = String(name).trim();
        if (!raw) return '';
        return raw.replace(/\.json$/i, '');
    }

    static _isNullLike(name) {
        if (!name) return true;
        const lowered = String(name).trim().toLowerCase();
        return !lowered || lowered === 'null' || lowered === 'none' || lowered === 'undefined';
    }

    static _getPrimaryActor(data) {
        if (!data || !Array.isArray(data.actors)) return null;
        const shown = data.actors.find(actor => actor && actor.sprite && (actor.Shown === true || actor.Shown === undefined));
        if (shown) return shown;
        return data.actors.find(actor => actor && actor.sprite) || null;
    }

    static getCachedPrimarySpriteKey(type, name) {
        const cleanName = this._normalizeName(name);
        if (!cleanName) return null;
        const key = `${type}:${cleanName}`;
        const data = this.spriteData[key];
        const actor = this._getPrimaryActor(data);
        return actor?.sprite || null;
    }

    static async getPrimarySpriteKey(type, name) {
        if (this._isNullLike(name)) return null;
        const cleanName = this._normalizeName(name);
        if (!cleanName) return null;
        const cached = this.getCachedPrimarySpriteKey(type, cleanName);
        if (cached) return cached;
        const data = await this.loadSpriteDefinition(type, cleanName);
        const actor = this._getPrimaryActor(data);
        return actor?.sprite || null;
    }

    static async preloadSpriteDefinitions(type, names = []) {
        const unique = new Set();
        for (const name of (names || [])) {
            const clean = this._normalizeName(name);
            if (!clean) continue;
            if (this._isNullLike(clean)) continue;
            unique.add(clean);
        }

        for (const key of unique) {
            try {
                await this.loadSpriteDefinition(type, key);
            } catch (e) {}
        }

        return unique.size;
    }

    /**
     * Load a single sprite definition from JSON.
     * @param {string} type - Type of sprite ('defence', 'monster', 'puddle', 'projectile')
     * @param {string} name - Name of the sprite (e.g., 'SniperTower', 'Orc')
     * @returns {Promise<Object>} Parsed sprite data
     */
    static async loadSpriteDefinition(type, name) {
        const cleanName = this._normalizeName(name);
        if (!cleanName) return null;
        const key = `${type}:${cleanName}`;
        
        if (this.spriteData[key]) {
            return this.spriteData[key];
        }

        try {
            const folder = this._resolveFolder(type);
            const path = `assets/gamedata/${folder}/${cleanName}.json`;
            const response = await fetch(path);
            
            if (!response.ok) {
                ErrorHandler.logError(`Failed to load sprite definition: ${path}`);
                return null;
            }

            const data = await response.json();
            this.validateSpriteData(data);
            this.spriteData[key] = data;
            return data;
        } catch (e) {
            ErrorHandler.logError(`Error loading sprite ${type}:${cleanName}: ${e.message}`);
            return null;
        }
    }

    /**
     * Validate sprite definition structure.
     * @param {Object} data - Sprite definition
     */
    static validateSpriteData(data) {
        if (!Array.isArray(data.actors)) {
            throw new Error('Invalid sprite data: missing "actors" array');
        }
        if (!data.stageOptions || typeof data.stageOptions !== 'object') {
            throw new Error('Invalid sprite data: missing "stageOptions"');
        }
        if (!Array.isArray(data.stageOptions.SpriteInfo)) {
            throw new Error('Invalid sprite data: stageOptions.SpriteInfo must be an array');
        }
        if (typeof data.stageOptions.StageLength !== 'number') {
            throw new Error('Invalid sprite data: stageOptions.StageLength must be a number');
        }
        // timelines can be null for static sprites
        if (data.timelines !== null && !Array.isArray(data.timelines)) {
            throw new Error('Invalid sprite data: timelines must be null or array');
        }
        
        // Validate actors
        for (const actor of data.actors) {
            if (!actor.sprite || !Array.isArray(actor.Position) || actor.Position.length !== 2) {
                throw new Error('Invalid actor: missing sprite name or invalid position');
            }
            if (!Array.isArray(actor.Scale) || actor.Scale.length !== 2) {
                throw new Error('Invalid actor: invalid scale');
            }
            if (typeof actor.uid !== 'number') {
                throw new Error('Invalid actor: missing uid');
            }
        }
    }

    /**
     * Create a sprite container with all actors for a given definition.
     * @param {Phaser.Scene} scene - Phaser scene
     * @param {string} type - Type of sprite
     * @param {string} name - Name of the sprite
     * @param {number} x - World position X
     * @param {number} y - World position Y
     * @param {Object} options - Additional options (depth, animations, etc.)
     * @returns {Promise<Phaser.GameObjects.Container>} Container with all sprite actors
     */
    static async createSprite(scene, type, name, x = 0, y = 0, options = {}) {
        const spriteData = await this.loadSpriteDefinition(type, name);
        if (!spriteData) return null;

        const container = scene.add.container(x, y);
        const spriteMap = {}; // Map of uid to sprite object for animation

        // Create all actors
        for (const actor of spriteData.actors) {
            if (!actor.Shown) continue;

            try {
                const sprite = scene.add.sprite(
                    actor.Position[0],
                    actor.Position[1],
                    actor.sprite
                );
                
                // Apply properties
                sprite.setScale(actor.Scale[0], actor.Scale[1]);
                sprite.setAlpha(actor.Alpha);
                sprite.setRotation((actor.Angle * Math.PI) / 180);
                sprite.setOrigin(actor.Alignment[0], actor.Alignment[1]);
                
                if (actor.Flip !== 0) {
                    sprite.setFlip(actor.Flip === 1 || actor.Flip === 3, actor.Flip === 2 || actor.Flip === 3);
                }

                // Apply colour if specified (HEX format)
                if (actor.Colour) {
                    sprite.setTint(parseInt(actor.Colour.replace('#', ''), 16));
                }

                container.add(sprite);
                spriteMap[actor.uid] = sprite;
            } catch (e) {
                ErrorHandler.logError(`Failed to create actor sprite "${actor.sprite}": ${e.message}`);
            }
        }

        // Store spray data for animation reference
        container.spriteData = spriteData;
        container.spriteMap = spriteMap;
        container.spriteType = type;
        container.spriteName = name;

        // Apply options
        if (options.depth !== undefined) container.setDepth(options.depth);
        if (options.interactive) container.setInteractive();

        // Store animation timeline (only if animations exist)
        const animKey = `${type}:${name}`;
        if (spriteData.timelines && spriteData.stageOptions) {
            this.spriteAnimations[animKey] = {
                timelines: spriteData.timelines,
                stageLength: spriteData.stageOptions.StageLength
            };
        }

        if (DEBUG_MODE) {
            console.log(`[SpriteFactory] Created sprite: ${type}:${name} at (${x}, ${y})`);
        }

        return container;
    }

    /**
     * Play a sprite animation based on timeline data.
     * @param {Phaser.Scene} scene - Phaser scene
     * @param {Phaser.GameObjects.Container} container - Sprite container
     * @param {number} startTime - Start time for animation (default 0)
     * @param {number} duration - Duration to play (if undefined, plays full cycle)
     * @param {Function} onComplete - Callback when animation completes
     */
    static animateSprite(scene, container, startTime = 0, duration = null, onComplete = null) {
        const animKey = `${container.spriteType}:${container.spriteName}`;
        const animData = this.spriteAnimations[animKey];

        if (!animData) {
            if (DEBUG_MODE) {
                console.warn(`[SpriteFactory] No animation data for: ${animKey} (static sprite)`);
            }
            return;
        }

        const { timelines, stageLength } = animData;
        const playDuration = duration || (stageLength * 1000);

        // Apply timeline interpolation
        for (const timeline of timelines) {
            const sprite = container.spriteMap[timeline.spriteuid];
            if (!sprite) continue;

            this._applyTimelineAnimation(scene, sprite, timeline, startTime, playDuration, onComplete);
        }
    }

    /**
     * Interpolate and apply timeline keyframes to a sprite.
     * @private
     */
    static _applyTimelineAnimation(scene, sprite, timeline, startTime, duration, onComplete) {
        const stages = timeline.stage;
        if (stages.length === 0) return;

        // Find current and next keyframes based on startTime
        let prevStage = stages[0];
        let nextStage = stages[0];
        
        for (let i = 0; i < stages.length; i++) {
            if (stages[i].Time >= startTime) {
                nextStage = stages[i];
                prevStage = i > 0 ? stages[i - 1] : stages[0];
                break;
            }
            prevStage = stages[i];
        }

        // Apply initial state from prevStage
        this._applySpriteState(sprite, prevStage);

        // Create tweened animations for property transitions
        if (nextStage && nextStage.Time > prevStage.Time) {
            const timeDiff = nextStage.Time - prevStage.Time;
            const tweenDelay = Math.max(0, (startTime - prevStage.Time) * duration / timeDiff);
            const tweenDuration = (timeDiff * duration) / timeline.stage[timeline.stage.length - 1].Time;

            scene.tweens.add({
                targets: sprite,
                x: { from: prevStage.Position[0], to: nextStage.Position[0] },
                y: { from: prevStage.Position[1], to: nextStage.Position[1] },
                scaleX: { from: prevStage.Scale[0], to: nextStage.Scale[0] },
                scaleY: { from: prevStage.Scale[1], to: nextStage.Scale[1] },
                alpha: { from: prevStage.Alpha, to: nextStage.Alpha },
                angle: { from: prevStage.Angle, to: nextStage.Angle },
                duration: tweenDuration,
                delay: tweenDelay,
                ease: 'Linear',
                repeat: -1,
                onComplete: onComplete
            });
        }
    }

    /**
     * Apply sprite state properties from a timeline stage.
     * @private
     */
    static _applySpriteState(sprite, stage) {
        sprite.setPosition(stage.Position[0], stage.Position[1]);
        sprite.setScale(stage.Scale[0], stage.Scale[1]);
        sprite.setAlpha(stage.Alpha);
        sprite.setRotation((stage.Angle * Math.PI) / 180);
        sprite.setOrigin(stage.Alignment[0], stage.Alignment[1]);
        sprite.setVisible(stage.Shown);

        if (stage.Flip !== 0) {
            sprite.setFlip(stage.Flip === 1 || stage.Flip === 3, stage.Flip === 2 || stage.Flip === 3);
        }
    }

    /**
     * Clear cached sprite definition and animation data.
     * @param {string} type - Type of sprite
     * @param {string} name - Name of the sprite
     */
    static clearCache(type, name) {
        const key = `${type}:${name}`;
        delete this.spriteData[key];
        delete this.spriteAnimations[key];
    }

    /**
     * Clear all cached data.
     */
    static clearAllCache() {
        this.spriteData = {};
        this.spriteAnimations = {};
    }
}
