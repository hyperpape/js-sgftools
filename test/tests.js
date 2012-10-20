var _ = require('underscore');
var Position = require('../lib/positions.js').Position;
var Fragment = require('../lib/fragments.js').Fragment;

exports.stoneCount = function (test, target, count) {
    test.equals(target.position.numberStones, count);
};

exports.numberChildren = function (test, target, count) {
    test.equals(target.children.length, count);
};

exports.adjacent = function (test, target, point, results) {
    test.deepEqual(target.position.adjacent(point).sort(), results.sort());
}

exports.isOccupiedTest = function (test, target, point, result, message) {
    if (result === true) {
        test.ok(target.position.isOccupied(point));
    } else if (result === false) {
        test.ok(!target.position.isOccupied(point));
    } else {
        test.equal(target.position.isOccupied(point), result);
    }
}

exports.getGroupTest = function (test, target, point, group) {
    var targetGroup = target.position.getGroup(point);
    test.deepEqual(Object.keys(targetGroup.stones).sort(),
               Object.keys(group.stones).sort());
    test.deepEqual(targetGroup.liberties.sort(), group.liberties.sort());
    test.equal(targetGroup.color, group.color);
};

exports.captureCount = function (test, target, count) {
    test.equals(target.position.potentialCaptures().length, count);
};

exports.capturedStrings = function (test, target, point, color, result) {
    test.equals(target.capturedStrings);
}

exports.findSuccessor = function (test, target, plist, count) {
    test.equals(Position.findSuccessors().length, count);
};

exports.afterCapturesTest = function (test, target, count) {
    test.equals(target.afterCaptures().length, count);
};

exports.captureResultsTest = function (test, target, count) {
    test.equals(target.captureResults().length, count);
};

exports.placeMoveTest = function (test, target, point, color, result) {
    var newStones = target.position.placeMove(point, color);
    var position = new Position(newStones, new Fragment());
    test.ok(position.isOccupied(point));
    if (result && result.stoneCount) {
        test.equals(position.numberStones, result.stoneCount);
    }
};

exports.buildTest = function (test, tree) {
    var startingPoints = tree.getStartingPoints();
    test.ok(startingPoints.length !== 0);
    tree.addStartingPoints(startingPoints);
    for (var i = 0; i < startingPoints.length; i++) {
        test.ok(startingPoints[i].inTree());
    }
};
