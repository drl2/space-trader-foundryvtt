import { FREIGHTPRICES, FREIGHTROLLS, PASSENGERROLLS } from './trade-goods.js';

export function log(force, ...args) {
    const shouldLog = force || game.modules.get('_dev-mode')?.api?.getPackageDebugValue(this.ID);

    if (shouldLog) {
        console.log(this.ID, '|', ...args);
    }
}


export function registerSettings(id) {
    game.settings.register(id, 'showGM', {
        name: `SPACE-TRADER.SETTINGS.ShowGM.Name`,
        hint: `SPACE-TRADER.SETTINGS.ShowGM.Hint`,
        default: `showDetails`,
        type: String,
        scope: "world",
        config: true,
        choices: {
            "resultsOnly": `SPACE-TRADER.ResultsOnly`,
            "showRolls": `SPACE-TRADER.ShowRolls`,
            "showDetails": `SPACE-TRADER.ShowDetails`
        }
    })

    game.settings.register(id, 'showPlayers', {
        name: `SPACE-TRADER.SETTINGS.ShowPlayers.Name`,
        hint: `SPACE-TRADER.SETTINGS.ShowPlayers.Hint`,
        default: `resultsOnly`,
        type: String,
        scope: "world",
        config: true,
        choices: {
            "showNothing": `SPACE-TRADER.ShowNothing`,
            "resultsOnly": `SPACE-TRADER.ResultsOnly`,
            "showRolls": `SPACE-TRADER.ShowRolls`,
            "showDetails": `SPACE-TRADER.ShowDetails`
        }
    })

    game.settings.register(id, 'show3dDice', {
        name: `SPACE-TRADER.SETTINGS.Show3dDice.Name`,
        hint: `SPACE-TRADER.SETTINGS.Show3dDice.Hint`,
        default: true,
        type: Boolean,
        scope: "world",
        config: true
    })

    game.settings.register(id, 'addPassengersToNotes', {
        name: `SPACE-TRADER.SETTINGS.PassengersToNotes.Name`,
        hint: `SPACE-TRADER.SETTINGS.PassengersToNotes.Hint`,
        default: true,
        type: Boolean,
        scope: "world",
        config: true
    })

    game.settings.register(id, 'allocatePassengerCargo', {
        name: `SPACE-TRADER.SETTINGS.PassengerCargo.Name`,
        hint: `SPACE-TRADER.SETTINGS.PassengerCargo.Hint`,
        default: true,
        type: Boolean,
        scope: "world",
        config: true
    })
}

export function getPopDMPassenger(population) {
    let dm = 0;

    if (population <= 1) { dm = -4; }
    else if (population == 6 || population == 7) { dm = 1; }
    else if (population >= 8) { dm = 3; }

    return dm;
}

export function getTravelCodeDMPassenger(code) {
    let dm = 0;

    if (code == "1") { dm = 1; }
    else if (code == "2") { dm = -4; }

    return dm;
}

export function getPopDMFreight(population) {
    let dm = 0;

    if (population <= 1) { dm = -4; }
    else if (population == 6 || population == 7) { dm = 2; }
    else if (population >= 8) { dm = 4; }

    return dm;
}

export function getTravelCodeDMFreight(code) {
    let dm = 0;

    if (code == "1") { dm = -2; }
    else if (code == "2") { dm = -6; }

    return dm;
}

export function getTechLevelDMFreight(tl) {
    let dm = 0;

    if (tl <= 6) { dm = -1; }
    else if (tl >= 9) { dm = 2; }

    return dm;
}

export function getFreightDMMail(freightDm) {
    let dm = 0;

    if (freightDm <= -10) { dm = -2; }
    else if (freightDm <= -5) { dm = -1; }
    else if (freightDm <= 4) { dm = 0; }
    else if (freightDm <= 9) { dm = 1; }
    else if (freightDm >= 10) { dm = 2; }
    return dm;
}

export function getStarportDM(starport) {
    let dm = 0;

    if (starport == "A") { dm = 2; }
    else if (starport == "B") { dm = 1; }
    else if (starport == "E") { dm = -1; }
    else if (starport == "X") { dm = -3; }

    return dm;
}

export function getStarportDMSpec(starport) {
    let dm = 0;

    if (starport == "A") { dm = 6; }
    else if (starport == "B") { dm = 4; }
    else if (starport == "C") { dm = 2; }

    return dm;
}


export function getDistanceDM(parsecs) {
    return 1 - parsecs;
}

export function getArmedDM(isArmed) {
    let dm = 0;
    if (isArmed) { dm = 2 }
    return dm;
}

export function getTechLevelDMMail(tl) {
    let dm = 0;

    if (tl <= 5) { dm = -4; }

    return dm;
}


export function getPassengerDice(roll) {
    if (roll > 20) { roll = 20 };
    if (roll < 1) { roll = 1 };

    const val = PASSENGERROLLS.filter(row => (row.minRoll <= roll && row.maxRoll >= roll));
    return val;
}

export function getFreightDice(roll) {
    if (roll > 20) { roll = 20 };
    if (roll < 1) { roll = 1 };

    const val = FREIGHTROLLS.filter(row => (row.minRoll <= roll && row.maxRoll >= roll));
    return val;
}

export function formatRollFormula(base, dms) {
    if (dms == 0) { return `${base}`; }
    else if (dms > 0) { return `${base}+${dms}`; }
    else { return `${base}${dms}`; }
}

export function getDmHtml(primary, secondary) {
    let html = "<table>"
    primary.forEach((dm) => html += `<tr><td>${dm.name}</td><td>${dm.value}</td></tr>`);
    secondary?.forEach((dm) => html += `<tr><td>${dm.name}</td><td>${dm.value}</td></tr>`);
    html += "</table>"

    return html;
}

export function getFreightPrices(parsecs) {
    if (parsecs > 0 && parsecs <= 6) {
        return FREIGHTPRICES.filter(row => (row.parsecs == parsecs))[0];
    }
}

export function hasChecked(list) {
    return list.filter(row => (row.checked == true)).length != 0;
}

export function getChecked(list) {
    return list.filter(row => (row.checked == true));
}

export function removeChecked(list) {
    return list.filter(row => (!row.checked));
}

export function getFreight(actor) {
    return actor.items.filter(item => (item.type == "component"
        && item.system.subtype === "cargo"
        && item.flags["space-trader"]?.isFreight));
}

export function getSpecBuyPopDM(pop) {
    let dm = 0;

    if (pop <= 3) { dm = -3; }
    if (pop >= 9) { dm = 3; }

    return dm;
}