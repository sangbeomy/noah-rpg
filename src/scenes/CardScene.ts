import Phaser from 'phaser';
import { W, H, txt, button } from '../ui';
import { chapters } from '../data/chapters';
import { state, save } from '../state';
import { drawBackdrop, figure, prop } from '../art';
import { setMood, sfx } from '../audio';

const CARD_THEME: Record<number, string> = { 1: 'field', 2: 'storm', 3: 'ararat' };
const CARD_BG: Record<number, number> = { 1: 0x9ac86a, 2: 0x5a6a8a, 3: 0x9ac0e0 };

// 챕터 시작 카드 / 마지막 엔딩 카드
export class CardScene extends Phaser.Scene {
  constructor() { super('Card'); }

  create(data: { chapter: number }) {
    const ch = chapters.find(c => c.id === data.chapter);

    if (!ch) {                                   // 엔딩
      setMood('triumph'); sfx('win');
      this.add.rectangle(W / 2, H / 2, W, H, 0x9ac86a);
      drawBackdrop(this, 'field', 0x9ac86a);
      prop(this, 'rainbow', 480, 400, 0.8); prop(this, 'lion', 640, 480, 1.4); prop(this, 'rabbit', 760, 490, 1.6);
      figure(this, 'noah', 300, 480, 1.4, 'smile');
      figure(this, 'wife', 440, 480, 1.3, 'smile');
      this.add.rectangle(W / 2, 150, W - 120, 250, 0x140f22, 0.82).setStrokeStyle(3, 0xffe9a8);
      txt(this, W / 2, 80, '노아 이야기, 끝!', 52, '#ffe9a8').setOrigin(0.5);
      txt(this, W / 2, 148, `믿음 ${state.faith}  ·  용기 ${state.courage}  ·  지혜 ${state.wisdom}`, 28, '#ffffff').setOrigin(0.5);
      txt(this, W / 2, 205, '하나님은 약속을 지키세요 — 다음 이야기도 곧 만나요!', 22, '#d8cdf2').setOrigin(0.5);
      button(this, W / 2, 280, 260, 52, '처음으로', () => this.scene.start('Title'));
      return;
    }

    setMood('title');
    state.chapter = ch.id;
    state.node = ch.start;
    save();

    this.add.rectangle(W / 2, H / 2, W, H, 0x1b1626);
    drawBackdrop(this, CARD_THEME[ch.id] ?? 'desert', CARD_BG[ch.id] ?? 0x888888);
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.45);
    txt(this, W / 2, 140, `제 ${ch.id} 장`, 30, '#e8dcff').setOrigin(0.5);
    txt(this, W / 2, 210, ch.title, 54, '#ffe9a8').setOrigin(0.5).setStroke('#000000', 6);
    txt(this, W / 2, 280, `📖 ${ch.verse}`, 22, '#ffffff').setOrigin(0.5);
    button(this, W / 2, 380, 240, 56, '시작하기', () => this.scene.start('Story', { resume: true }));
  }
}
