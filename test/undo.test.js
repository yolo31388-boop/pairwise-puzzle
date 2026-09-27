
const { LevelState } = require('../src/level/state.js');
const { UndoSystem } = require('../src/systems/undo.js');
const { PressurePlate } = require('../src/entities/plate.js');

describe('解谜关卡状态', () => {
  test('撤销应恢复压力板状态', () => {
    const level = new LevelState();
    level.plates = {p1: {active: true}};
    const undo = new UndoSystem(level);
    undo.push();
    level.plates.p1.active = false;
    undo.undo();
    expect(level.plates.p1.active).toBe(true);
  });

  test('撤销应恢复门状态', () => {
    const level = new LevelState();
    level.doors = {d1: {open: false}};
    const undo = new UndoSystem(level);
    undo.push();
    level.doors.d1.open = true;
    undo.undo();
    expect(level.doors.d1.open).toBe(false);
  });

  test('撤销应恢复收集品', () => {
    const level = new LevelState();
    level.collected.add('key1');
    const undo = new UndoSystem(level);
    undo.push();
    level.collected.delete('key1');
    undo.undo();
    expect(level.collected.has('key1')).toBe(true);
  });

  test('多步撤销重做一致', () => {
    const level = new LevelState();
    level.entities.push({x:0, y:0});
    const undo = new UndoSystem(level);
    undo.push();
    level.entities[0].x = 5;
    undo.push();
    level.entities[0].x = 10;
    undo.undo();
    expect(level.entities[0].x).toBe(5);
    undo.redo();
    expect(level.entities[0].x).toBe(10);
  });

  test('压力板应实时计算', () => {
    const plate = new PressurePlate('p1', 5, 5);
    const entities = [{x:5, y:5}];
    plate.update(entities);
    expect(plate.active).toBe(true);
    plate.update([]);
    expect(plate.active).toBe(false);
  });

  test('快照应深拷贝', () => {
    const level = new LevelState();
    level.plates = {p1: {active: false}};
    const snap = level.snapshot();
    level.plates.p1.active = true;
    expect(snap.plates.p1.active).toBe(false);
  });
});
