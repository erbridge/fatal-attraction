GAME = {};

(function() {

'use strict';

GAME.init = function() {
    this.game = new Phaser.Game(
        window.innerWidth, window.innerHeight,
        Phaser.AUTO,
        '',
        {
            preload: this.preload,
            create:  this.create,
            update:  this.update,
        }
    );
};

GAME.preload = function() {

};

GAME.create = function() {

};

GAME.update = function() {

};

})();
