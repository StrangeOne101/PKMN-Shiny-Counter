var installing = false;

function checkInstalling() {
    if (chrome.extension.getBackgroundPage().isInstalling()) {
        setTimeout(checkInstalling(), 1000);
        installing = true;
        document.getElementsByTagName("body")[0].innerHTML = "<h3>Please wait a moment until installation is done...</h3>"
        return false;
    } else if (installing) {
        document.location = document.location;
    }
    return true;
}


$(document).ready(function() {

    if (checkInstalling()) {
        var data = chrome.extension.getBackgroundPage().getSelectFormData();
        $("#pokemon-list").html(data);

        $("#pokemon-list").change(function() {
            chrome.extension.getBackgroundPage().setCurrentlySelected($("#pokemon-list")[0].value); //Update selected pokemon
            updatePokemon();
            updatePokemonNumbers(chrome.extension.getBackgroundPage().getCount($("#pokemon-list")[0].value));
        });
        updatePokemon(); //Give it a base image
        updatePokemonNumbers(chrome.extension.getBackgroundPage().getCount($("#pokemon-list")[0].value));
    }

    if (chrome.extension.getBackgroundPage().extra() != "") {
        $("head").html($("head").html() + chrome.extension.getBackgroundPage().extra());
    }

    $("#counter").click(function(e) {
        chrome.extension.getBackgroundPage().countCurrent(); //Add 1 to the counter
        updatePokemon(); //Update counter
        updatePokemonNumbers(chrome.extension.getBackgroundPage().getCount($("#pokemon-list")[0].value));
    });

    $("#undo").click(function(e) {
        chrome.extension.getBackgroundPage().removeCount();
        updatePokemonNumbers(chrome.extension.getBackgroundPage().getCount($("#pokemon-list")[0].value));
    });

    $("#set").click(function(e) {
        var currentCount = chrome.extension.getBackgroundPage().getCount($("#pokemon-list")[0].value).count;
        var element = $(".pokemon[value='" + $("#pokemon-list")[0].value + "']");

        var p = prompt("Set the amount of " + element.text() + " in the current session", currentCount);
        if (p == null) return;

        var count = parseInt(p);
        var newCount = count - currentCount;

        if (currentCount - newCount < 0) newCount = -currentCount;

        chrome.extension.getBackgroundPage().addCount(newCount);
        updatePokemonNumbers(chrome.extension.getBackgroundPage().getCount($("#pokemon-list")[0].value));

    });

    $("#pokemon-artwork, #pokemon-name").click(function(e) {
        var baseURL = "https://bulbapedia.bulbagarden.net/wiki/" + $("#pokemon-name").text() + "_(Pok%C3%A9mon)";

        window.open(baseURL);
    });


    /*$(".white-button").hover(function() { //Doesn't work as of yet
        $(this).stop().animate({
            padding: '4px'
        }, 300);
    }, function() {
        $(this).stop().animate({
            padding: '0px'
        }, 300);
    });*/

    chrome.extension.getBackgroundPage().setCountCallback(function(data) {
        updatePokemon();
        updatePokemonNumbers(data);
    });
});

function updateTime(time) {
    var diff = new Date().getTime() - time;
    var mins = diff / 1000 / 60;
    var hours = mins / 60;
    var days = hours / 24;
    var months = days / 365.25 * 12;
    var years = days / 365.25;

    var toEnglish = "";

    if (years >= 1) {
        toEnglish = Math.floor(years) + " year" + s(Math.floor(years)) + " ago";
    } else if (months >= 1) {
        toEnglish = Math.floor(months) + " month" + s(Math.floor(months)) + " ago";
    } else if (days >= 1) {
        toEnglish = Math.floor(days) + " day" + s(Math.floor(days)) + " ago";
    } else if (hours >= 1) {
        toEnglish = Math.floor(hours) + " hour" + s(Math.floor(hours)) + " ago";
    } else if (mins > 0) {
        toEnglish = Math.floor(mins) + " minute" + s(Math.floor(mins)) + " ago";
    } else {
        toEnglish = "Not yet";
    }

    $("#date-start").text(toEnglish);
}

function s(int) {
    return s == 1 ? "" : "s";
}

function updatePokemon() {
    var id = $("#pokemon-list")[0].value;

    if (!chrome.extension) { //The popup is closed
        return;
    } else {
        new Error("");
    }

    var element = $(".pokemon[value='" + id + "']");
    $("#pokemon-artwork-img").attr("src", element.attr("artwork"));
    var name = element.text().split("(")[0].trim(); //Everything left of the bracket (exclude the form)

    //** FORMS ARE DISABLED FOR NOW, AS THE TITLE LOOKS BETTER WITHOUT THEM **
    //var form = element.text().indexOf("(") > -1 ? element.text().split("(")[1].split(")")[1].trim() : ""; //Everything in the brackets, if it has them
    $("#pokemon-name").text(name);
    //$("#pokemon-form").text(form)
    var types = element.attr("type").split(" ");
    var typeElements = "";
    for (var i in types) {
        typeElements = typeElements + "<div class='type " + types[i] + "'>" + types[i].toUpperCase() + "</div>";
    }
    $("#pokemon-types").html(typeElements);
}

function updatePokemonNumbers(data) {
    $("#counter").text(data.count);
    $("#count-total").text(data.totalCount);
    if (data.count > 0) {
      $("#undo").removeAttr("disabled");
    }
    updateTime(data.start);
}
