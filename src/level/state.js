// 关卡状态 - 快照/恢复均为深拷贝，压力板激活状态由实体位置实时推导
function deepClone(value) {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Set) return new Set([...value].map(deepClone));
  if (Array.isArray(value)) return value.map(deepClone);
  const out = {};
  for (const key of Object.keys(value)) out[key] = deepClone(value[key]);
  return out;
}

class LevelState {
  constructor() {
    this.entities = [];
    this.switches = {};
    this.doors = {};
    this.plates = {};
    this.collected = new Set();
    this.exit = null;
    this.requiredKeys = [];
  }

  // 压力板激活状态实时计算：当前是否有实体站在上面，不缓存旧状态
  isPlateActive(id) {
    const plate = this.plates[id];
    if (!plate) return false;
    return this.entities.some(e => e.x === plate.x && e.y === plate.y);
  }

  // 将派生数据（plates.active）与实体位置同步，移动/撤销/重做后调用
  recompute() {
    for (const id of Object.keys(this.plates)) {
      this.plates[id].active = this.isPlateActive(id);
    }
  }

  snapshot() {
    return {
      entities: deepClone(this.entities),
      switches: deepClone(this.switches),
      doors: deepClone(this.doors),
      plates: deepClone(this.plates),
      collected: new Set(this.collected),
      exit: deepClone(this.exit),
      requiredKeys: deepClone(this.requiredKeys)
    };
  }

  restore(snap) {
    this.entities = deepClone(snap.entities);
    this.switches = deepClone(snap.switches);
    this.doors = deepClone(snap.doors);
    this.plates = deepClone(snap.plates);
    this.collected = new Set(snap.collected);
    this.exit = deepClone(snap.exit);
    this.requiredKeys = deepClone(snap.requiredKeys);
  }
}

module.exports = { LevelState, deepClone };
