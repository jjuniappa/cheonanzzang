const CHARACTER_CONFIG = {
  ninja: {
    moveSpeed: 240,
    projectileSpeed: 900,
    projectileRangeTiles: 4.4,
    basicDamage: 1,
    attackCooldownMs: 220
  },

  soldier: {
    moveSpeed: 180,
    projectileSpeed: 800,
    projectileRangeTiles: 5,
    basicDamage: 1,
    attackCooldownMs: 300
  }
};

// updateProjectiles()는 projectileRangeTiles를 사용하므로
// 추가 수정 없이 사거리 변경이 자동 적용됩니다.
