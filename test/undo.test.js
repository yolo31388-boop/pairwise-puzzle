
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

describe('引擎边界不变量', () => {
  const makeLevel = () => {
    const level = new LevelState();
    level.entities.push(
      {id: 'player', type: 'player', x: 0, y: 0},
      {id: 'box1', type: 'box', x: 1, y: 0}
    );
    level.plates = {p1: {x: 2, y: 0}, p2: {x: 3, y: 0}};
    level.switches = {s1: {on: false}};
    level.doors = {
      dPlate: {plates: ['p1'], mode: 'AND'},
      dAnd: {plates: ['p1', 'p2'], mode: 'AND'},
      dOr: {plates: ['p1', 'p2'], mode: 'OR'},
      dKey: {key: 'key1'},
      dMix: {plates: ['p1'], switches: ['s1'], mode: 'AND'}
    };
    return level;
  };

  test('撤销恢复压力板状态（箱子推上压力板后撤销）', () => {
    const level = makeLevel();
    const undo = new UndoSystem(level);
    expect(level.isPlateActive('p1')).toBe(false);
    undo.push();
    level.move('box1', 1, 0); // 箱子推上 p1
    expect(level.isPlateActive('p1')).toBe(true);
    undo.undo();
    expect(level.entities.find(e => e.id === 'box1').x).toBe(1);
    expect(level.isPlateActive('p1')).toBe(false);
  });

  test('撤销恢复门状态（门由压力板实时驱动）', () => {
    const level = makeLevel();
    const undo = new UndoSystem(level);
    undo.push();
    level.move('box1', 1, 0);
    expect(level.isDoorOpen('dPlate')).toBe(true);
    undo.undo();
    expect(level.isDoorOpen('dPlate')).toBe(false);
  });

  test('撤销恢复收集品与钥匙门联动', () => {
    const level = makeLevel();
    const undo = new UndoSystem(level);
    expect(level.isDoorOpen('dKey')).toBe(false);
    undo.push();
    level.collect('key1');
    expect(level.collected.has('key1')).toBe(true);
    expect(level.isDoorOpen('dKey')).toBe(true);
    undo.undo();
    expect(level.collected.has('key1')).toBe(false);
    expect(level.isDoorOpen('dKey')).toBe(false);
  });

  test('多步撤销重做在完整状态上保持一致', () => {
    const level = makeLevel();
    const undo = new UndoSystem(level);
    undo.push();
    level.move('box1', 1, 0); // 上 p1
    undo.push();
    level.move('box1', 1, 0); // 上 p2
    undo.push();
    level.collect('key1');
    undo.undo();
    expect(level.collected.has('key1')).toBe(false);
    expect(level.isPlateActive('p2')).toBe(true);
    undo.undo();
    expect(level.isPlateActive('p1')).toBe(true);
    expect(level.isPlateActive('p2')).toBe(false);
    undo.redo();
    expect(level.isPlateActive('p2')).toBe(true);
    undo.redo();
    expect(level.collected.has('key1')).toBe(true);
    expect(level.isDoorOpen('dKey')).toBe(true);
  });

  test('压力板激活状态实时计算，不缓存旧状态', () => {
    const plate = new PressurePlate('p1', 5, 5);
    const entities = [{x: 5, y: 5}];
    plate.update(entities);
    expect(plate.active).toBe(true);
    entities[0].x = 9; // 实体移动后无需再次 update
    expect(plate.active).toBe(false);
    expect(plate.isActive([{x: 5, y: 5}])).toBe(true);
  });

  test('多个压力板按与/或规则控制同一扇门', () => {
    const level = makeLevel();
    level.move('box1', 1, 0); // 只压 p1
    expect(level.isDoorOpen('dAnd')).toBe(false);
    expect(level.isDoorOpen('dOr')).toBe(true);
    level.move('box1', 1, 0); // 离开 p1 压上 p2
    expect(level.isDoorOpen('dAnd')).toBe(false);
    expect(level.isDoorOpen('dOr')).toBe(true);
    level.entities.push({id: 'box2', type: 'box', x: 2, y: 0}); // 同时压 p1 p2
    expect(level.isDoorOpen('dAnd')).toBe(true);
  });

  test('开关与压力板混合与逻辑控制门', () => {
    const level = makeLevel();
    level.move('box1', 1, 0);
    expect(level.isDoorOpen('dMix')).toBe(false);
    level.switches.s1.on = true;
    expect(level.isDoorOpen('dMix')).toBe(true);
    level.move('box1', 1, 0); // 离开 p1
    expect(level.isDoorOpen('dMix')).toBe(false);
  });

  test('撤销栈超过上限时丢弃最早快照', () => {
    const level = makeLevel();
    const undo = new UndoSystem(level, 3);
    for (let i = 1; i <= 5; i++) {
      undo.push();
      level.entities[0].x = i;
    }
    expect(undo.undoStack.length).toBe(3);
    expect(undo.undo()).toBe(true); // 回到 x=4
    expect(undo.undo()).toBe(true); // 回到 x=3
    expect(undo.undo()).toBe(true); // 回到 x=2，最早的 x=0/1 已丢弃
    expect(undo.undo()).toBe(false);
    expect(level.entities[0].x).toBe(2);
  });

  test('连续撤销可回到初始状态，空栈撤销无副作用', () => {
    const level = makeLevel();
    const undo = new UndoSystem(level);
    const initial = level.snapshot();
    undo.push();
    level.move('box1', 1, 0);
    undo.push();
    level.move('player', 0, 1);
    undo.push();
    level.collect('key1');
    undo.undo(); undo.undo(); undo.undo();
    expect(level.snapshot()).toEqual(initial);
    expect(undo.undo()).toBe(false);
    expect(level.snapshot()).toEqual(initial);
  });

  test('重做后状态与撤销前完全一致', () => {
    const level = makeLevel();
    const undo = new UndoSystem(level);
    undo.push();
    level.move('box1', 1, 0);
    level.collect('key1');
    level.switches.s1.on = true;
    const before = level.snapshot();
    undo.undo();
    expect(level.snapshot()).not.toEqual(before);
    undo.redo();
    expect(level.snapshot()).toEqual(before);
  });

  test('箱子离开压力板后压力板与门自动恢复', () => {
    const level = makeLevel();
    level.move('box1', 1, 0);
    expect(level.isPlateActive('p1')).toBe(true);
    expect(level.isDoorOpen('dPlate')).toBe(true);
    level.move('box1', 1, 0); // 离开 p1
    expect(level.isPlateActive('p1')).toBe(false);
    expect(level.isDoorOpen('dPlate')).toBe(false);
  });

  test('快照完整性：包含实体、开关、门、压力板、收集品且互不影响', () => {
    const level = makeLevel();
    level.collect('gem1');
    const snap = level.snapshot();
    level.entities[0].x = 99;
    level.switches.s1.on = true;
    level.doors.dPlate.mode = 'OR';
    level.plates.p1.x = 42;
    level.collected.clear();
    expect(snap.entities[0].x).toBe(0);
    expect(snap.switches.s1.on).toBe(false);
    expect(snap.doors.dPlate.mode).toBe('AND');
    expect(snap.plates.p1.x).toBe(2);
    expect(snap.collected.has('gem1')).toBe(true);
    level.restore(snap);
    expect(level.entities[0].x).toBe(0);
    expect(level.switches.s1.on).toBe(false);
    expect(level.plates.p1.x).toBe(2);
    expect(level.collected.has('gem1')).toBe(true);
    snap.entities[0].x = 77; // 恢复快照后与快照脱钩
    expect(level.entities[0].x).toBe(0);
  });

  test('关卡完成判定基于当前完整状态，撤销后失效', () => {
    const level = makeLevel();
    level.exit = {x: 0, y: 1};
    const undo = new UndoSystem(level);
    expect(level.isComplete()).toBe(false);
    undo.push();
    level.move('player', 0, 1);
    expect(level.isComplete()).toBe(true);
    undo.undo();
    expect(level.isComplete()).toBe(false);
    undo.redo();
    expect(level.isComplete()).toBe(true);
  });

  test('新操作清空重做栈，重做不重新计算', () => {
    const level = makeLevel();
    const undo = new UndoSystem(level);
    undo.push();
    level.move('box1', 1, 0);
    undo.undo();
    expect(undo.redoStack.length).toBe(1);
    undo.push(); // 新操作分支
    level.move('player', 0, 1);
    expect(undo.redoStack.length).toBe(0);
    expect(undo.redo()).toBe(false);
    undo.undo();
    expect(level.entities.find(e => e.id === 'box1').x).toBe(1);
  });
});
