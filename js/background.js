/**
 * URLS of data to download
 */
var URL_POKEDEX = "https://pokemondb.net/pokedex/all";
var URL_ARTWORK = "https://img.pokemondb.net/artwork/";

/**
 * Icons
 *
 */
var ICON_NORMAL = "img/icon-128.png";
var ICON_DISABLED = "img/icon-128-disabled.png";
var ICON_ALERT = "img/icon-128-alert.png";

var dataLoading = false;

var pokedexData = {}; //The pokedex data. Not an array, but an object.
var countData = {};   //The pokemon and their count data
var selectedPokemon = "001"; //The currently selected pokemon

var disabled = false; //The state of the extension
var alert = false;    //Alert means the user has to do something

var icon;
var iconImg = new Image();
var spinning = false; //Wee woo wee woo

var installing = false;

var countCallback;

var syncTimer; //A timeout function to sync count data. Used to prevent sync/async issues.

$(document).ready(function() {
    //Load the image onto the canvas. Allows us to spin it.
    icon = document.getElementById("icon").getContext("2d");

    chrome.storage.local.get("pokedex", function(data) {
        if (typeof data.pokedex !== 'undefined') {
            pokedexData = data.pokedex;
            checkForUpdates();
        } else { //Download the data and store it in local storage
            alert = true;

            installing = true;
            updateIcon(); //Show that we are doing something
            startDataDownload(function() {
                alert = false;
                installing = false;
                updateIcon();
            });
        }
    });

    iconImg.onload = function() {
        document.getElementById("icon").width = iconImg.width;
        document.getElementById("icon").height = iconImg.height;
        icon.drawImage(iconImg, 0, 0);
        icon.save();
    };
    iconImg.src = "img/icon-128.png";
});

/**
 * Checks the pokedex for updates
 */
function checkForUpdates() {
    $.ajax({
        url: URL_POKEDEX,
        success: function(data) {
            var table = $(data).find("#pokedex").children("tbody")[0];
            $(table).children("tr").last().each(function(o) {
                var number = $($($(this).children("td")).get(0)).text().trim();
                if (isNaN(parseFloat(number))) {
                    return;
                }
                var keys = Object.keys(pokedexData);
                keys.sort((a, b) => a - b);
                var lastKey = keys[keys.length - 1];
                console.log(lastKey)
                var lastIdInDex = parseFloat(pokedexData[lastKey].id);

                if (number > lastIdInDex) { //Dex needs updating
                    alert = true;

                    installing = true;
                    updateIcon(); //Show that we are doing something
                    startDataDownload(function() {
                        alert = false;
                        installing = false;
                        updateIcon();
                    });
                }
            });
        }
    });
}




/**
 * Updates the icon used
 */
function updateIcon() {
    iconImg.src = disabled ? ICON_DISABLED : (alert ? ICON_ALERT : ICON_NORMAL);
}

function startDataDownload(callback) {
    if (!callback) callback = function() {};
    dataLoading = true;
	$.ajax({
        url: URL_POKEDEX,
        success: function(data) {
            var table = $(data).find("#pokedex").children("tbody")[0];
            $(table).children("tr").each(function(row) {
                var hasForm = $($($(this).children("td")).get(1)).children("small.aside").size() > 0;


                var name = $($($(this).children("td")).get(1)).children("a.ent-name").text();
                var number = $($($(this).children("td")).get(0)).text().trim();
                var types = [];
                $($($(this).children("td")).get(2)).children("a.type-icon").each(function(o) { //Go through each type element
                    types.push(this.innerHTML); //The text within that <a> that's the type
                });
                var artName = "";

                //Patches for a few pokemon that have slightly different URLs when they don't have a form tag
                if (name == "Rotom") {
                    artName = "rotom-normal";
                } else if (name == "Kyurem") {
                    artName = "kyurem-normal";
                }

                if (hasForm) { //We aren't doing forms right now
                    var form = $($($(this).children("td")).get(1)).children("small.aside").text();
                    if (form.toLowerCase().indexOf("mega") <= -1 && form.toLowerCase().indexOf("primal") <= -1) { //Ignore mega pokemon

                        form = form.replace(name, "").trim(); //Replace "Alolan x" with just "Alolan"
                        var formNo = "01";
                        while (typeof pokedexData[number + "." + formNo] !== 'undefined') {
                            formNo = (parseInt(formNo) + 1) + ""; //Add 1 to the form being checked
                            formNo = formNo < 10 ? "0" + formNo : formNo; //Add 0 if it's less than 10
                        }
                        number = number + "." + formNo;

                        if (form.toLowerCase() == "ash-") { //Ash Greninja patch
                            form = "Ash";
                        }

                        //Patch the URLs for words that are excess aren't aren't used in the URLS.
                        //Cloak for wormadam, Size for Pumpkaboo, % for Zygarde, etc
                        artName = (name.toLowerCase() + "-") + form.toLowerCase().replace("forme", "").replace("cloak", "")
                            .replace("size", "").replace("%", "").replace("form", "").replace("mode", "").replace("style", "").trim();
                        artName = artName.replace(":", "").replace(" ", "-");
                        name = name + " (" + form + ")";
                    }
                }
                var pokemonObject = { //Form the object
                    name: name,
                    id: number,
                    types: types
                };
                if (artName != "") {
                    pokemonObject.artName = artName;
                }
                pokedexData[number] = pokemonObject;

                    // //Just if we need it in future

            });

            /*var fileData = JSON.stringify(pokedexData);
            var blob = new Blob([fileData], {type: "text/plain"});

            var url = URL.createObjectURL(blob);
            console.log("Download URL: " + chrome.runtime.getURL("data/pokedex.json"));
            chrome.downloads.download({ //Save the data to disk
                url: url,
                filename: "data/pokedex.json"
            });*/
            chrome.storage.local.set({
                "pokedex": pokedexData
            });
            dataFound = true;
            dataLoading = false;

            callback();
        }
    });
}

