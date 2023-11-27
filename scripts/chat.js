import { SpaceTrader } from './space-trader.js'

// toggle visibility of chat card sections based on user type and settings
export const toggleChatDetails = function (app, html, data) {
    let chatCard = html.find(".st-chatcard");

    if (chatCard.length > 0) {
        const showGM = game.settings.get(SpaceTrader.ID, 'showGM');
        const showPlayers = game.settings.get(SpaceTrader.ID, 'showPlayers');
        let dmDiv = html.find(".st-dms");
        let rollsDiv = html.find(".st-rolls")

        if (game.user.isGM) {
            if (showGM != "showDetails") { dmDiv.hide(); }
            if (showGM != "showDetails" && showGM != "showRolls") { rollsDiv.hide(); }
        } else {
            if (showPlayers != "showDetails") { dmDiv.hide(); }
            if (showPlayers != "showDetails" && showPlayers != "showRolls") { rollsDiv.hide(); }
        }
    }
}


