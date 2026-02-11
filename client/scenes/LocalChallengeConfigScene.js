import GlobalAudio from '../utils/AudioManager.js';
import GlobalBackground from '../utils/BackgroundManager.js';
import { formatCompact } from '../utils/FormatManager.js';
import GlobalLocalization from '../utils/LocalizationManager.js';
import DefenceFactory from '../utils/factories/DefenceFactory.js';
import MonsterFactory from '../utils/factories/MonsterFactory.js';
import SpriteFactory from '../utils/factories/SpriteFactory.js';

export default class LocalChallengeConfigScene extends Phaser.Scene {
    constructor() {
        super('LocalChallengeConfigScene');
        this.PIXEL_FONT = '"Press Start 2P", cursive';
    }

    create() {
        try {
            GlobalBackground.registerScene(this, { key: 'bg', useImageIfAvailable: true });
        } catch (e) {}
        const t = (key, fallback) => GlobalLocalization.t(key, fallback);
        const fmt = (key, ...args) => GlobalLocalization.format(key, ...args);
        const config = this.registry.get("challengeConfig") || {};
        const cx = this.cameras.main.centerX;

        this.add.text(cx, 50, `${config.title || t('CHALLENGE_GENERIC', 'CHALLENGE')}`, {
            fontSize: 32,
            fontFamily: this.PIXEL_FONT
        }).setOrigin(0.5);

        this.add.text(cx, 100, config.desc || t('CHALLENGE_DESC_FALLBACK', 'Challenge description'), {
            fontSize: 16,
            fontFamily: this.PIXEL_FONT,
            color: '#cccccc',
            align: 'center',
            wordWrap: { width: 600 }
        }).setOrigin(0.5);

        // Display config
        let y = 150;
        const reward = Number(config.challengeReward || 0);
        if (reward > 0) {
            this.add.text(cx, y, fmt('CHALLENGE_REWARD_LINE', 'Reward: +{0} Tokens', formatCompact(reward)), {
                fontSize: 16,
                fontFamily: this.PIXEL_FONT,
                color: '#ffd966'
            }).setOrigin(0.5);
            y += 26;
        }

        if (typeof config.switchSides === 'boolean') {
            const playerSide = config.switchSides ? t('SIDE_MONSTERS', 'Monsters') : t('SIDE_DEFENCES', 'Defences');
            const opponentSide = config.switchSides ? t('SIDE_DEFENCES', 'Defences') : t('SIDE_MONSTERS', 'Monsters');
            const opponentName = config.names?.[1] || t('OPP_DEFAULT', 'Opponent');
            this.add.text(cx, y, fmt('CHALLENGE_SIDES_LINE', 'You: {0} | Opponent: {1} ({2})', playerSide, opponentName, opponentSide), {
                fontSize: 14,
                fontFamily: this.PIXEL_FONT,
                color: '#cccccc'
            }).setOrigin(0.5);
            y += 26;
        }

        if (Number.isFinite(config.diceCount)) {
            this.add.text(cx, y, fmt('CHALLENGE_DICE', 'Dice: {0}', config.diceCount), {
                fontSize: 14,
                fontFamily: this.PIXEL_FONT
            }).setOrigin(0.5);
            y += 24;
        }

        if (Number.isFinite(config.boardRows) && Number.isFinite(config.boardCols)) {
            this.add.text(cx, y, fmt('CHALLENGE_BOARD', 'Board: {0} x {1}', config.boardRows, config.boardCols), {
                fontSize: 14,
                fontFamily: this.PIXEL_FONT
            }).setOrigin(0.5);
            y += 24;
        }

        this.add.text(cx, y, fmt('CHALLENGE_PLAYERS', 'Players: {0}', config.players || 2), {
            fontSize: 16,
            fontFamily: this.PIXEL_FONT
        }).setOrigin(0.5);
        y += 26;

        this.add.text(cx, y, fmt('CHALLENGE_WAVES', 'Waves: {0}', config.waves || 30), {
            fontSize: 16,
            fontFamily: this.PIXEL_FONT
        }).setOrigin(0.5);
        y += 26;

        if (config.teamsEnabled) {
            this.add.text(cx, y, t('CHALLENGE_TEAMS_ENABLED', 'Teams: Enabled'), {
                fontSize: 16,
                fontFamily: this.PIXEL_FONT
            }).setOrigin(0.5);
            y += 26;
        }

        // Players
        y += 16;
        this.add.text(cx, y, t('CHALLENGE_PLAYERS_LABEL', 'Players:'), {
            fontSize: 18,
            fontFamily: this.PIXEL_FONT
        }).setOrigin(0.5);
        y += 32;

        for (let i = 0; i < (config.players || 2); i++) {
            const name = config.names?.[i] || `P${i + 1}`;
            const isAI = config.ai?.[i] || false;
            const diff = config.difficulty?.[i] || 'Medium';
            const team = config.teams?.[i] || 'blue';

            const diffLabel = t(`DIFFICULTY_${String(diff).toUpperCase()}`, diff);
            const aiLabel = isAI ? fmt('CHALLENGE_AI_LABEL', 'AI {0}', diffLabel) : t('CHALLENGE_HUMAN_LABEL', 'Human');
            const teamLabel = config.teamsEnabled ? ` - ${t(`TEAM_${String(team).toUpperCase()}`, String(team).toUpperCase())}` : '';
            const line = `${name} (${aiLabel})${teamLabel}`;
            this.add.text(cx, y, line, {
                fontSize: 14,
                fontFamily: this.PIXEL_FONT,
                color: isAI ? '#ff6666' : '#66ff66'
            }).setOrigin(0.5);
            y += 22;
        }

        const switchSides = !!config.switchSides;
        const playerRole = switchSides ? 'monster' : 'defence';
        const opponentRole = switchSides ? 'defence' : 'monster';

        const getDefaultLoadout = (role, isProto) => {
            if (role === 'defence') {
                const defNormal = JSON.parse(localStorage.getItem('defenceNormalLoadout')) || [];
                const defProto = JSON.parse(localStorage.getItem('defenceProtoLoadout')) || [];
                return isProto ? defProto : defNormal;
            }
            const monNormal = JSON.parse(localStorage.getItem('monsterNormalLoadout')) || [];
            const monProto = JSON.parse(localStorage.getItem('monsterProtoLoadout')) || [];
            return isProto ? monProto : monNormal;
        };

        const getOverride = (idx) => {
            const loadouts = config.challengeLoadouts || {};
            return loadouts[idx] || loadouts[String(idx)] || null;
        };

        const getLoadoutForPlayer = (idx, role, isProto) => {
            const override = getOverride(idx);
            const overrideKey = isProto ? 'protoLoadout' : 'normalLoadout';
            if (override && Array.isArray(override[overrideKey])) {
                return override[overrideKey];
            }
            return getDefaultLoadout(role, isProto);
        };

        const resolveSpriteKey = (unitKey, role) => {
            if (!unitKey) return null;
            const defData = DefenceFactory.defenceData || {};
            const monData = MonsterFactory.monsterData || {};
            const data = role === 'defence' ? (defData[unitKey] || monData[unitKey]) : (monData[unitKey] || defData[unitKey]);
            let spriteKey = data?.displaySprite || data?.DisplaySprite || null;
            if (spriteKey && !this.textures.exists(spriteKey)) {
                const spriteType = role === 'defence' ? 'defence' : 'monster';
                const cachedKey = SpriteFactory.getCachedPrimarySpriteKey(spriteType, spriteKey);
                if (cachedKey && this.textures.exists(cachedKey)) spriteKey = cachedKey;
            }
            if (spriteKey && this.textures.exists(spriteKey)) return spriteKey;
            return null;
        };

        const resolveUnitName = (unitKey) => {
            if (!unitKey) return '';
            const defData = DefenceFactory.defenceData || {};
            const monData = MonsterFactory.monsterData || {};
            const data = defData[unitKey] || monData[unitKey] || {};
            const typeName = data?.TypeName || unitKey;
            const fallback = data?.FullName || unitKey;
            return t(`UNIT_${typeName}`, fallback);
        };

        const tooltipText = this.add.text(0, 0, '', {
            fontSize: 10,
            fontFamily: this.PIXEL_FONT,
            color: '#ffffff'
        }).setOrigin(0.5).setDepth(30).setVisible(false);

        const tooltipBg = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.85)
            .setOrigin(0.5)
            .setDepth(29)
            .setVisible(false)
            .setStrokeStyle(1, 0x666666);