var downloadingArtwork = false;

function getSelectFormData() {
    var array = [];
    var keys = Object.keys(pokedexData);
    keys.sort((a, b) => a - b);
    for (var i = 0; i < keys.length; i++) {
        var pokemon = pokedexData[keys[i]];
        var artUrl = URL_ARTWORK + (pokemon.name.replace(" ", "-").replace(":", "")
            .replace("\u2640", "-f") .replace("\u2642", "-m").toLowerCase()) + ".jpg";

        if (typeof pokemon.artName !== 'undefined') {
            artUrl = URL_ARTWORK + pokemon.artName + ".jpg";
        }
        if (new Date().getDate() == 1 && new Date().getMonth() == 3) {
            artUrl = URL_ARTWORK + ((Math.floor(Math.random() * 14) == i % 14 && i % 3 == 0) ? "bibarel.jpg" : "bidoof.jpg"); //get pranked haha
        }

        var type = pokemon.types.toString().replace(",", " ").toLowerCase();

        var element = "<option value=\"" + pokemon.id + "\" artwork=\"" + artUrl + "\" class='pokemon' "
            + (selectedPokemon == pokemon.id ? "selected" : "") + " type='" + type + "'>" + pokemon.name + "</option>\r\n";
        array.push(element);
    }

    return array;
}

function getCount(pokemonID) {
    if (typeof countData[pokemonID] === 'undefined' || typeof countData[pokemonID].count === 'undefined') {
        return {count:0, totalCount: 0, start: new Date().getTime()};
    }

    return countData[pokemonID];
}

function addCount(amount = 1) {
    if (typeof countData[selectedPokemon] === 'undefined') {
        countData[selectedPokemon] = {
            totalCount: amount,
            count: amount,
            start: new Date().getTime(),
            resets: []
        };
    } else {
        var c = countData[selectedPokemon].count + amount;
        if (c < 0) c = 0;

        var c2 = countData[selectedPokemon].totalCount + amount;
        if (c2 < 0) c2 = 0;

        countData[selectedPokemon].count = c;
        countData[selectedPokemon].totalCount = c2;
    }

    if (typeof countCallback !== 'undefined' && countCallback != null) {
        countCallback(countData[selectedPokemon]);
    }

    syncCountData(); //Instead of just calling the async method to set the data, we
                     //call this function to prevent sync/async issues.
}

function removeCount() {
    if (typeof countData[selectedPokemon] !== 'undefined') {
        countData[selectedPokemon].count--;
        countData[selectedPokemon].totalCount--;
    }

    if (typeof countCallback !== 'undefined' && countCallback != null) {
        countCallback(countData[selectedPokemon]);
    }

    syncCountData(); //Instead of just calling the async method to set the data, we
                     //call this function to prevent sync/async issues.
}

/**
 *
 */
function syncCountData() {
    if (typeof syncTimer !== 'undefined' && syncTimer != null) {
        clearTimeout(syncTimer);
    }
    syncTimer = setTimeout(function() {
        chrome.storage.sync.set({
            "pokemon": countData
        });
        syncTimer = null;
    }, 1000);
}

