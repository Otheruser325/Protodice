import GlobalLocalization from './LocalizationManager.js';

const STORAGE_KEY = 'protodice_achievements';

export const ACHIEVEMENT_DEFS = [
  { key: 'firstPlay', titleKey: 'ACH_FIRSTPLAY_TITLE', descKey: 'ACH_FIRSTPLAY_DESC', title: "I'm New to This", desc: 'Play Protodice for the first time.' },
  { key: 'waves100', titleKey: 'ACH_WAVES_100_TITLE', descKey: 'ACH_WAVES_100_DESC', title: 'Warm-Up Waves', desc: 'Progress 100 waves total.' },
  { key: 'waves500', titleKey: 'ACH_WAVES_500_TITLE', descKey: 'ACH_WAVES_500_DESC', title: 'Battle-Seasoned', desc: 'Progress 500 waves total.' },
  { key: 'waves2500', titleKey: 'ACH_WAVES_2500_TITLE', descKey: 'ACH_WAVES_2500_DESC', title: 'Endless War', desc: 'Progress 2,500 waves total.' },
  { key: 'time1h', titleKey: 'ACH_TIME_1H_TITLE', descKey: 'ACH_TIME_1H_DESC', title: 'Just One More', desc: 'Play Protodice for 1 hour total.' },
  { key: 'time12h', titleKey: 'ACH_TIME_12H_TITLE', descKey: 'ACH_TIME_12H_DESC', title: 'All In', desc: 'Play Protodice for 12 hours total.' },
  { key: 'time24h', titleKey: 'ACH_TIME_24H_TITLE', descKey: 'ACH_TIME_24H_DESC', title: 'Diceaholic', desc: 'Play Protodice for 24 hours total.' },
  { key: 'wins1', titleKey: 'ACH_WINS_1_TITLE', descKey: 'ACH_WINS_1_DESC', title: 'First Victory', desc: 'Win your first match.' },
  { key: 'wins10', titleKey: 'ACH_WINS_10_TITLE', descKey: 'ACH_WINS_10_DESC', title: 'Veteran Commander', desc: 'Win 10 matches.' },
  { key: 'wins50', titleKey: 'ACH_WINS_50_TITLE', descKey: 'ACH_WINS_50_DESC', title: 'Specialised Commander', desc: 'Win 50 matches.' },
  { key: 'kills50', titleKey: 'ACH_KILLS_50_TITLE', descKey: 'ACH_KILLS_50_DESC', title: 'Enemy Down', desc: 'Defeat 50 enemies (monsters as defender / defences as attacker).' },
  { key: 'kills250', titleKey: 'ACH_KILLS_250_TITLE', descKey: 'ACH_KILLS_250_DESC', title: 'No More Messing Around', desc: 'Defeat 250 enemies.' },
  { key: 'kills1000', titleKey: 'ACH_KILLS_1000_TITLE', descKey: 'ACH_KILLS_1000_DESC', title: 'Monster Slayer', desc: 'Defeat 1,000 enemies.' },
  { key: 'daily1', titleKey: 'ACH_DAILY_1_TITLE', descKey: 'ACH_DAILY_1_DESC', title: 'Challenger', desc: 'Beat a daily challenge.' },
  { key: 'daily10', titleKey: 'ACH_DAILY_10_TITLE', descKey: 'ACH_DAILY_10_DESC', title: 'Problem Solver', desc: 'Beat 10 daily challenges.' },
  { key: 'ownEpic', titleKey: 'ACH_OWN_EPIC_TITLE', descKey: 'ACH_OWN_EPIC_DESC', title: 'Augmented', desc: 'Obtain an Epic unit.' },
  { key: 'ownLegendary', titleKey: 'ACH_OWN_LEGENDARY_TITLE', descKey: 'ACH_OWN_LEGENDARY_DESC', title: 'In Our Darkest Hour...', desc: 'Obtain a Legendary unit.' },
  { key: 'hellscape', titleKey: 'ACH_HELLSCAPE_TITLE', descKey: 'ACH_HELLSCAPE_DESC', title: 'Hellscape', desc: "Defeat Deucifer in Deucifer's Pit." },
  { key: 'tickler', titleKey: 'ACH_TICKLER_TITLE', descKey: 'ACH_TICKLER_DESC', title: 'The Tickler', desc: 'Deal over 100 fire/poison damage in a match.' },
  { key: 'stunWave', titleKey: 'ACH_STUN_WAVE_TITLE', descKey: 'ACH_STUN_WAVE_DESC', title: "Who's Stunning Now?", desc: 'Stun or freeze 5 enemies in one wave.' }
];

const DEFAULT_UNLOCKED = Object.fromEntries(ACHIEVEMENT_DEFS.map((def) => [def.key, false]));

