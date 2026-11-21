import Phaser from 'phaser';
import { sfx, markUiClick } from './audio';

export const W = 960;
export const H = 540;
export const FONT = 'Jua, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';

export function txt(scene: Phaser.Scene, x: number, y: number, s: string, size = 24,
  color = '#ffffff', wrap = 0): Phaser.GameObjects.Text {
  return scene.add.text(x, y, s, {
    fontFamily: FONT, fontSize: `${size}px`, color,
    wordWrap: wrap ? { width: wrap, useAdvancedWrap: true } : undefined,
    lineSpacing: 8,
  });
}

export function button(scene: Phaser.Scene, x: number, y: number, w: number, h: number,
  label: string, onClick: () => void, fill = 0x5b3f8f): Phaser.GameObjects.Container {
  const bg = scene.add.rectangle(0, 0, w, h, fill).setStrokeStyle(3, 0xffffff, 0.9);
  const t = txt(scene, 0, 0, label, 22, '#ffffff', w - 24).setOrigin(0.5);
  t.setAlign('center');
  const c = scene.add.container(x, y, [bg, t]).setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerover', () => bg.setFillStyle(Phaser.Display.Color.ValueToColor(fill).lighten(20).color));
  c.on('pointerout', () => bg.setFillStyle(fill));
  c.on('pointerdown', () => { markUiClick(); sfx('click'); onClick(); });
  return c;
}

export function shake(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject, dx = 12) {
  const o = target as unknown as { x: number };
  const x0 = o.x;
  scene.tweens.add({ targets: target, x: x0 + dx, duration: 50, yoyo: true, repeat: 3, onComplete: () => { o.x = x0; } });
}
