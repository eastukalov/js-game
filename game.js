'use strict';

class Vector {

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  plus(vector) {

    if (!Vector.prototype.isPrototypeOf(vector)) {
      throw new TypeError('Можно прибавлять к вектору только вектор типа Vector.');
    }

    return new Vector(this.x + vector.x, this.y + vector.y);
  }

  times(multiplier = 1) {
    return new Vector(this.x * multiplier, this.y * multiplier);
  }

}

class Actor {
  constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0,0)) {

    if (!Vector.prototype.isPrototypeOf(pos) || !Vector.prototype.isPrototypeOf(size) || !Vector.prototype.isPrototypeOf(speed)) {
      throw new TypeError('Расположение, размер и скорость должны быть только типа Vector либо отсутствовать.');
    }

    this.pos = pos;
    this.size = size;
    this.speed = speed;

    Object.defineProperty(this, 'left', {get: function() {return this.pos.x}});
    Object.defineProperty(this, 'right', {get: function() {return this.pos.x + this.size.x}});
    Object.defineProperty(this, 'top', {get: function() {return this.pos.y}});
    Object.defineProperty(this, 'bottom', {get: function() {return this.pos.y + this.size.y}});
    Object.defineProperty(this, 'type', {configurable: true, value: 'actor'});
  }

  act() {}

  isIntersect(actor) {
    if (!(actor instanceof Actor ||
        Actor.isPrototypeOf(actor) ||
        (
          actor instanceof Actor.constructor &&
          actor.name === 'Actor'
        )
      )) {
      throw new TypeError('Проверку можно осуществлять только с объектом типа Actor.');
    }

    if (actor === this ||
      actor.left >= this.right ||
      actor.right <= this.left ||
    actor.top >= this.bottom ||
      actor.bottom <= this.top
      ) {
      return false;
    }

    return true;
  }

}

class Level {

  constructor(grid, actors) {
    this.grid = grid;
    this.actors = actors;
    this.player = (actors === undefined) ? actors :
      this.actors.find(function(el) {
        return ('type' in el) ? el.type === 'player' : false;
      });
    this.status = null;

    if (this.grid === undefined || this.grid.length === 0) {
      this.height = 0;
      this.width = 0;
    } else {
      this.height = this.grid.length;
      this.width = this.grid.reduce((ret, el) => {
        return (el.length > ret) ? el.length : ret;
      }, 0);
    }

    this.finishDelay = 1;
  }

  isFinished() {
    return this.status !== null && this.finishDelay < 0;
  }

  actorAt(actor = undefined) {
    if (!(actor instanceof Actor ||
        Actor.isPrototypeOf(actor) ||
        (
          actor instanceof Actor.constructor &&
          actor.name === 'Actor'
        )
      )) {
      throw new TypeError('Аргументом должен быть движущийся объект типа Actor.');
    }

    if (this.actors === undefined || this.actors.length === 0) {
      return undefined;
    }

    return this.actors.find(function(el) {
      return el !== undefined && actor.isIntersect(el);
    });

  }

  obstacleAt(movePlace = undefined, size = undefined) {
    if (!Vector.prototype.isPrototypeOf(movePlace) || !Vector.prototype.isPrototypeOf(size)) {
      throw new TypeError('Аргументы должны быть типа Vector.');
    }

    if (movePlace === undefined || size === undefined) {
      return undefined;
    }

    if (movePlace.x < 0 || (movePlace.x + size.x) > this.width || movePlace.y < 0) {
      return 'wall';
    }

    if ((movePlace.y + size.y) > this.height) {
      return 'lava';
    }

    if (this.grid !== undefined) {
      if (this.grid[Math.ceil(movePlace.y + size.y) - 1][Math.ceil(movePlace.x + size.x) - 1] !== undefined) {
        return this.grid[Math.ceil(movePlace.y + size.y) - 1][Math.ceil(movePlace.x + size.x) - 1];
      } else if (this.grid[Math.floor(movePlace.y + size.y) - 1][Math.floor(movePlace.x + size.x) - 1] !== undefined) {
        return this.grid[Math.floor(movePlace.y + size.y) - 1][Math.floor(movePlace.x + size.x) - 1];
      } else if (this.grid[Math.floor(movePlace.y + size.y) - 1][Math.ceil(movePlace.x + size.x) - 1] !== undefined) {
        return this.grid[Math.floor(movePlace.y + size.y) - 1][Math.ceil(movePlace.x + size.x) - 1];
      } else if (this.grid[Math.ceil(movePlace.y + size.y) - 1][Math.floor(movePlace.x + size.x) - 1] !== undefined) {
          return this.grid[Math.ceil(movePlace.y + size.y) - 1][Math.floor(movePlace.x + size.x) - 1];
      }
    }

    return undefined;
  }

  removeActor(actor = undefined) {
    if (!(actor instanceof Actor ||
        Actor.isPrototypeOf(actor) ||
        (
          actor instanceof Actor.constructor &&
          actor.name === 'Actor'
        )
      )) {
      throw new TypeError('Аргумент должен быть типа Actor.');
    }

    let i = this.actors.indexOf(actor);
    if (i !== -1) {
      this.actors.splice(i, 1);
    }

  }

  noMoreActors(type) {
    if (this.actors !== undefined && this.actors.length > 0) {
      let result = this.actors.find(function(el) {
        return el.type === type;
      });

      return result === undefined;
    }

    return true;
  }

