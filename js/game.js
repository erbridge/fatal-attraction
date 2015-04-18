(function() {

'use strict';

var game,
    planets,
    currentPlanet,
    players,
    controls;

window.startGame = function() {
    game = new Phaser.Game(
        window.innerWidth, window.innerHeight,
        Phaser.AUTO
    );

    game.state.add('main', mainState);
    game.state.start('main');
};

var mainState = {
    preload: function() {
        game.load.image('player', 'assets/player.png');
        game.load.image('planet', 'assets/planet.png');
    },

    create: function() {
        controls = game.input.keyboard.createCursorKeys();

        game.physics.startSystem(Phaser.Physics.P2JS);

        planets = game.add.group();

        for (var i = 0; i < 10; i++) {
            addPlanet(game.rnd.integerInRange(200, game.world.width - 200), game.rnd.integerInRange(200, game.world.height - 200), false);
        }

        addPlanet(game.world.width / 2, game.world.height / 2, true);

        players = game.add.group();

        var player = players.create(100, 100, 'player');
        game.physics.p2.enable(player);

        player.body.onBeginContact.add(function(body) {
            playerHit(player, body);
        }, this);
    },

    update: function() {
        players.forEachAlive(movePlayer, this);
        planets.forEachAlive(movePlanet, this);
    },
}

function addPlanet(x, y, isCurrent) {
    var planet = planets.create(x, y, 'planet');
    game.physics.p2.enable(planet);

    planet.body.velocity.x = game.rnd.integerInRange(-20, 20);
    planet.body.velocity.y = game.rnd.integerInRange(-20, 20);

    planet.body.mass = 100;

    if (isCurrent) {
        planet.body.velocity.x = 0;
        planet.body.velocity.y = 0;

        setCurrentPlanet(planet);
    }
}

function setCurrentPlanet(planet) {
    if (currentPlanet !== undefined) {
        currentPlanet.tint = 0x8abeb7;
        currentPlanet.body.mass = 100;
    }

    planet.tint = 0xb5bd68;
    planet.body.mass = 10000;

    currentPlanet = planet;
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
    move(player, 10);

    if (controls.left.isDown) {
        player.body.rotateLeft(100);
    } else if (controls.right.isDown) {
        player.body.rotateRight(100);
    } else {
        player.body.setZeroRotation();
    }
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

    var force = forceCoefficient * 100 * obj.body.mass * target.body.mass / (x * x + y * y);
    var angle = Math.atan2(y, x);

    obj.body.force.x = Math.cos(angle) * force;
    obj.body.force.y = Math.sin(angle) * force;
}

})();
