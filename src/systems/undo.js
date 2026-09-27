
class UndoSystem {
  constructor(level) { this.level = level; this.undoStack = []; this.redoStack = []; }
  push() {
    this.undoStack.push(this.level.snapshot());
    this.redoStack = [];
  }
  undo() {
    if (this.undoStack.length === 0) return;
    this.redoStack.push(this.level.snapshot());
    this.level.restore(this.undoStack.pop());
  }
  redo() {
    if (this.redoStack.length === 0) return;
    this.undoStack.push(this.level.snapshot());
    this.level.restore(this.redoStack.pop());
  }
}

module.exports = { UndoSystem };
