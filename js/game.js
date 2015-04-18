(function() {

'use strict';

var game,
    planets,
    currentPlanet,
    players;

window.startGame = function() {
    game = new Phaser.Game(
        window.innerWidth, window.innerHeight,
        Phaser.AUTO,
        '',
        {
            preload: preload,
            create:  create,
            update:  update,
        }
    );
};

function preload() {
    game.load.image('player', 'assets/player.png');
    game.load.image('planet', 'assets/planet.png');
}

function create() {
    game.physics.startSystem(Phaser.Physics.P2JS);

    planets = game.add.group();

    for (var i = 0; i < 10; i++) {
        var planet = planets.create(game.rnd.integerInRange(200, game.world.width - 200), game.rnd.integerInRange(200, game.world.height - 200), 'planet');
        game.physics.p2.enable(planet);

        if (currentPlanet === undefined) {
            currentPlanet = planet;
        }
    }

    players = game.add.group();

    var player = players.create(100, 100, 'player');
    game.physics.p2.enable(player);
}

function update() {
    players.forEachAlive(movePlayer, this);
    planets.forEachAlive(movePlanet, this)
}

function movePlayer(obj) {
    move(obj, 15);
}

function movePlanet(obj) {
    if (obj === currentPlanet) {
        return;
    }

    move(obj, 5);
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
