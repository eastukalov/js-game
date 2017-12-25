'use strict';

class Vector {

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  plus(vector) {

    if (!(vector instanceof Vector)) {
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

    if (!(pos instanceof Vector) || !(size instanceof Vector) || !(speed instanceof Vector)) {
      throw new TypeError('Расположение, размер и скорость должны быть только типа Vector либо отсутствовать.');
    }

    this.pos = pos;
    this.size = size;
    this.speed = speed;
  }

  get type () {
    return 'actor';
  }

  get left () {
    return this.pos.x;
  }

  get right () {
    return this.pos.x + this.size.x;
  }

  get top () {
    return this.pos.y;
  }

  get bottom () {
    return this.pos.y + this.size.y;
  }

  act() {}

  isIntersect(actor) {
    if (!(actor instanceof Actor)) {
      throw new TypeError('Проверку можно осуществлять только с объектом типа Actor.');
    }

    if (actor === this) {
      return false;
    }

    return !(
      actor.left >= this.right ||
      actor.right <= this.left ||
      actor.top >= this.bottom ||
      actor.bottom <= this.top
    );

  }

}

class Level {

  constructor(grid = [], actors = []) {
    this.grid = grid.slice(0);
    this.actors = actors.slice(0);
    this.player = this.actors.find((el) => {
        return el.type === 'player';
      });
    this.status = null;
    this.height = this.grid.length;
    this.width = this.grid.reduce((ret, el) => {
      return (el.length > ret) ? el.length : ret;
    }, 0);


    this.finishDelay = 1;
  }

  isFinished() {
    return this.status !== null && this.finishDelay < 0;
  }

  actorAt(actor) {

    if (!(actor instanceof Actor)) {
      throw new TypeError('Аргументом должен быть движущийся объект типа Actor.');
    }

    return this.actors.find((el) => {
      return actor.isIntersect(el);
    });

  }

  obstacleAt(movePlace, size) {
    if (!(movePlace instanceof Vector) || !(size instanceof Vector)) {
      throw new TypeError('Аргументы должны быть типа Vector.');
    }

    if (movePlace.x < 0 || (movePlace.x + size.x) > this.width || movePlace.y < 0) {
      return 'wall';
    }

    if ((movePlace.y + size.y) > this.height) {
      return 'lava';
    }

    const yMin = Math.floor(movePlace.y);
    const yMax = Math.ceil(movePlace.y + size.y);
    const xMin = Math.floor(movePlace.x);
    const xMax = Math.ceil(movePlace.x + size.x);

    for (let y = yMin; y < yMax; y++) {

      for (let x = xMin; x < xMax; x++) {
        const cell = this.grid[y][x];

        if (cell) {
          return cell;
        }

      }

    }

  }

  removeActor(actor) {
    if (!(actor instanceof Actor)) {
      throw new TypeError('Аргумент должен быть типа Actor.');
    }

    const i = this.actors.indexOf(actor);

    if (i !== -1) {
      this.actors.splice(i, 1);
    }

  }

  noMoreActors(type) {

    return !this.actors.some((el) => {
      return el.type === type;
    });

  }

  playerTouched(type, actor) {

    if (actor !== undefined && !(actor instanceof Actor)) {
      throw new TypeError('Аргумент должен быть типа Actor или undefined.');
    }

    if (this.status !== null) {
      return;
    }

    if (type === 'lava' || type === 'fireball') {
      this.status = 'lost';
    } else if (actor !== undefined && type === 'coin' && actor.type === 'coin') {
      this.removeActor(actor);

      if (this.noMoreActors('coin')) {
        this.status = 'won';
      }

    }

  }
}

class LevelParser {

  constructor(dict = {}) {
    this.dict = Object.assign({}, dict);
  }

  actorFromSymbol(symbol) {
    return this.dict[symbol];
  }

  createGrid(array) {

    if (!Array.isArray(array) || array.length === 0) {
      return [];
    }

    return array.map((el) => {

      if (el === undefined || el === null || el.length === 0) {
        return [];
      }

      return el.split('').map((i) => {
        return this.obstacleFromSymbol(i);
      });

    });

  }

  obstacleFromSymbol(symbol) {

    if (symbol === 'x') {
      return 'wall';
    }

    if (symbol === '!') {
      return 'lava';
    }

  }

  createActors(array) {

    if (!Array.isArray(array) || array.length === 0) {
      return [];
    }

    let arrayTarget = [];
    let construct;
    let obj = {};

    for (let i = 0; i < array.length; i++) {

      if (!(array[i] === undefined || array[i] === null || array[i].length === 0)) {

        for (let j = 0; j < array[i].length; j++) {
          construct = this.actorFromSymbol(array[i][j]);

          if (construct !== undefined &&
            typeof construct === 'function'
          ) {
            obj = new construct(new Vector(j, i));

            if (obj instanceof Actor) {
              arrayTarget.push(obj);
            }

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
    super(pos, new Vector(1, 1), speed);
  }

  get type() {
    return 'fireball';
  }

  getNextPosition(time = 1) {
    return this.speed.times(time).plus(this.pos);
  }

  handleObstacle() {
    this.speed = this.speed.times(-1);
  }

  act(time = 1, level) {

    const newPos = this.getNextPosition(time);

    if (!level.obstacleAt(newPos, this.size)) {
      this.pos = newPos;
    } else {
      level.obstacleAt(newPos, this.size);
      this.handleObstacle();
    }
  }

}

class HorizontalFireball extends Fireball{
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(2, 0));
  }
}

class VerticalFireball extends Fireball{
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(0, 2));
  }
}

class FireRain extends Fireball{
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(0, 3));
    this.beginPos = pos;
  }

  handleObstacle() {
    this.pos = this.beginPos;
  }
}

class Coin extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
    this.beginPos = this.pos;
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * 2 * Math.PI;
  }

  get type() {
    return 'coin';
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
    super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5), new Vector(0, 0));
  }

  get type() {
    return 'player';
  }
}

const actorDict = {
  '@': Player,
  'v': FireRain,
  'o': Coin,
  '=': HorizontalFireball,
  '|': VerticalFireball
};

loadLevels()
  .then((value) => {
    const schemas = JSON.parse(value);
    const parser = new LevelParser(actorDict);
    return runGame(schemas, parser, DOMDisplay)
  })
  .then(() => alert('Вы выиграли приз!'));


