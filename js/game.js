(function() {

'use strict';

var game,
    planetCollisionGroup,
    playerCollisionGroup,
    projectileCollisionGroup,
    cursorControls,
    wasdControls,
    zqsdControls,
    background,
    midground,
    foreground,
    planets,
    currentPlanet,
    gravityDirection,
    players,
    projectiles,
    screenShake,
    flashTextTimer,
    playTimer,
    timeRecord     = parseInt(localStorage.getItem('fatal-attraction-time-record')) || 0,
    topSpeedRecord = parseInt(localStorage.getItem('fatal-attraction-top-speed-record')) || 0,
    isGameOver;

function shutdown() {
    planetCollisionGroup     = undefined;
    playerCollisionGroup     = undefined;
    projectileCollisionGroup = undefined;

    cursorControls = undefined;
    wasdControls   = undefined;
    zqsdControls   = undefined;

    background = undefined;
    midground  = undefined;
    foreground = undefined;

    planets          = undefined;
    currentPlanet    = undefined;
    gravityDirection = undefined;

    players = undefined;

    projectiles = undefined;

    isGameOver = undefined;
}

var colours = {
    black:  0x1d1f21,
    red:    0xcc6666,
    orange: 0xde935f,
    yellow: 0xf0c674,
    green:  0xb5bd68,
    aqua:   0x8abeb7,
    blue:   0x81a2be,
    purple: 0xb294bb,
    brown:  0xa3685a,
}

window.startGame = function() {
    game = new Phaser.Game(
        1820, 1024,
        Phaser.AUTO
    );

    game.state.add('start', startState);
    game.state.add('main', mainState);

    game.state.start('start');
};

window.WebFontConfig = {
    google: {
        families: [
            'Press Start 2P',
        ],
    },
};

var startState = {
    preload: function() {
        game.load.script('webfont',    '//ajax.googleapis.com/ajax/libs/webfont/1.5.10/webfont.js');

        game.load.audio('discord-sfx', 'assets/discord.wav');

        game.load.image('background',  'assets/background.png');
        game.load.image('midground',   'assets/midground.png');
        game.load.image('foreground',  'assets/foreground.png');
        game.load.image('player',      'assets/player.png');
        game.load.image('planet',      'assets/planet.png');
    },

    create: function() {
        setupScreen();
        setupControls();
        setupPhysics();

        addBackground();
        addPlanets(9);

        this.titleDisplay = game.add.text(game.world.centerX, 40, 'FATAL ATTRACTION');
        this.titleDisplay.anchor.set(0.5, 0);

        this.titleDisplay.font = 'Press Start 2P';
        this.titleDisplay.fontSize = 105;

        this.titleDisplay.fill   = '#' + colours.yellow.toString(16);
        this.titleDisplay.stroke = '#' + colours.black.toString(16);

        this.titleDisplay.strokeThickness = 3;

        this.controlDisplayUp = game.add.text(game.world.centerX, 250, 'UP - Gravity Gun');
        this.controlDisplayUp.anchor.set(0.5, 0);

        this.controlDisplayUp.font = 'Press Start 2P';
        this.controlDisplayUp.fontSize = 30;

        this.controlDisplayUp.fill   = '#' + colours.green.toString(16);
        this.controlDisplayUp.stroke = '#' + colours.black.toString(16);

        this.controlDisplayUp.strokeThickness = 3;

        this.controlDisplayDown = game.add.text(game.world.centerX, 350, 'DOWN - Anti-Gravity Gun');
        this.controlDisplayDown.anchor.set(0.5, 0);

        this.controlDisplayDown.font = 'Press Start 2P';
        this.controlDisplayDown.fontSize = 30;

        this.controlDisplayDown.fill   = '#' + colours.purple.toString(16);
        this.controlDisplayDown.stroke = '#' + colours.black.toString(16);

        this.controlDisplayDown.strokeThickness = 3;

        this.controlDisplayLeftRight = game.add.text(game.world.centerX, 450, 'LEFT / RIGHT - Rotate');
        this.controlDisplayLeftRight.anchor.set(0.5, 0);

        this.controlDisplayLeftRight.font = 'Press Start 2P';
        this.controlDisplayLeftRight.fontSize = 30;

        this.controlDisplayLeftRight.fill   = '#' + colours.red.toString(16);
        this.controlDisplayLeftRight.stroke = '#' + colours.black.toString(16);

        this.controlDisplayLeftRight.strokeThickness = 3;

        this.readyDisplay = game.add.text(game.world.centerX, 720, 'Press a key to start');
        this.readyDisplay.anchor.set(0.5, 0);

        this.readyDisplay.font = 'Press Start 2P';
        this.readyDisplay.fontSize = 60;

        this.readyDisplay.fill   = '#' + colours.blue.toString(16);
        this.readyDisplay.stroke = '#' + colours.black.toString(16);

        this.readyDisplay.strokeThickness = 3;

        flashTextTimer = game.time.create(false);

        flashTextTimer.loop(Phaser.Timer.SECOND / 2, function() {
            this.readyDisplay.visible = !this.readyDisplay.visible;
        }, this);

        flashTextTimer.start();

        var discordSfx = game.add.audio('discord-sfx', 0.3);
        discordSfx.loopFull();
    },

    update: function() {
        planets.forEachAlive(movePlanet, this);

        lerpWorldCenterTowardsCurrentPlanet();

        planets.forEachAlive(maybeWrap, this);

        if (isUpDown() || isDownDown() || isLeftDown() || isRightDown()) {
            flashTextTimer.destroy();

            this.titleDisplay.kill();
            this.controlDisplayUp.kill();
            this.controlDisplayDown.kill();
            this.controlDisplayLeftRight.kill();
            this.readyDisplay.kill();

            game.time.events.add(Phaser.Timer.SECOND / 2, function() {
                var warningDisplay = game.add.text(game.world.centerX, game.world.centerY, 'Don\'t Die');
                warningDisplay.anchor.set(0.5);

                warningDisplay.font = 'Press Start 2P';
                warningDisplay.fontSize = 60;

                warningDisplay.fill   = '#' + colours.red.toString(16);
                warningDisplay.stroke = '#' + colours.black.toString(16);

                warningDisplay.strokeThickness = 3;

                game.time.events.add(Phaser.Timer.SECOND, function() {
                    game.state.start('main');
                }, this);
            }, this);
        }
    },

    shutdown: function() {
        shutdown();
    },
}

var mainState = {
    preload: function() {
        game.load.script('webfont',          '//ajax.googleapis.com/ajax/libs/webfont/1.5.10/webfont.js');

        game.load.audio('shoot-sfx',         'assets/shoot.wav');
        game.load.audio('boom-sfx',          'assets/boom.wav');
        game.load.audio('attractor-hit-sfx', 'assets/attractor-hit.wav');
        game.load.audio('repulsor-hit-sfx',  'assets/repulsor-hit.wav');
        game.load.audio('discord-sfx',       'assets/discord.wav');

        game.load.image('background',        'assets/background.png');
        game.load.image('midground',         'assets/midground.png');
        game.load.image('foreground',        'assets/foreground.png');
        game.load.image('player',            'assets/player.png');
        game.load.image('planet',            'assets/planet.png');
        game.load.image('projectile',        'assets/projectile.png');

        game.load.physics('physics-data',    'assets/physics.json');
    },

    create: function() {
        setupScreen();
        setupControls();
        setupPhysics();

        addBackground();

        setupProjectiles();

        addPlayers(1);
        addPlanets(9);

        players.forEachAlive(addTimer, this);
        players.forEachAlive(addSpeedDisplay, this);

        playTimer = game.time.create(false);
        playTimer.start();
    },

    update: function() {
        players.forEachAlive(movePlayer, this);
        planets.forEachAlive(movePlanet, this);

        players.forEachAlive(maybeFire, this);

        if (players.countLiving() === 1) {
            lerpWorldCenterTowardsPlayer(players.getFirstAlive());
        } else {
            lerpWorldCenterTowardsCurrentPlanet();
        }

        players.forEachAlive(maybeWrap, this);
        planets.forEachAlive(maybeWrap, this);
        projectiles.forEachAlive(maybeWrap, this);

        if (isGameOver && (isUpDown() || isDownDown() || isLeftDown() || isRightDown())) {
            flashTextTimer.destroy();
            playTimer.destroy();

            game.state.start('main');
        }
    },

    shutdown: function() {
        shutdown();
    },
}

function doGameOver() {
    playTimer.stop();

    saveRecords();

    game.time.events.add(Phaser.Timer.SECOND * 2, function() {
        isGameOver = true;

        var readyDisplay = game.add.text(game.world.centerX, 720, 'Press a key to try again');
        readyDisplay.anchor.set(0.5, 0);

        readyDisplay.font = 'Press Start 2P';
        readyDisplay.fontSize = 60;

        readyDisplay.fill   = '#' + colours.blue.toString(16);
        readyDisplay.stroke = '#' + colours.black.toString(16);

        readyDisplay.strokeThickness = 3;

        flashTextTimer = game.time.create(false);

        flashTextTimer.loop(Phaser.Timer.SECOND / 2, function() {
            readyDisplay.visible = !readyDisplay.visible;
        }, this);

        flashTextTimer.start();
    }, this);
}

function setupScreen() {
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.scale.pageAlignHorizontally = true;
    game.scale.pageAlignVertically = true;
    game.scale.setScreenSize(true);

    screenShake = 0;
}

function setupControls() {
    cursorControls = game.input.keyboard.createCursorKeys();

    wasdControls = {
        up:    game.input.keyboard.addKey(Phaser.Keyboard.W),
        down:  game.input.keyboard.addKey(Phaser.Keyboard.S),
        left:  game.input.keyboard.addKey(Phaser.Keyboard.A),
        right: game.input.keyboard.addKey(Phaser.Keyboard.D),
    };

    zqsdControls = {
        up:    game.input.keyboard.addKey(Phaser.Keyboard.Z),
        down:  game.input.keyboard.addKey(Phaser.Keyboard.S),
        left:  game.input.keyboard.addKey(Phaser.Keyboard.Q),
        right: game.input.keyboard.addKey(Phaser.Keyboard.D),
    };
}

function setupPhysics() {
    game.physics.startSystem(Phaser.Physics.P2JS);

    playerCollisionGroup     = game.physics.p2.createCollisionGroup();
    planetCollisionGroup     = game.physics.p2.createCollisionGroup();
    projectileCollisionGroup = game.physics.p2.createCollisionGroup();
}

function addBackground() {
    background = game.add.tileSprite(0, 0, 1820, 1024, 'background');
    midground  = game.add.tileSprite(0, 0, 1820, 1024, 'midground');
    foreground = game.add.tileSprite(0, 0, 1820, 1024, 'foreground');
}

function addPlayers(count) {
    // TODO: Use the count.

    players = game.add.group();

    players.boomSfx = game.add.audio('boom-sfx', 0.5);

    addPlayer(game.world.centerX, game.world.centerY);
}

function addPlanets(count) {
    planets = game.add.group();

    planets.attractorHitSfx = game.add.audio('attractor-hit-sfx', 0.5);
    planets.repulsorHitSfx  = game.add.audio('repulsor-hit-sfx', 0.5);

    var minX = 500;
    var minY = 500;
    var maxX = game.world.width - 500;
    var maxY = game.world.height - 500;

    for (var i = 0; i < count; i++) {
        var x = game.rnd.integerInRange(minX, maxX);
        var y = game.rnd.integerInRange(minY, maxY);
        while (Math.abs(game.world.centerX - x) < 300 && Math.abs(game.world.centerY - y) < 300) {
            x = game.rnd.integerInRange(minX, maxX);
            y = game.rnd.integerInRange(minY, maxY);
        }

        addPlanet(x, y, i === 0);

        if (i === 0) {
            minX = 0;
            minY = 0;
            maxX = game.world.width;
            maxY = game.world.height;
        }
    }
}

function setupProjectiles() {
    projectiles = game.add.group();

    projectiles.shootSfx = game.add.audio('shoot-sfx', 0.5);
}

function lerpWorldCenterTowardsCurrentPlanet() {
    lerpWorldCenterTowardsXY(currentPlanet.body.x, currentPlanet.body.y, 50);
}

function lerpWorldCenterTowardsPlayer(player) {
    lerpWorldCenterTowardsXY(player.body.x, player.body.y, 30);
}

function lerpWorldCenterTowardsXY(targetX, targetY, lerpFactor) {
    var x = (game.world.centerX - targetX) / lerpFactor + screenShake;
    var y = (game.world.centerY - targetY) / lerpFactor + screenShake;

    background.tilePosition.x += x * 1.3;
    background.tilePosition.y += y * 1.3;

    midground.tilePosition.x += x * 1.2;
    midground.tilePosition.y += y * 1.2;

    foreground.tilePosition.x += x;
    foreground.tilePosition.y += y;

    function lerp(obj) {
        obj.body.x += x;
        obj.body.y += y;
    }

    if (players) {
        players.forEachAlive(lerp, this);
    }

    if (planets) {
        planets.forEachAlive(lerp, this);
    }

    if (projectiles) {
        projectiles.forEachAlive(lerp, this);
    }

    screenShake = -screenShake * 0.9;
}

function shakeScreen(value) {
    screenShake += value;
}

function addPlanet(x, y, isCurrent) {
    var planet = planets.create(x, y, 'planet');
    game.physics.p2.enable(planet);

    planet.anchor.set(0.5);
    planet.tint = colours.aqua;

    planet.body.velocity.x = game.rnd.integerInRange(-100, 100);
    planet.body.velocity.y = game.rnd.integerInRange(-100, 100);

    planet.body.rotateRight(game.rnd.realInRange(-20, 20));

    planet.body.mass    = 1000;
    planet.body.damping = 0;
    planet.body.angularDamping = 0;

    planet.body.setCollisionGroup(planetCollisionGroup);
    planet.body.collides(playerCollisionGroup);
    planet.body.collides(projectileCollisionGroup);

    if (isCurrent) {
        setCurrentPlanet(planet);
    }
}

function setCurrentPlanet(planet, gravityDirectionToSet, playSfx) {
    if (gravityDirectionToSet === undefined) {
        gravityDirectionToSet = 1;
    }

    if (currentPlanet !== undefined) {
        currentPlanet.tint = colours.aqua;
        currentPlanet.body.mass = 100;
    }

    var sfx;
    if (gravityDirectionToSet === 1) {
        planet.tint = colours.green;
        sfx = planets.attractorHitSfx;
    } else {
        planet.tint = colours.purple;
        sfx = planets.repulsorHitSfx;
    }

    planet.body.mass = 1000000;

    gravityDirection = gravityDirectionToSet;

    if (playSfx) {
        sfx.play();
    }

    currentPlanet = planet;
}

function addPlayer(x, y) {
    var player = players.create(x, y, 'player');
    game.physics.p2.enable(player);

    player.body.clearShapes();
    player.body.loadPolygon('physics-data', 'player');

    player.anchor.set(0.5);
    player.tint = colours.red;

    player.body.rotation = game.rnd.realInRange(0, 2 * Math.PI);

    player.body.damping = 0;
    player.body.angularDamping = 0.9999;

    player.body.setCollisionGroup(playerCollisionGroup);
    player.body.collides(playerCollisionGroup);
    player.body.collides(planetCollisionGroup);

    player.body.onBeginContact.add(function(body) {
        playerHit(player, body);
    }, this);

    player.topSpeed = 0;

    player.canFire = true;
}

function addTimer(player) {
    var pad = '0000000';

    player.timeRecordDisplay = game.add.text(20, 20, '');

    player.timeRecordDisplay.font = 'Press Start 2P';
    player.timeRecordDisplay.fontSize = 50;

    player.timeRecordDisplay.fill   = '#' + colours.red.toString(16);
    player.timeRecordDisplay.stroke = '#' + colours.black.toString(16);

    player.timeRecordDisplay.strokeThickness = 3;

    player.timeDisplay = game.add.text(20, 90, '');

    player.timeDisplay.font = 'Press Start 2P';
    player.timeDisplay.fontSize = 50;

    player.timeDisplay.fill   = '#' + colours.red.toString(16);
    player.timeDisplay.stroke = '#' + colours.black.toString(16);

    player.timeDisplay.strokeThickness = 3;

    player.timeLabelDisplay = game.add.text(20, 160, 'time');

    player.timeLabelDisplay.font = 'Press Start 2P';
    player.timeLabelDisplay.fontSize = 20;

    player.timeLabelDisplay.fill   = '#' + colours.red.toString(16);
    player.timeLabelDisplay.stroke = '#' + colours.black.toString(16);

    player.timeLabelDisplay.strokeThickness = 3;

    player.timer = game.time.create(false);

    player.timer.loop(1, function() {
        setTimeDisplay(player);
    }, this);

    setTimeDisplay(player);
    setTimeRecordDisplay(player);

    player.timer.start();
}

function setTimeDisplay(player) {
    var pad = '0000000';

    var ms = player.timer.ms;
    var text = (pad + ms).slice(-pad.length);
    player.timeDisplay.setText(text);

    if (ms > timeRecord) {
        timeRecord = ms;

        setTimeRecordDisplay(player);
    }
}

function setTimeRecordDisplay(player) {
    var pad = '0000000';

    var text = (pad + timeRecord).slice(-pad.length);
    player.timeRecordDisplay.setText(text);
}

function addSpeedDisplay(player) {
    player.topSpeedRecordDisplay = game.add.text(game.world.width - 20, 20, '');
    player.topSpeedRecordDisplay.anchor.set(1, 0);

    player.topSpeedRecordDisplay.font = 'Press Start 2P';
    player.topSpeedRecordDisplay.fontSize = 50;

    player.topSpeedRecordDisplay.fill   = '#' + colours.yellow.toString(16);
    player.topSpeedRecordDisplay.stroke = '#' + colours.black.toString(16);

    player.topSpeedRecordDisplay.strokeThickness = 3;

    player.topSpeedDisplay = game.add.text(game.world.width - 20, 90, '');
    player.topSpeedDisplay.anchor.set(1, 0);

    player.topSpeedDisplay.font = 'Press Start 2P';
    player.topSpeedDisplay.fontSize = 50;

    player.topSpeedDisplay.fill   = '#' + colours.yellow.toString(16);
    player.topSpeedDisplay.stroke = '#' + colours.black.toString(16);

    player.topSpeedDisplay.strokeThickness = 3;

    player.topSpeedLabelDisplay = game.add.text(game.world.width - 20, 160, 'top speed');
    player.topSpeedLabelDisplay.anchor.set(1, 0);

    player.topSpeedLabelDisplay.font = 'Press Start 2P';
    player.topSpeedLabelDisplay.fontSize = 20;

    player.topSpeedLabelDisplay.fill   = '#' + colours.yellow.toString(16);
    player.topSpeedLabelDisplay.stroke = '#' + colours.black.toString(16);

    player.topSpeedLabelDisplay.strokeThickness = 3;

    setSpeedDisplay(player);
    setSpeedRecordDisplay(player);
}

function setSpeedDisplay(player) {
    var pad = '0000000';

    var speed = parseInt(player.topSpeed);
    var text = (pad + speed).slice(-pad.length);
    player.topSpeedDisplay.setText(text);

    if (speed > topSpeedRecord) {
        topSpeedRecord = speed;

        setSpeedRecordDisplay(player);
    }
}

function setSpeedRecordDisplay(player) {
    var pad = '0000000';

    var text = (pad + topSpeedRecord).slice(-pad.length);
    player.topSpeedRecordDisplay.setText(text);
}

function saveRecords() {
    localStorage.setItem('fatal-attraction-time-record', timeRecord);
    localStorage.setItem('fatal-attraction-top-speed-record', topSpeedRecord);
}

function playerHit(player, body) {
    // FIXME: This is if they hit a wall.
    if (body === null) {
        return;
    }

    killPlayer(player);

    if (body.sprite.key === 'player') {
        killPlayer(body.sprite);
    }
}

function killPlayer(player) {
    player.timer.destroy();
    player.kill();

    players.boomSfx.play();

    shakeScreen(100);

    if (players.countLiving() === 0) {
        doGameOver();
    }
}

function movePlayer(player) {
    var sign = 0;
    if (isLeftDown()) {
        sign = -1;
    } else if (isRightDown()) {
        sign = 1;
    }

    player.body.angularForce += sign * 60;

    move(player, 5, false);

    var speed = Math.sqrt(Math.pow(player.body.velocity.x, 2) +  Math.pow(player.body.velocity.y, 2));
    if (speed > player.topSpeed) {
        player.topSpeed = speed;
        setSpeedDisplay(player);
    }
}

function movePlanet(planet) {
    if (planet === currentPlanet) {
        return;
    }

    move(planet, 1, true);
}

function move(obj, forceCoefficient, shouldSpin) {
    accelerateToObject(obj, currentPlanet, forceCoefficient, shouldSpin);
}

function accelerateToObject(obj, target, forceCoefficient, shouldSpin) {
    var difficultyFactor = 1;
    if (playTimer) {
        difficultyFactor += Math.pow(playTimer.ms / 10000, 1.1);
    }

    // These are axis aligned squares!
    var objTopLeftX     = obj.x - obj.width / 2;
    var objTopLeftY     = obj.y + obj.height / 2;

    var objTopRightX    = obj.x + obj.width / 2;
    var objTopRightY    = obj.y + obj.height / 2;

    var objBottomLeftX  = obj.x - obj.width / 2;
    var objBottomLeftY  = obj.y - obj.height / 2;

    var objBottomRightX = obj.x + obj.width / 2;
    var objBottomRightY = obj.y - obj.height / 2;

    var averageObjX = (objTopLeftX + objTopRightX + objBottomLeftX + objBottomRightX) / 4;
    var averageObjY = (objTopLeftY + objTopRightY + objBottomLeftY + objBottomRightY) / 4;

    var targetTopLeftX     = target.x - target.width / 2;
    var targetTopLeftY     = target.y + target.height / 2;

    var targetTopRightX    = target.x + target.width / 2;
    var targetTopRightY    = target.y + target.height / 2;

    var targetBottomLeftX  = target.x - target.width / 2;
    var targetBottomLeftY  = target.y - target.height / 2;

    var targetBottomRightX = target.x + target.width / 2;
    var targetBottomRightY = target.y - target.height / 2;

    var averageTargetX = (targetTopLeftX + targetTopRightX + targetBottomLeftX + targetBottomRightX) / 4;
    var averageTargetY = (targetTopLeftY + targetTopRightY + targetBottomLeftY + targetBottomRightY) / 4;

    var directX = averageTargetX - averageObjX;
    var directY = averageTargetY - averageObjY;

    var indirectX = directX + game.width;
    var indirectY = directY + game.height;

    var x;
    if (Math.abs(directX) < Math.abs(indirectX)) {
        x = directX;
    } else {
        x = indirectX;
    }

    var y;
    if (Math.abs(directY) < Math.abs(indirectY)) {
        y = directY;
    } else {
        y = indirectY;
    }

    var squaredDistance = (x * x + y * y);
    var angle = Math.atan2(y, x);

    var force = Math.min(
        20000000,
        gravityDirection * difficultyFactor * forceCoefficient * obj.body.mass * target.body.mass / squaredDistance
    );

    obj.body.force.x = Math.cos(angle) * force;
    obj.body.force.y = Math.sin(angle) * force;

    if (shouldSpin) {
        var angularForce = 0;

        var objTopLeftToTargetX = objTopLeftX - averageTargetX;
        var objTopLeftToTargetY = objTopLeftY - averageTargetY;
        var objTopLeftToTargetSquaredDistance = objTopLeftToTargetX * objTopLeftToTargetX + objTopLeftToTargetY * objTopLeftToTargetY;

        // Axis aligned box means the vector from center to corner is (1, 1), so the dot product divided by the distance squared is:
        angularForce += (objTopLeftToTargetX + objTopLeftToTargetY) / objTopLeftToTargetSquaredDistance;

        var objTopRightToTargetX = objTopRightX - averageTargetX;
        var objTopRightToTargetY = objTopRightY - averageTargetY;
        var objTopRightToTargetSquaredDistance = objTopRightToTargetX * objTopRightToTargetX + objTopRightToTargetY * objTopRightToTargetY;

        angularForce += (objTopRightToTargetX + objTopRightToTargetY) / objTopRightToTargetSquaredDistance;

        var objBottomLeftToTargetX = objBottomLeftX - averageTargetX;
        var objBottomLeftToTargetY = objBottomLeftY - averageTargetY;
        var objBottomLeftToTargetSquaredDistance = objBottomLeftToTargetX * objBottomLeftToTargetX + objBottomLeftToTargetY * objBottomLeftToTargetY;

        angularForce += (objBottomLeftToTargetX + objBottomLeftToTargetY) / objBottomLeftToTargetSquaredDistance;

        var objBottomRightToTargetX = objBottomRightX - averageTargetX;
        var objBottomRightToTargetY = objBottomRightY - averageTargetY;
        var objBottomRightToTargetSquaredDistance = objBottomRightToTargetX * objBottomRightToTargetX + objBottomRightToTargetY * objBottomRightToTargetY;

        angularForce += (objBottomRightToTargetX + objBottomRightToTargetY) / objBottomRightToTargetSquaredDistance;

        obj.body.angularForce = Math.min(10000, 10000 * angularForce);
    }
}

function maybeFire(player) {
    var fireType;
    if (isUpDown()) {
        fireType = 1;
    } else if (isDownDown()) {
        fireType = -1;
    } else {
        return;
    }

    addProjectile(player, fireType);
}

function addProjectile(player, fireType) {
    if (!player.canFire) {
        return;
    }

    var projectile = projectiles.create(player.x, player.y, 'projectile');
    game.physics.p2.enable(projectile);

    projectile.anchor.set(0.5);
    projectile.tint = colours.yellow;

    projectile.body.rotation = player.body.rotation;

    var angle = projectile.body.rotation - Math.PI / 2;
    var speed = 1500;

    projectile.body.velocity.x = Math.cos(angle) * speed;
    projectile.body.velocity.y = Math.sin(angle) * speed;

    projectile.body.damping = 0;
    projectile.body.angularDamping = 0;

    projectile.body.setCollisionGroup(projectileCollisionGroup);
    projectile.body.collides(planetCollisionGroup);

    projectile.body.onBeginContact.add(function(body) {
        projectileHit(player, projectile, body);
    }, this);

    projectile.fireType = fireType;

    game.time.events.add(Phaser.Timer.SECOND / 5, function() {
        player.canFire = true;
    }, this);

    game.time.events.add(Phaser.Timer.SECOND * 2, function() {
        killProjectile(player, projectile);
    }, this);

    player.canFire = false;

    projectiles.shootSfx.play();
}

function projectileHit(player, projectile, body) {
    killProjectile(player, projectile)

    // FIXME: This is if it hit a wall.
    if (body === null) {
        return;
    }

    shakeScreen(2);

    setCurrentPlanet(body.sprite, projectile.fireType, true);
}

function killProjectile(player, projectile) {
    projectile.kill();

    player.hasProjectile = false;
}

function maybeWrap(obj) {
    game.world.wrap(obj.body, Math.sqrt(obj.height / 2, obj.width / 2));
}

function isUpDown() {
    return cursorControls.up.isDown || wasdControls.up.isDown || zqsdControls.up.isDown;
}

function isDownDown() {
    return cursorControls.down.isDown || wasdControls.down.isDown || zqsdControls.down.isDown;
}

function isLeftDown() {
    return cursorControls.left.isDown || wasdControls.left.isDown || zqsdControls.left.isDown;
}

function isRightDown() {
    return cursorControls.right.isDown || wasdControls.right.isDown || zqsdControls.right.isDown;
}

})();
