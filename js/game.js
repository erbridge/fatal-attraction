(function() {

'use strict';

var game,
    planetCollisionGroup,
    playerCollisionGroup,
    projectileCollisionGroup,
    controls,
    planets,
    currentPlanet,
    players,
    projectiles,
    gravityDirection;

window.startGame = function() {
    game = new Phaser.Game(
        1024 * 16 / 9, 1024,
        Phaser.AUTO
    );

    game.state.add('main', mainState);
    game.state.start('main');
};

var mainState = {
    preload: function() {
        game.load.image('player',     'assets/player.png');
        game.load.image('planet',     'assets/planet.png');
        game.load.image('projectile', 'assets/projectile.png');
    },

    create: function() {
        game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        game.scale.pageAlignHorizontally = true;
        game.scale.pageAlignVertically = true;
        game.scale.setScreenSize(true);

        controls = game.input.keyboard.createCursorKeys();

        game.physics.startSystem(Phaser.Physics.P2JS);

        playerCollisionGroup     = game.physics.p2.createCollisionGroup();
        planetCollisionGroup     = game.physics.p2.createCollisionGroup();
        projectileCollisionGroup = game.physics.p2.createCollisionGroup();

        // Make things collide with the bounds.
        // game.physics.p2.updateBoundsCollisionGroup();

        players     = game.add.group();
        planets     = game.add.group();
        projectiles = game.add.group();

        for (var i = 0; i < 10; i++) {
            addPlanet(game.rnd.integerInRange(200, game.world.width - 200), game.rnd.integerInRange(200, game.world.height - 200), false);
        }

        addPlanet(game.world.centerX, game.world.centerY, true);

        addPlayer(50, 50);
    },

    update: function() {
        players.forEachAlive(movePlayer, this);
        planets.forEachAlive(movePlanet, this);

        players.forEachAlive(maybeFire, this);

        players.forEachAlive(maybeWrap, this);
        planets.forEachAlive(maybeWrap, this);
        projectiles.forEachAlive(maybeWrap, this);
    },
}

function addPlanet(x, y, isCurrent) {
    var planet = planets.create(x, y, 'planet');
    game.physics.p2.enable(planet);

    planet.anchor = new Phaser.Point(0.5, 0.5);

    planet.body.velocity.x = game.rnd.integerInRange(-20, 20);
    planet.body.velocity.y = game.rnd.integerInRange(-20, 20);

    planet.body.rotateRight(game.rnd.integerInRange(-20, 20));

    planet.body.mass = 100;

    planet.body.setCollisionGroup(planetCollisionGroup);
    planet.body.collides(playerCollisionGroup);
    planet.body.collides(projectileCollisionGroup);

    if (isCurrent) {
        setCurrentPlanet(planet);
    }
}

function setCurrentPlanet(planet, gravityDirectionToSet) {
    if (gravityDirectionToSet === undefined) {
        gravityDirectionToSet = 1;
    }

    if (currentPlanet !== undefined) {
        currentPlanet.tint = 0x8abeb7;
        currentPlanet.body.mass = 100;
    }

    if (gravityDirectionToSet === 1) {
        planet.tint = 0xb5bd68;
    } else {
        planet.tint = 0xb294bb;
    }

    planet.body.mass = 10000;

    gravityDirection = gravityDirectionToSet;

    currentPlanet = planet;
}

function addPlayer(x, y) {
    var player = players.create(x, y, 'player');
    game.physics.p2.enable(player);

    player.anchor = new Phaser.Point(0.5, 0.5);
    player.body.rotation = Math.PI * 3 / 4;

    player.body.setCollisionGroup(playerCollisionGroup);
    player.body.collides(playerCollisionGroup);
    player.body.collides(planetCollisionGroup);

    player.body.onBeginContact.add(function(body) {
        playerHit(player, body);
    }, this);

    player.canFire = true;
}

function playerHit(player, body) {
    // FIXME: This is if they hit a wall.
    if (body === null) {
        return;
    }

    player.kill();

    if (body.sprite.key === 'player') {
        body.kill();
    }
}

function movePlayer(player) {
    if (controls.left.isDown) {
        player.body.rotateLeft(100);
    } else if (controls.right.isDown) {
        player.body.rotateRight(100);
    } else {
        player.body.setZeroRotation();
    }

    move(player, 10);
}

function movePlanet(planet) {
    if (planet === currentPlanet) {
        return;
    }

    move(planet, 1);
}

function move(obj, forceCoefficient) {
    accelerateToObject(obj, currentPlanet, forceCoefficient);
}

function accelerateToObject(obj, target, forceCoefficient) {
    var x = target.x - obj.x;
    var y = target.y - obj.y;

    var force = gravityDirection * forceCoefficient * 100 * obj.body.mass * target.body.mass / (x * x + y * y);
    var angle = Math.atan2(y, x);

    obj.body.force.x = Math.cos(angle) * force;
    obj.body.force.y = Math.sin(angle) * force;
}

function maybeFire(player) {
    var fireType;
    if (controls.up.isDown) {
        fireType = 1;
    } else if (controls.down.isDown) {
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

    projectile.anchor = new Phaser.Point(0.5, 0.5);

    projectile.body.rotation = player.body.rotation;

    var angle = projectile.body.rotation - Math.PI / 2;

    projectile.body.velocity.x = Math.cos(angle) * 1000;
    projectile.body.velocity.y = Math.sin(angle) * 1000;

    projectile.body.setCollisionGroup(projectileCollisionGroup);
    projectile.body.collides(planetCollisionGroup);

    projectile.body.onBeginContact.add(function(body) {
        projectileHit(player, projectile, body);
    }, this);

    projectile.fireType = fireType;

    game.time.events.add(Phaser.Timer.SECOND / 5, function() {
        player.canFire = true;
    }, this);

    player.canFire = false;
}

function projectileHit(player, projectile, body) {
    projectile.kill();

    player.hasProjectile = false;

    // FIXME: This is if it hit a wall.
    if (body === null) {
        return;
    }

    setCurrentPlanet(body.sprite, projectile.fireType);
}

function maybeWrap(obj) {
    game.world.wrap(obj.body);
}

})();
