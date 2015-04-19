(function() {

'use strict';

var game,
    planetCollisionGroup,
    playerCollisionGroup,
    projectileCollisionGroup,
    controls,
    background,
    trails,
    trailTexture,
    trailImage,
    planets,
    currentPlanet,
    players,
    projectiles,
    gravityDirection;

var colours = {
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

    game.state.add('main', mainState);
    game.state.start('main');
};

var mainState = {
    preload: function() {
        game.load.image('background', 'assets/background.png');
        game.load.image('trail',      'assets/trail.png');
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

        trailImage = game.make.image(0, 0, 'trail');
        trailImage.anchor.set(0.5);

        game.physics.startSystem(Phaser.Physics.P2JS);

        playerCollisionGroup     = game.physics.p2.createCollisionGroup();
        planetCollisionGroup     = game.physics.p2.createCollisionGroup();
        projectileCollisionGroup = game.physics.p2.createCollisionGroup();

        // Make things collide with the bounds.
        // game.physics.p2.updateBoundsCollisionGroup();

        background = game.add.tileSprite(0, 0, 1820, 1024, 'background');

        trails      = game.add.group();
        players     = game.add.group();
        planets     = game.add.group();
        projectiles = game.add.group();

        addPlayer(game.world.centerX, game.world.centerY);

        for (var i = 0; i < 11; i++) {
            var x = game.rnd.integerInRange(0, game.world.width);
            var y = game.rnd.integerInRange(0, game.world.height);
            while (Math.abs(game.world.centerX - x) < 300 && Math.abs(game.world.centerY - y) < 300) {
                x = game.rnd.integerInRange(0, game.world.width);
                y = game.rnd.integerInRange(0, game.world.height);
            }

            addPlanet(x, y, i === 0);
        }
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
    },

    shutdown: function() {
        // FIXME: Tidy up and reset everything!
    },
}

function lerpWorldCenterTowardsCurrentPlanet() {
    lerpWorldCenterTowardsXY(currentPlanet.body.x, currentPlanet.body.y, 50);
}

function lerpWorldCenterTowardsPlayer(player) {
    lerpWorldCenterTowardsXY(player.body.x, player.body.y, 50);
}

function lerpWorldCenterTowardsXY(targetX, targetY, lerpFactor) {
    var x = (game.world.centerX - targetX) / lerpFactor;
    var y = (game.world.centerY - targetY) / lerpFactor;

    background.tilePosition.x += x;
    background.tilePosition.y += y;

    function lerp(obj) {
        obj.body.x += x;
        obj.body.y += y;
    }

    players.forEachAlive(lerp, this);
    planets.forEachAlive(lerp, this);
    projectiles.forEachAlive(lerp, this);
}

function addPlanet(x, y, isCurrent) {
    var planet = planets.create(x, y, 'planet');
    game.physics.p2.enable(planet);

    planet.anchor.set(0.5);
    planet.tint = colours.aqua;

    planet.body.velocity.x = game.rnd.integerInRange(-100, 100);
    planet.body.velocity.y = game.rnd.integerInRange(-100, 100);

    planet.body.rotateRight(game.rnd.integerInRange(-20, 20));

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

function setCurrentPlanet(planet, gravityDirectionToSet) {
    if (gravityDirectionToSet === undefined) {
        gravityDirectionToSet = 1;
    }

    if (currentPlanet !== undefined) {
        currentPlanet.tint = colours.aqua;
        currentPlanet.body.mass = 100;
    }

    if (gravityDirectionToSet === 1) {
        planet.tint = colours.green;
    } else {
        planet.tint = colours.purple;
    }

    planet.body.mass = 1000000;

    gravityDirection = gravityDirectionToSet;

    currentPlanet = planet;
}

function addPlayer(x, y) {
    var player = players.create(x, y, 'player');
    game.physics.p2.enable(player);

    player.anchor.set(0.5);
    player.body.rotation = Math.PI * 3 / 4;

    player.body.damping = 0;
    player.body.angularDamping = 0.99;

    player.body.setCollisionGroup(playerCollisionGroup);
    player.body.collides(playerCollisionGroup);
    player.body.collides(planetCollisionGroup);

    player.body.onBeginContact.add(function(body) {
        playerHit(player, body);
    }, this);

    player.canFire = true;

    // FIXME: This should display the actual trajectory of the player, not their movement in camera space.
    player.trailTexture = game.add.renderTexture(game.world.width, game.world.height, 'trailTexture');

    player.trail = trails.create(game.world.centerX, game.world.centerY, player.trailTexture);
    player.trail.anchor.set(0.5);

    player.trailTimer = game.time.create(false);

    player.trailTimer.loop(Phaser.Timer.SECOND / 4, function() {
        addToTrail(player);
    }, this);

    // player.trailTimer.start();
}

function playerHit(player, body) {
    // FIXME: This is if they hit a wall.
    if (body === null) {
        return;
    }

    player.trailTimer.destroy();
    player.kill();

    if (body.sprite.key === 'player') {
        body.sprite.trailTimer.destroy();
        body.kill();
    }
}

function movePlayer(player) {
    var sign = 0;
    if (controls.left.isDown) {
        sign = -1;
    } else if (controls.right.isDown) {
        sign = 1;
    }

    player.body.angularForce += sign * 30;

    move(player, 5, false);
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
        gravityDirection * forceCoefficient * obj.body.mass * target.body.mass / squaredDistance
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

function addToTrail(player) {
    player.trailTexture.render(trailImage, player.position, false);
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

    projectile.anchor.set(0.5);

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
    game.world.wrap(obj.body, Math.sqrt(obj.height / 2, obj.width / 2));
}

})();
