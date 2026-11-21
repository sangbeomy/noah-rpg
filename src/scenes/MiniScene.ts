import Phaser from 'phaser';
import { W, H, txt, button, shake } from '../ui';
import { state, save } from '../state';
import type { MiniGame } from '../data/types';
import { drawScene, ICON_SCENE, figure, prop, makeIcon, type Icon } from '../art';
import { setMood, sfx } from '../audio';

// 화면에 쓰이는 글자 (폰트 미리 불러오기용)
export const MINI_TEXT = '재앙 번째 기회 다시 도전 성공 아쉬워요 하나님이 도와주실 거예요 도움을 받아 조금 쉬워졌어요 망치질 날리기 지금 순서대로 물방울 방주 노아 가족 동물 안내하기 피해서 지켜요  눌러요 남은 시간 초 찾았어요 빛을 움직여 힌트 이쪽이에요 마리 개 가만히 움직였어요 두려워도 서 있어요 소고 팔의 힘 아론과 훌이 받쳐 줘요 내려가요 꾹 눌러요 톡톡 ❤️';

const attempts: Record<string, number> = {};
type Game = MiniGame & { nodeId: string };

export class MiniScene extends Phaser.Scene {
  private g!: Game;
  private easy = false;
  private lives = 3;
  private ended = false;
  private livesText!: Phaser.GameObjects.Text;
  private info!: Phaser.GameObjects.Text;
  private tick: (dt: number) => void = () => {};

  constructor() { super('Mini'); }

  init(d: Game) {
    this.g = d;
    this.ended = false;
    this.easy = (attempts[d.nodeId] ?? 0) >= 2;   // 두 번 실패하면 하나님이 도와주세요 (쉬워짐)
    this.tick = () => {};
  }

  update(_t: number, dt: number) { if (!this.ended) this.tick(dt); }

  private icon(emoji: string, x: number, y: number, size: number): Icon {
    return makeIcon(this, emoji, x, y, size, (s, sz) => txt(this, 0, 0, s, sz));
  }

  create() {
    const g = this.g;
    setMood(g.mood ?? (g.kind === 'sequence' ? 'desert' : 'tense'));
    this.add.rectangle(W / 2, H / 2, W, H, g.bg ?? 0x333333);
    drawScene(this, g.art ?? ICON_SCENE[g.icon], { bg: g.bg ?? 0x333333, figures: false });
    this.add.rectangle(W / 2, 28, W, 56, 0x000000, 0.5);
    txt(this, 16, 12, `${g.plague ? `재앙 ${g.plague}/10 · ` : ''}${g.title}`, 24, '#ffe9a8');
    this.livesText = txt(this, W - 16, 12, '', 24).setOrigin(1, 0);
    const pbg = this.add.rectangle(W / 2, 104, W - 60, 76, 0x000000, 0.42);
    this.info = txt(this, W / 2, 104, g.prompt + (this.easy ? '\n(도움을 받아 조금 쉬워졌어요)' : ''), 22, '#ffffff', W - 100).setOrigin(0.5);
    this.info.setAlign('center');
    pbg.setSize(W - 60, Math.max(54, this.info.height + 22));
    this.lives = 3 + (this.easy ? 2 : 0) + (g.kind === 'dodge' ? Math.min(3, Math.floor(state.courage / 2)) : 0);
    this.showLives();

    ({ timing: () => this.timing(), tap: () => this.tapGame(), dodge: () => this.dodge(),
       seek: () => this.seek(), sequence: () => this.sequence(), wait: () => this.waitGame(), raise: () => this.raise() })[g.kind]();
  }

  private showLives() {
    const g = this.g;
    const uses = g.kind === 'timing' || g.kind === 'dodge' || g.kind === 'wait' || (g.kind === 'tap' && !!g.bad);
    this.livesText.setText(uses ? '❤️'.repeat(Math.max(0, this.lives)) : '');
  }

