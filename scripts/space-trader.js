import { TRADECODES, ROLLTYPES } from './trade-goods.js';
import { TradeConfig } from './trade-config.js';
import { MapLookup } from './map-lookup.js';
import {
  registerSettings, getPopDMPassenger, getStarportDM, getTravelCodeDMPassenger,
  getDistanceDM, getPassengerDice, formatRollFormula, getDmHtml,
  getFreightPrices, hasChecked, getChecked, removeChecked, getPopDMFreight,
  getTravelCodeDMFreight, getTechLevelDMFreight, getFreightDice,
  getFreightDMMail, getArmedDM, getTechLevelDMMail, getFreight,
  getStarportDMSpec
} from './utility.js';
import * as Chat from './chat.js';
import { FreightSale } from './freight-sale.js';

Hooks.once('init', async function () {
  registerSettings(SpaceTrader.ID);
  await loadTemplates({
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

Hooks.on("renderChatMessage", (app, html, data) => Chat.toggleChatDetails(app, html, data));

Hooks.on("renderTokenHUD", async (hud, html, token) => {
  const actor = game.actors.get(token.actorId);
  if (!(game.user.isGM && actor.type == "ship")) return;

  const button = $(`
     <div class="control-icon">
       <img src="icons/svg/coins.svg" width="36" height="36" title="${game.i18n.localize('SPACE-TRADER.TradingMenu')}"/>
     </div>
   `)

  button.on('click', () => {
    showTradeWindow(actor);
  })

  html.find('div.right').append(button);

})

Hooks.on("getActorDirectoryEntryContext", async (html, menuItems) => {
  menuItems.push({
    name: "SPACE-TRADER.TradingMenu",
    icon: `<i class="fa fa-coins"></i>`,
    callback: async (html) => {
      const actorId = html[0].dataset.documentId;
      const actor = game.actors.get(actorId);
      showTradeWindow(actor);
    },
    condition: (html) => {
      const actorId = html[0].dataset.documentId;
      const actor = game.actors.get(actorId);
      return game.user.isGM && (actor.type == "ship");
    }
  })
})

Hooks.on("renderActorSheet", async (app, html) => {
  const actor = app.actor;
  if (!(game.user.isGM && actor.type == "ship")) return;

  const button = $(`<button class="space-trader-cargo-button"><i class="fa fa-coins"></i> ${game.i18n.localize('SPACE-TRADER.TradingMenu')}</button>`);

  button.on('click', () => {
    showTradeWindow(actor);
  })

  const loc = html.find(".cargo-weight");
  loc.append(button);
})


function showTradeWindow(actor) {
  new SpaceTrader(actor, { title: `${actor.name}  ${game.i18n.localize('SPACE-TRADER.window-title')}` }).render(true);
}


export class SpaceTrader extends FormApplication {

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

  constructor(actor, options) {
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

  }

  get title() {
    return `${this.actor.name} - ${game.i18n.localize('SPACE-TRADER.window-title')}`;
  }

  static get defaultOptions() {
    const defaults = super.defaultOptions;

    const overrides = {
      height: 'auto',
      width: 800,
      id: 'space-trader',
      template: this.TEMPLATES.TRADEWINDOW,
      closeOnSubmit: false,
      submitOnChange: true,
      tabs: [{ navSelector: ".tabs", contentSelector: ".content", initial: "settings" }]
    };

    const mergedOptions = foundry.utils.mergeObject(defaults, overrides);

    return mergedOptions;
  }

  async getData() {
    if (this.actor.getFlag(SpaceTrader.ID, SpaceTrader.FLAGS.CONFIG) === undefined) {
      await this.actor.setFlag(SpaceTrader.ID, SpaceTrader.FLAGS.CONFIG, TradeConfig.getNew());
    }

    const config = this.actor.getFlag(SpaceTrader.ID, SpaceTrader.FLAGS.CONFIG);

    let starportDMText = "";
    const worldStats = TradeConfig.parseUWP(config.uwp);
    const starportDM = getStarportDMSpec(worldStats?.starport);
    if (starportDM > 0) { starportDMText = `+${starportDM} ${game.i18n.localize('SPACE-TRADER.DM')}:  ${game.i18n.localize('SPACE-TRADER.Starport')} ${worldStats?.starport}`}
    

    return {
      tradeCodes: TRADECODES,
      config: config,
      pcs: SpaceTrader.getActors(),
      passengers: this.passengers,
      passengerList: this.passengerList,
      maxHigh: ((config.travStewardSkill > 0) ? (config.travStewardSkill * 10) : 0),
      maxMid: ((config.travStewardSkill > 0) ? (config.travStewardSkill * 100) :
        ((config.travStewardSkill == 0) ? 10 : 0)),
      freight: this.freight,
      freightList: this.freightList,
      starportDM: starportDMText
    }
  }

  async _updateObject(event, formData) {
    const data = foundry.utils.expandObject(formData);

    await this.actor.setFlag(SpaceTrader.ID, SpaceTrader.FLAGS.CONFIG, data.config);
    this.freight.brokerRollEffect = data.freight.brokerRollEffect;
    this.passengers.brokerRollEffect = data.passengers.brokerRollEffect;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.on('click', ".space-trader-search-button", this._handleSearchClick.bind(this));
    html.on('click', ".passenger-button", this._handlePassengerClick.bind(this));
    html.on('change', ".toggle-all-passengers", this._handleAllPassengersToggle.bind(this));
    html.on('change', ".toggle-single-passenger", this._handlePassengerToggle.bind(this));
    html.on('click', ".onboard-button", this._handleOnBoardClick.bind(this));
    html.on('click', ".freight-button", this._handleFreightClick.bind(this));
    html.on('change', ".toggle-all-freight", this._handleAllFreightToggle.bind(this));
    html.on('change', ".toggle-single-freight", this._handleFreightToggle.bind(this));
    html.on('click', ".load-button", this._handleLoadCargoClick.bind(this));
    html.on('click', ".deliver-button", this._handleDeliverFreightClick.bind(this));
  }

  async _handleSearchClick(event) {
    new MapLookup(this, this.actor.getFlag(SpaceTrader.ID, SpaceTrader.FLAGS.CONFIG)).render(true);
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

      const cardContent = await renderTemplate(SpaceTrader.TEMPLATES.PASSENGERRESULTS, summaryData);

      const resultOptions = {
        type: CONST.CHAT_MESSAGE_TYPES.OTHER,
        content: cardContent,
        speaker: ChatMessage.getSpeaker({ actor: this.actor })
      }

      if (showPlayers === "showNothing") {
        resultOptions.whisper = ChatMessage.getWhisperRecipients("GM");
      }

      ChatMessage.create(resultOptions);


      async function displayChatCard(dmsTotal, rollType, actor) {
        const roll = await new Roll(formatRollFormula("2d6", dmsTotal)).evaluate({ async: true });
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
          passengerRoll = await new Roll(val[0].diceRoll).evaluate({ async: true })
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

          let cardContent = await renderTemplate(SpaceTrader.TEMPLATES.PASSENGERROLL, rollData);

          const chatOptions = {
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
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

    let cardContent = await renderTemplate(SpaceTrader.TEMPLATES.PASSENGERONBOARD, rollData);

    const resultOptions = {
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
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
          const amount = await new Roll("1d6*10").evaluate({ async: true });
          this.freightList.push({ type: game.i18n.localize('SPACE-TRADER.FreightLot'), tons: amount.total, price: prices.freight * amount.total, checked: false, sort: amount.total });
        }

        for (let i = 0; i < minorLots; i++) {
          const amount = await new Roll("1d6*5").evaluate({ async: true });
          this.freightList.push({ type: game.i18n.localize('SPACE-TRADER.FreightLot'), tons: amount.total, price: prices.freight * amount.total, checked: false, sort: amount.total });
        }

        for (let i = 0; i < incidentalLots; i++) {
          const amount = await new Roll("1d6").evaluate({ async: true });
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

      const cardContent = await renderTemplate(SpaceTrader.TEMPLATES.FREIGHTRESULTS, summaryData);

      const resultOptions = {
        type: CONST.CHAT_MESSAGE_TYPES.OTHER,
        content: cardContent,
        speaker: ChatMessage.getSpeaker({ actor: this.actor })
      }

      if (showPlayers === "showNothing") {
        resultOptions.whisper = ChatMessage.getWhisperRecipients("GM");
      }

      ChatMessage.create(resultOptions);

      async function displayChatCard(dmsTotal, rollType, actor) {
        const roll = await new Roll(formatRollFormula("2d6", dmsTotal)).evaluate({ async: true });
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
          freightRoll = await new Roll(val[0].diceRoll).evaluate({ async: true })
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

          let cardContent = await renderTemplate(SpaceTrader.TEMPLATES.FREIGHTROLL, rollData);

          const chatOptions = {
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
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
        const roll = await new Roll(formatRollFormula("2d6", dmsTotal)).evaluate({ async: true });
        const rollHtml = await roll.render();

        if (show3dRolls) { game.dice3d?.showForRoll(roll); }

        let toRoll = "";
        let freightRoll;
        let freightHtml = "";
        let freightResult = "";
        let finalResult = 0;

        if (roll.total >= 12) {
          toRoll = `${game.i18n.localize('SPACE-TRADER.RollingFor')} 1D ${game.i18n.localize('SPACE-TRADER.Containers')}`
          freightRoll = await new Roll("1d6").evaluate({ async: true })
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

          let cardContent = await renderTemplate(SpaceTrader.TEMPLATES.FREIGHTROLL, rollData);

          const chatOptions = {
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
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

    let cardContent = await renderTemplate(SpaceTrader.TEMPLATES.FREIGHTLOAD, rollData);

    const resultOptions = {
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
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