        let tooltipActive = false;
        let tooltipValue = '';

        const updateTooltipPosition = (x, y) => {
            if (!tooltipValue) return;
            tooltipText.setText(tooltipValue);
            const pad = 6;
            const w = Math.max(20, tooltipText.width + pad * 2);
            const h = Math.max(16, tooltipText.height + pad * 2);
            const cam = this.cameras.main;
            let tx = x;
            let ty = y - 20;
            if (ty - h / 2 < cam.y + 8) {
                ty = y + 20;
            }
            if (tx - w / 2 < cam.x + 8) tx = cam.x + 8 + w / 2;
            if (tx + w / 2 > cam.x + cam.width - 8) tx = cam.x + cam.width - 8 - w / 2;
            if (ty + h / 2 > cam.y + cam.height - 8) ty = cam.y + cam.height - 8 - h / 2;
            tooltipBg.setSize(w, h);
            tooltipBg.setPosition(tx, ty).setVisible(true);
            tooltipText.setPosition(tx, ty).setVisible(true);
        };

        const showTooltip = (pointer, text) => {
            if (!text) return;
            tooltipActive = true;
            tooltipValue = text;
            const px = pointer?.worldX ?? pointer?.x ?? 0;
            const py = pointer?.worldY ?? pointer?.y ?? 0;
            updateTooltipPosition(px, py);
        };

