
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

const { Game } = require('../src/game.js');
const { Door } = require('../src/entities/door.js');

function makeGame(opts) {
  const level = new LevelState();
  level.entities.push(
    {id: 'player', type: 'player', x: 0, y: 0},
    {id: 'box1', type: 'box', x: 1, y: 0},
    {id: 'box2', type: 'box', x: 4, y: 0}
  );
  level.plates = {
    p1: {x: 2, y: 0, active: false},
    p2: {x: 5, y: 0, active: false}
  };
  return new Game(level, opts);
}

describe('引擎边界不变量', () => {
  test('箱子推上压力板后撤销，压力板与门都恢复未激活', () => {
    const game = makeGame();
    game.addDoor('d1', [{type: 'plate', id: 'p1'}]);
    game.move('box1', 1, 0); // 箱子到 (2,0)，压住 p1
    expect(game.level.plates.p1.active).toBe(true);
    expect(game.isDoorOpen('d1')).toBe(true);
    game.undo();
    expect(game.level.entities.find(e => e.id === 'box1').x).toBe(1);
    expect(game.level.plates.p1.active).toBe(false);
    expect(game.isDoorOpen('d1')).toBe(false);
  });

  test('箱子离开压力板后自动恢复未激活', () => {
    const game = makeGame();
    game.addDoor('d1', [{type: 'plate', id: 'p1'}]);
    game.move('box1', 1, 0);
    expect(game.isDoorOpen('d1')).toBe(true);
    game.move('box1', 1, 0); // 箱子离开 p1
    expect(game.level.plates.p1.active).toBe(false);
    expect(game.isDoorOpen('d1')).toBe(false);
  });

  test('多个压力板按逻辑与控制同一扇门', () => {
    const game = makeGame();
    game.addDoor('d1', [{type: 'plate', id: 'p1'}, {type: 'plate', id: 'p2'}], 'AND');
    game.move('box1', 1, 0); // 只压住 p1
    expect(game.isDoorOpen('d1')).toBe(false);
    game.move('box2', 1, 0); // 同时压住 p2
    expect(game.isDoorOpen('d1')).toBe(true);
    game.move('box1', 1, 0); // p1 空出
    expect(game.isDoorOpen('d1')).toBe(false);
  });

  test('多个压力板按逻辑或控制同一扇门', () => {
    const game = makeGame();
    game.addDoor('d1', [{type: 'plate', id: 'p1'}, {type: 'plate', id: 'p2'}], 'OR');
    expect(game.isDoorOpen('d1')).toBe(false);
    game.move('box1', 1, 0);
    expect(game.isDoorOpen('d1')).toBe(true);
  });

  test('钥匙收集后开门，撤销后钥匙回到未收集且门关闭', () => {
    const game = makeGame();
    game.addDoor('d1', [{type: 'key', id: 'key1'}]);
    expect(game.isDoorOpen('d1')).toBe(false);
    game.collect('key1');
    expect(game.level.collected.has('key1')).toBe(true);
    expect(game.isDoorOpen('d1')).toBe(true);
    game.undo();
    expect(game.level.collected.has('key1')).toBe(false);
    expect(game.isDoorOpen('d1')).toBe(false);
  });

  test('撤销恢复开关状态', () => {
    const game = makeGame();
    game.addDoor('d1', [{type: 'switch', id: 's1'}]);
    game.toggleSwitch('s1');
    expect(game.level.switches.s1).toBe(true);
    expect(game.isDoorOpen('d1')).toBe(true);
    game.undo();
    expect(game.level.switches.s1).toBeFalsy();
    expect(game.isDoorOpen('d1')).toBe(false);
  });

  test('连续撤销可回到初始状态，空栈撤销安全', () => {
    const game = makeGame();
    const initial = game.level.snapshot();
    game.move('player', 1, 0);
    game.move('box1', 1, 0);
    game.collect('key1');
    expect(game.undo()).toBe(true);
    expect(game.undo()).toBe(true);
    expect(game.undo()).toBe(true);
    expect(game.undo()).toBe(false);
    expect(game.level.entities).toEqual(initial.entities);
    expect(game.level.collected.size).toBe(0);
    expect(game.level.plates.p1.active).toBe(false);
  });

  test('重做后状态与撤销前完全一致', () => {
    const game = makeGame();
    game.addDoor('d1', [{type: 'plate', id: 'p1'}]);
    game.move('box1', 1, 0);
    game.collect('key1');
    const before = game.level.snapshot();
    game.undo();
    game.undo();
    game.redo();
    game.redo();
    const after = game.level.snapshot();
    expect(after.entities).toEqual(before.entities);
    expect(after.plates).toEqual(before.plates);
    expect([...after.collected]).toEqual([...before.collected]);
    expect(game.isDoorOpen('d1')).toBe(true);
  });

  test('撤销栈超过上限时丢弃最早快照', () => {
    const game = makeGame({maxUndo: 3});
    for (let i = 0; i < 5; i++) game.move('player', 1, 0);
    expect(game.undoSystem.undoStack.length).toBe(3);
    game.undo(); game.undo(); game.undo();
    expect(game.undo()).toBe(false);
    // 最早两个快照已丢弃，只能退回到第 2 步之后的位置
    expect(game.level.entities.find(e => e.id === 'player').x).toBe(2);
  });

  test('撤销后执行新操作会清空重做栈', () => {
    const game = makeGame();
    game.move('player', 1, 0);
    game.undo();
    game.move('player', 0, 1);
    expect(game.redo()).toBe(false);
    expect(game.level.entities.find(e => e.id === 'player')).toMatchObject({x: 0, y: 1});
  });

  test('压力板实时反映实体移动，无需手动刷新', () => {
    const entities = [{x: 5, y: 5}];
    const plate = new PressurePlate('p1', 5, 5);
    plate.update(entities);
    expect(plate.active).toBe(true);
    entities[0].x = 9; // 实体直接移动，不再调用 update
    expect(plate.active).toBe(false);
  });

  test('门没有独立状态变量，完全由输入实时推导', () => {
    const level = new LevelState();
    level.switches = {s1: false};
    const door = new Door('d1', [{type: 'switch', id: 's1'}]);
    door.level = level;
    expect(door.open).toBe(false);
    level.switches.s1 = true;
    expect(door.open).toBe(true);
    expect(Object.keys(door)).not.toContain('open');
  });

  test('快照完整性：包含全部状态且与关卡完全隔离', () => {
    const game = makeGame();
    game.addDoor('d1', [{type: 'plate', id: 'p1'}]);
    game.level.switches = {s1: true};
    game.level.doors = {d1: {open: false}};
    game.collect('key1');
    const snap = game.level.snapshot();
    expect(snap.entities.length).toBe(3);
    expect(snap.switches.s1).toBe(true);
    expect(snap.plates.p1).toEqual({x: 2, y: 0, active: false});
    expect(snap.collected.has('key1')).toBe(true);
    // 修改关卡后快照不受影响
    game.level.plates.p1.active = true;
    game.level.switches.s1 = false;
    game.level.entities[0].x = 99;
    game.level.collected.clear();
    expect(snap.plates.p1.active).toBe(false);
    expect(snap.switches.s1).toBe(true);
    expect(snap.entities[0].x).toBe(0);
    expect(snap.collected.has('key1')).toBe(true);
  });

  test('关卡完成判定基于当前完整状态，撤销后不再完成', () => {
    const game = makeGame();
    game.level.exit = {x: 1, y: 0};
    game.level.requiredKeys = ['key1'];
    expect(game.isComplete()).toBe(false);
    game.collect('key1');
    game.move('player', 1, 0);
    expect(game.isComplete()).toBe(true);
    game.undo(); // 玩家离开出口
    expect(game.isComplete()).toBe(false);
    game.redo();
    expect(game.isComplete()).toBe(true);
    game.undo();
    game.undo(); // 钥匙回到未收集
    expect(game.isComplete()).toBe(false);
  });
});
