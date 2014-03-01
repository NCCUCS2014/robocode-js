// Generated by LiveScript 1.2.0
(function(){
  var $SET_TIMEOUT, $BULLET_SPEED, $HP, $ROBOT_RADIUS, $MAX_BULLET, $BULLET_INTERVAL, $YELL_TIMEOUT, $SEQUENTIAL_EVENTS, $PARALLEL_EVENTS, $CANVAS_DEBUG, $DIV_DEBUG, AssetsLoader, degreesToRadians, radiansToDegrees, euclid_distance, in_rect, Robot, Battle;
  $SET_TIMEOUT = 10;
  $BULLET_SPEED = 3;
  $HP = 20;
  $ROBOT_RADIUS = 10;
  $MAX_BULLET = 5;
  $BULLET_INTERVAL = 30;
  $YELL_TIMEOUT = 50;
  $SEQUENTIAL_EVENTS = ['move_forwards', 'move_backwards', 'turn_left', 'turn_right', 'move_opposide'];
  $PARALLEL_EVENTS = ['shoot', 'turn_turret_left', 'turn_turret_right', 'turn_radar_left', 'turn_radar_right'];
  $CANVAS_DEBUG = false;
  $DIV_DEBUG = true;
  AssetsLoader = (function(){
    AssetsLoader.displayName = 'AssetsLoader';
    var prototype = AssetsLoader.prototype, constructor = AssetsLoader;
    function AssetsLoader(assets, callback){
      var name, uri, this$ = this;
      this.assets = assets;
      this.callback = callback;
      this._resources = 0;
      this._resources_loaded = 0;
      for (name in assets) {
        uri = assets[name];
        this._resources++;
        this.assets[name] = new Image();
        this.assets[name].src = uri;
      }
      for (name in assets) {
        uri = assets[name];
        this.assets[name].onload = fn$;
      }
      function fn$(){
        this$._resources_loaded++;
        if (this$._resources_loaded === this$._resources && typeof this$.callback === 'function') {
          return this$.callback();
        }
      }
    }
    prototype.is_done_loading = function(){
      return this._resources_loaded === this._resources;
    };
    prototype.get = function(asset_name){
      return this.assets[asset_name];
    };
    return AssetsLoader;
  }());
  degreesToRadians = function(degrees){
    return degrees * (Math.PI / 180);
  };
  radiansToDegrees = function(radians){
    return radians * (180 / Math.PI);
  };
  euclid_distance = function(x1, y1, x2, y2){
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
  };
  in_rect = function(x1, y1, x2, y2, width, height){
    return (x2 + width > x1 && x1 > x2) && (y2 + height > y1 && y1 > y2);
  };
  Robot = (function(){
    Robot.displayName = 'Robot';
    var prototype = Robot.prototype, constructor = Robot;
    Robot.battlefieldWidth = 0;
    Robot.battlefieldHeight = 0;
    function Robot(x, y, source){
      var this$ = this;
      this.x = x;
      this.y = y;
      this.source = source;
      this.angle = 0;
      this.turret_angle = 0;
      this.radar_angle = Math.random() * 360;
      this.bullet = [];
      this.events = {};
      this.status = {};
      this.hp = $HP;
      this.id = 0;
      this.isHit = false;
      this.enemySpot = [];
      this.me = {};
      this.yellTs = 0;
      this.isYell = false;
      this.yellMsg = undefined;
      this.bulletTs = 0;
      this.worker = new Worker(source);
      this.worker.onmessage = function(e){
        return this$.receive(e.data);
      };
    }
    Robot.setBattlefield = function(width, height){
      constructor.battlefieldWidth = width;
      return constructor.battlefieldHeight = height;
    };
    prototype.move = function(distance){
      var newX, newY;
      newX = this.x + distance * Math.cos(degreesToRadians(this.angle));
      newY = this.y + distance * Math.sin(degreesToRadians(this.angle));
      if (in_rect(newX, newY, 15, 15, constructor.battlefieldWidth - 15, constructor.battlefieldHeight - 15)) {
        logger.log('not-wall-collide');
        this.status.wallCollide = false;
        this.x = newX;
        return this.y = newY;
      } else {
        logger.log('wall-collide');
        return this.status.wallCollide = true;
      }
    };
    prototype.turn = function(degrees){
      this.angle += degrees;
      this.angle = this.angle % 360;
    };
    prototype.turnTurret = function(degrees){
      this.turret_angle += degrees;
      this.turret_angle = this.turret_angle % 360;
    };
    prototype.yell = function(msg){
      this.isYell = true;
      this.yellTs = 0;
      this.yellMsg = msg;
    };
    prototype.receive = function(msg){
      var event, i$, ref$, len$, ev, event_id;
      event = JSON.parse(msg);
      if (event.log !== undefined) {
        logger.log(event.log);
        return;
      }
      if (event.action === "shoot") {
        if (this.bullet.length >= $MAX_BULLET || this.bulletTs < $BULLET_INTERVAL) {
          this.sendCallback(event["event_id"]);
          return;
        }
        this.bulletTs = 0;
        this.bullet.push({
          x: this.x,
          y: this.y,
          direction: this.angle + this.turret_angle
        });
        this.sendCallback(event["event_id"]);
        return;
      }
      if (event.action === "turn_turret_left") {
        for (i$ = 0, len$ = (ref$ = this.events).length; i$ < len$; ++i$) {
          ev = ref$[i$];
          if (ev.action === "turn_turret_left") {
            this.sendCallback(event["event_id"]);
            return;
          }
        }
      }
      if (event.action === "turn_turret_right") {
        for (i$ = 0, len$ = (ref$ = this.events).length; i$ < len$; ++i$) {
          ev = ref$[i$];
          if (ev.action === "turn_turret_right") {
            this.sendCallback(event["event_id"]);
            return;
          }
        }
      }
      if (event.action === "yell") {
        if (this.yellTs === 0) {
          this.yell(event.msg);
        }
        this.sendCallback(event["event_id"]);
        return;
      }
      event["progress"] = 0;
      event_id = event["event_id"];
      logger.log("got event " + event_id + "," + event.action);
      return this.events[event_id] = event;
    };
    prototype.send = function(msg_obj){
      return this.worker.postMessage(JSON.stringify(msg_obj));
    };
    prototype.getEnemyRobots = function(){
      var enemy, i$, ref$, len$, r;
      enemy = [];
      for (i$ = 0, len$ = (ref$ = Battle.robots).length; i$ < len$; ++i$) {
        r = ref$[i$];
        if (r.id !== this.id) {
          enemy.push(r);
        }
      }
      return enemy;
    };
    prototype.sendEnemySpot = function(){
      logger.log('send-enemy-spot');
      return this.send({
        "action": "enemy-spot",
        "me": this.me,
        "enemy-spot": this.enemySpot,
        "status": this.status
      });
    };
    prototype.sendInterruption = function(){
      logger.log('send-interruption');
      return this.send({
        "action": "interruption",
        "me": this.me,
        "status": this.status
      });
    };
    prototype.sendCallback = function(event_id){
      return this.send({
        "action": "callback",
        "me": this.me,
        "event_id": event_id,
        "status": this.status
      });
    };
    prototype.checkEnemySpot = function(){
      var i$, ref$, len$, enemyRobot, myAngle, myRadians, enemyPositionRadians, distance, radiansDiff, max, min, enemyPositionDegrees;
      this.enemySpot = [];
      for (i$ = 0, len$ = (ref$ = this.getEnemyRobots()).length; i$ < len$; ++i$) {
        enemyRobot = ref$[i$];
        myAngle = (this.angle + this.turret_angle) % 360;
        myRadians = degreesToRadians(myAngle);
        enemyPositionRadians = Math.atan2(enemyRobot.y - this.y, enemyRobot.x - this.x);
        distance = euclid_distance(this.x, this.y, enemyRobot.x, enemyRobot.y);
        radiansDiff = Math.atan2($ROBOT_RADIUS, distance);
        if (myRadians > Math.PI) {
          myRadians -= 2 * Math.PI;
        }
        if (myRadians < -Math.PI) {
          myRadians += 2 * Math.PI;
        }
        max = enemyPositionRadians + radiansDiff;
        min = enemyPositionRadians - radiansDiff;
        if (myRadians >= min && myRadians <= max) {
          enemyPositionDegrees = radiansToDegrees(enemyPositionRadians);
          this.enemySpot.push({
            id: enemyRobot.id,
            angle: enemyPositionDegrees,
            distance: distance,
            hp: enemyRobot.hp
          });
        }
      }
      if (this.enemySpot.length > 0) {
        return true;
      }
      return false;
    };
    prototype.updateBullet = function(){
      var id, ref$, b, bullet_wall_collide, i$, ref1$, len$, enemy_robot, robot_hit;
      for (id in ref$ = this.bullet) {
        b = ref$[id];
        b.x += $BULLET_SPEED * Math.cos(degreesToRadians(b.direction));
        b.y += $BULLET_SPEED * Math.sin(degreesToRadians(b.direction));
        bullet_wall_collide = !in_rect(b.x, b.y, 2, 2, constructor.battlefieldWidth - 2, constructor.battlefieldHeight - 2);
        if (bullet_wall_collide) {
          b = null;
          this.bullet.splice(id, 1);
          continue;
        }
        for (i$ = 0, len$ = (ref1$ = this.getEnemyRobots()).length; i$ < len$; ++i$) {
          enemy_robot = ref1$[i$];
          robot_hit = euclid_distance(b.x, b.y, enemy_robot.x, enemy_robot.y) < 20;
          if (robot_hit) {
            enemy_robot.hp -= 3;
            enemy_robot.isHit = true;
            Battle.explosions.push({
              x: enemy_robot.x,
              y: enemy_robot.y,
              progress: 1
            });
            b = null;
            this.bullet.splice(id, 1);
            continue;
          }
        }
      }
      return true;
    };
    prototype.update = function(){
      var has_sequential_event, event_id, ref$, event;
      this.me = {
        angle: this.angle,
        angle_turret: this.angle_turret,
        id: this.id,
        x: this.x,
        y: this.y,
        hp: this.hp
      };
      has_sequential_event = false;
      this.status = {};
      if (this.bulletTs === Number.MAX_VALUE) {
        this.bulletTs = 0;
      } else {
        this.bulletTs++;
      }
      if (this.bullet.length > 0) {
        this.updateBullet();
      }
      if (this.isHit) {
        this.events = {};
        this.status.isHit = true;
        this.isHit = false;
        this.sendInterruption();
        return;
      }
      if (this.checkEnemySpot()) {
        this.sendEnemySpot();
      }
      for (event_id in ref$ = this.events) {
        event = ref$[event_id];
        if ($SEQUENTIAL_EVENTS.indexOf(event.action) !== -1) {
          if (has_sequential_event) {
            continue;
          }
          has_sequential_event = true;
        }
        logger.log("events[" + event_id + "] = {action=" + event.action + ",progress=" + event.progress + "}");
        if (event["amount"] <= event["progress"]) {
          this.sendCallback(event["event_id"]);
          delete this.events[event_id];
        } else {
          switch (event["action"]) {
          case "move_forwards":
            event["progress"]++;
            this.move(1);
            if (this.status.wallCollide) {
              this.actionToCollide = 1;
              this.events = {};
              this.sendInterruption();
              break;
            }
            break;
          case "move_backwards":
            event["progress"]++;
            this.move(-1);
            if (this.status.wallCollide) {
              this.actionToCollide = -1;
              this.events = {};
              this.sendInterruption();
              break;
            }
            break;
          case "move_opposide":
            event["progress"]++;
            this.move(-this.actionToCollide);
            if (this.status.wallCollide) {
              this.actionToCollide = -this.actionToCollide;
              this.events = {};
              this.sendInterruption();
              break;
            }
            break;
          case "turn_left":
            event["progress"]++;
            this.turn(-1);
            break;
          case "turn_right":
            event["progress"]++;
            this.turn(1);
            break;
          case "turn_turret_left":
            event["progress"]++;
            this.turnTurret(-1);
            break;
          case "turn_turret_right":
            event["progress"]++;
            this.turnTurret(1);
          }
        }
      }
    };
    return Robot;
  }());
  Battle = (function(){
    Battle.displayName = 'Battle';
    var prototype = Battle.prototype, constructor = Battle;
    Battle.robots = [];
    Battle.explosions = [];
    function Battle(ctx, width, height, sources){
      var res$, i$, len$, source, id, ref$, r;
      this.ctx = ctx;
      this.width = width;
      this.height = height;
      constructor.explosions = [];
      Robot.setBattlefield(this.width, this.height);
      res$ = [];
      for (i$ = 0, len$ = sources.length; i$ < len$; ++i$) {
        source = sources[i$];
        res$.push(new Robot(Math.random() * this.width, Math.random() * this.height, source));
      }
      constructor.robots = res$;
      id = 0;
      for (i$ = 0, len$ = (ref$ = constructor.robots).length; i$ < len$; ++i$) {
        r = ref$[i$];
        r.id = id;
        id++;
      }
      this.assets = new AssetsLoader({
        "body": 'img/body.png',
        "body-red": 'img/body-red.png',
        "turret": 'img/turret.png',
        "radar": 'img/radar.png',
        'explosion1-1': 'img/explosion/explosion1-1.png',
        'explosion1-2': 'img/explosion/explosion1-2.png',
        'explosion1-3': 'img/explosion/explosion1-3.png',
        'explosion1-4': 'img/explosion/explosion1-4.png',
        'explosion1-5': 'img/explosion/explosion1-5.png',
        'explosion1-6': 'img/explosion/explosion1-6.png',
        'explosion1-7': 'img/explosion/explosion1-7.png',
        'explosion1-8': 'img/explosion/explosion1-8.png',
        'explosion1-9': 'img/explosion/explosion1-9.png',
        'explosion1-10': 'img/explosion/explosion1-10.png',
        'explosion1-11': 'img/explosion/explosion1-11.png',
        'explosion1-12': 'img/explosion/explosion1-12.png',
        'explosion1-13': 'img/explosion/explosion1-13.png',
        'explosion1-14': 'img/explosion/explosion1-14.png',
        'explosion1-15': 'img/explosion/explosion1-15.png',
        'explosion1-16': 'img/explosion/explosion1-16.png',
        'explosion1-17': 'img/explosion/explosion1-17.png'
      });
    }
    prototype.run = function(){
      this.send_all({
        "action": "run"
      });
      return this._loop();
    };
    prototype._loop = function(){
      var this$ = this;
      this._update();
      this._draw();
      if ($DIV_DEBUG) {
        this._updateDebug();
      }
      return setTimeout(function(){
        return this$._loop();
      }, $SET_TIMEOUT);
    };
    prototype.send_all = function(msg_obj){
      var i$, ref$, len$, robot, results$ = [];
      for (i$ = 0, len$ = (ref$ = constructor.robots).length; i$ < len$; ++i$) {
        robot = ref$[i$];
        results$.push(robot.send(msg_obj));
      }
      return results$;
    };
    prototype._update = function(){
      var i$, ref$, len$, robot;
      for (i$ = 0, len$ = (ref$ = constructor.robots).length; i$ < len$; ++i$) {
        robot = ref$[i$];
        if (robot) {
          robot.update();
        }
      }
    };
    prototype._updateDebug = function(){
      var text, i$, ref$, len$, robot, ev, me, bullet;
      text = "";
      for (i$ = 0, len$ = (ref$ = constructor.robots).length; i$ < len$; ++i$) {
        robot = ref$[i$];
        ev = JSON.stringify(robot.events, null, "\t");
        me = JSON.stringify(robot.me, null, "\t");
        bullet = JSON.stringify(robot.bullet, null, "\t");
        text += (robot.id + ":\n") + ("me:\n" + me + "\n") + ("events:\n" + ev + "\nbullet:\n" + bullet + "\n");
      }
      $('#debug').html(text);
    };
    prototype._draw = function(){
      var id, ref$, robot, body, textX, textY, text, i$, ref1$, len$, b, i, explosion;
      this.ctx.clearRect(0, 0, this.width, this.height);
      for (id in ref$ = constructor.robots) {
        robot = ref$[id];
        body = 'body';
        if (robot.id === 0) {
          body = 'body-red';
        }
        if (robot.hp <= 0) {
          Battle.explosions.push({
            x: robot.x,
            y: robot.y,
            progress: 1
          });
          robot = {};
          delete constructor.robots[id];
          constructor.robots.splice(id, 1);
          continue;
        }
        this.ctx.save();
        this.ctx.translate(robot.x, robot.y);
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "top";
        textX = 20;
        textY = 20;
        if (this.width - robot.x < 100) {
          textX = -textX;
          this.ctx.textAlign = "right";
        }
        if (this.height - robot.y < 100) {
          textY = -textY;
        }
        text = robot.hp + "/" + $HP;
        if (robot.isYell && robot.yellTs < $YELL_TIMEOUT) {
          this.ctx.font = "17px Verdana";
          text = robot.yellMsg;
          robot.yellTs++;
        } else {
          robot.yellTs = 0;
          robot.isYell = false;
        }
        if ($CANVAS_DEBUG) {
          text += " turret_angle" + robot.turret_angle;
        }
        this.ctx.fillText(text, textX, textY);
        this.ctx.rotate(degreesToRadians(robot.angle));
        this.ctx.drawImage(this.assets.get(body), -(38 / 2), -(36 / 2), 38, 36);
        this.ctx.rotate(degreesToRadians(robot.turret_angle));
        this.ctx.drawImage(this.assets.get("turret"), -(54 / 2), -(20 / 2), 54, 20);
        this.ctx.rotate(degreesToRadians(robot.radar_angle));
        this.ctx.drawImage(this.assets.get("radar"), -(16 / 2), -(22 / 2), 16, 22);
        this.ctx.restore();
        if (robot.bullet.length > 0) {
          for (i$ = 0, len$ = (ref1$ = robot.bullet).length; i$ < len$; ++i$) {
            b = ref1$[i$];
            this.ctx.save();
            this.ctx.translate(b.x, b.y);
            this.ctx.rotate(degreesToRadians(b.direction));
            this.ctx.fillRect(-3, -3, 6, 6);
            this.ctx.restore();
          }
        }
      }
      for (i$ = 0, len$ = (ref$ = constructor.explosions).length; i$ < len$; ++i$) {
        i = ref$[i$];
        explosion = constructor.explosions.pop();
        if (explosion.progress <= 17) {
          this.ctx.drawImage(this.assets.get("explosion1-" + parseInt(explosion.progress)), explosion.x - 64, explosion.y - 64, 128, 128);
          explosion.progress += 1;
          constructor.explosions.unshift(explosion);
        }
      }
    };
    return Battle;
  }());
  window.Battle = Battle;
}).call(this);
