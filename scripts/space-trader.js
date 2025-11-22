import { TRADECODES, ROLLTYPES } from './trade-goods.js';
import { TradeConfig } from './trade-config.js';
import { MapLookup } from './map-lookup.js';
import {
  registerSettings, getPopDMPassenger, getStarportDM, getTravelCodeDMPassenger,
  getDistanceDM, getPassengerDice, formatRollFormula, getDmHtml,
  getFreightPrices, hasChecked, getChecked, removeChecked, getPopDMFreight,
  getTravelCodeDMFreight, getTechLevelDMFreight, getFreightDice,
  getFreightDMMail, getArmedDM, getTechLevelDMMail, getFreight
} from './utility.js';
import * as Chat from './chat.js';
import { FreightSale } from './freight-sale.js';

Hooks.once('init', async function () {
  registerSettings(SpaceTrader.ID);
  await foundry.applications.handlebars.loadTemplates({
    settings: "/modules/space-trader/templates/parts/settings.hbs",
    passengers: "/modules/space-trader/templates/parts/passengers.hbs",
    freight: "/modules/space-trader/templates/parts/freight.hbs",
    specbuy: "/modules/space-trader/templates/parts/specbuy.hbs",
    specsell: "/modules/space-trader/templates/parts/specsell.hbs",
  });
});

Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(SpaceTrader.ID);
});

Hooks.on("renderChatMessageHTML", (app, html, data) => Chat.toggleChatDetails(app, html, data));

Hooks.on("renderTokenHUD", async (hud, html, token) => {
  const actor = game.actors.get(token.actorId);
  if (!(game.user.isGM && actor.type == "ship")) return;

  const button = document.createElement('div');
  button.className = 'control-icon';
  button.innerHTML = `<img src="icons/svg/coins.svg" width="36" height="36" title="${game.i18n.localize('SPACE-TRADER.TradingMenu')}"/>`;

  button.addEventListener('click', () => {
    showTradeWindow(actor);
  });

  // Convert jQuery object to DOM element if necessary
  const htmlElement = html instanceof HTMLElement ? html : html[0] || html.get?.(0);
  htmlElement.querySelector('div.right')?.appendChild(button);

})

// Use the correct Foundry hook for context menus
Hooks.on("getActorContextOptions", (html, entryOptions) => {
  entryOptions.push({
    name: "SPACE-TRADER.TradingMenu",
    icon: '<i class="fa fa-coins"></i>',
    condition: li => {
      const actorId = li.dataset.entryId || li.dataset.documentId || 
                      li.getAttribute('data-entry-id') || li.getAttribute('data-document-id');
      const actor = game.actors.get(actorId);
      return game.user.isGM && actor?.type === "ship";
    },
    callback: li => {
      const actorId = li.dataset.entryId || li.dataset.documentId || 
                      li.getAttribute('data-entry-id') || li.getAttribute('data-document-id');
      const actor = game.actors.get(actorId);
      showTradeWindow(actor);
    }
  });
});

Hooks.on("renderActorSheetV2", async (app, html) => {
  const actor = app.actor;
  if (!(game.user.isGM && actor.type == "ship")) return;

  const buttonContainer = document.createElement('span');
  buttonContainer.className = 'ship-stat centre';
  buttonContainer.innerHTML = `<button class="space-trader-cargo-button"><i class="fa fa-coins"></i> ${game.i18n.localize('SPACE-TRADER.TradingMenu')}</button>`;

  const button = buttonContainer.querySelector('.space-trader-cargo-button');
  button.addEventListener('click', () => {
    showTradeWindow(actor);
  });

  // Convert jQuery object to DOM element if necessary
  const htmlElement = html instanceof HTMLElement ? html : html[0] || html.get?.(0);
  const loc = htmlElement.querySelector(".cargo-weight");
  loc?.appendChild(buttonContainer);
})


function showTradeWindow(actor) {
  try {
    const tradeWindow = new SpaceTrader(actor, { title: `${actor.name}  ${game.i18n.localize('SPACE-TRADER.window-title')}` });
    tradeWindow.render(true);
  } catch (error) {
    console.error("SpaceTrader: Error creating trade window:", error);
    ui.notifications.error(`Trade window error: ${error.message}`);
  }
}


