// 压力板 - 激活状态由当前站在上面的实体实时决定，不缓存旧状态
class PressurePlate {
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;
    this._entities = [];
  }

  update(entities) {
    this._entities = entities;
  }

  get active() {
    return this._entities.some(e => e.x === this.x && e.y === this.y);
  }
}

module.exports = { PressurePlate };
