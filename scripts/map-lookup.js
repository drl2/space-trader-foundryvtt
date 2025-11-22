export class MapLookup extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    static ID = 'world-lookup';
    static TEMPLATE = `modules/space-trader/templates/map-lookup.hbs`;
    static APIBASE = 'https://travellermap.com/api';
    static SEARCHAPI = 'search';
    static UWPAPI = 'credits';

    static DEFAULT_OPTIONS = {
        id: "world-lookup",
        tag: "form",
        window: {
            title: "SPACE-TRADER.WorldLookup",
            resizable: true
        },
        position: {
            width: 300,
            height: "auto"
        },
        form: {
            submitOnChange: true,
            closeOnSubmit: false
        },
        actions: {
            search: this.#onSearchClick,
            select: this.#onSelectClick
        }
    };

    static PARTS = {
        form: {
            template: "modules/space-trader/templates/map-lookup.hbs"
        }
    };

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

    constructor(traderApp, config, options = {}) {
        super(options);
        this.query = '';
        this.worlds = [];
        this.selectedWorld = "";
        this.traderApp = traderApp;
        this.config = config;
    }

    async _prepareContext(options) {
        return {
            worlds: this.worlds,
            query: this.query,
            selectedWorld: this.selectedWorld
        }
    }

    async _onSubmit(formData) {
        const data = foundry.utils.expandObject(formData);
        this.query = data.query;
    }

    _attachPartListeners(partId, htmlElement, options) {
        // Set up change listener for world select dropdown (non-action events)
        const worldSelect = htmlElement.querySelector('.world-select');
        if (worldSelect) {
            worldSelect.addEventListener('change', (event) => {
                this.selectedWorld = event.target.value;
                const selectButton = htmlElement.querySelector('[data-action="select"]');
                if (selectButton) selectButton.disabled = false;
            });

            worldSelect.addEventListener('dblclick', async (event) => {
                const world = await MapLookup.fetchWorldData(this.selectedWorld);
                this.updateTraderWindow(world);
            });
        }
    }

    // Static private action handlers
    static #onSearchClick(event, target) {
        this._handleSearchClick(event);
    }

    static #onSelectClick(event, target) {
        this._handleSelectClick(event);
    }

    async _handleSearchClick(event) {
        this.selectedWorld = "";
        const queryInput = this.element.querySelector('input[name="query"]');
        if (queryInput && queryInput.value) {
            this.worlds = await MapLookup.fetchSearchResults(queryInput.value);
            if (this.worlds) { this.render(true); }
        } else {
            ui.notifications.warn(game.i18n.localize('SPACE-TRADER.ERRORS.MissingQuery'));
        }
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

        
        console.warn(world);
        this.traderApp.render(true);
        this.close();
    }
}