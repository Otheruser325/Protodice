import GlobalBackground from '../utils/BackgroundManager.js';
import GlobalFonts from '../utils/FontManager.js';
import ErrorHandler from '../utils/ErrorManager.js';
import GlobalLocalization from '../utils/LocalizationManager.js';
import DefenceFactory from '../utils/factories/DefenceFactory.js';
import MonsterFactory from '../utils/factories/MonsterFactory.js';
import PuddleFactory from '../utils/factories/PuddleFactory.js';
import SpriteFactory from '../utils/factories/SpriteFactory.js';

export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
    }

    _delay(ms) {
      return new Promise(res => setTimeout(res, ms));
    }

    preload() {
        try {
          ErrorHandler.setScene(this);
        } catch (e) {}
	    try {
          GlobalBackground.registerScene(this, { key: 'bg', useImageIfAvailable: true });
        } catch (e) {}

        // Splash screen display
        this.cameras.main.setBackgroundColor('#000000');

        const fontDefs = [
          { family: 'Press Start 2P', url: 'assets/fonts/PressStart2P.ttf', weight: '400' },
          { family: 'game_over', url: 'assets/fonts/game_over.ttf', weight: '400' }
        ];
        this._fontPromise = GlobalFonts.init(fontDefs, { timeout: 2000 }).catch(err => {
          console.warn('GlobalFonts.init failed (continuing):', err);
        });

        const titleStyle = { fontSize: '64px', color: '#ffffff', fontFamily: '"Press Start 2P", cursive' };
        const loadingStyle = { fontSize: '20px', color: '#000000', fontFamily: '"Press Start 2P", cursive' };

        this.titleText = this.add.text(600, 100, 'PROTODICE', {
            fontFamily: '"Press Start 2P", cursive',
            fontSize: '48px',
            color: '#ffffff'
        }).setOrigin(0.5).setAlpha(0);

        this.loadingText = this.add.text(600, 300, GlobalLocalization.t('PRELOAD_LOADING', 'Loading...'), {
            fontFamily: '"Press Start 2P", cursive',
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0.5).setAlpha(0);

        const barX = 600 - 150;
        const barY = 350;
        const barW = 300;
        const barH = 30;

        // Add a progress bar
        const progressBarBg = this.add.rectangle(600, barY, barW, barH, 0x444444).setOrigin(0.5);
        const progressBarFill = this.add.rectangle(barX, barY, 0, barH, 0xFFEE55).setOrigin(0, 0.5);
        this.loadingPercent = this.add.text(600, barY, '0%', loadingStyle).setOrigin(0.5).setAlpha(0);

        const revealPreloadText = () => {
          try {
            this.titleText?.setAlpha(1);
            this.loadingText?.setAlpha(1);
            this.loadingPercent?.setAlpha(1);
          } catch (e) {}
        };

        this._fontPromise?.then(() => {
          try {
            const style = { fontFamily: '"Press Start 2P", cursive' };
            if (this.titleText && this.titleText.setStyle) this.titleText.setStyle(style);
            if (this.loadingText && this.loadingText.setStyle) this.loadingText.setStyle(style);
            if (this.loadingPercent && this.loadingPercent.setStyle) this.loadingPercent.setStyle(style);
          } catch (e) {}
        }).finally(() => {
          revealPreloadText();
        });

        this.load.on('progress', (value) => {
            progressBarFill.width = Math.max(2, Math.round(barW * value));
            this.loadingPercent.setText(`${Math.round(value * 100)}%`);
        });

        this.load.on('complete', async () => {
        try {
          const waitMs = 1000;
          await Promise.race([
            this._fontPromise || Promise.resolve(),
            this._delay(waitMs)
          ]);
        } catch (e) {
          console.warn('Font wait race error (continuing):', e);
        }

        try {
            const style = { fontFamily: '"Press Start 2P", cursive' };
            if (this.titleText && this.titleText.setStyle) this.titleText.setStyle(style);
            if (this.loadingText && this.loadingText.setStyle) this.loadingText.setStyle(style);
            if (this.loadingPercent && this.loadingPercent.setStyle) this.loadingPercent.setStyle(style);
         } catch (e) {}
        this.tweens.add({
            targets: [this.progressBarBg, this.progressBarFill, this.loadingPercent, this.loadingText, this.titleText],
            alpha: 0,
            duration: 400,
            onComplete: () => {
              this.time.delayedCall(150, () => this.scene.start('MenuScene'));
            }
          });
        });

        // Load all assets
        // Localization XMLs
        this.load.xml('loc:English', 'config/locs/English.xml');
        this.load.xml('loc:French', 'config/locs/French.xml');
        this.load.xml('loc:Spanish', 'config/locs/Spanish.xml');
        this.load.xml('loc:Italian', 'config/locs/Italian.xml');
        this.load.xml('loc:Portuguese', 'config/locs/Portuguese.xml');
        this.load.xml('loc:Welsh', 'config/locs/Welsh.xml');

        // Music tracks
        this.load.audio('crossing_the_gap', 'assets/music/crossing_the_gap.mp3');
        this.load.audio('defend_the_breach', 'assets/music/defend_the_breach.mp3');
        this.load.audio('prototype_defenders', 'assets/music/prototype_defenders.mp3');
        this.load.audio('dice_league', 'assets/music/dice_league.mp3');

        // Generic sounds
        this.load.audio('button', 'assets/audio/button.mp3');
        this.load.audio('dice', 'assets/audio/dice.mp3');
        this.load.audio('reload_complete', 'assets/audio/reload_complete.mp3');
        this.load.audio('combo_pair', 'assets/audio/combo_pair.mp3');
        this.load.audio('combo_triple', 'assets/audio/combo_triple.mp3');
        this.load.audio('combo_fullHouse', 'assets/audio/combo_fullHouse.mp3');
        this.load.audio('combo_fourOfAKind', 'assets/audio/combo_fourOfAKind.mp3');
        this.load.audio('combo_fiveOfAKind', 'assets/audio/combo_fiveOfAKind.mp3');
        this.load.audio('combo_straight', 'assets/audio/combo_straight.mp3');
		
		    // Death sounds for units
        this.load.audio('unit_death', 'assets/audio/unit_death.mp3');
        this.load.audio('monster_death', 'assets/audio/monster_death.mp3');
        this.load.audio('defence_death', 'assets/audio/defence_death.mp3');
        
        // Special/status effect sounds
        this.load.audio('acid', 'assets/audio/acid.mp3');
        this.load.audio('armor', 'assets/audio/armor.mp3');
        this.load.audio('charm', 'assets/audio/charm.mp3');
        this.load.audio('explosion', 'assets/audio/explosion.mp3');
        this.load.audio('fire', 'assets/audio/fire.mp3');
        this.load.audio('freeze', 'assets/audio/freeze.mp3');
        this.load.audio('knockback', 'assets/audio/knockback.mp3');
        this.load.audio('laser', 'assets/audio/laser.mp3');
        this.load.audio('lifesteal', 'assets/audio/lifesteal.mp3');
        this.load.audio('mine_explosion', 'assets/audio/mine_explosion.mp3');
        this.load.audio('poison', 'assets/audio/poison.mp3');
        this.load.audio('puddle_deploy', 'assets/audio/puddle_deploy.mp3');
        this.load.audio('puddle_expired', 'assets/audio/puddle_expired.mp3');
        this.load.audio('purge', 'assets/audio/purge.mp3');
        this.load.audio('revive', 'assets/audio/revive.mp3');
        this.load.audio('shield_break', 'assets/audio/shield_break.mp3');
        this.load.audio('shield_burst', 'assets/audio/shield_burst.mp3');
        this.load.audio('shield_deploy', 'assets/audio/shield_deploy.mp3');
        this.load.audio('slow', 'assets/audio/slow.mp3');
        this.load.audio('stun', 'assets/audio/stun.mp3');
        this.load.audio('summon', 'assets/audio/summon.mp3');

        // VFX sprites
        this.load.image('explosion', 'assets/sprites/vfx/explosion.png');
        this.load.image('radioactive_waste', 'assets/sprites/vfx/radioactive_waste.png');
        this.load.image('shield', 'assets/sprites/vfx/shield.png');
        this.load.image('shield_break', 'assets/sprites/vfx/shield_break.png');
        this.load.image('shield_burst', 'assets/sprites/vfx/shield_burst.png');

        // Projectile sprites (used by SpriteFactory/CombatFactory)
        const projectileFiles = [
            'arrow',
            'bomb',
            'bullet',
            'energy_blast',
            'fire',
            'flaming_boulder',
            'jab',
            'laser',
            'lightning_ball',
            'love_arrow',
            'mortar_shell',
            'nuclear_rocket',
            'rock',
            'rocket',
            'shell',
            'shock_bomb',
            'shock_bullet',
            'tank_shell',
            'tracer',
            'yellow_bullet'
        ];
        projectileFiles.forEach(f => this.load.image(f, 'assets/sprites/projectiles/' + f + '.png'));

        this.load.json('changelog', 'config/changelog.json');

        this.load.image('bg', 'assets/bg/bg_neon.png');

        this.load.image('dice_sheet', 'assets/sprites/dice/dice.png');
        this.load.image('prototype_dice_sheet', 'assets/sprites/dice/prototype_dice.png');

        this.load.image('settingsIcon', 'assets/ui/settings.png');
        this.load.image('achievementIcon', 'assets/ui/achievement.png');
        this.load.image('helpIcon', 'assets/ui/help.png');
        this.load.image('changelogIcon', 'assets/ui/changelog.png');
        this.load.image('playerIcon', 'assets/ui/player.png');
        this.load.image('botIcon', 'assets/ui/robot.png');

        // Load defence definitions
        const defenceFiles = ['AcidShooter', 'Ballista', 'Barricade', 'BoomCannon', 'Cannon', 'CryoFan', 'DamageAmplifier', 'DestroyTower', 'Flamethrower', 'ForceField', 'Landmine', 'LazorBeam', 'MachineGun', 'MicroSentry', 'Microwavr', 'Mortar', 'Multishot', 'RadialLauncher', 'RocketLauncher', 'ShockBlaster', 'ShockLauncher', 'Shredder', 'SIMO', 'SniperTower'];
        defenceFiles.forEach(f => this.load.json(f + 'Defence', 'assets/gamedata/DefenceDefinitions/' + f + '.defence'));

        // Load monster definitions
        const monsterFiles = ['Archer', 'Bat', 'Bomber', 'Catapult', 'Cupid', 'Demon', 'ElectroMage', 'FireImp', 'Ghost', 'Goblin', 'Golem', 'Harpy', 'IceLizard', 'Knight', 'Mech', 'Necromancer', 'PoisonWard', 'Orc', 'Skeleton', 'Surgeon', 'Tank', 'Thrower', 'Troll', 'Zombie'];
        monsterFiles.forEach(f => this.load.json(f + 'Monster', 'assets/gamedata/MonsterDefinitions/' + f + '.monster'));

        // Load defence sprites
        defenceFiles.forEach(f => this.load.image(f.toLowerCase(), 'assets/sprites/defences/' + f.toLowerCase() + '.png'));

        // Load monster sprites
        monsterFiles.forEach(f => this.load.image(f.toLowerCase(), 'assets/sprites/monsters/' + f.toLowerCase() + '.png'));
    }

    async create() {
        const saved = JSON.parse(localStorage.getItem('protodice_settings')) || {};

        const defaults = {
            audio: true,
            music: true,
            visualEffects: true,
            shuffleTrack: false,
            trackIndex: 0,
            language: 'English'
        };

        // Merge saved overrides
        const finalSettings = { ...defaults, ...saved };

        // Store in registry
        this.registry.set('settings', finalSettings);
        try {
            GlobalLocalization.init(this);
            GlobalLocalization.setLanguage(this, finalSettings.language || 'English');
        } catch (e) {}

        this._registerDiceFrames();
        this._registerExplosionFrames();

        // Set factory data
        const defenceFiles = ['AcidShooter', 'Ballista', 'Barricade', 'BoomCannon', 'Cannon', 'CryoFan', 'DamageAmplifier', 'DestroyTower', 'Flamethrower', 'ForceField', 'Landmine', 'LazorBeam', 'MachineGun', 'MicroSentry', 'Microwavr', 'Mortar', 'Multishot', 'RadialLauncher', 'RocketLauncher', 'ShockBlaster', 'ShockLauncher', 'Shredder', 'SIMO', 'SniperTower'];
        DefenceFactory.defenceData = {};
        defenceFiles.forEach(f => {
            const data = this.cache.json.get(f + 'Defence');
            DefenceFactory.validateData(data);
            DefenceFactory.defenceData[f] = data;
        });

        const monsterFiles = ['Archer', 'Bat', 'Bomber', 'Catapult', 'Cupid', 'Demon', 'ElectroMage', 'FireImp', 'Ghost', 'Goblin', 'Golem', 'Harpy', 'IceLizard', 'Knight', 'Mech', 'Necromancer', 'PoisonWard', 'Orc', 'Skeleton', 'Surgeon', 'Tank', 'Thrower', 'Troll', 'Zombie'];
        MonsterFactory.monsterData = {};
        monsterFiles.forEach(f => {
            const data = this.cache.json.get(f + 'Monster');
            MonsterFactory.validateData(data);
            MonsterFactory.monsterData[f] = data;
        });

        try {
            await PuddleFactory.loadData();
        } catch (e) {}

        try {
            const defSprites = Object.values(DefenceFactory.defenceData || {}).map(d => d.DisplaySprite);
            const monSprites = Object.values(MonsterFactory.monsterData || {}).map(d => d.DisplaySprite);
            const projSprites = [
                ...Object.values(DefenceFactory.defenceData || {}).map(d => d.ProjectileSprite),
                ...Object.values(MonsterFactory.monsterData || {}).map(d => d.ProjectileSprite)
            ];
            const puddleSprites = Object.values(PuddleFactory.puddleData || {}).map(p => p.Sprite || p.DisplaySprite);

            await SpriteFactory.preloadSpriteDefinitions('defence', defSprites);
            await SpriteFactory.preloadSpriteDefinitions('monster', monSprites);
            await SpriteFactory.preloadSpriteDefinitions('projectile', projSprites);
            await SpriteFactory.preloadSpriteDefinitions('puddle', puddleSprites);
        } catch (e) {
            console.warn('[Preload] SpriteFactory preload failed', e);
        }

        this.time.delayedCall(1000, () => {
            this.scene.start('MenuScene');
        });
    }

    _registerDiceFrames() {
        const frames = [
            { key: '1', x: 47, y: 30, w: 97, h: 105 },
            { key: '2', x: 199, y: 30, w: 100, h: 105 },
            { key: '3', x: 354, y: 30, w: 97, h: 105 },
            { key: '4', x: 47, y: 153, w: 97, h: 102 },
            { key: '5', x: 199, y: 153, w: 100, h: 102 },
            { key: '6', x: 354, y: 153, w: 97, h: 102 }
        ];

        const register = (key) => {
            if (!this.textures || !this.textures.exists(key)) return;
            const tex = this.textures.get(key);
            if (tex._diceFramesRegistered) return;
            frames.forEach((frame) => {
                try {
                    tex.add(frame.key, 0, frame.x, frame.y, frame.w, frame.h);
                } catch (e) {
                    /* ignore duplicate frame errors */
                }
            });
            tex._diceFramesRegistered = true;
        };

        register('dice_sheet');
        register('prototype_dice_sheet');
    }

    _registerExplosionFrames() {
        const key = 'explosion';
        if (!this.textures || !this.textures.exists(key)) return;
        const tex = this.textures.get(key);
        if (tex._explosionFramesRegistered) return;

        const source = tex.source && tex.source[0];
        if (!source || !source.width || !source.height) return;

        const width = source.width;
        const height = source.height;

        // If the sheet is a clean horizontal strip of square-ish frames, slice it.
        // Otherwise, register a single full-frame for safe usage.
        let frameCount = 1;
        if (height > 0 && width % height === 0) {
            const candidate = Math.floor(width / height);
            if (candidate >= 2 && candidate <= 16) frameCount = candidate;
        }

        const frameWidth = Math.floor(width / frameCount);
        for (let i = 0; i < frameCount; i++) {
            try {
                tex.add(`explosion_${i}`, 0, i * frameWidth, 0, frameWidth, height);
            } catch (e) {
                /* ignore duplicate frame errors */
            }
        }

        if (frameCount > 1 && this.anims && !this.anims.exists('explosion')) {
            try {
                this.anims.create({
                    key: 'explosion',
                    frames: Array.from({ length: frameCount }, (_, i) => ({ key, frame: `explosion_${i}` })),
                    frameRate: 12,
                    repeat: 0
                });
            } catch (e) {}
        }

        tex._explosionFramesRegistered = true;
    }
}