        const hideTooltip = () => {
            tooltipActive = false;
            tooltipValue = '';
            tooltipBg.setVisible(false);
            tooltipText.setVisible(false);
        };

        this.input.on('pointermove', (pointer) => {
            if (!tooltipActive) return;
            const px = pointer?.worldX ?? pointer?.x ?? 0;
            const py = pointer?.worldY ?? pointer?.y ?? 0;
            updateTooltipPosition(px, py);
        });

        const drawLoadoutPanel = (centerX, topY, label, role, normalLoadout, protoLoadout, accentColor) => {
            const panelWidth = 260;
            const panelHeight = 120;
            const rowHeight = 44;
            const iconSize = 22;
            const iconGap = 6;

            this.add.text(centerX, topY - 14, label, {
                fontSize: 12,
                fontFamily: this.PIXEL_FONT,
                color: accentColor || '#ffffff'
            }).setOrigin(0.5, 0);

            this.add.rectangle(centerX, topY + panelHeight / 2, panelWidth, panelHeight, 0x111111, 0.55)
                .setStrokeStyle(2, accentColor ? Phaser.Display.Color.HexStringToColor(accentColor).color : 0x444444);

            const drawRow = (rowY, rowLabel, loadout, rowColor) => {
                this.add.text(centerX - panelWidth / 2 + 10, rowY - 10, rowLabel, {
                    fontSize: 10,
                    fontFamily: this.PIXEL_FONT,
                    color: rowColor || '#cccccc'
                }).setOrigin(0, 0);

                const iconStartX = centerX - panelWidth / 2 + 78;
                for (let i = 0; i < 5; i++) {
                    const unitKey = loadout?.[i] || null;
                    const x = iconStartX + i * (iconSize + iconGap);
                    const slotBg = this.add.rectangle(x, rowY, iconSize, iconSize, 0x222222, 0.9)
                        .setStrokeStyle(1, 0x444444);

                    if (unitKey) {
                        const spriteKey = resolveSpriteKey(unitKey, role);
                        const unitName = resolveUnitName(unitKey);
                        slotBg.setInteractive({ useHandCursor: true });
                        slotBg.on('pointerover', (pointer) => showTooltip(pointer, unitName));
                        slotBg.on('pointerout', hideTooltip);

                        if (spriteKey) {
                            const icon = this.add.image(x, rowY, spriteKey);
                            icon.setDisplaySize(iconSize - 2, iconSize - 2);
                        } else {
                            const text = this.add.text(x, rowY + 1, String(unitKey).slice(0, 3).toUpperCase(), {
                                fontSize: 8,
                                fontFamily: this.PIXEL_FONT,
                                color: '#ffffff'
                            }).setOrigin(0.5);
                            text.setDepth(slotBg.depth + 1);
                        }
                    } else {
                        this.add.text(x, rowY, '-', {
                            fontSize: 10,
                            fontFamily: this.PIXEL_FONT,
                            color: '#555555'
                        }).setOrigin(0.5);
                    }
                }
            };

            const rowStartY = topY + 34;
            drawRow(rowStartY, t('LOADOUT_NORMAL', 'Normal'), normalLoadout, '#cccccc');
            drawRow(rowStartY + rowHeight, t('LOADOUT_PROTO', 'Proto'), protoLoadout, '#ffd966');
        };

