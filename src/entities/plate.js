class PressurePlate {
  constructor(id, x, y) {
    this.id = id; this.x = x; this.y = y;
    this.entities = [];
  }

  update(entities) {
    this.entities = entities || [];
  }

  // 激活状态由当前站在上面的实体实时决定，不缓存旧状态
  isActive(entities) {
    const list = entities || this.entities;
    return list.some(e => e.x === this.x && e.y === this.y);
  }

  get active() {
    return this.isActive(this.entities);
  }
}

module.exports = { PressurePlate };
