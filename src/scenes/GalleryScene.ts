import Phaser from 'phaser';
import { W, txt } from '../ui';
import { drawScene, SCENE_NAMES } from '../art';

// 개발용: 주소 끝에 ?gallery=1 (또는 2, 3…)을 붙이면 모든 장면 그림을 한눈에 볼 수 있어요.
export class GalleryScene extends Phaser.Scene {
  constructor() { super('Gallery'); }

  create(d: { page: number }) {
    const per = 9, names = SCENE_NAMES.slice((d.page - 1) * per, d.page * per);
    this.add.rectangle(480, 270, W, 540, 0x111111);
    names.forEach((n, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const box = this.add.container(col * 320 + 2, row * 180 + 2);
      drawScene(this, n, { bg: 0xd9a441, chapter: 4 }).forEach(g => box.add(g));
      box.setScale(0.331);
      txt(this, col * 320 + 8, row * 180 + 4, n, 14, '#ffffff').setStroke('#000000', 4);
    });
  }
}
