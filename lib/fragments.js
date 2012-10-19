/* A fragment is an object that represents a single diagram's
 * contents. */

if (typeof exports !== 'undefined') {
    var _ = require('underscore');
    var Diagram = require('./diagrams.js').Diagram;
    var Position = require('./positions.js').Position;
}

function Fragment (text, positionList) {
    this.borders = {};
    this.stones = {};
    this.markers = {};
    this.moves = [];
    this.positionList = positionList;

    if (text) {
        this.text = text;
        Diagram.parseDiagram(text, this);
        this.createChildren();
    }

}

// Create a series of children for the Fragment. The first child is
// the initial position of the Fragment, while each subsequent child
// represents one move.
Fragment.prototype.createChildren = function () {

    this.children = [new ChildFragment(this.stones, this)];

    for (var i = 0, ilen = this.moves.length; i < ilen; i++) {
        var color = this.moves[i].movenumber % 2 === 0 ?
            Diagram.oppositeColor(this.firstPlayer) : this.firstPlayer
        // get the stones on the board after the move is placed
        var stones = _.last(this.children).placeMove(
            this.moves[i].point, color);
        var child = new ChildFragment(stones, this, this.moves[i].point);
        this.children.push(child);
    }
};

Fragment.prototype.equalStones = function (fragment) {
    return this.stonesRep() === fragment.stonesRep();
};

Fragment.createStonesRep = function (stones, boardHeight, boardWidth) {
    var diagramText = [];
    for (var i = 1, ilen = boardHeight; i <= ilen; i++) {
        for (var j = 1; j <= boardWidth; j++) {
            if (stones[[j,i]]) {
                diagramText.push(Diagram.dChars[stones[[j,i]]] + ' ');
            } else {
                diagramText.push(Diagram.dChars[EMPTY] + ' ');
            }
        }
        diagramText.push('\n');
    }
    return diagramText.join('');
};

// A representation of a position's stones. Will be the same as the
// borderless and markerless diagram from which that Position could be
// derived.
Fragment.prototype.stonesRep = function () {
    if (!this.stonesRepString) {
        this.stonesRepString =
            Fragment.createStonesRep(this.stones, this.boardHeight,
                                     this.boardWidth);
    }
    return this.stonesRepString;
};

// Expand all fragments to the size of the largest fragment found
Fragment.embedAll = function (fragments) {
    var maxSize = Fragment.maxSize(fragments);

    for (var i = 0, ilen = fragments.length; i < ilen; i++) {
        if (fragments[i].boardWidth < maxSize.width ||
            fragments[i].boardHeight < maxSize.height) {
            try {
                newFragments.push(fragments[i].embed(
                    maxSize.width, maxSize.height));
            } catch (err) {
                console.log(err.message + "on fragment\n" +
                            fragments[i].text);
            }
        } else {
            newFragments.push(fragments[i]);
        }
    }
    return newFragments;
};

// Return the largest boardsize of any Fragments in an array
Fragment.maxSize = function (fragments) {
    return {
        height: _.max(_.pluck(fragments, 'boardHeight')),
        width: _.max(_.pluck(fragments, 'boardWidth'))
    };
};

// Keep only those fragments that are the same size as the largest
// board dimensions of any fragment.
Fragment.oneSize = function (fragments) {
    var boardSize = Fragment.maxSize(fragments);
    return _.filter(fragments, function (x) {
        return !((x.boardHeight < boardSize.height) ||
                 (x.boardWidth < boardSize.width));
    });
};

// A board can be unambiguously embedded in a larger board so long as
// it contains at least one corner, but not all four sides
Fragment.prototype.embeddable = function () {
    var numBorders = _.size(this.borders);

    if (numBorders < 2 || numBorders === 4) {
        return false;
    }

    if (numBorders === 2) {
        for (side in this.borders) {
            if ((oppositeBorders[side] in this.borders)) {
                return false;
            }
        }
    }
    return true;
};

Fragment.prototype.embed = function (newWidth, newHeight) {
    if ((newWidth < this.boardWidth) || (newHeight < this.boardHeight)) {
        throw new Error("tried to embed a board in one smaller than it");
    }

    if (!this.embeddable()) {
        throw new Error("tried to embed a board that didn't have a corner");
    }

    var newFragment = new Fragment();

    // get distance that stones must be moved down/to the right for
    // the new board
    var xOffset = 'left' in this.borders ? 0 : (newWidth - this.boardWidth);
    var yOffset = 'up' in this.borders ? 0 : (newHeight - this.boardHeight);

    // embed stones and moves in newFragment
    _.each(this.stones, function (point) {
        this.stones[point] = this.newCoordinates(point, xOffset, yOffset)});
    newFragment.moves = this.embedMoves(xOffset, yOffset);

    // copy basic board attributes
    newFragment.firstPlayer = this.firstPlayer;
    newFragment.firstMoveNumber = this.firstMoveNumber;
    newFragment.hasCoordinates = this.hasCoordinates;

    // record new attributes
    newFragment.boardWidth = newWidth;
    newFragment.boardHeight = newHeight;

    // record that this board was embedded
    newFragment.wasEmbeddedFrom = [this.boardHeight, this.boardWidth];
    newFragment.oldBorders = this.borders;

    newFragment.createChildren();
    return newFragment;
};

// Return the new coordinates for a point after adding columns and
// rows to the top and left
Fragment.prototype.newCoordinates = function (point, xOffset, yOffset) {
    var ptCoordinates = Position.coordinates(point);
    return [ptCoordinates[0] + xOffset, ptCoordinates[1] + yOffset];
};

Fragment.prototype.embedMoves = function (xOffset, yOffset) {
    return _.map(this.moves, function (point) { return {
        movenumber: point.movenumber,
        point: this.newCoordinates(point, xOffset, yOffset)
    }; });
};

function ChildFragment (stones, parent, move) {
    this.fragment = parent;
    this.borders = parent.borders;
    this.positionList = parent.positionList;

    if (move) {
        this.move = move;
    }

    this.position = this.positionList.newPosition(stones, parent);
}

if (typeof exports !== 'undefined') {
    exports.Fragment = Fragment;
}