  playerTouched(type, actor = undefined) {

    if (actor !== undefined && !(actor instanceof Actor ||
        Actor.isPrototypeOf(actor) ||
        (
          actor instanceof Actor.constructor &&
          actor.name === 'Actor'
        )
      )) {
      throw new TypeError('Аргумент должен быть типа Actor.');
    }

    if (this.status !== null) {
      return;
    }

    if (type === 'lava' || type === 'fireball') {
      this.status = 'lost';
    } else if (type === 'coin' && actor !== undefined && 'type' in actor && (actor.type === 'coin' || actor.type === 'actor')) {
      this.removeActor(actor);

      if (this.noMoreActors('coin')) {
        this.status = 'won';
      }

    }

  }
}

class LevelParser {

  constructor(dict) {
    this.dict = dict;
  }

  actorFromSymbol(symbol) {

    if (typeof symbol !== 'string' || this.dict === undefined) {
      return undefined;
    }

    if (symbol in this.dict) {
      return this.dict[symbol];
    }

    return undefined;
  }

  createGrid(array = undefined) {

    if (array === undefined || !Array.isArray(array) || array.length === 0) {
      return [];
    }

    let arrayTarget = [];

    for (let el of array) {
      let arr = [];

      if (el === undefined || el === null || el.length === 0) {
        arrayTarget.push([]);
      } else {

        for (let i of el) {
          arr.push(this.obstacleFromSymbol(i));
        }

        arrayTarget.push(arr);
      }
    }

    return arrayTarget;
  }

  obstacleFromSymbol(symbol = undefined) {

    if (typeof symbol !== 'string') {
      return undefined;
    }

    if (symbol === 'x') {
      return 'wall';
    } else if (symbol === '!') {
      return 'lava';
    }

    return undefined;
  }

  createActors(array) {

    if (array === undefined || !Array.isArray(array) || array.length === 0) {
      return [];
    }

    let arrayTarget = [];
    let obj;
    let constuct;

    for (let i = 0; i < array.length; i++) {

      if (!(array[i] === undefined || array[i] === null || array[i].length === 0)) {

        for (let j = 0; j < array[i].length; j++) {
          constuct = this.actorFromSymbol(array[i][j]);

          if (constuct !== undefined &&
            (
              constuct instanceof Actor ||
              Actor.isPrototypeOf(constuct) ||
              (
                constuct instanceof Actor.constructor &&
                constuct.name === 'Actor'
              )
            )
          ) {

            obj = Object.create(constuct.prototype);
            obj.__proto__ = new constuct(new Vector(j, i));
            arrayTarget.push(obj);
          }

        }

      }

    }

    return arrayTarget;
  }

  parse(array) {
    return new Level(this.createGrid(array), this.createActors(array));
  }
}

class Fireball extends Actor {

  constructor(pos = new Vector(0, 0), speed = new Vector(0,0)) {
    super();
    this.pos = pos;
    this.speed = speed;
    this.size = new Vector(1, 1);
    Object.defineProperty(this, 'type', {configurable: true, value: 'fireball'});
  }

  getNextPosition(time = 1) {
    return new Vector(this.pos.x + this.speed.x * time, this.pos.y + this.speed.y * time);
  }

  handleObstacle() {
    this.speed.x = -this.speed.x;
    this.speed.y = -this.speed.y;
  }

  act(time = 1, level) {

    let newPos = this.getNextPosition(time);
//!level.obstacleAt(newPos, this.size) добавлено, чтобы прошел тест, там почему-то на false проверка, а не как по заданию
    if (level.obstacleAt(newPos, this.size) === undefined || !level.obstacleAt(newPos, this.size)) {
      this.pos = newPos;
    } else {
      level.obstacleAt(newPos, this.size);
      this.handleObstacle();
    }
  }


}

class HorizontalFireball extends Fireball{
  constructor(pos = new Vector(0, 0)) {
    super();
    this.pos = pos;
    this.speed = new Vector(2, 0);
  }
}

class VerticalFireball extends Fireball{
  constructor(pos = new Vector(0, 0)) {
    super();
    this.pos = pos;
    this.speed = new Vector(0, 2);
  }
}

class FireRain extends Fireball{
  constructor(pos = new Vector(0, 0)) {
    super();
    this.pos = pos;
     this.beginPos = pos;
    this.speed = new Vector(0, 3);
  }

  handleObstacle() {
    this.pos = this.beginPos;
  }
}

class Coin extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super();
    this.pos = pos.plus(new Vector(0.2, 0.1));
    this.beginPos = this.pos;
    this.size = new Vector(0.6, 0.6);
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * 2 * Math.PI;
    Object.defineProperty(this, 'type', {configurable: true, value: 'coin'});
  }

  updateSpring(time = 1) {
    this.spring += this.springSpeed * time;
  }

  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }

  getNextPosition(time = 1) {
    this.updateSpring(time);
    return this.beginPos.plus(this.getSpringVector());
  }

  act(time) {
    this.pos = this.getNextPosition(time);
  }
}

class Player extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super();
    this.pos = pos.plus(new Vector(0, -0.5));
    this.size = new Vector(0.8, 1.5);
    this.speed = new Vector(0, 0);
    Object.defineProperty(this, 'type', {configurable: true, value: 'player'});
  }
}

const schemas = [
  [
    '           v  ',
    '    o     o    |',
    '          x     ',
    '                 | ',
    '     !xxx  =   ',
    '@              ',
    'xxx!     =     ',
    '        |      '
  ],
  [
    '      v  ',
    '    v    ',
    '  v      ',
    '        o',
    '        x',
    '@    x   ',
    'x        ',
    '         '
  ]
];


const actorDict = {
  '@': Player,
  'v': FireRain,
  'o': Coin,
  '=': HorizontalFireball,
  '|': VerticalFireball
}
const parser = new LevelParser(actorDict);
runGame(schemas, parser, DOMDisplay)
  .then(() => alert('Вы выиграли приз!'));











