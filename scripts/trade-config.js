export class TradeConfig {
    
    static parseUWP(uwp) {
        uwp = uwp.toUpperCase();
        const uwpRegex = /[ABCDEX][0-9A-DRS][0-9A-F][0-9A][0-9A-C][0-9A-F][0-9A-J]-[0-9A-X]/;
        if (uwpRegex.test(uwp)) {

            let size = uwp[1];
            if (size.match(/^(R|S|D)$/)) { size = "0"; } //treat R,D,S special cases as 0

            const worldStats = {
                starport: uwp[0],
                size: parseInt(size, 16),
                atmosphere: parseInt(uwp[2], 16),
                hydrosphere: parseInt(uwp[3], 16),
                population: parseInt(uwp[4], 16),
                government: parseInt(uwp[5], 16),
                lawlevel: parseInt(uwp[6], 32),
                techlevel: parseInt(uwp[8], 32)
            }
            return worldStats;
        } else {
            ui.notifications.error(game.i18n.localize('SPACE-TRADER.ERRORS.InvalidUWP'));
            return null;
        }
    }

    static getNew() {
        const newConfig = { 
            uwp: "",
            tradeCodes : {
                Ag: false,
                As: false,
                Ba: false,
                De: false,
                Fl: false,
                Ga: false,
                Hi: false,
                Ht: false,
                Ic: false,
                In: false,
                Lo: false,
                Na: false,
                Ni: false,
                Po: false,
                Ri: false,
                Va: false,
                Wa: false
            },
            travelCode: 0,
            supplierBrokerSkill: 2,
            travBrokerSkill: 0,
            travStewardSkill: 0,
            travRank: 0,
            isArmed: false,
            parsecs: 1,
            moneyTargetId: 0,
            highestSocDM: 0,
            destinationName: ""
        }
        return newConfig;
    }

}