// A script to scrape the ascii text for diagrams from an L19 thread.
// It's designed to be usable from either a browser or from
// NodeJS.

if (typeof exports !== 'undefined') {
    var _ = require('underscore');
}

// once these error limits are reached, cease trying

// for all urls together
var TOTAL_ERROR_LIMIT = 2;
// for a single error
var URL_ERROR_LIMIT = 2;

// target is the document for the page we already have open
function getL19Thread (target, requestMethod, callback) {
    var stack = new Stack(requestMethod, callback);
    stack.handle(target, target.URL);
}

function Stack(requestMethod, callback) {
    this.requestMethod = requestMethod;
    this.callback = callback;   // called when all pages have been
    // scraped

    this.used = {};             // already scraped
    this.pending = [];          // unscraped
    this.inProgress = {};       // ongoing requests
    this.diagrams = [];

    this.totalErrors = 0;
    this.urlErrors = {};
}

Stack.prototype.handle = function (result, url) {
    console.log("handling " + url);
    this.extract(result);
    this.handledURL(url);
    this.dispatch();
};

Stack.prototype.onError = function (url) {
    this.totalErrors++;
    if (this.urlErrors[url]) {
        this.urlErrors[url]++;
    } else {
        this.urlErrors[url] = 1;
    }
    this.handleError(url);
}

Stack.prototype.handleError = function (url) {
    if (this.urlErrors[url] >= URL_ERROR_LIMIT) {
        throw new Error("This script is aborting.\n" +
                        "url: " + url + " cannot be retrieved after " +
                        URL_ERROR_LIMIT + " tries.");
    } else if (this.totalErrors >= TOTAL_ERROR_LIMIT) {
        throw new Error("This script is aborting after " + TOTAL_ERROR_LIMIT +
                        " errors retrieving pages.");
    } else {
        this.pending.push(url);
        this.dispatch();
    }
};

Stack.prototype.extract = function (target) {
    this.diagrams.push.apply(this.diagrams, extractL19Diagrams(target));
    this.addURLs(getL19ThreadURLs(target));
};

Stack.prototype.addURLs = function (linkList) {
    for (var i = 0, ilen = linkList.length; i < ilen; i++) {
        if (!(linkList[i] in this.used)) {
            this.pending.push(linkList[i]);
        }
    }
};

Stack.prototype.dispatch = function () {
    if (this.pending.length > 0) {
        var targetURL = this.pending.pop();
        if (!(targetURL in this.used || targetURL in this.inProgress)) {
            // superfluous so long as we don't do multiple simultaneous
            // requests
            this.inProgress[targetURL] = 1;
            console.log("requesting " + targetURL);
            this.requestMethod(targetURL, this);
        } else {
            this.dispatch();
        }
    } else {
        if (this.waiting()) {
            return;
            // nothing is on the stack, but a request is still pending
        } else {
            this.callback(this.diagrams);
        }
    }
};

Stack.prototype.waiting = function () {
    if (_.size(this.inProgress) > 0) {
        return true;
    }
    return false;
};

Stack.prototype.handledURL = function (url) {
    this.used[url] = 1;
    delete this.inProgress[url];
};


// These are functions to get data from a loaded page
function getL19ThreadURLs (page) {
    var links = page.getElementsByTagName('a');

    // window will be defined in the browser, but not in Node
    if (typeof window !== 'undefined') {
        console.log(window.location.href); // needs comment
        var threadOrigin = window.location.href.match(pageURL)[1];
    } else {
        threadOrigin = page.location.href.match(pageURL)[1];
    }

    links = _.filter(links, function (link) {
        return link.href.indexOf(threadOrigin) !== -1; });
    return _uniq(_.map(links, canonURL));
}

// &sid=hexadecimal portion of the URL appears when not logged in
var pageURL = /(lifein19x19\.com\/forum\/viewtopic\.php\?f\=\d+\&t\=\d+)(?:\&sid\=[0-9a-f]*)?(\&start\=(\d+))?/;

function canonURL (link) {
    var match = link.href.match(pageURL);
    if (match) {
        if (match[3] === '0') {
            // if the URL contains "start=0", we have a duplicate for
            // the thread's origin, so use that URL
            var url = match[1];
        } else if (match[2]) {
            // if we saw "&start=x" and x is not 0, include it in the
            // URL
            url = match[1] + match[2];
        } else {
            url = match[1];
        }
    }
    return "http://" + url;
}

function extractL19Diagrams (node) {
    // returns strings that may be diagrams from an L19 page
    return _.map(node.getElementsByClassName('codebox'), extractDiagram);
}

function extractDiagram (node) {
    var container = node.getElementsByTagName('code');
    var result = joinDataNodes(container[0].childNodes, '\n');
    // strip [go] and [\go] tags
    return result.replace(/\[\/?go\]/g, "");
}

function joinDataNodes (nodes, separator) {
    var results = _.filter(nodes, function (node) { return node.data; });
    return results.join(separator);
}

// The remaining functions are for the browser extension
function insertResponseText (page) {
    var div = document.createElement("div");
    div.innerHTML = page;
    return div;
}

function XHR (targetURL, stack) {
    var request = new XMLHttpRequest();
    request.open('GET', targetURL);
    request.onreadystatechange = function () {
        if (request.readyState === 4) {
            stack.handle(insertResponseText(request.responseText), targetURL);
        }
    };
    request.send(null);
}

// Add "Extract Diagrams" as link to the menubar, before FAQ
function addExtractionLink (callback) {

    // link creation
    var extractionLink = document.createElement('a');
    extractionLink.href = "";
    extractionLink.innerHTML = "Extract Diagrams";
    extractionLink.setAttribute("style", "margin-right: 1em", false);

    extractionLink.onclick = function () {
        getL19Thread(document, XHR, callback, insertResponseText);
        return false; };

    // placement in page
    var menubar = document.getElementById("menubar");
    var menubarRight = menubar.getElementsByClassName('genmed')[1];
    menubarRight.insertBefore(extractionLink,
                              menubarRight.getElementsByTagName('a')[0]);
}

if (this.XMLHttpRequest && window.location.href.match(pageURL)) {
    addExtractionLink(function (diagrams) { makeSGF(makeSet(diagrams)); } );
}

if (typeof exports !== 'undefined') {
    exports.getL19Thread = getL19Thread;
}