
// 关卡状态 - 存在撤销不完整bug
class LevelState {
  constructor() {
    this.entities = []; this.switches = {}; this.doors = {};
    this.plates = {}; this.collected = new Set();
  }
  snapshot() {
    // BUG: 浅拷贝，实体位置和开关状态共享引用
    return {
      entities: this.entities.map(e => ({...e})),
      switches: {...this.switches},
      doors: {...this.doors},
      plates: this.plates, // BUG: 直接引用
      collected: new Set(this.collected)
    };
  }
  restore(snap) {
    this.entities = snap.entities.map(e => ({...e}));
    this.switches = {...snap.switches};
    this.doors = {...snap.doors};
    this.plates = snap.plates; // BUG: 恢复引用
    this.collected = new Set(snap.collected);
  }
}

module.exports = { LevelState };
