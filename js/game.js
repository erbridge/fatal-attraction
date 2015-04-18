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
            var planet = planets.create(game.rnd.integerInRange(200, game.world.width - 200), game.rnd.integerInRange(200, game.world.height - 200), 'planet');
            game.physics.p2.enable(planet);

            planet.body.velocity.x = game.rnd.integerInRange(-20, 20);
            planet.body.velocity.y = game.rnd.integerInRange(-20, 20);

            if (currentPlanet === undefined) {
                currentPlanet = planet;
                currentPlanet.tint = 0xb5bd68;
            }
        }

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
    move(player, 15);

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

    move(planet, 5);
}

function move(obj, speed) {
    accelerateToObject(obj, currentPlanet, speed);
}

function accelerateToObject(obj, target, speed, shouldRotate) {
    var angle = Math.atan2(target.y - obj.y, target.x - obj.x);
    obj.body.force.x = Math.cos(angle) * speed;
    obj.body.force.y = Math.sin(angle) * speed;
}

})();