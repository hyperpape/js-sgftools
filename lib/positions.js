if (typeof exports !== 'undefined') {
    var _ = require('underscore');
    exports.Position = Position;
    var Diagram = require('./diagrams.js').Diagram;
    var Fragment = require('./fragments.js').Fragment;
}

function Position (stones, parent) {
    this.stones = Position.copyStones(stones);
    this.numberStones = _.size(this.stones);

    this.captureSource = [];
    this.childFragments = []; // childFragments that point to this
                              // position

    this.boardWidth = parent.boardWidth;
    this.boardHeight = parent.boardHeight;
}

Position.copyStones = function (stones) {
    return _.extend({}, stones);
};

Position.prototype.stoneCopy = function () {
    return _.extend({}, this.stones);
};

Position.prototype.equalStones = Fragment.prototype.equalStones;

Position.prototype.notCaptureResult = function () {
    return this.captureSource.length === 0;
};

Position.prototype.adjacent = function (point) {
    var ptCoordinates = Fragment.coordinates(point);
    var adjacents = [];

    // check that the point is not on an edge
    if (ptCoordinates[1] !== this.boardHeight) { // bottom
        adjacents.push(ptCoordinates[0] + ',' + (ptCoordinates[1] + 1));
    }
    if ((ptCoordinates[0] !==  this.boardWidth)) { // right
        adjacents.push((ptCoordinates[0] + 1) +  ',' + ptCoordinates[1]);
    }
    if (ptCoordinates[0] !== 1) { // left
        adjacents.push((ptCoordinates[0] - 1) + ',' + ptCoordinates[1]);
    }
    if (ptCoordinates[1] !== 1) { // top
        adjacents.push(ptCoordinates[0] + ',' + (ptCoordinates[1] - 1));
    }
    return adjacents;
};

Position.prototype.getGroup = function (point) {
    var groupColor = this.stones[point] || Diagram.EMPTY;
    var liberties = [];
    var processed = {};

    if (groupColor !== Diagram.EMPTY) {
        var todo = [point];
        while (todo.length) {
            // get all adjacent points
            // add same colored stones to todo, add empty points to liberties
            var next = todo.pop();
            if (!(next in processed)) {
                processed[next] = groupColor;
                var newPoints = this.adjacent(next);

                for (var i = 0, nextAdjacent; nextAdjacent = newPoints[i]; i++) {
                    if (!this.isOccupied(nextAdjacent)) {
                        liberties.push(nextAdjacent);
                    }
                    if ((this.stones[nextAdjacent] === groupColor) &&
                        (!(nextAdjacent in processed))) {
                        todo.push(nextAdjacent);
                    }
                }
            }
        }
    }

    return {"stones": processed, "liberties": _.uniq(liberties),
            "color": groupColor};
};

Position.prototype.stonesRep = Fragment.prototype.stonesRep;

Position.prototype.removePoints = function (groups) {
    var newStones = this.stoneCopy();
    for (var i = 0; i < groups.length; i++) {
        for (var point in groups[i].stones) {
            delete newStones[point];
        }
    }
    return newStones;
};

// Place a move and perform resulting captures, return the stones produced
Position.prototype.placeMove = function (point, color) {
    var captures = this.capturedStrings(point, color);
    var stones = (captures.length > 0) ? this.removePoints(captures) :
        this.stoneCopy();
    stones[point] = color;
    return stones;
};

// Find out if placing a stone would capture a group. Not suicide
// aware.
Position.prototype.capturedStrings = function (point, color) {
    if (this.isOccupied(point)) {
        return false; // may be better to raise an error
    }

    var adjacent = this.adjacent(point);
    var captures = [];
    for (var i = 0; i < adjacent.length; i++) {
        if (this.isOccupied(adjacent[i])) {
            var group = this.getGroup(adjacent[i]);
            if (group.color !== color &&
                group.liberties.length === 1) {
                captures.push(group);
            }
        }
    }
    return captures;
};

Position.prototype.isOccupied = function (point) {
    return this.stones[point];
};

Position.prototype.sameBoardSize = function (position) {
    return this.boardHeight === position.boardHeight &&
        this.boardWidth === position.boardWidth;
};

// Test if this position differs from another by adding or subtracting
// one stone that doesn't cause a capture.
Position.prototype.differsByOneStone = function (other) {
    if (!this.sameBoardSize(other)) {
        return false;
    }

    // avoid the case where a single stone has swapped places
    if (this.numberStones === other.numberStones) {
        return false;
    }

    // when comparing x & y, must test if x has stones y doesn't & vice versa
    var ldiffs = 0;
    var rdiffs = 0;

    for (var point in this.stones) {
        // return false if any stone flips color
        if (other.stones[point] &&
            this.stones[point] !== other.stones[point]) {
            return false;
        }
        // check for added stones
        if (!other.stones[point]) {
            if (ldiffs) {
                return false;
            }
            ldiffs++;
        }
    }
    for (var point in other.stones) {
        if (!this.stones[point]) {
            if (rdiffs) {
                return false;
            }
            rdiffs++;
        }
    }
    if (ldiffs === 1 || rdiffs === 1) {
        return true;
    }
};

