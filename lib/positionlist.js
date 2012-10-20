if (typeof exports !== 'undefined') {
    var Fragment = require('./fragments.js').Fragment;
    var Position = require('./positions.js').Position;
    exports.PositionList = PositionList;
}

function PositionList () {
    this.positions = []; // position keyed by number of stones they
                         // have
    this.positionDictionary = {}; // positions keyed by their stonesRep()
    this.largestPosition = 0;
}

PositionList.prototype.getBoardPosition = function (stonesRep) {
    return this.positionDictionary[stonesRep];
};

PositionList.prototype.byLength = function (length) {
    return this.positions[length];
};

PositionList.prototype.newPosition = function (stones, child, parent) {
    var stonesRep = Fragment.createStonesRep(stones, parent.boardHeight,
                                             parent.boardWidth);
    var found = this.positionDictionary[stonesRep];
    if (found) {
        found.childFragments.push(child);
        return found;
    } else {
        var newPosition = new Position(stones, parent);
        var numberStones = newPosition.numberStones;
        if (this.positions[numberStones]) {
            this.positions[numberStones].push(newPosition);
        } else {
            this.positions.numberStones = [newPosition];
            this.largestPosition = Math.max(this.largestPosition, numberStones);
        }
        newPosition.positionList = this;
        this.positionDictionary[stonesRep] = newPosition;
        return newPosition;
    }
};