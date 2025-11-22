import { SpaceTrader } from './space-trader.js'

// toggle visibility of chat card sections based on user type and settings
export const toggleChatDetails = function (app, html, data) {
    // Convert jQuery object to DOM element if necessary
    const htmlElement = html instanceof HTMLElement ? html : html[0] || html.get?.(0);
    
    if (!htmlElement) return;
    
    let chatCard = htmlElement.querySelectorAll(".st-chatcard");

    if (chatCard?.length > 0) {
        const showGM = game.settings.get(SpaceTrader.ID, 'showGM');
        const showPlayers = game.settings.get(SpaceTrader.ID, 'showPlayers');
        let dmDiv = htmlElement.querySelector(".st-dms");
        let rollsDiv = htmlElement.querySelector(".st-rolls")

        if (game.user.isGM) {
            if (showGM != "showDetails") { dmDiv.style.display = 'none'; }
            if (showGM != "showDetails" && showGM != "showRolls") { rollsDiv.style.display = 'none'; }
        } else {
            if (showPlayers != "showDetails") { dmDiv.style.display = 'none'; }
            if (showPlayers != "showDetails" && showPlayers != "showRolls") { rollsDiv.style.display = 'none'; }
        }
    }
}


