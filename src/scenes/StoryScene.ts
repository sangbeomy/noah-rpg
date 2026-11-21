import Phaser from 'phaser';
import { W, H, txt, button } from '../ui';
import { chapters } from '../data/chapters';
import type { StoryNode } from '../data/types';
import { state, applyEffects, save } from '../state';
import { drawScene, ICON_SCENE } from '../art';
import { setMood, sfx, recentUiClick, type Mood } from '../audio';

const CHAPTER_MOOD: Record<number, Mood> = { 1: 'desert', 2: 'desert', 3: 'desert' };
const history: string[] = [];          // 이 장에서 지나온 장면들 (뒤로가기용)
let storyChapter = 0;
let storyMood: Mood = 'desert';

export class StoryScene extends Phaser.Scene {
  private node!: StoryNode;
  private resume = false;
  private typing?: Phaser.Time.TimerEvent;
  private fullText = '';
  private body!: Phaser.GameObjects.Text;
  private choiceUI: Phaser.GameObjects.GameObject[] = [];
  private advanceReady = false;

  constructor() { super('Story'); }

  init(data: { resume?: boolean }) { this.resume = !!data.resume; }

  private get chapter() { return chapters.find(c => c.id === state.chapter)!; }

  private find(id: string) { return this.chapter.nodes.find(n => n.id === id)!; }

  create() {
    this.node = this.find(state.node);
    this.render(this.node, !this.resume);
    this.resume = false;
  }

  private render(n: StoryNode, applyFx: boolean) {
    this.children.removeAll(true);
    this.choiceUI = [];
    this.advanceReady = false;

    state.node = n.id;
    if (applyFx) applyEffects(n.effects);
    save();

    // 장면 그림. 선택지가 있는 장면은 인물을 작게 그려서 위쪽 선택 버튼과 겹치지 않게 해요.
    this.add.rectangle(W / 2, H / 2, W, H, n.bg ?? 0x333333);
    drawScene(this, n.art ?? ICON_SCENE[n.icon ?? ''], {
      bg: n.bg ?? 0x333333, speaker: n.speaker, compact: !!n.choices, chapter: state.chapter,
    });

    // 배경음악 / 효과음
    if (state.chapter !== storyChapter) { history.length = 0; storyChapter = state.chapter; storyMood = CHAPTER_MOOD[state.chapter] ?? 'desert'; }
    if (n.music) storyMood = n.music;
    setMood(n.speaker === '하나님' ? 'holy' : storyMood);
    if (applyFx && n.sfx) sfx(n.sfx);

    // 상단 HUD
    this.add.rectangle(W / 2, 22, W, 44, 0x000000, 0.45);
    txt(this, 16, 8, `제${state.chapter}장 ${this.chapter.title}${n.plague ? ` · 재앙 ${n.plague}/10` : ''}`, 20, '#ffe9a8');
    txt(this, W - 16, 8, `❤️ ${state.hp}/${state.maxHp}  🙏 ${state.faith}  🛡️ ${state.courage}  💡 ${state.wisdom}`, 20).setOrigin(1, 0);
    if (n.verse) txt(this, W / 2, 56, `📖 ${n.verse}`, 18, '#fff3c4').setOrigin(0.5, 0);

    // 화면 아래 영역 구분:
    //  [이름표]  y 304~342  (대화창 바로 위, 대화창과 겹치지 않음)
    //  [대화창]  y 346~532  (메시지는 이 안쪽에서만 표시)
    const BOX_TOP = 346, BOX_BOTTOM = 532;
    this.add.rectangle(W / 2, (BOX_TOP + BOX_BOTTOM) / 2, W - 40, BOX_BOTTOM - BOX_TOP, 0x140f22, 0.94).setStrokeStyle(3, 0xffe9a8);
    if (n.speaker) {
      const tagW = Math.max(130, n.speaker.length * 26 + 50);
      this.add.rectangle(20 + tagW / 2, 323, tagW, 38, 0x5b3f8f).setStrokeStyle(3, 0xffe9a8);
      txt(this, 20 + tagW / 2, 323, n.speaker, 22, '#ffffff').setOrigin(0.5);
    }
    this.body = txt(this, 48, BOX_TOP + 14, '', 24, '#ffffff', W - 96);
    this.typeOut(n.text);

    this.input.removeAllListeners();
    this.input.on('pointerdown', () => this.onTap());
    this.input.keyboard?.removeAllListeners();
    this.input.keyboard?.on('keydown-SPACE', () => this.onTap());
    this.input.keyboard?.on('keydown-ENTER', () => this.onTap());
  }

  private typeOut(s: string) {
    this.fullText = s;
    let i = 0;
    this.typing?.remove();
    this.typing = this.time.addEvent({
      delay: 28, repeat: s.length - 1,
      callback: () => {
        i++; this.body.setText(s.slice(0, i));
        if (i >= s.length) this.finishTyping();
      },
    });
  }

  private finishTyping() {
    this.typing?.remove(); this.typing = undefined;
    this.body.setText(this.fullText);
    const n = this.node;
    if (n.choices) {
      n.choices.forEach((c, idx) => {
        const btn = button(this, W / 2, 115 + idx * 80, 800, 68, c.text, () => {
          applyEffects(c.effects);
          this.go(c.next);
        }, 0x3f7f5b);
        this.choiceUI.push(btn);
      });
    } else {
      this.advanceReady = true;
      const hint = txt(this, W - 44, H - 20,n.battle ? '⚔️ 전투 시작 ▶' : n.minigame ? '🎮 도전! ▶' : n.endChapter ? '장 마치기 ▶' : '▶', 20, '#ffe9a8').setOrigin(1, 0.5);
      this.tweens.add({ targets: hint, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
    }
  }

  private onTap() {
    if (recentUiClick()) return;     // 소리 버튼을 누른 것은 이야기 넘기기로 세지 않아요
    if (this.typing) { this.finishTyping(); return; }
    if (!this.advanceReady) return;
    const n = this.node;
    if (n.battle) {
      this.scene.start('Battle', n.battle);
    } else if (n.minigame) {
      this.scene.start('Mini', { ...n.minigame, nodeId: `${state.chapter}:${n.id}` });
    } else if (n.endChapter) {
      this.scene.start('Card', { chapter: state.chapter + 1 });
    } else {
      const arr = this.chapter.nodes;
      this.go(n.next ?? arr[arr.findIndex(x => x.id === n.id) + 1].id);
    }
  }

  /** 뒤로가기: 방금 본 장면으로 돌아가요 (처음 장면이면 false) */
  goBack(): boolean {
    const prev = history.pop();
    if (!prev) return false;
    this.node = this.find(prev);
    this.render(this.node, false);       // 능력치는 다시 올리지 않아요
    return true;
  }

  private go(id: string) {
    history.push(this.node.id);
    if (history.length > 200) history.shift();
    this.node = this.find(id);
    this.render(this.node, true);
  }
}
