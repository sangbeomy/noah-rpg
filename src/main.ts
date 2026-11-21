import Phaser from 'phaser';
import { W, H } from './ui';
import { TitleScene } from './scenes/TitleScene';
import { CardScene } from './scenes/CardScene';
import { StoryScene } from './scenes/StoryScene';
import { BattleScene } from './scenes/BattleScene';
import { MiniScene, MINI_TEXT } from './scenes/MiniScene';
import { GalleryScene } from './scenes/GalleryScene';
import { HudScene } from './scenes/HudScene';
import { chapters } from './data/chapters';
import { enemies } from './data/enemies';

async function start() {
  // 한글 폰트가 로드될 때까지 잠깐 기다림 (실패해도 계속 진행)
  // Google Fonts는 글자 묶음별로 나뉘어 있어서, 게임에 쓰이는 모든 글자를 미리 요청합니다.
  const all = JSON.stringify(chapters) + JSON.stringify(enemies) + MINI_TEXT + ' 새로 시작이어하기노아방주무지개이야기성경속영웅들의모험장화면을눌러서진행해요시작하기처음으로끝다음열가지재앙과홍해곧만나요믿음용기지혜체력전투승리했다쓰러졌어떻게할까지팡이공격기도회복타이르기';
  try { await Promise.race([document.fonts.load('24px Jua', all), new Promise(r => setTimeout(r, 3000))]); } catch { /* ignore */ }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    backgroundColor: '#1b1626',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [TitleScene, CardScene, StoryScene, BattleScene, MiniScene, GalleryScene, HudScene],
  });
  // 개발용 그림 모아보기: ?gallery=1
  const gal = /gallery=(\d+)/.exec(location.search);
  if (gal) game.events.once('ready', () => { game.scene.stop('Title'); game.scene.start('Gallery', { page: Number(gal[1]) }); });
  // 테스트용: 주소 끝에 ?debug 를 붙이면 window.__game 으로 접근 가능
  if (location.search.includes('debug')) (window as unknown as { __game: Phaser.Game }).__game = game;
}
start();
