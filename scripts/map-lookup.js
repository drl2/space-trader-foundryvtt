export class MapLookup extends FormApplication {
    static ID = 'space-trader';
    static TEMPLATE = `modules/${this.ID}/templates/map-lookup.hbs`;
    static APIBASE = 'https://travellermap.com/api';
    static SEARCHAPI = 'search';
    static UWPAPI = 'credits';

    static async fetchSearchResults(query) {
        const url = `${MapLookup.APIBASE}/${MapLookup.SEARCHAPI}?q=${query}`;
        let resp = await fetch(url).catch(error => ui.notifications.warn(game.i18n.localize('SPACE-TRADER.ERRORS.MapConnectFail')));
        let worlds = await resp.json();
        if (worlds.Results.Count == 160) { ui.notifications.warn(game.i18n.localize('SPACE-TRADER.WARNINGS.NotAllFetched')); }
        return MapLookup.processSearchResults(worlds.Results);
    }

    static processSearchResults(worldList) {
        if (worldList && worldList.Count > 0) {
            const worlds = [];
            for (const i in worldList.Items) {
                const world = worldList.Items[i];
                if (world.hasOwnProperty("World")) {
                    worlds.push({ query: `sx=${world.World.SectorX}&sy=${world.World.SectorY}&hx=${world.World.HexX}&hy=${world.World.HexY}`, name: `${world.World.Name} - ${world.World.Sector}` })
                }
            }
            worlds.sort((a, b) => (a.name > b.name) ? 1 : -1);
            return (worlds);
        } else {
            ui.notifications.warn(game.i18n.localize('SPACE-TRADER.WARNINGS.NoWorldFound'));
            return;
        }
    }

    static async fetchWorldData(query) {
        const url = `${MapLookup.APIBASE}/${MapLookup.UWPAPI}?${query}`;
        let resp = await fetch(url);
        let world = await resp.json();
        return world;

    }

    static get defaultOptions() {
        const defaults = super.defaultOptions;

        const overrides = {
            height: 'auto',
            width: 300,
            id: 'world-lookup',
            template: this.TEMPLATE,
            closeOnSubmit: false,
            title: game.i18n.localize('SPACE-TRADER.WorldLookup')
        };
        const mergedOptions = foundry.utils.mergeObject(defaults, overrides);

        return mergedOptions;
    }


    constructor(traderApp, config, options) {
        super(options);
        this.query = '';
        this.worlds = [];
        this.selectedWorld = "";
        this.traderApp = traderApp;
        this.config = config;
    }

    async getData() {
        return {
            worlds: this.worlds,
            query: this.query,
            selectedWorld: this.selectedWorld
        }
    }


    async _updateObject(event, formData) {
        const data = foundry.utils.expandObject(formData);
        this.query = data.query;
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.on('click', ".search-button", this._handleSearchClick.bind(this));
        html.on('change', ".world-select", this._handleWorldSelect.bind(this));
        html.on('dblclick', ".world-select", this._handleWorldDoubleClick.bind(this));
        html.on('click', ".select-button", this._handleSelectClick.bind(this));
    }

    async _handleSearchClick(event) {
        // why are all these not working?
        // console.warn(event);
        // const element = event.target;
        // console.warn(element);
        // const q = event.target.closest(".query");
        // console.warn(q);
        //
        this.selectedWorld = "";
        if (event.currentTarget.previousElementSibling.value) {
            this.worlds = await MapLookup.fetchSearchResults(event.currentTarget.previousElementSibling.value ?? "");
            if (this.worlds) { this.render(true); }
        } else {
            ui.notifications.warn(game.i18n.localize('SPACE-TRADER.ERRORS.MissingQuery'));
        }
    }

    async _handleWorldSelect(event) {
        this.selectedWorld = event.target.value;
        event.delegateTarget[3].disabled = false;
    }

    async _handleWorldDoubleClick(event) {
        const world = await MapLookup.fetchWorldData(this.selectedWorld);
        this.updateTraderWindow(world);
    }

    async _handleSelectClick(event) {
        const world = await MapLookup.fetchWorldData(this.selectedWorld);
        this.updateTraderWindow(world);
    }

    updateTraderWindow(world) {
        this.config.uwp = world.WorldUwp;
        const codes = world.WorldRemarks;

        if (codes.includes("Fo")) {
            this.config.travelCode = 2; // "Fo" = Forbidden, Red zone
        } else if (codes.includes("Da")) {
            this.config.travelCode = 1; // "Da" = Danger, Amber zone
        } else {
            this.config.travelCode = 0;
        }

        Object.keys(this.config.tradeCodes).forEach(key => {
            this.config.tradeCodes[key] = codes.includes(key);
        })

        
        this.traderApp.render(true);
        this.close();
    }
}