        const loadoutTitleY = y + 14;
        this.add.text(cx, loadoutTitleY, t('CHALLENGE_LOADOUTS', 'Loadouts'), {
            fontSize: 18,
            fontFamily: this.PIXEL_FONT
        }).setOrigin(0.5);

        const panelTopY = loadoutTitleY + 30;
        const panelGap = 40;
        const panelWidth = 260;
        const leftX = cx - (panelWidth / 2 + panelGap / 2);
        const rightX = cx + (panelWidth / 2 + panelGap / 2);

        const playerName = config.names?.[0] || t('CHALLENGE_PLAYER', 'Player');
        const opponentName = config.names?.[1] || t('OPP_DEFAULT', 'Opponent');

        drawLoadoutPanel(
            leftX,
            panelTopY,
            `${playerName} (${t(`SIDE_${playerRole.toUpperCase()}`, playerRole)})`,
            playerRole,
            getLoadoutForPlayer(0, playerRole, false),
            getLoadoutForPlayer(0, playerRole, true),
            '#66ff66'
        );

        drawLoadoutPanel(
            rightX,
            panelTopY,
            `${opponentName} (${t(`SIDE_${opponentRole.toUpperCase()}`, opponentRole)})`,
            opponentRole,
            getLoadoutForPlayer(1, opponentRole, false),
            getLoadoutForPlayer(1, opponentRole, true),
            '#ff6666'
        );

        const viewH = this.cameras.main.height;
        const loadoutSectionBottom = panelTopY + 120;
        const startBtnY = Math.min(viewH - 90, loadoutSectionBottom + 36);
        const backBtnY = Math.min(viewH - 40, startBtnY + 50);

        // Start Game
        this.add.text(cx, startBtnY, t('CHALLENGE_START', 'START CHALLENGE'), {
            fontSize: 22,
            fontFamily: this.PIXEL_FONT,
            color: '#66ff66'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            GlobalAudio.playButton(this);
            this.scene.start('LocalGameScene', config);
        });

        // Back
        this.add.text(cx, backBtnY, t('UI_BACK', '<- BACK'), {
            fontSize: 18,
            fontFamily: this.PIXEL_FONT,
            color: '#ff6666'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            GlobalAudio.playButton(this);
            this.scene.start('LocalChallengesScene');
        });

        this.input.keyboard.on('keydown-ESC', () => {
            GlobalAudio.playButton(this);
            this.scene.start('LocalChallengesScene');
        });
    }
}
