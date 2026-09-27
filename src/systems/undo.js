// 撤销系统 - 每次操作前保存完整快照，撤销/重做只恢复快照不重新计算，栈有上限
class UndoSystem {
  constructor(level, maxSnapshots = 100) {
    this.level = level;
    this.maxSnapshots = maxSnapshots;
    this.undoStack = [];
    this.redoStack = [];
  }

  push() {
    this.undoStack.push(this.level.snapshot());
    // 超过上限时丢弃最早的快照
    while (this.undoStack.length > this.maxSnapshots) this.undoStack.shift();
    this.redoStack = [];
  }

  undo() {
    if (this.undoStack.length === 0) return false;
    this.redoStack.push(this.level.snapshot());
    this.level.restore(this.undoStack.pop());
    return true;
  }

  redo() {
    if (this.redoStack.length === 0) return false;
    this.undoStack.push(this.level.snapshot());
    this.level.restore(this.redoStack.pop());
    return true;
  }
}

module.exports = { UndoSystem };
