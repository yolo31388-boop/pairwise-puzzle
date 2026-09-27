class UndoSystem {
  constructor(level, maxDepth = 100) {
    this.level = level;
    this.maxDepth = maxDepth;
    this.undoStack = [];
    this.redoStack = [];
  }

  // 每次玩家操作前调用，保存完整关卡状态快照；超过上限丢弃最早快照
  push() {
    this.undoStack.push(this.level.snapshot());
    if (this.undoStack.length > this.maxDepth) this.undoStack.shift();
    this.redoStack = [];
  }

  undo() {
    if (this.undoStack.length === 0) return false;
    this.redoStack.push(this.level.snapshot());
    this.level.restore(this.undoStack.pop());
    return true;
  }

  // 重做基于撤销时压入重做栈的下一个状态，不重新计算
  redo() {
    if (this.redoStack.length === 0) return false;
    this.undoStack.push(this.level.snapshot());
    if (this.undoStack.length > this.maxDepth) this.undoStack.shift();
    this.level.restore(this.redoStack.pop());
    return true;
  }
}

module.exports = { UndoSystem };