export class SpaceTrader extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

  static ID = 'space-trader';
  static TEMPLATES = {
    TRADEWINDOW: `modules/${this.ID}/templates/space-trader.hbs`,
    PASSENGERROLL: `modules/${this.ID}/templates/chatcards/passengerroll.hbs`,
    PASSENGERRESULTS: `modules/${this.ID}/templates/chatcards/passengerresults.hbs`,
    PASSENGERONBOARD: `modules/${this.ID}/templates/chatcards/passengeronboard.hbs`,
    FREIGHTROLL: `modules/${this.ID}/templates/chatcards/freightroll.hbs`,
    FREIGHTRESULTS: `modules/${this.ID}/templates/chatcards/freightresults.hbs`,
    FREIGHTLOAD: `modules/${this.ID}/templates/chatcards/freightload.hbs`,
  }
  static FLAGS = {
    CONFIG: 'config',
    ISFREIGHT: 'isFreight'
  }

  static DEFAULT_OPTIONS = {
    id: "space-trader",
    tag: "form",
    window: {
      title: "SPACE-TRADER.window-title",
      icon: "fa-solid fa-coins",
      resizable: true
    },
    position: {
      width: 800,
      height: "auto"
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    },
    actions: {
      search: this.#onSearchClick,
      passenger: this.#onPassengerClick,
      onboard: this.#onBoardClick,
      freight: this.#onFreightClick,
      load: this.#onLoadCargoClick,
      deliver: this.#onDeliverFreightClick,
      toggleAllPassengers: this.#onAllPassengersToggle,
      togglePassenger: this.#onPassengerToggle,
      toggleAllFreight: this.#onAllFreightToggle,
      toggleFreight: this.#onFreightToggle
    }
  };

  constructor(actor, options = {}) {
    try {
      super(options);
      this.actor = actor;
      this.passengers = {
        brokerRollEffect: 0,
        noneSelected: true,
        none: true,
        allChecked: false
      }
      this.passengerList = [];
      this.freight = {
        brokerRollEffect: 0,
        noneSelected: true,
        none: true,
        allChecked: false,
        noCargo: getFreight(actor).length == 0
      }
      this.freightList = [];
    } catch (error) {
      console.error("SpaceTrader: FATAL ERROR in constructor:", error);
      throw error; // Re-throw to prevent broken instance
    }
  }

  get title() {
    return `${this.actor.name} - ${game.i18n.localize('SPACE-TRADER.window-title')}`;
  }

  static PARTS = {
    form: {
      template: "/modules/space-trader/templates/space-trader.hbs"
    },
    settings: {
      template: "/modules/space-trader/templates/parts/settings.hbs"
    },
    passengers: {
      template: "/modules/space-trader/templates/parts/passengers.hbs"
    },
    freight: {
      template: "/modules/space-trader/templates/parts/freight.hbs"
    },
    specbuy: {
      template: "/modules/space-trader/templates/parts/specbuy.hbs"
    },
    specsell: {
      template: "/modules/space-trader/templates/parts/specsell.hbs"
    }
  };

  static TABS = {
    sheet: {
      tabs: [
        {id: "settings", group: "sheet", label: "SPACE-TRADER.Settings"},
        {id: "passengers", group: "sheet", label: "SPACE-TRADER.Passengers"},
        {id: "freight", group: "sheet", label: "SPACE-TRADER.Freight"},
        {id: "specbuy", group: "sheet", label: "SPACE-TRADER.SpecBuy"},
        {id: "specsell", group: "sheet", label: "SPACE-TRADER.SpecSell"}
      ],
      initial: "settings"
    }
  };

  async _prepareContext(options) {
    try {
      if (this.actor.getFlag(SpaceTrader.ID, SpaceTrader.FLAGS.CONFIG) === undefined) {
        await this.actor.setFlag(SpaceTrader.ID, SpaceTrader.FLAGS.CONFIG, TradeConfig.getNew());
      }

      const config = this.actor.getFlag(SpaceTrader.ID, SpaceTrader.FLAGS.CONFIG);

      const context = {
        tabs: this.constructor.TABS,
        tradeCodes: TRADECODES,
        config: config,
        pcs: SpaceTrader.getActors(),
        travelCodeOptions: [
          { value: "0", label: game.i18n.localize('SPACE-TRADER.TRAVEL-CODES.None') },
          { value: "1", label: game.i18n.localize('SPACE-TRADER.TRAVEL-CODES.Amber') },
          { value: "2", label: game.i18n.localize('SPACE-TRADER.TRAVEL-CODES.Red') }
        ],
        passengers: this.passengers,
        passengerList: this.passengerList,
        maxHigh: ((config.travStewardSkill > 0) ? (config.travStewardSkill * 10) : 0),
        maxMid: ((config.travStewardSkill > 0) ? (config.travStewardSkill * 100) :
          ((config.travStewardSkill == 0) ? 10 : 0)),
        freight: this.freight,
        freightList: this.freightList
      };
      
      return context;
    } catch (error) {
      console.error("SpaceTrader: FATAL ERROR in _prepareContext:", error);
      throw error;
    }
  }

  async _onSubmit(formData) {
    const data = foundry.utils.expandObject(formData);
    await this.actor.setFlag(SpaceTrader.ID, SpaceTrader.FLAGS.CONFIG, data.config);
    this.freight.brokerRollEffect = data.freight?.brokerRollEffect;
    this.passengers.brokerRollEffect = data.passengers?.brokerRollEffect;
  }

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
  }

  _onRender(context, options) {
    // Initialize tabs after render
    super._onRender(context, options);
    
    // Initialize tabs after all parts are rendered
    this._initializeTabs();
  }

  _initializeTabs() {
    const tabNavs = this.element.querySelectorAll('.sheet-tabs a[data-tab]');
    const tabContents = this.element.querySelectorAll('section.tab[data-tab]');
    
    if (tabNavs.length === 0 || tabContents.length === 0) {
      // Retry after a short delay if tabs aren't ready yet
      setTimeout(() => this._initializeTabs(), 100);
      return;
    }
    
    tabNavs.forEach(nav => {
      nav.addEventListener('click', (event) => {
        event.preventDefault();
        const targetTab = nav.dataset.tab;
        
        // Remove active from all tabs and contents
        tabNavs.forEach(n => n.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        // Add active to clicked tab and corresponding content
        nav.classList.add('active');
        const targetContent = this.element.querySelector(`section.tab[data-tab="${targetTab}"]`);
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    });
    
    // Ensure the first tab is active by default
    if (tabNavs.length > 0 && tabContents.length > 0) {
      tabNavs[0].classList.add('active');
      tabContents[0].classList.add('active');
    }
  }

  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners?.(partId, htmlElement, options);
    
    // Handle form field changes manually since ApplicationV2 submitOnChange isn't working
    if (partId === "settings") {
      const formFields = htmlElement.querySelectorAll('input, select');
      formFields.forEach(field => {
        field.addEventListener('change', async (event) => {
          // In ApplicationV2, the form element is the root element
          const form = this.element;
          if (form && form.tagName === 'FORM') {
            const formData = new foundry.applications.ux.FormDataExtended(form);
            await this._onSubmit(formData.object);
          }
        });
      });
    }
  }

  // Static private action handlers - following ApplicationV2 guide
  static #onSearchClick(event, target) {
    try {
      this._handleSearchClick(event);
    } catch (error) {
      console.error("SpaceTrader: Critical error in #onSearchClick:", error);
      ui.notifications.error(`Search action failed: ${error.message}`);
    }
  }

  static #onPassengerClick(event, target) {
    try {
      this._handlePassengerClick(event);
    } catch (error) {
      console.error("SpaceTrader: Critical error in #onPassengerClick:", error);
      ui.notifications.error(`Passenger action failed: ${error.message}`);
    }
  }

  static #onBoardClick(event, target) {
    try {
      this._handleOnBoardClick(event);
    } catch (error) {
      console.error("SpaceTrader: Critical error in #onBoardClick:", error);
      ui.notifications.error(`Board action failed: ${error.message}`);
    }
  }

  static #onFreightClick(event, target) {
    try {
      this._handleFreightClick(event);
    } catch (error) {
      console.error("SpaceTrader: Critical error in #onFreightClick:", error);
      ui.notifications.error(`Freight action failed: ${error.message}`);
    }
  }

  static #onLoadCargoClick(event, target) {
    try {
      this._handleLoadCargoClick(event);
    } catch (error) {
      console.error("SpaceTrader: Critical error in #onLoadCargoClick:", error);
      ui.notifications.error(`Load cargo action failed: ${error.message}`);
    }
  }

  static #onDeliverFreightClick(event, target) {
    try {
      this._handleDeliverFreightClick(event);
    } catch (error) {
      console.error("SpaceTrader: Critical error in #onDeliverFreightClick:", error);
      ui.notifications.error(`Deliver freight action failed: ${error.message}`);
    }
  }

  static #onAllPassengersToggle(event, target) {
    try {
      this._handleAllPassengersToggle(event);
    } catch (error) {
      console.error("SpaceTrader: Critical error in #onAllPassengersToggle:", error);
      ui.notifications.error(`All passengers toggle failed: ${error.message}`);
    }
  }

  static #onPassengerToggle(event, target) {
    try {
      this._handlePassengerToggle(event);
    } catch (error) {
      console.error("SpaceTrader: Critical error in #onPassengerToggle:", error);
      ui.notifications.error(`Passenger toggle failed: ${error.message}`);
    }
  }

  static #onAllFreightToggle(event, target) {
    try {
      this._handleAllFreightToggle(event);
    } catch (error) {
      console.error("SpaceTrader: Critical error in #onAllFreightToggle:", error);
      ui.notifications.error(`All freight toggle failed: ${error.message}`);
    }
  }

  static #onFreightToggle(event, target) {
    try {
      this._handleFreightToggle(event);
    } catch (error) {
      console.error("SpaceTrader: Critical error in #onFreightToggle:", error);
      ui.notifications.error(`Freight toggle failed: ${error.message}`);
    }
  }

  _handleSearchClick(event) {
    try {
      const config = this.actor.getFlag(SpaceTrader.ID, SpaceTrader.FLAGS.CONFIG);
      const mapLookup = new MapLookup(this, config);
      mapLookup.render(true);
    } catch (error) {
      console.error("SpaceTrader: Error in _handleSearchClick", error);
      ui.notifications.error(`Search dialog error: ${error.message}`);
    }
  }


  async _handlePassengerClick(event) {
    const config = this.actor.getFlag(SpaceTrader.ID, SpaceTrader.FLAGS.CONFIG);
    const worldStats = TradeConfig.parseUWP(config.uwp);
    if (this.checkRequirements(ROLLTYPES.passenger, config, worldStats)) {
      const showGM = game.settings.get(SpaceTrader.ID, 'showGM');
      const showPlayers = game.settings.get(SpaceTrader.ID, 'showPlayers');
      const show3dRolls = game.settings.get(SpaceTrader.ID, 'show3dDice');

      let lowPsgrs = 0;
      let basicPsgrs = 0;
      let midPsgrs = 0;
      let highPsgrs = 0;
      let dmHtml = "";

      const dmsPrimary = [
        { name: game.i18n.localize('SPACE-TRADER.DMNAMES.RollEffect'), value: this.passengers.brokerRollEffect },
        { name: game.i18n.localize('SPACE-TRADER.DMNAMES.StewardSkill'), value: config.travStewardSkill },
        { name: game.i18n.localize('SPACE-TRADER.DMNAMES.WorldPopulation'), value: getPopDMPassenger(worldStats.population) },
        { name: game.i18n.localize('SPACE-TRADER.DMNAMES.StarportType'), value: getStarportDM(worldStats.starport) },
        { name: game.i18n.localize('SPACE-TRADER.DMNAMES.TravelCode'), value: getTravelCodeDMPassenger(config.travelCode) },
        { name: game.i18n.localize('SPACE-TRADER.DMNAMES.TravelDistance'), value: getDistanceDM(config.parsecs) },
      ];

      const totalPrimary = dmsPrimary.reduce((dm, object) => dm + parseInt(object.value), 0);

      // setup is done, now let's roll

      // low passengers
      let dmsSecondary = [
        { name: game.i18n.localize('SPACE-TRADER.DMNAMES.LowPassengers'), value: 1 },
      ];
      let dmsTotal = totalPrimary + 1;
      if (showGM === "showDetails" || showPlayers === "showDetails") { dmHtml = getDmHtml(dmsPrimary, dmsSecondary); }
      lowPsgrs = await displayChatCard(dmsTotal, game.i18n.localize('SPACE-TRADER.ROLLINGFOR.LowPassengers'), this.actor);


      // basic passengers
      dmsSecondary = [];
      dmsTotal = totalPrimary;
      if (showGM === "showDetails" || showPlayers === "showDetails") { dmHtml = getDmHtml(dmsPrimary); }
      basicPsgrs = await displayChatCard(dmsTotal, game.i18n.localize('SPACE-TRADER.ROLLINGFOR.BasicPassengers'), this.actor);


      // middle passengers
      // same dms as basic
      midPsgrs = await displayChatCard(dmsTotal, game.i18n.localize('SPACE-TRADER.ROLLINGFOR.MiddlePassengers'), this.actor);


      // High passengers
      dmsSecondary = [
        { name: game.i18n.localize('SPACE-TRADER.DMNAMES.HighPassengers'), value: -4 },
      ];
      dmsTotal = totalPrimary - 4;
      if (showGM === "showDetails" || showPlayers === "showDetails") { dmHtml = getDmHtml(dmsPrimary, dmsSecondary); }
      highPsgrs = await displayChatCard(dmsTotal, game.i18n.localize('SPACE-TRADER.ROLLINGFOR.BasicPassengers'), this.actor);


      if (highPsgrs + midPsgrs + basicPsgrs + lowPsgrs) {
        this.passengers.none = false;
        const prices = getFreightPrices(config.parsecs);
        this.passengerList = [];

        for (let i = 0; i < highPsgrs; i++) {
          this.passengerList.push({ type: game.i18n.localize('SPACE-TRADER.PASSENGERTYPES.High'), price: prices.high, checked: false });
        }

        for (let i = 0; i < midPsgrs; i++) {
          this.passengerList.push({ type: game.i18n.localize('SPACE-TRADER.PASSENGERTYPES.Middle'), price: prices.middle, checked: false });
        }

        for (let i = 0; i < basicPsgrs; i++) {
          this.passengerList.push({ type: game.i18n.localize('SPACE-TRADER.PASSENGERTYPES.Basic'), price: prices.basic, checked: false });
        }

        for (let i = 0; i < lowPsgrs; i++) {
          this.passengerList.push({ type: game.i18n.localize('SPACE-TRADER.PASSENGERTYPES.Low'), price: prices.low, checked: false });
        }

        await this.render(true);
      }

      // results summary
      const summaryData = {
        lowPsgrs: lowPsgrs,
        basicPsgrs: basicPsgrs,
        midPsgrs: midPsgrs,
        highPsgrs: highPsgrs
      }

      const cardContent = await foundry.applications.handlebars.renderTemplate(SpaceTrader.TEMPLATES.PASSENGERRESULTS, summaryData);

      const resultOptions = {
        type: CONST.CHAT_MESSAGE_STYLES.OTHER,
        content: cardContent,
        speaker: ChatMessage.getSpeaker({ actor: this.actor })
      }

      if (showPlayers === "showNothing") {
        resultOptions.whisper = ChatMessage.getWhisperRecipients("GM");
      }

      ChatMessage.create(resultOptions);


      async function displayChatCard(dmsTotal, rollType, actor) {
        const roll = await new Roll(formatRollFormula("2d6", dmsTotal)).evaluate();
        const rollHtml = await roll.render();
        const val = getPassengerDice(roll.total);

        if (show3dRolls) { game.dice3d?.showForRoll(roll); }

        let toRoll = "";
        let passengerRoll;
        let passengerHtml = "";
        let passengerResult = "";
        let finalResult = 0;

        if (val[0].diceRoll != "0") {
          toRoll = `${game.i18n.localize('SPACE-TRADER.RollingFor')} ${val[0].diceDesc} ${game.i18n.localize('SPACE-TRADER.Passengers')}`
          passengerRoll = await new Roll(val[0].diceRoll).evaluate()
          passengerHtml = await passengerRoll.render();
          if (show3dRolls) { game.dice3d?.showForRoll(passengerRoll); }
          passengerResult = `${passengerRoll.total} ${game.i18n.localize('SPACE-TRADER.Passengers')} ${game.i18n.localize('SPACE-TRADER.Found')}`
          finalResult = passengerRoll.total;
        } else {
          toRoll = `0 ${game.i18n.localize('SPACE-TRADER.Passengers')} ${game.i18n.localize('SPACE-TRADER.Found')}`
        }


        if (showGM != "resultsOnly" && (showPlayers != "resultsOnly" || showPlayers != "showNothing")) {

          const rollData = {
            rollType: rollType,
            dmHtml: dmHtml,
            rollHtml: rollHtml,
            initialResult: toRoll,
            passengerRollHtml: passengerHtml,
            passengerResult: passengerResult
          }

          let cardContent = await foundry.applications.handlebars.renderTemplate(SpaceTrader.TEMPLATES.PASSENGERROLL, rollData);

          const chatOptions = {
            type: CONST.CHAT_MESSAGE_STYLES.OTHER,
            content: cardContent,
            speaker: ChatMessage.getSpeaker({ actor: actor })
          }

          if (showPlayers === "showNothing" || showPlayers === "resultsOnly") {
            chatOptions.whisper = ChatMessage.getWhisperRecipients("GM");
          }


          await ChatMessage.create(chatOptions);

        }

        return finalResult;
      }

    }
  }

  async _handleAllPassengersToggle(event) {
    this.passengers.allChecked = !this.passengers.allChecked;
    this.passengerList.forEach(item => item.checked = this.passengers.allChecked);
    this.passengers.noneSelected = !this.passengers.allChecked;
    await this.render(true);
  }

  async _handlePassengerToggle(event) {
    const id = event.currentTarget.dataset.id;
    this.passengerList[id].checked = !this.passengerList[id].checked;
    const checked = hasChecked(this.passengerList);
    this.passengers.noneSelected = !checked;

    await this.render(true);
  }


  async _handleOnBoardClick(event) {
    const showPlayers = game.settings.get(SpaceTrader.ID, 'showPlayers');
    const addPassengersToNotes = game.settings.get(SpaceTrader.ID, 'addPassengersToNotes');
    const allocatePassengerCargo = game.settings.get(SpaceTrader.ID, 'allocatePassengerCargo');
    const config = this.actor.getFlag(SpaceTrader.ID, SpaceTrader.FLAGS.CONFIG);
    const checkedList = getChecked(this.passengerList);
    this.passengerList = removeChecked(this.passengerList);


    const total = checkedList.reduce((n, { price }) => n + price, 0)

    const rollData = {
      onboard: checkedList,
      total: total,
      dest: (config.destinationName == "") ? "" : ` (${config.destinationName})`
    }

    let cardContent = await foundry.applications.handlebars.renderTemplate(SpaceTrader.TEMPLATES.PASSENGERONBOARD, rollData);

    const resultOptions = {
      type: CONST.CHAT_MESSAGE_STYLES.OTHER,
      content: cardContent,
      speaker: ChatMessage.getSpeaker({ actor: this.actor })
    }

    if (showPlayers === "showNothing") {
      resultOptions.whisper = ChatMessage.getWhisperRecipients("GM");
    }

    ChatMessage.create(resultOptions);

    this.passengers.noneSelected = true;

    await this.render(true);


    if (addPassengersToNotes) {
      const textResult = this.actor.system.finances + cardContent;
      await this.actor.update({ 'system.finances': textResult })
    }

    if (config.moneyTargetId != "0") {
      const target = game.actors.get(config.moneyTargetId);
      await target.update({ 'system.financeValues.cash': target.system.financeValues.cash + total });
    }

    if (allocatePassengerCargo) {

      const high = checkedList.filter(row => (row.type == game.i18n.localize('SPACE-TRADER.PASSENGERTYPES.High'))).length;
      const middle = checkedList.filter(row => (row.type == game.i18n.localize('SPACE-TRADER.PASSENGERTYPES.Middle'))).length;

      if (high > 0) {
        const highProto = {
          name: game.i18n.localize('SPACE-TRADER.ITEMNAMES.HighPsgrStorage') + ((config.destinationName == "") ? "" : ` (${config.destinationName})`),
          type: "component"
        }
        const cargoSpace = new Item(highProto);
        const newItem = await this.actor.createEmbeddedDocuments("Item", [cargoSpace.toObject()]);
        await newItem[0].update({ "system.subtype": "cargo", "system.quantity": high, "system.weight": 1 });
      }

      if (middle > 0) {
        const highProto = {
          name: game.i18n.localize('SPACE-TRADER.ITEMNAMES.MidPsgrStorage') + ((config.destinationName == "") ? "" : ` (${config.destinationName})`),
          type: "component"
        }
        const cargoSpace = new Item(highProto);
        const newItem = await this.actor.createEmbeddedDocuments("Item", [cargoSpace.toObject()]);
        await newItem[0].update({ "system.subtype": "cargo", "system.quantity": middle, "system.weight": .1 });
      }

    }
  }


  async _handleFreightClick(event) {
    const config = this.actor.getFlag(SpaceTrader.ID, SpaceTrader.FLAGS.CONFIG);
    const worldStats = TradeConfig.parseUWP(config.uwp);
    if (this.checkRequirements(ROLLTYPES.freight, config, worldStats)) {
      const showGM = game.settings.get(SpaceTrader.ID, 'showGM');
      const showPlayers = game.settings.get(SpaceTrader.ID, 'showPlayers');
      const show3dRolls = game.settings.get(SpaceTrader.ID, 'show3dDice');

      let incidentalLots = 0;
      let minorLots = 0;
      let majorLots = 0;
      let mailLots = 0;
      let dmHtml = "";

      const dmsPrimary = [
        { name: game.i18n.localize('SPACE-TRADER.DMNAMES.RollEffect'), value: this.freight.brokerRollEffect },
        { name: game.i18n.localize('SPACE-TRADER.DMNAMES.WorldPopulation'), value: getPopDMFreight(worldStats.population) },
        { name: game.i18n.localize('SPACE-TRADER.DMNAMES.StarportType'), value: getStarportDM(worldStats.starport) },
        { name: game.i18n.localize('SPACE-TRADER.DMNAMES.TravelCode'), value: getTravelCodeDMFreight(config.travelCode) },
        { name: game.i18n.localize('SPACE-TRADER.DMNAMES.TechLevel'), value: getTechLevelDMFreight(worldStats.techlevel) },
        { name: game.i18n.localize('SPACE-TRADER.DMNAMES.TravelDistance'), value: getDistanceDM(config.parsecs) },
      ];

      const totalPrimary = dmsPrimary.reduce((dm, object) => dm + parseInt(object.value), 0);

      // setup is done, now let's roll

      // Major Cargo
      let dmsSecondary = [
        { name: game.i18n.localize('SPACE-TRADER.DMNAMES.MajorCargo'), value: -4 },
      ];
      let dmsTotal = totalPrimary - 4;
      if (showGM === "showDetails" || showPlayers === "showDetails") { dmHtml = getDmHtml(dmsPrimary, dmsSecondary); }
      majorLots = await displayChatCard(dmsTotal, game.i18n.localize('SPACE-TRADER.ROLLINGFOR.MajorCargo'), this.actor);


      // Minor cargo
      dmsSecondary = [];
      dmsTotal = totalPrimary;
      if (showGM === "showDetails" || showPlayers === "showDetails") { dmHtml = getDmHtml(dmsPrimary); }
      minorLots = await displayChatCard(dmsTotal, game.i18n.localize('SPACE-TRADER.ROLLINGFOR.MinorCargo'), this.actor);


      // incidental cargo
      dmsSecondary = [
        { name: game.i18n.localize('SPACE-TRADER.DMNAMES.IncidentalCargo'), value: 2 },
      ];
      dmsTotal = totalPrimary + 2;
      if (showGM === "showDetails" || showPlayers === "showDetails") { dmHtml = getDmHtml(dmsPrimary, dmsSecondary); }
      incidentalLots = await displayChatCard(dmsTotal, game.i18n.localize('SPACE-TRADER.ROLLINGFOR.IncidentalCargo'), this.actor);

      //mail
      dmsSecondary = [];
      const dmsMail = [
        { name: `${game.i18n.localize('SPACE-TRADER.DMNAMES.FreightTravelDM')} ${totalPrimary}`, value: getFreightDMMail(totalPrimary) },
        { name: game.i18n.localize('SPACE-TRADER.DMNAMES.IsArmed'), value: getArmedDM(config.isArmed) },
        { name: game.i18n.localize('SPACE-TRADER.DMNAMES.TechLevel'), value: getTechLevelDMMail(worldStats.techlevel) },
        { name: game.i18n.localize('SPACE-TRADER.DMNAMES.HighestSOC'), value: config.highestSocDM },
        { name: game.i18n.localize('SPACE-TRADER.DMNAMES.Rank'), value: config.travRank }
      ]
      const mailDMsTotal = dmsMail.reduce((dm, object) => dm + parseInt(object.value), 0);
      if (showGM === "showDetails" || showPlayers === "showDetails") { dmHtml = getDmHtml(dmsMail, dmsSecondary); }
      mailLots = await displayMailChatCard(mailDMsTotal, game.i18n.localize('SPACE-TRADER.ROLLINGFOR.Mail'), this.actor);




      if (incidentalLots + minorLots + majorLots + mailLots) {
        this.freight.none = false;
        const prices = getFreightPrices(config.parsecs);
        this.freightList = [];

        for (let i = 0; i < majorLots; i++) {
          const amount = await new Roll("1d6*10").evaluate();
          this.freightList.push({ type: game.i18n.localize('SPACE-TRADER.FreightLot'), tons: amount.total, price: prices.freight * amount.total, checked: false, sort: amount.total });
        }

        for (let i = 0; i < minorLots; i++) {
          const amount = await new Roll("1d6*5").evaluate();
          this.freightList.push({ type: game.i18n.localize('SPACE-TRADER.FreightLot'), tons: amount.total, price: prices.freight * amount.total, checked: false, sort: amount.total });
        }

        for (let i = 0; i < incidentalLots; i++) {
          const amount = await new Roll("1d6").evaluate();
          this.freightList.push({ type: game.i18n.localize('SPACE-TRADER.FreightLot'), quantity: 1, tons: amount.total, price: prices.freight * amount.total, checked: false, sort: amount.total });
        }

        if (mailLots > 0) {
          this.freightList.push({ type: game.i18n.localize('SPACE-TRADER.MailContainer'), quantity: mailLots, tons: mailLots * 5, price: mailLots * 25000, checked: false, sort: 9999999 });
        }

        this.freightList.sort((a, b) => b.sort - a.sort);

        await this.render(true);
      }


      // results summary
      const summaryData = {
        incidentalLots: incidentalLots,
        minorLots: minorLots,
        majorLots: majorLots,
        mailLots: (mailLots > 0) ? 1 : 0
      }

      const cardContent = await foundry.applications.handlebars.renderTemplate(SpaceTrader.TEMPLATES.FREIGHTRESULTS, summaryData);

      const resultOptions = {
        type: CONST.CHAT_MESSAGE_STYLES.OTHER,
        content: cardContent,
        speaker: ChatMessage.getSpeaker({ actor: this.actor })
      }

      if (showPlayers === "showNothing") {
        resultOptions.whisper = ChatMessage.getWhisperRecipients("GM");
      }

      ChatMessage.create(resultOptions);

      async function displayChatCard(dmsTotal, rollType, actor) {
        const roll = await new Roll(formatRollFormula("2d6", dmsTotal)).evaluate();
        const rollHtml = await roll.render();
        const val = getFreightDice(roll.total);

        if (show3dRolls) { game.dice3d?.showForRoll(roll); }

        let toRoll = "";
        let freightRoll;
        let freightHtml = "";
        let freightResult = "";
        let finalResult = 0;

        if (val[0].diceRoll != "0") {
          toRoll = `${game.i18n.localize('SPACE-TRADER.RollingFor')} ${val[0].diceDesc} ${game.i18n.localize('SPACE-TRADER.Lots')}`
          freightRoll = await new Roll(val[0].diceRoll).evaluate()
          freightHtml = await freightRoll.render();
          if (show3dRolls) { game.dice3d?.showForRoll(freightRoll); }
          freightResult = `${freightRoll.total} ${game.i18n.localize('SPACE-TRADER.Lots')} ${game.i18n.localize('SPACE-TRADER.Found')}`
          finalResult = freightRoll.total;
        } else {
          toRoll = `0 ${game.i18n.localize('SPACE-TRADER.Lots')} ${game.i18n.localize('SPACE-TRADER.Found')}`
        }


        if (showGM != "resultsOnly" && (showPlayers != "resultsOnly" || showPlayers != "showNothing")) {

          const rollData = {
            rollType: rollType,
            dmHtml: dmHtml,
            rollHtml: rollHtml,
            initialResult: toRoll,
            freightRollHtml: freightHtml,
            freightResult: freightResult
          }

          let cardContent = await foundry.applications.handlebars.renderTemplate(SpaceTrader.TEMPLATES.FREIGHTROLL, rollData);

          const chatOptions = {
            type: CONST.CHAT_MESSAGE_STYLES.OTHER,
            content: cardContent,
            speaker: ChatMessage.getSpeaker({ actor: actor })
          }

          if (showPlayers === "showNothing" || showPlayers === "resultsOnly") {
            chatOptions.whisper = ChatMessage.getWhisperRecipients("GM");
          }


          await ChatMessage.create(chatOptions);

        }

        return finalResult;
      }


      async function displayMailChatCard(dmsTotal, rollType, actor) {
        const roll = await new Roll(formatRollFormula("2d6", dmsTotal)).evaluate();
        const rollHtml = await roll.render();

        if (show3dRolls) { game.dice3d?.showForRoll(roll); }

        let toRoll = "";
        let freightRoll;
        let freightHtml = "";
        let freightResult = "";
        let finalResult = 0;

        if (roll.total >= 12) {
          toRoll = `${game.i18n.localize('SPACE-TRADER.RollingFor')} 1D ${game.i18n.localize('SPACE-TRADER.Containers')}`
          freightRoll = await new Roll("1d6").evaluate()
          freightHtml = await freightRoll.render();
          if (show3dRolls) { game.dice3d?.showForRoll(freightRoll); }
          freightResult = `${freightRoll.total} ${game.i18n.localize('SPACE-TRADER.Containers')} ${game.i18n.localize('SPACE-TRADER.Found')}`
          finalResult = freightRoll.total;
        } else {
          toRoll = game.i18n.localize('SPACE-TRADER.NoMailFound');
        }


        if (showGM != "resultsOnly" && (showPlayers != "resultsOnly" || showPlayers != "showNothing")) {

          const rollData = {
            rollType: rollType,
            dmHtml: dmHtml,
            rollHtml: rollHtml,
            initialResult: toRoll,
            freightRollHtml: freightHtml,
            freightResult: freightResult
          }

          let cardContent = await foundry.applications.handlebars.renderTemplate(SpaceTrader.TEMPLATES.FREIGHTROLL, rollData);

          const chatOptions = {
            type: CONST.CHAT_MESSAGE_STYLES.OTHER,
            content: cardContent,
            speaker: ChatMessage.getSpeaker({ actor: actor })
          }

          if (showPlayers === "showNothing" || showPlayers === "resultsOnly") {
            chatOptions.whisper = ChatMessage.getWhisperRecipients("GM");
          }


          await ChatMessage.create(chatOptions);

        }

        return finalResult;
      }
    }
  }

  async _handleAllFreightToggle(event) {
    this.freight.allChecked = !this.freight.allChecked;
    this.freightList.forEach(item => item.checked = this.freight.allChecked);
    this.freight.noneSelected = !this.freight.allChecked;
    await this.render(true);
  }


  async _handleFreightToggle(event) {
    const id = event.currentTarget.dataset.id;
    this.freightList[id].checked = !this.freightList[id].checked;
    const checked = hasChecked(this.freightList);
    this.freight.noneSelected = !checked;

    await this.render(true);
  }


  async _handleLoadCargoClick(event) {
    const showPlayers = game.settings.get(SpaceTrader.ID, 'showPlayers');
    const config = this.actor.getFlag(SpaceTrader.ID, SpaceTrader.FLAGS.CONFIG);
    const checkedList = getChecked(this.freightList);
    this.freightList = removeChecked(this.freightList);


    const total = checkedList.reduce((n, { price }) => n + price, 0)

    const rollData = {
      onboard: checkedList,
      total: total,
      dest: (config.destinationName == "") ? "" : ` (${config.destinationName})`
    }

    let cardContent = await foundry.applications.handlebars.renderTemplate(SpaceTrader.TEMPLATES.FREIGHTLOAD, rollData);

    const resultOptions = {
      type: CONST.CHAT_MESSAGE_STYLES.OTHER,
      content: cardContent,
      speaker: ChatMessage.getSpeaker({ actor: this.actor })
    }

    if (showPlayers === "showNothing") {
      resultOptions.whisper = ChatMessage.getWhisperRecipients("GM");
    }

    ChatMessage.create(resultOptions);

    this.freight.noneSelected = true;

    await this.render(true);

    for (let x in checkedList) {
      const row = checkedList[x];

      const proto = {
        name: row.type + ((config.destinationName == "") ? "" : ` (${config.destinationName})`),
        type: "component"
      }

      const cargoSpace = new Item(proto);
      const newItem = await this.actor.createEmbeddedDocuments("Item", [cargoSpace.toObject()]);

      if (row.type == game.i18n.localize('SPACE-TRADER.FREIGHTTYPES.Mail')) {
        await newItem[0].update({
          "system.subtype": "cargo", "system.quantity": row.quantity, "system.weight": 5,
          "system.price": row.price, "system.purchasePrice": row.price
        });
        await newItem[0].setFlag(SpaceTrader.ID, SpaceTrader.FLAGS.ISFREIGHT, true)
      } else {
        await newItem[0].update({
          "system.subtype": "cargo", "system.quantity": 1, "system.weight": row.tons,
          "system.price": row.price, "system.purchasePrice": row.price
        });
        await newItem[0].setFlag(SpaceTrader.ID, SpaceTrader.FLAGS.ISFREIGHT, true)
      }
    }

  }


  async _handleDeliverFreightClick(event) {
    new FreightSale(this).render(true);
  }


  static getActors() {
    let actors = game.actors.contents.filter(e => (e.type === 'traveller' || e.type === 'robot'));
    let pcs = [
      { id: 0, name: game.i18n.localize('SPACE-TRADER.OnlyInChat') }
    ];

    if (actors.length > 0) {
      for (const actor of actors) {
        pcs.push({ id: actor.id, name: actor.name });
      }
    }
    return pcs;
  }





  checkRequirements(rollType, config, worldStats) {
    let isOk = true;

    // validate the UWP
    if (rollType === ROLLTYPES.passenger || rollType === ROLLTYPES.freight) {
      isOk = isOk && ((worldStats == null) ? false : true)
    }

    // validate steward skill
    if (rollType === ROLLTYPES.passenger) {
      if (!Number.isInteger(parseInt(config.travStewardSkill))) {
        ui.notifications.error(game.i18n.localize('SPACE-TRADER.ERRORS.BadStewardSkill'));
        isOk = false;
      }
    }

    // validate parsecs
    if (rollType === ROLLTYPES.passenger || rollType === ROLLTYPES.freight) {
      if (!Number.isInteger(parseInt(config.parsecs))) {
        ui.notifications.error(game.i18n.localize('SPACE-TRADER.ERRORS.BadParsecs'));
        isOk = false;
      }
    }


    return isOk;
  }


}