const DEFAULTS = {
  totals: {
    gamesPlayed: 0,
    playTimeSeconds: 0,
    wavesPlayed: 0,
    wins: 0,
    monstersDefeated: 0,
    defencesDestroyed: 0,
    dailyChallengesCompleted: 0
  },
  unlocked: {
    ...DEFAULT_UNLOCKED
  },
  completedChallenges: {
    daily: false,
    deucifer: false
  }
};

const ENEMY_DEFEAT_TARGET = 50;
const ENEMY_DEFEAT_TARGET_250 = 250;
const ENEMY_DEFEAT_TARGET_1000 = 1000;
const DAILY_CHALLENGE_TARGET = 10;
const STUN_WAVE_TARGET = 5;
const HOURS_1_SECONDS = 3600;
const HOURS_12_SECONDS = 12 * 3600;
const HOURS_24_SECONDS = 24 * 3600;

class AchievementsManager {
  static _data = null;
  static _notifications = [];
  static _achieveNotificationRunning = false;
  static _scene = null;
  static _playHeartbeatStarted = false;
  static _heartbeatId = null;
  static _waveStunTracker = null;
  static _visibilityHandlerBound = false;

  static {
    this._bootstrap();
  }

  static _bootstrap() {
    if (this._data) return;

    const loaded = this._load() || {};
    this._data = {
      totals: { ...DEFAULTS.totals, ...(loaded.totals || {}) },
      unlocked: { ...DEFAULTS.unlocked, ...(loaded.unlocked || {}) },
      completedChallenges: { ...DEFAULTS.completedChallenges, ...(loaded.completedChallenges || {}) }
    };

    this._migrateLegacyAchievementKeys();
    this._save();
  }

  static _ensureInitialized() {
    if (!this._data) this._bootstrap();
  }

  static _migrateLegacyAchievementKeys() {
    const unlocked = this._data?.unlocked || {};

    // Backward compatibility with an older key that mapped to the 24h milestone.
    if (unlocked.diceaholic) unlocked.time24h = true;
    delete unlocked.diceaholic;

    this._data.unlocked = { ...DEFAULTS.unlocked, ...unlocked };
  }

  // Allow a scene to be registered for UI display. Pass `null` to unregister.
  static registerScene(scene) {
    this._ensureInitialized();
    this._scene = scene || null;

    if (scene && scene.events && typeof scene.events.once === 'function') {
      scene.events.once('shutdown', () => { if (this._scene === scene) this._scene = null; });
      scene.events.once('destroy', () => { if (this._scene === scene) this._scene = null; });
    }

    if (!this._playHeartbeatStarted) {
      this._startPlayHeartbeat();
    }
    if (!this._visibilityHandlerBound) {
      this._bindVisibilityHandler();
    }

    this._maybeDisplayNotifications();
  }

