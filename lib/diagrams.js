/* This module contains contents and functions necessary to parse
   ascii diagrams, represent colors, and output coordinates for board
   points. */

if (typeof exports !== 'undefined') {
    var _ = require('underscore');
}

var Diagram = {};

/* Stone colors */

var BLACK = Diagram.BLACK = 2;
var WHITE = Diagram.WHITE = 1;
var EMPTY = Diagram.EMPTY = 0;

var stoneColor = Diagram.stoneColor = {};
stoneColor[BLACK] = 'B';
stoneColor[WHITE] = 'W';

var oppositeColor = Diagram.oppositeColor = function oppositeColor (color) {
    return color === WHITE ? BLACK : WHITE;
};

/* Diagram characters */

// represents [STONE, MARKER] for each symbol that may appear in a
// diagram
var symbols = {'X': [BLACK, EMPTY],
               'O': [WHITE, EMPTY],
               '.': [EMPTY, EMPTY],
               ',': [EMPTY, EMPTY],
               'C': [EMPTY, 'circle'],
               '#': [BLACK, 'square'],
               '@': [WHITE, 'square'],
               'S': [EMPTY, 'square'],
               'Y': [BLACK, 'triangle'],
               'Q': [WHITE, 'triangle'],
               'T': [EMPTY, 'triangle'],
               'Z': [BLACK, 'X'],
               'P': [WHITE, 'X'],
               'M': [EMPTY, 'X'],
               'B': [BLACK, 'circle'],
               'W': [WHITE, 'circle'],
               '?': [EMPTY, 'shaded']
              };

// translate move labels to move numbers
var numbers = Diagram.numbers = {};
numbers[0] = 10;
for (var i = 1; i < 10; i++) {
    Diagram.numbers[i] = i;
}

// all legal characters for diagrams, including optional search
//  characters from SL (V A * ?)
var diagramChars = '.XO,|\n-1234567890BW#@YQZPCSTMVA*?' +
    'abcdefghijklmnopqrstuvwxyz';

// every legal character must be in symbols. note this puts '-',
// etc. in symbols. This is different from how parseDiagramBody works.
for (var i = 0; i < diagramChars.length; i++) {
    if (!(diagramChars[i] in symbols)) {
        symbols[diagramChars[i]] = [EMPTY, EMPTY];
    }
}

/* for SGF representations of positions */

// Characters for recreating the text of a diagram from a position
var dChars = Diagram.dChars = {};
dChars[BLACK] = 'X';
dChars[WHITE] = 'O';
dChars[EMPTY] = '.';

// mapping 1->'a', 2->'b' etc. for looking up coords note the mapping
// is one-based, since in go we do not talk about the 0-0 point.
var coordinates = Diagram.coordinates = {};
var chars = 'abcdefghijklmnopqrstuvwyxz';

for (var num = 0; i < 19; i++) {
    // note that sgf uses 'i', even though go boards don't
    coordinates[num + 1] = chars.charAt(num);
}

var oppositeBorders = Diagram.oppositeBorders = {'up' : 'down',
                                                 'down' : 'up',
                                                 'left' : 'right',
                                                 'right' : 'left'};

/* Parsing Diagrams */

Diagram.parseDiagram = function (text, target) {
    var lines = text.split("\n");
    target.titleLine = lines[0];
    target.numberStones = target.boardIndex = 0;
    Diagram.parseTitleLine(lines[0], target);

    if (Diagram.isBorderLine(lines[1])) {
        target.borders.up = true;
    }
    if (Diagram.isBorderLine(_.last(lines))) {
        target.borders.down = true;
    }

    Diagram.parseBoard(lines, target);

    delete target.boardIndex;
};

Diagram.titleLinePattern = /(?=[BbWwcm0-9])([bBWw]?)(c?)m?([0-9]*)?/;

// one or more '$'; optional whitespace, '-'s and '+'s; one or more '-'s
// and '+'s; followed by more optional whitespace;
Diagram.topBorderPattern = /\$+[\s\-\+]*[\-\+]+[\s\-\+]*/;

// matches one or more '$', optional left border (|), anything in
// the middle, optional right border.

// '-' is a legal character inside for a board point, so this is
// technically incorrect for parsing diagrams in general. The
// diagrams we need will not use dashes this way.

Diagram.linePattern = /\$+\s*(\|)?([^\|\-\+\[\]\$]+)(\|)?/;

Diagram.isBorderLine = function (line) {
    return Diagram.topBorderPattern.test(line);
};

Diagram.parseBoard = function (lines, fragment) {
    var row = 0;

    for (var i = 1, ilen = lines.length; i < ilen; i++) {
        // first line is titleLine and diagram caption--skip it
        var matches = Diagram.linePattern.exec(lines[i]);
        if (matches && !Diagram.isBorderLine(lines[i])) {
            row += 1;
        }
        if (matches) {
            // if any line has a border, give the whole board a border.
            if (matches[1]) {
                fragment.borders.left = true;
            }
            if (matches[3]) {
                fragment.borders.right = true;
            }
            // handle the "innards" of the line
            if (matches[2]) {
                // don't give parseLine a line that's just whitespace
                if (/\S/.test(matches[2])) {
                    try {
                        Diagram.parseLine(matches[2], row, fragment);
                    } catch (err) {
                        console.log(err.message);
                    }
                }
            } else {
                throw new Error("failed to match line " + i + "of the diagram");
            }
        }
    }
    fragment.boardHeight = row;
    fragment.moves.sort(function (x,y) {return x.movenumber - y.movenumber;});
}

// Get stones, markers and moves contained in the next line of the
// diagram and add them to our fragment
Diagram.parseLine = function (match, row, fragment) {
    var column = 0;

    match = match.replace(/ /g, '');
    for (var j = 0, nextChar; nextChar = match.charAt(j); j++) {
        if (nextChar in symbols) {
            column++;

            var stone = symbols[nextChar][0];
            if (stone !== EMPTY) {
                fragment.stones[column + ',' + row] = stone;
                fragment.numberStones++;
            }

            var marker = symbols[nextChar][1];
            if (marker !== EMPTY) {
                fragment.markers[column + ',' + row] = marker;
            }

            else if (nextChar in numbers) {
                var number = numbers[nextChar];
                // some diagrams contain the same move several times
                // should probably create one fragment per repetition
                if (_.pluck(fragment.moves, "movenumber").indexOf(number) !== -1) {
                    throw new Error("diagram with repeated numbers");
                } else {
                    fragment.moves.push({
                        'movenumber' : number,
                        'point' : column + ',' + row
                    });
                }
            }
        } else {
            throw new Error("can't recognize a character (" + nextChar + ")");
        }
    }

    if (!fragment.boardWidth) {
        fragment.boardWidth = column;
    } else {
        if (fragment.boardWidth !== column && !Diagram.isBorderLine(match)) {
            throw new Error ("boardWidth doesn't match the linewidth");
        }
    }
};

// if specified, get presence of coordinates, first move number and
// first player from diagram
Diagram.parseTitleLine = function (titleLine, fragment) {

    var titleParts = Diagram.titleLinePattern.exec(titleLine);
    fragment.firstPlayer = BLACK;
    if (titleParts) {
        if (titleParts[1]) {
            if (titleParts[1].toUpperCase() === 'W') {
                fragment.firstPlayer = WHITE;
            }
        }

        if (titleParts[2]) {
            fragment.hasCoordinates = true;
        }
        if (titleParts[3]) {
            fragment.firstMoveNumber = titleParts[3];
        }
    }
};

if (typeof exports !== 'undefined') {
    exports.Diagram = Diagram;
}