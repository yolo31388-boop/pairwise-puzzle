// 门 - 开关状态由连接的开关/压力板/钥匙实时计算，无独立状态变量
class Door {
  constructor(id, inputs = [], logic = 'OR') {
    if (logic !== 'AND' && logic !== 'OR') {
      throw new Error(`unsupported door logic: ${logic}`);
    }
    this.id = id;
    this.inputs = inputs; // [{ type: 'plate'|'switch'|'key', id }]
    this.logic = logic;
    this.level = null;
  }

  _inputActive(input) {
    const level = this.level;
    if (!level) return false;
    switch (input.type) {
      case 'plate': return level.isPlateActive(input.id);
      case 'switch': return !!level.switches[input.id];
      case 'key': return level.collected.has(input.id);
      default: return false;
    }
  }

  get open() {
    if (this.inputs.length === 0) return false;
    const results = this.inputs.map(input => this._inputActive(input));
    return this.logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
  }
}

module.exports = { Door };
