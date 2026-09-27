// 游戏控制层 - 每次玩家操作前保存完整快照，完成判定基于当前完整状态
const { LevelState } = require('./level/state.js');
const { UndoSystem } = require('./systems/undo.js');
const { Door } = require('./entities/door.js');

class Game {
  constructor(level = new LevelState(), { maxUndo = 100 } = {}) {
    this.level = level;
    this.undoSystem = new UndoSystem(level, maxUndo);
    this.doors = {};
  }

  addDoor(id, inputs, logic = 'OR') {
    const door = new Door(id, inputs, logic);
    door.level = this.level;
    this.doors[id] = door;
    return door;
  }

  move(entityId, dx, dy) {
    const entity = this.level.entities.find(e => e.id === entityId);
    if (!entity) throw new Error(`unknown entity: ${entityId}`);
    this.undoSystem.push();
    entity.x += dx;
    entity.y += dy;
    this.level.recompute();
    return entity;
  }

  collect(itemId) {
    this.undoSystem.push();
    this.level.collected.add(itemId);
    this.level.recompute();
  }

  toggleSwitch(id) {
    this.undoSystem.push();
    this.level.switches[id] = !this.level.switches[id];
    this.level.recompute();
  }

  undo() {
    const ok = this.undoSystem.undo();
    if (ok) this.level.recompute();
    return ok;
  }

  redo() {
    const ok = this.undoSystem.redo();
    if (ok) this.level.recompute();
    return ok;
  }

  isDoorOpen(id) {
    const door = this.doors[id];
    return door ? door.open : false;
  }

  // 关卡完成判定：基于当前完整状态实时计算，不使用累积标志
  isComplete() {
    const player = this.level.entities.find(e => e.type === 'player');
    const exit = this.level.exit;
    if (!player || !exit) return false;
    const hasAllKeys = (this.level.requiredKeys || []).every(k => this.level.collected.has(k));
    return hasAllKeys && player.x === exit.x && player.y === exit.y;
  }
}

module.exports = { Game };