  static _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('[Achievements] failed to load', e);
      return null;
    }
  }

  static _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
    } catch (e) {
      console.warn('[Achievements] failed to save', e);
    }
  }

  static getAll() {
    this._ensureInitialized();
    return this._data;
  }

  static getDefinitions() {
    return ACHIEVEMENT_DEFS.slice();
  }

  // Read & clear notifications (returns array of achievement keys)
  static getNotifications() {
    const copy = this._notifications.slice();
    this._notifications.length = 0;
    return copy;
  }

  // ---- Totals / recorders ----
  static addGame() {
    this._ensureInitialized();
    this._data.totals.gamesPlayed = (this._data.totals.gamesPlayed || 0) + 1;
    this.maybeUnlock('firstPlay');
    this._save();
  }

  static addWaves(n) {
    this._ensureInitialized();
    n = Math.max(0, Math.floor(n || 0));
    this._data.totals.wavesPlayed = (this._data.totals.wavesPlayed || 0) + n;
    this._checkWaveMilestones();
    this._save();
  }

  // Backwards-compatible alias (rounds -> waves)
  static addRounds(n) {
    this.addWaves(n);
  }

  static addWin(n = 1) {
    this._ensureInitialized();
    n = Math.max(0, Math.floor(n || 1));
    this._data.totals.wins = (this._data.totals.wins || 0) + n;
    if (this._data.totals.wins >= 1) this.maybeUnlock('wins1');
    if (this._data.totals.wins >= 10) this.maybeUnlock('wins10');
    if (this._data.totals.wins >= 50) this.maybeUnlock('wins50');
    this._save();
  }

  static addMonsterDefeats(n = 1) {
    this._ensureInitialized();
    n = Math.max(0, Math.floor(n || 0));
    if (n <= 0) return;
    this._data.totals.monstersDefeated = (this._data.totals.monstersDefeated || 0) + n;
    this._checkEnemyMilestone();
    this._save();
  }

  static addDefenceDefeats(n = 1) {
    this._ensureInitialized();
    n = Math.max(0, Math.floor(n || 0));
    if (n <= 0) return;
    this._data.totals.defencesDestroyed = (this._data.totals.defencesDestroyed || 0) + n;
    this._checkEnemyMilestone();
    this._save();
  }

  static recordShopPurchase(rarity) {
    this._ensureInitialized();
    if (!rarity) return;
    this.recordUnitUnlock(rarity);
  }

  static recordUnitUnlock(rarity) {
    this._ensureInitialized();
    if (!rarity) return;
    const r = String(rarity).toLowerCase();
    if (r === 'epic') this.maybeUnlock('ownEpic');
    if (r === 'legendary') this.maybeUnlock('ownLegendary');
  }

  static recordWaveStun(waveKey, targetId) {
    this._ensureInitialized();
    if (!waveKey || !targetId) return;
    if (!this._waveStunTracker || this._waveStunTracker.waveKey !== waveKey) {
      this._waveStunTracker = { waveKey, targets: new Set() };
    }
    this._waveStunTracker.targets.add(targetId);
    if (this._waveStunTracker.targets.size >= STUN_WAVE_TARGET) {
      this.maybeUnlock('stunWave');
    }
  }

  // add total play seconds (called when session ends or on regular heartbeat)
  static addPlaySeconds(seconds) {
    this._ensureInitialized();
    seconds = Math.max(0, Math.floor(seconds || 0));
    this._data.totals.playTimeSeconds = (this._data.totals.playTimeSeconds || 0) + seconds;
    this._checkTimeMilestones();
    this._save();
  }

  // Complete a challenge
  static completeChallenge(key) {
    this._ensureInitialized();
    if (!key) return;
    if (!this._data.completedChallenges[key]) {
      this._data.completedChallenges[key] = true;
    }
    if (key === 'daily') {
      this._data.totals.dailyChallengesCompleted = (this._data.totals.dailyChallengesCompleted || 0) + 1;
      this._checkDailyMilestones();
    }
    this._save();
  }

  // Check if challenge completed
  static isChallengeCompleted(key) {
    this._ensureInitialized();
    return !!(this._data.completedChallenges && this._data.completedChallenges[key]);
  }

  // Checkers
  static _checkWaveMilestones() {
    const w = this._data.totals.wavesPlayed || 0;
    if (w >= 100) this.maybeUnlock('waves100');
    if (w >= 500) this.maybeUnlock('waves500');
    if (w >= 2500) this.maybeUnlock('waves2500');
  }

  static _checkEnemyMilestone() {
    const monsters = this._data.totals.monstersDefeated || 0;
    const defences = this._data.totals.defencesDestroyed || 0;
    const total = monsters + defences;
    if (total >= ENEMY_DEFEAT_TARGET) this.maybeUnlock('kills50');
    if (total >= ENEMY_DEFEAT_TARGET_250) this.maybeUnlock('kills250');
    if (total >= ENEMY_DEFEAT_TARGET_1000) this.maybeUnlock('kills1000');
  }

  static _checkTimeMilestones() {
    const t = this._data.totals.playTimeSeconds || 0;
    if (t >= HOURS_1_SECONDS) this.maybeUnlock('time1h');
    if (t >= HOURS_12_SECONDS) this.maybeUnlock('time12h');
    if (t >= HOURS_24_SECONDS) this.maybeUnlock('time24h');
  }

  static _checkDailyMilestones() {
    const d = this._data.totals.dailyChallengesCompleted || 0;
    if (d >= 1) this.maybeUnlock('daily1');
    if (d >= DAILY_CHALLENGE_TARGET) this.maybeUnlock('daily10');
  }

  // Mark unlocked and enqueue notification
  static maybeUnlock(key) {
    this._ensureInitialized();
    if (!key) return false;
    if (this._data.unlocked[key]) return false;

    this._data.unlocked[key] = true;
    this._notifications.unshift(key);
    if (this._notifications.length > 200) this._notifications.length = 200;
    this._save();
    this._maybeDisplayNotifications();
    return true;
  }

  // Attempt to display queued notifications using the registered scene (if any)
  static _maybeDisplayNotifications() {
    if (!this._notifications || this._notifications.length === 0) return;
    if (!this._scene) return;
    if (this._achieveNotificationRunning) {
      try {
        this._scene.time.delayedCall(200, () => this._maybeDisplayNotifications());
      } catch (e) {}
      return;
    }
    const notifs = this._notifications.slice();
    this._notifications.length = 0;
    this._displayAchievementSequence(notifs);
  }

  static _getLocalizedAchievementMeta() {
    const t = (key, fallback) => GlobalLocalization.t(key, fallback);
    const out = {};
    ACHIEVEMENT_DEFS.forEach((def) => {
      out[def.key] = {
        title: t(def.titleKey, def.title),
        desc: t(def.descKey, def.desc)
      };
    });
    return out;
  }

  /**
   * Display a sequence of achievement popups.
   * - notifs: array of achievement keys (required)
   * - onComplete: optional callback when finished
   * - sceneOverride: optional Phaser.Scene to use for UI (useful for mid-game popups)
   */
  static _displayAchievementSequence(notifs, onComplete, sceneOverride) {
    if (!Array.isArray(notifs) || notifs.length === 0) {
      if (onComplete) onComplete();
      return;
    }

    const displayScene = sceneOverride || this._scene;
    if (!displayScene) {
      this._notifications = notifs.concat(this._notifications);
      if (onComplete) onComplete();
      return;
    }

    const meta = this._getLocalizedAchievementMeta();
    this._achieveNotificationRunning = true;

    const displayOne = (idx) => {
      if (!displayScene || !displayScene.add) {
        const remainder = notifs.slice(idx);
        this._notifications = remainder.concat(this._notifications);
        this._achieveNotificationRunning = false;
        if (onComplete) onComplete();
        return;
      }

      if (idx >= notifs.length) {
        this._achieveNotificationRunning = false;
        if (onComplete) onComplete();
        return;
      }

      const key = notifs[idx];
      const item = meta[key] || { title: key, desc: '' };

      const boxY = displayScene.cameras.main.height - 120;
      const boxW = Math.min(800, displayScene.cameras.main.width - 120);
      const boxH = 72;
      const x = displayScene.cameras.main.centerX;

      let rect;
      let title;
      let desc;
      try {
        rect = displayScene.add.rectangle(x, boxY + 40, boxW, boxH, 0x111111, 0.95).setDepth(1000).setAlpha(0);
        rect.setStrokeStyle(2, 0x66ff66, 1);

        title = displayScene.add.text(x - boxW / 2 + 18, boxY + 12, item.title, { fontSize: 20, fontFamily: '"Press Start 2P", cursive', color: '#66ff66' }).setDepth(1001);
        desc = displayScene.add.text(x - boxW / 2 + 18, boxY + 36, item.desc, { fontSize: 14, fontFamily: '"Press Start 2P", cursive', color: '#ffffff' }).setDepth(1001);

        displayScene.tweens.add({
          targets: [rect, title, desc],
          y: '-=40',
          alpha: 1,
          duration: 260,
          ease: 'Cubic.easeOut'
        });
      } catch (e) {
        const remainder = notifs.slice(idx);
        this._notifications = remainder.concat(this._notifications);
        this._achieveNotificationRunning = false;
        if (onComplete) onComplete();
        return;
      }

      const hold = 1500;
      try {
        displayScene.time.delayedCall(hold, () => {
          if (!displayScene || !displayScene.tweens) {
            const remainder = notifs.slice(idx + 1);
            this._notifications = remainder.concat(this._notifications);
            this._achieveNotificationRunning = false;
            if (onComplete) onComplete();
            return;
          }

          displayScene.tweens.add({
            targets: [rect, title, desc],
            y: '+=40',
            alpha: 0,
            duration: 260,
            ease: 'Cubic.easeIn',
            onComplete: () => {
              try { rect.destroy(); } catch (e) {}
              try { title.destroy(); } catch (e) {}
              try { desc.destroy(); } catch (e) {}
              try {
                displayScene.time.delayedCall(130, () => displayOne(idx + 1));
              } catch (e) {
                const remainder = notifs.slice(idx + 1);
                this._notifications = remainder.concat(this._notifications);
                this._achieveNotificationRunning = false;
                if (onComplete) onComplete();
              }
            }
          });
        });
      } catch (e) {
        const remainder = notifs.slice(idx);
        this._notifications = remainder.concat(this._notifications);
        this._achieveNotificationRunning = false;
        if (onComplete) onComplete();
      }
    };

    displayOne(0);
  }

  // ---------- playtime heartbeat (global) ----------
  static _startPlayHeartbeat() {
    if (this._playHeartbeatStarted) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    this._playHeartbeatStarted = true;
    this._heartbeatId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.addPlaySeconds(1);
      }
    }, 1000);

    window.addEventListener('beforeunload', () => { this._save(); });
  }

  static _bindVisibilityHandler() {
    if (typeof document === 'undefined') return;
    if (this._visibilityHandlerBound) return;

    this._visibilityHandlerBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this._maybeDisplayNotifications();
      }
    });
  }
}

const GlobalAchievements = AchievementsManager;
export default GlobalAchievements;