  private loseLife() {
    if (this.ended) return;
    this.lives--; this.showLives(); shake(this, this.livesText, 6); sfx('miss');
    if (this.lives <= 0) this.fail();
  }

  private win() {
    if (this.ended) return;
    this.ended = true; sfx('win');
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55);
    txt(this, W / 2, H / 2 - 20, '🎉 성공!', 72, '#ffe9a8').setOrigin(0.5);
    this.time.delayedCall(1200, () => {
      state.node = this.g.win; save();
      this.scene.start('Story', { resume: false });
    });
  }

  private fail() {
    if (this.ended) return;
    this.ended = true; sfx('lose');
    attempts[this.g.nodeId] = (attempts[this.g.nodeId] ?? 0) + 1;
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.65);
    txt(this, W / 2, H / 2 - 70, '😢 아쉬워요!', 56, '#ffe9a8').setOrigin(0.5);
    txt(this, W / 2, H / 2 - 10, '하나님이 도와주실 거예요. 다시 도전해요!', 24, '#ffffff').setOrigin(0.5);
    button(this, W / 2, H / 2 + 70, 260, 60, '다시 도전', () => this.scene.restart(this.g));
  }

  private rnd(a: number, b: number) { return a + Math.random() * (b - a); }

  // ── 1) 타이밍: 움직이는 표시가 초록 칸에 있을 때 누르기 ──────────────
  private timing() {
    const g = this.g, goal = g.goal ?? 3;
    const x0 = 130, tw = 700, y = 316;
    const zoneW = Math.min(0.34, 0.11 + state.faith * 0.012 + (this.easy ? 0.09 : 0));
    let hits = 0, pos = 0, dir = 1, zc = this.rnd(0.25, 0.75);
    const base = 0.00055 * (g.speed ?? 1) * (this.easy ? 0.7 : 1);

    const who = figure(this, g.fig ?? 'noah', 480, 268, 0.56, 'smile');
    this.add.rectangle(x0 + tw / 2, y, tw, 36, 0x222222).setStrokeStyle(3, 0xffffff);
    const zone = this.add.rectangle(0, y, tw * zoneW, 36, 0x44cc66);
    const marker = this.add.rectangle(x0, y, 10, 56, 0xffffff);
    const count = txt(this, W / 2, 364, `0 / ${goal}`, 30, '#ffe9a8').setOrigin(0.5);
    const place = () => zone.setX(x0 + tw * zc);
    place();

    const press = () => {
      if (this.ended) return;
      if (Math.abs(pos - zc) <= zoneW / 2) {
        hits++; count.setText(`${hits} / ${goal}`); sfx('ding');
        this.cameras.main.flash(150, 255, 255, 255);
        this.tweens.add({ targets: who, y: 258, duration: 90, yoyo: true });
        if (hits >= goal) return this.win();
        zc = this.rnd(0.2, 0.8); place();
      } else this.loseLife();
    };
    button(this, W / 2, 454, 320, 70, g.btn ?? '👆 지금!', press, 0x8f6a3f);
    this.input.keyboard?.on('keydown-SPACE', press);
    this.tick = (dt) => {
      pos += dir * dt * (base + hits * 0.00012);
      if (pos >= 1) { pos = 1; dir = -1; } else if (pos <= 0) { pos = 0; dir = 1; }
      marker.setX(x0 + tw * pos);
    };
  }

  // ── 2) 누르기: 나타나는 것을 눌러요 (눌러선 안 되는 것도 있어요) ──────
  private tapGame() {
    const g = this.g, goal = g.goal ?? 10;
    let left = (g.time ?? 20) * (this.easy ? 1.5 : 1) + Math.min(4, state.wisdom);
    let got = 0;
    const status = txt(this, W / 2, 504, '', 26, '#ffe9a8').setOrigin(0.5);
    this.add.rectangle(W / 2, 504, 460, 40, 0x000000, 0.45).setDepth(-1);
    const refresh = () => status.setText(`${g.icon} ${got} / ${goal}      ⏱️ ${Math.ceil(left)}초`);
    refresh();

    const spawn = () => {
      if (this.ended) return;
      const isBad = !!g.bad && Math.random() < 0.28;
      const t = this.icon(isBad ? g.bad! : (g.icons ? g.icons[Math.floor(Math.random() * g.icons.length)] : g.icon), this.rnd(80, 880), this.rnd(190, 440), 68);
      t.setInteractive({ useHandCursor: true });
      t.once('pointerdown', () => {
        if (this.ended) return;
        t.disableInteractive();
        this.tweens.add({ targets: t, scale: 1.6, alpha: 0, duration: 180, onComplete: () => t.destroy() });
        if (isBad) { this.loseLife(); return; }
        got++; refresh(); sfx('pop');
        if (got >= goal) this.win();
      });
      this.tweens.add({ targets: t, alpha: 0, delay: 1100, duration: 400, onComplete: () => t.destroy() });
    };
    this.time.addEvent({ delay: this.easy ? 700 : 520, loop: true, callback: spawn });
    this.tick = (dt) => {
      left -= dt / 1000; refresh();
      if (left <= 0) this.fail();
    };
  }

  // ── 3) 피하기: 떨어지는 것을 피해 좌우로 움직여요 ──────────────────
  private dodge() {
    const g = this.g;
    let left = (g.time ?? 18) * (this.easy ? 0.75 : 1);
    const total = left;
    const me = figure(this, 'noah', W / 2, 520, 0.36, 'worry');
    const meY = 484;
    let targetX = W / 2, invuln = 0;
    const bar = this.add.rectangle(0, 51, 0, 8, 0xffe9a8).setOrigin(0, 0.5);
    const falling: { o: Icon; vy: number }[] = [];

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { targetX = p.x; });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { targetX = p.x; });
    const keys = this.input.keyboard?.createCursorKeys();

    this.time.addEvent({
      delay: this.easy ? 650 : 440, loop: true,
      callback: () => {
        if (this.ended) return;
        const o = this.icon(g.icon, this.rnd(50, 910), 170, 52);
        falling.push({ o, vy: this.rnd(230, 340) * (this.easy ? 0.75 : 1) });
      },
    });
    this.tick = (dt) => {
      const s = dt / 1000;
      if (keys?.left.isDown) targetX -= 460 * s;
      if (keys?.right.isDown) targetX += 460 * s;
      targetX = Phaser.Math.Clamp(targetX, 40, W - 40);
      me.x += (targetX - me.x) * Math.min(1, s * 14);
      invuln = Math.max(0, invuln - dt);
      me.setAlpha(invuln > 0 ? 0.4 : 1);

      for (let i = falling.length - 1; i >= 0; i--) {
        const f = falling[i];
        f.o.y += f.vy * s;
        if (invuln <= 0 && Math.abs(f.o.x - me.x) < 38 && Math.abs(f.o.y - meY) < 46) {
          f.o.destroy(); falling.splice(i, 1);
          invuln = 1000; this.loseLife();
        } else if (f.o.y > H + 40) { f.o.destroy(); falling.splice(i, 1); }
      }
      left -= s;
      bar.width = W * (1 - Math.max(0, left) / total);
      if (left <= 0) this.win();
    };
  }

  // ── 4) 찾기: 어둠 속에서 빛을 움직여 보이지 않는 것을 찾아요 ────────
  private seek() {
    const g = this.g, goal = g.goal ?? 5;
    let left = (g.time ?? 45) * (this.easy ? 1.5 : 1);
    const radius = 105 + state.wisdom * 8 + (this.easy ? 60 : 0);
    const pts: { x: number; y: number }[] = [];
    while (pts.length < goal) {
      const p = { x: this.rnd(80, 880), y: this.rnd(190, 470) };
      if (pts.every(q => Phaser.Math.Distance.Between(p.x, p.y, q.x, q.y) > 150)) pts.push(p);
    }
    const items = pts.map(p => ({ ...p, o: this.icon(g.icon, p.x, p.y, 54).setAlpha(0), found: false }));
    const glow = this.add.circle(W / 2, H / 2, radius, 0xffe9a8, 0.12).setStrokeStyle(2, 0xffe9a8, 0.5);
    const status = txt(this, W / 2, 505, '', 24, '#ffe9a8').setOrigin(0.5);
    let found = 0, lx = W / 2, ly = H / 2;

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { lx = p.x; ly = p.y; });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { lx = p.x; ly = p.y; });
    this.tick = (dt) => {
      glow.setPosition(lx, ly);
      left -= dt / 1000;
      for (const it of items) {
        if (it.found) continue;
        const d = Phaser.Math.Distance.Between(lx, ly, it.x, it.y);
        it.o.setAlpha(Phaser.Math.Clamp(1.4 - d / radius, 0, 1));
        if (d < 44) {
          it.found = true; found++; sfx('chime');
          this.tweens.add({ targets: it.o, scale: 1.5, duration: 250, yoyo: true });
          it.o.setAlpha(1);
          if (found >= goal) this.win();
        }
      }
      status.setText(`${g.icon} ${found} / ${goal}      ⏱️ ${Math.ceil(left)}초`);
      if (left <= 0) this.fail();
    };
  }

  // ── 5) 순서: 올바른 순서대로 눌러요 (틀려도 괜찮아요, 힌트가 나와요) ─
  private sequence() {
    const g = this.g, steps = g.steps ?? [];
    let k = 0, wrong = 0;
    const order = Phaser.Utils.Array.Shuffle([...steps]);
    const btns = order.map((label, i) => {
      const b = button(this, W / 2, 218 + i * 76, 780, 64, label, () => pick(label, b), 0x5b3f8f);
      return b;
    });
    const pick = (label: string, b: Phaser.GameObjects.Container) => {
      if (this.ended || !b.input?.enabled) return;
      if (label === steps[k]) {
        k++; sfx('ding');
        b.disableInteractive();
        (b.list[0] as Phaser.GameObjects.Rectangle).setFillStyle(0x3f7f5b);
        const num = txt(this, 0, 0, `${k}`, 28, '#ffe9a8').setOrigin(0.5);
        b.add(num); num.setPosition(-370, 0);
        if (k >= steps.length) this.win();
      } else {
        wrong++; shake(this, b, 10);
        if (wrong >= 2 || state.wisdom >= 3) {
          const hintIdx = order.indexOf(steps[k]);
          this.tweens.add({ targets: btns[hintIdx], scale: 1.05, duration: 350, yoyo: true, repeat: 3 });
        }
      }
    };
  }

  // ── 7) 팔 들기: 누르고 있거나 톡톡 눌러서 지팡이를 든 팔이 내려가지 않게 해요 ──
  //    시간이 갈수록 팔이 무거워지다가, 절반쯤 지나면 아론과 훌이 팔을 받쳐 줘요.
  private raise() {
    const g = this.g;
    const total = g.time ?? 20;
    let left = total, meter = 0.62, helped = false, low = false;
    const me = figure(this, 'moses', 700, 324, 0.95, 'awe');
    const aaron = figure(this, 'aaron', 610, 324, 0.95, 'smile').setAlpha(0);
    const hur = figure(this, 'hur', 790, 324, 0.95, 'smile').setAlpha(0);
    const amalek = figure(this, 'amalek', 150, 324, 0.8, 'angry');
    const joshua = figure(this, 'joshua', 300, 324, 0.8, 'angry');
    const bar = this.add.rectangle(W / 2 - 300, 466, 0, 24, 0x44cc66).setOrigin(0, 0.5);
    this.add.rectangle(W / 2, 466, 604, 30, 0x000000, 0).setStrokeStyle(3, 0xffffff);
    txt(this, W / 2 - 300, 436, '💪 팔의 힘', 22, '#ffe9a8');
    const status = txt(this, W / 2, 508, '', 24, '#ffe9a8').setOrigin(0.5);
    const shout = txt(this, W / 2, 400, '', 28, '#ffffff').setOrigin(0.5).setStroke('#000000', 5);
    const space = this.input.keyboard?.addKey('SPACE');

    const tap = () => { if (!this.ended) { meter = Math.min(1, meter + 0.08); sfx('pop'); } };
    this.input.on('pointerdown', tap);
    this.input.keyboard?.on('keydown-SPACE', tap);

    this.tick = (dt) => {
      const s = dt / 1000, prog = 1 - Math.max(0, left) / total;
      const holding = this.input.activePointer.isDown || !!space?.isDown;
      const decay = (0.18 + 0.25 * prog) * (helped ? 0.55 : 1) * (this.easy ? 0.7 : 1);
      meter = Math.min(1, meter + ((holding ? 0.3 : 0) - decay) * s);
      left -= s;

      if (!helped && prog >= 0.5) {
        helped = true; sfx('chime');
        this.tweens.add({ targets: [aaron, hur], alpha: 1, duration: 500 });
        shout.setText('아론과 훌이 팔을 받쳐 줘요!');
        this.time.delayedCall(2200, () => shout.setText(''));
      }
      if (meter < 0.25 && !low) { low = true; shout.setText('팔이 내려가요! 꾹 누르거나 톡톡 눌러요!'); this.time.delayedCall(1500, () => shout.setText('')); }
      if (meter > 0.4) low = false;

      me.y = 324 + (1 - meter) * 14;
      joshua.x = 300 + (meter - 0.5) * 170; amalek.x = joshua.x - 150 - (meter - 0.5) * 60;   // 팔이 높을수록 이스라엘이 밀어붙여요
      bar.width = 600 * Math.max(0, meter);
      bar.setFillStyle(meter < 0.25 ? 0xe05050 : meter < 0.5 ? 0xe0b040 : 0x44cc66);
      status.setText(`⏱️ ${Math.max(0, Math.ceil(left))}초`);
      if (meter <= 0) this.fail();
      else if (left <= 0) this.win();
    };
  }

  // ── 6) 기다리기: 무서워도 화면을 누르지 않고 가만히 서 있어요 ───────
  private waitGame() {
    const g = this.g;
    const total = (g.time ?? 10) * (this.easy ? 0.7 : 1);
    let left = total, grace = 700, cooldown = 0, rumble = 0;
    const army = [0, 1, 2].map(i => prop(this, 'chariotL', -150 - i * 190, 318 - i * 8, 0.9 - i * 0.1));
    prop(this, 'crowd', 800, 338, 0.8);
    const me = figure(this, 'moses', 600, 330, 0.8, 'awe');
    const bar = this.add.rectangle(0, 51, 0, 8, 0xffe9a8).setOrigin(0, 0.5);
    const shout = txt(this, W / 2, 400, '', 30, '#ffe9a8').setOrigin(0.5);

    const moved = () => {
      if (this.ended || grace > 0 || cooldown > 0) return;
      cooldown = 700;
      shout.setText('움직였어요! 가만히 서 있어요!');
      this.time.delayedCall(900, () => shout.setText(''));
      this.loseLife();
    };
    this.input.on('pointerdown', moved);
    this.input.keyboard?.on('keydown', moved);

    this.tick = (dt) => {
      const s = dt / 1000;
      grace = Math.max(0, grace - dt); cooldown = Math.max(0, cooldown - dt);
      left -= s;
      const prog = 1 - Math.max(0, left) / total;
      army.forEach((a, i) => { a.x = -150 - i * 190 + (500 + i * 40) * prog + Math.sin(left * 14 + i) * 3; });
      me.y = 330 + Math.sin(left * 9) * 1.2;
      rumble -= dt; if (rumble <= 0) { sfx('rumble'); rumble = 900; }
      bar.width = W * prog;
      if (left <= 0) this.win();
    };
  }
}