function setCurrentlySelected(pokemonID) {
    if (typeof pokedexData[pokemonID] !== 'undefined') {
        selectedPokemon = pokemonID;

        chrome.storage.sync.set({
            "selected": pokemonID
        });
    }
}

/*function downloadPendingArtwork() {
    if (pendingArtwork.length <= 0) return; //No more pending things to download

    var name = pendingArtwork[i];
    var url = URL_ARTWORK + name + ".jpg";

    var image = new Image();

    image.onload = function() {
        var width = image.width;
        var height = image.height;

        var maxSize = 256;

        var scale = width > height ? width : height;
        scale /= maxSize;

        var newWidth = Math.round(width / scale);
        var newHeight = Math.round(height / scale);

        var canvas = document.createElement('canvas'); //Add it to the document
        document.body.appendChild(canvas);
        canvas.width  = newWidth;
        canvas.height = newHeight;
        var ctx = canvas.getContext("2d");

        ctx.drawImage(image, 0, 0, width, height, 0, 0, newWidth, newHeight);

        canvas.toBlob(function(blob){
            chrome.downloads.download({ //Save the data to disk
                url: URL.createObjectURL(blob),
                filename: "data/img/" + name + ".jpg"
            });

            document.body.removeChild(canvas); //Remove it again

        }, 'image/jpeg', 1.0);
    };
    image.src = url;
}*/

function readStorage() {
    var pokemon = [];

    chrome.storage.sync.get(pokemon, function(result) {
        for (var i = 0; i < pokemon.length; i++) {
            var name = pokemon[i];

            //Read result and if above 0, store it
        }
    });

}

/**
 * Test whether a file exists or not
 * @param fileName The name of the file
 * @returns {boolean} True if the file is found
 */
function chromeFileExists(fileName) // in extension package
{
    var xmlhttp = new window.XMLHttpRequest();
    try {
        xmlhttp.open("GET", chrome.runtime.getURL(fileName), false);
        xmlhttp.onreadystatechange=function() {
            xmlhttp.abort();
        }
        xmlhttp.send(null);
    }
    catch(ex) {
        return false;
    }
    return true;
}

function debug(string) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "img/icon-256.png",
        title: "Debug",
        message: string,
    });
}

function spinIcon() {
    if (disabled || spinning) return;

    spinning = true;
    var rollTime = 1000;
    var slides = 50;
    updateIcon();

    for (var i = 1; i <= slides; i += 1) {
        const j = i; //Important that we have a constant, or by the time the thing fires, i is always = to slides
        setTimeout(function() {
            icon.save();
            icon.clearRect(0,0,icon.canvas.width,icon.canvas.height);
            icon.translate(icon.canvas.width/2,icon.canvas.height/2);
            icon.rotate((360 / slides * -j) * Math.PI / 180);
            icon.drawImage(iconImg,-iconImg.width/2,-iconImg.width/2);
            icon.restore();
            chrome.browserAction.setIcon({
                imageData: icon.getImageData(0, 0, iconImg.width, iconImg.height)
            });
        }, (rollTime / slides) * i);
    }
    setTimeout(function() {
        updateIcon(); //Set back to normal
        spinning = false;
    }, (rollTime / slides) + rollTime);

}

function playCountSound() {
    var notification = new Audio("sparkle.mp3");
    notification.volume /= 4;
    notification.play();
}

function countCurrent() {
    playCountSound();
    spinIcon();
    addCount();
}

function extra() {
    if (new Date().getDate() == 1 && new Date().getMonth() == 3) {
        return "<style>body {font-family: \"Comic Sans MS\" !important;}</style>";
    }

    return "";
}

function setCountCallback(callback) {
    countCallback = callback;
}

chrome.runtime.onInstalled.addListener(function(a) {
    if (a.reason === "install") {

    }
});

function isInstalling() {
    return installing;
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.pkmnshiny_count) {
	    countCurrent();

		if (!sent) {
		    sendResponse({pkthemeno: -1});
		}
	}
});

chrome.commands.onCommand.addListener(function (command) {
    if (command == "pkmn-shiny-count") {
        countCurrent();
    }
});


chrome.storage.sync.get("pokemon", function(result) {
    if (typeof result.pokemon !== 'undefined') {
        countData = result.pokemon;
    }
});

chrome.storage.sync.get("selected", function(result) {
    if (typeof result.selected !== 'undefined') {
        selectedPokemon = result.selected;
    }
});

loaded = true;
