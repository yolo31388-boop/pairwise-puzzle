
class PressurePlate {
  constructor(id, x, y) {
    this.id = id; this.x = x; this.y = y;
    this.active = false; // BUG: 缓存状态，不实时计算
  }
  update(entities) {
    this.active = entities.some(e => e.x === this.x && e.y === this.y);
  }
}

module.exports = { PressurePlate };