Position.prototype.getAddedStones = function (position) {
    for (var point in this.stones) {
        if (this.stones[point] && !position.stones[point]) {
            result[point] = this.stones[point];
        }
    }
    return result;
};

// Get all positions that differ from a given position by adding just
// one stone or making a capture
Position.prototype.findSuccessors = function () {

    var plist = this.positionList;
    var self = this;
    if (this.positionList.byLength(this.numberStones + 1)) {
        return filter(this.positionList.byLength(this.numberStones + 1),
                      function (x) { return self.differsByOneStone(x);}).
            concat(this.captureResults());
    } else {
        return this.captureResults();
    }
};

// get Positions from the PositionList that can be reached by capture
Position.prototype.captureResults = function (position) {
    var results = [];
    var postCapturePositions = this.afterCaptures();

    for (var i = 0, ilen = postCapturePositions.length; i < ilen; i++) {
        results.push(postCapturePositions[i].matchStones());
    }
    // mark the other positions as potentially arising from a capture
    for (var j = 0, jlen = results.length; j < jlen; j++) {
        results[j].captureSource.push(this);
    }
    return results;
};

Position.prototype.afterCaptures = function () {
    // creates an array of board Positions that could possibly be
    // reached by captures
    if (!this.postCapturePositions) {
        var potentialCaptures = this.potentialCaptures();
        this.postCapturePositions = [];
        for (var i = 0; i < potentialCaptures.length; i++) {
            var oppColor = oppositeColor(potentialCaptures[i].color);
            var result = this.placeMove(
                potentialCaptures[i].liberties[0], oppColor);
            // not at all sure how the parent should be chosen
            this.postCapturePositions.push(new Position(result, this.fragment));
        }
    }
    return this.postCapturePositions;
};

// Returns an array of objects representing capturable strings
// with properties stones and liberties
Position.prototype.potentialCaptures = function () {
    if (!this.potentiallyCapturedGroups) {
        var processed = {};
        this.potentiallyCapturedGroups = [];
        for (var point in this.stones) {
            if (!(point in processed)) {
                var stoneString = this.getGroup(point);
                _.extend(processed, stoneString.stones);
                if (stoneString.liberties.length === 1) {
                    this.potentiallyCapturedGroups.push(stoneString);
                }
            }
        }
    }
    return this.potentiallyCapturedGroups;
};

Position.prototype.isSubset = function (position) {
    for (var point in this.stones) {
        if (position.stones[point] !== this.stones[point]) {
            return false;
        }
    }
    return true;
};

// Temporary End

Position.prototype.matchStones = function (position) {
    return this.fragment.positionList.getBoardPosition(this.stonesRep()) ||
        [];
};

// the next three functions are for handling the general case
Position.prototype.placePartial = function () {
    var firstContact = this.findStart();
    if (! firstContact) {
        this.embeddedNeverInTree = true;
        return;
    }
    if (this.children.length === 1) {
        this.embeddedIgnore = true;
        return;
    }
    this.locateMoves(firstContact, i);
};

Position.prototype.findStart = function () {
    // Figure out how to place an embedded partial board in the tree.
    // To do this, for each i >= the number of stones in this
    // position, get all positions from the positionList that have
    // that many stones. If one of them is a superset of this
    // position's stones, return it, along with the number of stones.
    for (var i = this.numberStones, ilen = this.parent.positionList.largestPosition;
         i < ilen; i++) {
        var targets = this.parent.positionList.byLength(i);
        for (var j = 0, jlen = targets.length; j < jlen; j++) {
            if (this.isSubset(targets[j])) {
                return [targets[j], i]; // why this format?
            }
        }
    }
    return false;
};

Position.prototype.locateMoves = function (start) {
    // find places where moves are located in the positionList
    // wtf?
    var movePlaces = [];
    for (var i = 1, ilen = this.children.len; i < ilen; i++) {
        for (var j = 0 || start; j < this.parent.positionList.largestPosition;
             j++) {
            for (var k = 0, klen = this.parent.positionList[j].len; k < klen;
                 k++) {
                if (this.isSubset(this.parent.positionList[j][k])) {
                    movePlaces[i] = this.parent.positionList[j][k];
                }
            }
        }
    }
};