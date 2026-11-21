import Phaser from 'phaser';
import { W, H, txt, button, shake } from '../ui';
import { enemies } from '../data/enemies';
import { state, save } from '../state';
import { figure, drawBackdrop } from '../art';
import { setMood, sfx } from '../audio';

interface BattleData { enemy: string; win: string; lose: string }

// 간단한 턴제 전투: 지팡이 공격 / 기도(회복) / 타이르기(적 약화)
export class BattleScene extends Phaser.Scene {
  private d!: BattleData;
  private enemyHp = 0;
  private enemyMax = 0;
  private enemyAtk = 0;
  private busy = false;
  private log!: Phaser.GameObjects.Text;
  private hud!: Phaser.GameObjects.Text;
  private enemyHud!: Phaser.GameObjects.Text;
  private enemyIcon!: Phaser.GameObjects.Graphics;
  private heroIcon!: Phaser.GameObjects.Graphics;
  private buttons: Phaser.GameObjects.Container[] = [];

  constructor() { super('Battle'); }

  init(d: BattleData) { this.d = d; }

  create() {
    const e = enemies[this.d.enemy];
    this.enemyHp = this.enemyMax = e.hp;
    this.enemyAtk = e.atk;
    this.busy = false;
    this.buttons = [];

    setMood('battle');
    this.add.rectangle(W / 2, H / 2, W, H, 0x3a1f2a);
    drawBackdrop(this, e.theme, 0xd9a441);
    this.add.rectangle(W / 2, 50, W, 100, 0x000000, 0.5);   // 이름·체력 글씨가 잘 보이게
    this.add.rectangle(W / 2, 400, W, 280, 0x140f22, 0.92);
    this.enemyIcon = figure(this, e.fig, 700, 262, 0.82, 'angry', true);
    this.heroIcon = figure(this, 'moses', 240, 262, 0.82, 'smile');
    txt(this, 700, 50, e.name, 26, '#ffe9a8').setOrigin(0.5);
    txt(this, 240, 50, '모세', 26, '#ffe9a8').setOrigin(0.5);
    this.enemyHud = txt(this, 700, 85, '', 22).setOrigin(0.5);
    this.hud = txt(this, 240, 85, '', 22).setOrigin(0.5);
    this.log = txt(this, 40, 292, e.intro, 24, '#ffffff', W - 80);

    this.buttons.push(
      button(this, 180, 450, 270, 64, '💥 지팡이 공격', () => this.act('attack')),
      button(this, 480, 450, 270, 64, '🙏 기도 (회복)', () => this.act('pray'), 0x3f7f5b),
      button(this, 780, 450, 270, 64, '💬 타이르기', () => this.act('talk'), 0x8f6a3f),
    );
    this.refresh();
  }

  private refresh() {
    this.hud.setText(`❤️ ${state.hp}/${state.maxHp}`);
    this.enemyHud.setText(`❤️ ${Math.max(0, this.enemyHp)}/${this.enemyMax}`);
  }

  private setBusy(b: boolean) {
    this.busy = b;
    this.buttons.forEach(x => x.setAlpha(b ? 0.4 : 1));
  }

  private rnd(n: number) { return Math.floor(Math.random() * (n + 1)); }

  private act(kind: 'attack' | 'pray' | 'talk') {
    if (this.busy) return;
    this.setBusy(true);
    let msg = '';
    if (kind === 'attack') {
      const dmg = 3 + state.courage + this.rnd(2);
      this.enemyHp -= dmg;
      shake(this, this.enemyIcon);
      sfx('swing'); this.time.delayedCall(140, () => sfx('hit'));
      msg = `모세가 지팡이를 휘둘렀다! ${dmg}의 피해!`;
    } else if (kind === 'pray') {
      const heal = 4 + state.faith * 2;
      state.hp = Math.min(state.maxHp, state.hp + heal);
      sfx('heal');
      msg = `모세가 기도했다. 마음이 든든해졌다! 체력 ${heal} 회복.`;
    } else {
      const dmg = 1 + Math.floor(state.wisdom / 2);
      this.enemyHp -= dmg;
      const weaker = this.enemyAtk > 1;
      if (weaker) this.enemyAtk -= 1;
      msg = weaker ? '모세가 차분히 타일렀다. 상대의 기세가 꺾였다!' : '모세가 차분히 타일렀다.';
    }
    this.log.setText(msg);
    this.refresh();

    this.time.delayedCall(900, () => {
      if (this.enemyHp <= 0) return this.finish(true);
      const dmg = this.enemyAtk + this.rnd(2);
      state.hp = Math.max(0, state.hp - dmg);
      shake(this, this.heroIcon); sfx('hit');
      this.log.setText(`${enemies[this.d.enemy].name}의 공격! ${dmg}의 피해를 입었다.`);
      this.refresh();
      this.time.delayedCall(900, () => {
        if (state.hp <= 0) return this.finish(false);
        this.log.setText('어떻게 할까?');
        this.setBusy(false);
      });
    });
  }

  private finish(win: boolean) {
    this.log.setText(win ? '🎉 승리했다!' : '😵 모세가 쓰러졌다…');
    sfx(win ? 'win' : 'lose');
    if (!win) state.hp = state.maxHp;
    else state.hp = Math.min(state.maxHp, state.hp + 6);
    state.node = win ? this.d.win : this.d.lose;
    save();
    this.time.delayedCall(1200, () => this.scene.start('Story', { resume: false }));
  }
}
