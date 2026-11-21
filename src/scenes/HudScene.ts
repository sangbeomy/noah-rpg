import Phaser from 'phaser';
import { FONT } from '../ui';
import { unlock, isMuted, setMuted, markUiClick, sfx } from '../audio';
import type { StoryScene } from './StoryScene';

const PLAY = ['Story', 'Battle', 'Mini'];          // 이야기/전투/미니게임 중
const ALL = [...PLAY, 'Card', 'Gallery'];

// 모든 화면 위에 항상 떠 있는 작은 버튼들: 🏠 처음 화면 / ◀ 뒤로 / 소리 켜기·끄기
export class HudScene extends Phaser.Scene {
  private home!: Phaser.GameObjects.Container;
  private back!: Phaser.GameObjects.Container;

  constructor() { super('Hud'); }

  private makeBtn(x: number, label: string, onTap: () => void) {
    const bg = this.add.circle(0, 0, 19, 0x000000, 0.45).setStrokeStyle(2, 0xffffff, 0.8);
    const icon = this.add.text(0, 1, label, { fontFamily: FONT, fontSize: '20px' }).setOrigin(0.5);
    const btn = this.add.container(x, 24, [bg, icon]).setSize(44, 44);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => { markUiClick(); unlock(); onTap(); });
    return Object.assign(btn, { icon });
  }

  create() {
    const mute = this.makeBtn(556, isMuted() ? '🔇' : '🔊', () => {
      setMuted(!isMuted());
      mute.icon.setText(isMuted() ? '🔇' : '🔊');
    });
    this.back = this.makeBtn(498, '◀', () => this.goBack());
    this.home = this.makeBtn(440, '🏠', () => this.goHome());
    this.home.setVisible(false); this.back.setVisible(false);

    // 첫 터치/키 입력 때 소리 잠금 해제
    this.input.on('pointerdown', () => unlock());
    this.input.keyboard?.on('keydown', () => unlock());
  }

  update() {
    const m = this.game.scene;
    const inPlay = PLAY.some(k => m.isActive(k));
    this.back.setVisible(inPlay);
    this.home.setVisible(inPlay || m.isActive('Card') || m.isActive('Gallery'));
  }

  private goBack() {
    const m = this.game.scene;
    if (m.isActive('Story')) {
      const ok = (m.getScene('Story') as StoryScene).goBack();
      if (ok) sfx('pop');
      else this.tweens.add({ targets: this.back, x: '+=5', duration: 50, yoyo: true, repeat: 2 });   // 더 돌아갈 곳이 없어요
    } else if (m.isActive('Battle') || m.isActive('Mini')) {
      // 전투/미니게임을 그만두고 그 전 이야기 장면으로
      ['Battle', 'Mini'].forEach(k => m.stop(k));
      m.start('Story', { resume: true });
    }
  }

  private goHome() {
    const m = this.game.scene;
    ALL.forEach(k => { if (m.isActive(k)) m.stop(k); });
    m.start('Title');                                   // 진행 상황은 이미 저장되어 있어요
  }
}
