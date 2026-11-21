import type { Mood, Sfx } from '../audio';

export type Stat = 'faith' | 'courage' | 'wisdom';
export type Effects = Partial<Record<Stat, number>>;

export interface Choice { text: string; next: string; effects?: Effects; flag?: string }

// 미니게임: 재앙마다 다른 방식으로 도전해요. 실패해도 괜찮아요 — 다시 도전하면 점점 쉬워져요.
export interface MiniGame {
  kind: 'timing' | 'tap' | 'dodge' | 'seek' | 'sequence' | 'wait' | 'raise';
  title: string;
  prompt: string;
  icon: string;              // 목표물/그림 (tap: 누를 것, dodge: 떨어지는 것, seek: 찾을 것)
  icons?: string[];          // tap: 여러 가지 그림이 섞여 나올 때
  bad?: string;              // tap: 누르면 안 되는 것
  goal?: number;             // timing: 성공 횟수 / tap: 개수 / seek: 찾을 개수
  time?: number;             // 제한 시간(초): tap, dodge(버티는 시간), seek
  speed?: number;            // timing: 속도 배율
  steps?: string[];          // sequence: 올바른 순서
                             // wait: time(초) 동안 가만히 기다리기
  win: string;               // 성공하면 갈 노드
  art?: string;              // 배경 그림 이름 (없으면 icon으로 고름)
  fig?: string;              // timing: 가운데에 서 있는 인물 (기본 moses)
  btn?: string;              // timing: 버튼에 쓸 글자 (기본 "🙌 지팡이 들기!")
                             // raise: time(초) 동안 팔을 내리지 않고 버티기
  mood?: Mood;               // 배경음악 (기본: 긴장감 / 순서 맞추기는 잔잔하게)
  plague?: number;
  bg?: number;
}

export interface StoryNode {
  id: string;
  speaker?: string;          // 말하는 사람 (없으면 해설)
  text: string;
  bg?: number;               // 배경색 (0xRRGGBB)
  icon?: string;             // 장면 그림을 고르는 열쇠 (art.ts의 ICON_SCENE)
  art?: string;              // 장면 그림 이름 직접 지정 (icon보다 우선)
  music?: Mood;              // 이 장면부터 바꿀 배경음악
  sfx?: Sfx;                 // 이 장면에 들어올 때 한 번 울릴 효과음
  verse?: string;            // 성경 참조 (예: 출애굽기 2:11)
  effects?: Effects;
  next?: string;             // 생략하면 배열의 다음 노드로 이동
  choices?: Choice[];
  battle?: { enemy: string; win: string; lose: string };
  minigame?: MiniGame;
  plague?: number;           // 재앙 번호 (1~10) — 화면 위에 표시
  endChapter?: boolean;      // 챕터 끝
}

export interface Chapter { id: number; title: string; verse: string; start: string; nodes: StoryNode[] }

export interface Enemy { id: string; name: string; fig: string; theme: string; hp: number; atk: number; intro: string }
