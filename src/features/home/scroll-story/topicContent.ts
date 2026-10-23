// Editorial prompts for exploring everyday debate topics; these are not API data.
export const discoveryTopics = [
  { id: 'music', label: '음악', question: '공부할 때 음악, 도움이 될까요?', object: '파란 헤드폰', mascot: '/images/mascot/scenes/owl-listening-music.webp', mascotAlt: '파란 헤드폰을 쓰고 눈을 감은 채 음악을 즐기는 판겨리' },
  { id: 'work', label: '일하는 방식', question: '집에서 일하면 더 집중할 수 있을까요?', object: '따뜻한 지붕의 작은 집', mascot: '/images/mascot/scenes/owl-working-home.webp', mascotAlt: '집에서 작은 책상에 앉아 노트북으로 일하는 판겨리' },
  { id: 'routine', label: '생활 습관', question: '일찍 일어나는 하루가 더 좋을까요?', object: '부드러운 금빛 초승달', mascot: '/images/mascot/scenes/owl-early-morning.webp', mascotAlt: '아침 알람 시계 옆에서 두 날개를 활짝 펴고 기지개를 켜는 판겨리' },
] as const;
export type DiscoveryTopic = 0 | 1 | 2;
