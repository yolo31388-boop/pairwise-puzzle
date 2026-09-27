// 关卡状态 - 快照/恢复均为深拷贝，门与压力板状态实时派生
const deepCopy = (value) => {
  if (Array.isArray(value)) return value.map(deepCopy);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, deepCopy(v)]));
  }
  return value;
};

class LevelState {
  constructor() {
    this.entities = []; this.switches = {}; this.doors = {};
    this.plates = {}; this.collected = new Set();
    this.exit = null;
  }

  snapshot() {
    return {
      entities: deepCopy(this.entities),
      switches: deepCopy(this.switches),
      doors: deepCopy(this.doors),
      plates: deepCopy(this.plates),
      collected: new Set(this.collected),
      exit: deepCopy(this.exit)
    };
  }

  restore(snap) {
    this.entities = deepCopy(snap.entities);
    this.switches = deepCopy(snap.switches);
    this.doors = deepCopy(snap.doors);
    this.plates = deepCopy(snap.plates);
    this.collected = new Set(snap.collected);
    this.exit = deepCopy(snap.exit);
  }

  move(id, dx, dy) {
    const entity = this.entities.find(e => e.id === id);
    if (!entity) throw new Error(`entity not found: ${id}`);
    entity.x += dx;
    entity.y += dy;
  }

  collect(itemId) {
    this.collected.add(itemId);
  }

  // 压力板激活状态由当前站在上面的实体实时决定，不缓存
  isPlateActive(plateId) {
    const plate = this.plates[plateId];
    if (!plate) return false;
    return this.entities.some(e => e.x === plate.x && e.y === plate.y);
  }

  // 门的开关由连接的开关和压力板实时计算，无独立状态变量
  isDoorOpen(doorId) {
    const door = this.doors[doorId];
    if (!door) return false;
    if (door.key && !this.collected.has(door.key)) return false;
    const signals = [
      ...(door.plates || []).map(pid => this.isPlateActive(pid)),
      ...(door.switches || []).map(sid => !!(this.switches[sid] && this.switches[sid].on))
    ];
    if (signals.length === 0) return !!door.key;
    return (door.mode || 'AND') === 'OR' ? signals.some(Boolean) : signals.every(Boolean);
  }

  // 完成判定基于当前完整状态，不使用累积标志
  isComplete() {
    if (!this.exit) return false;
    const player = this.entities.find(e => e.type === 'player');
    return !!player && player.x === this.exit.x && player.y === this.exit.y;
  }
}

module.exports = { LevelState };
