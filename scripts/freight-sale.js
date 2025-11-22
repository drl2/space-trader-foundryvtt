import { getFreight, hasChecked, getChecked } from './utility.js';


export class FreightSale extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    static ID = 'freight-sale';

    static TEMPLATES = {
        FREIGHTSALEWINDOW: `modules/space-trader/templates/freight-sale.hbs`,
        FREIGHTSALECARD: `modules/space-trader/templates/chatcards/freightsale.hbs`
    }
  static FLAGS = {
    CONFIG: 'config'
  }

    static DEFAULT_OPTIONS = {
        id: "freight-sale",
        tag: "form",
        window: {
            title: "SPACE-TRADER.DeliverFreight",
            resizable: true
        },
        position: {
            width: 450,
            height: "auto"
        },
        form: {
            submitOnChange: true,
            closeOnSubmit: false
        },
        actions: {
            deliver: this.#onDeliverClick,
            toggleAll: this.#onToggleAllClick,
            toggle: this.#onToggleClick
        }
    };

    static PARTS = {
        form: {
            template: "modules/space-trader/templates/freight-sale.hbs"
        }
    };

    constructor(traderApp, options = {}) {
        super(options);
        this.actor = traderApp.actor;
        this.traderApp = traderApp;
        this.populateFreight();
    }

    populateFreight() {
        this.freight = getFreight(this.actor);
        this.allChecked = false;
        this.noFreight = this.freight.length == 0;
        this.freightList = [];

        for (let i = 0; i < this.freight.length; i++) {
            this.freightList.push({
                id: this.freight[i].id, type: this.freight[i].name, tons: this.freight[i].system.weight,
                price: this.freight[i].system.purchasePrice, checked: false
            });
        }
    }

    async _prepareContext(options) {
        return {
            freightList: this.freightList,
            allChecked: this.allChecked,
            noFreight: this.noFreight
        }
    }

    async _onSubmit(formData) {
        const data = foundry.utils.expandObject(formData);
        this.query = data.query;
    }

    _attachPartListeners(partId, htmlElement, options) {
        // AppV2 handles actions automatically - no manual event listeners needed
    }

    // Static private action handlers
    static #onDeliverClick(event, target) {
        this._handleDeliverFreightClick(event);
    }

    static #onToggleAllClick(event, target) {
        this._handleAllFreightToggle(event);
    }

    static #onToggleClick(event, target) {
        const id = target.dataset.id;
        this.freightList[id].checked = !this.freightList[id].checked;
        const checked = hasChecked(this.freightList);
        this.noneSelected = !checked;
        this.render(true);
    }

    async _handleAllFreightToggle(event) {
        this.allChecked = !this.allChecked;
        this.freightList.forEach(item => item.checked = this.allChecked);
        this.noneSelected = !this.allChecked;
        await this.render(true);
    }

    async _handleFreightToggle(event) {
        const id = event.currentTarget.dataset.id;
        this.freightList[id].checked = !this.freightList[id].checked;
        const checked = hasChecked(this.freightList);
        this.noneSelected = !checked;
        await this.render(true);
    }

    async _handleDeliverFreightClick(event) {
        const showPlayers = game.settings.get(FreightSale.ID, 'showPlayers');
        const config = this.actor.getFlag(FreightSale.ID, FreightSale.FLAGS.CONFIG);
        const checkedList = getChecked(this.freightList);
        const totalValue = checkedList.reduce((a,b) => a + (b.price || 0), 0);
        const totalWeight = checkedList.reduce((a,b) => a + (b.tons || 0), 0);

        const rollData = {
            freightList: checkedList,
            totalValue: totalValue,
            totalWeight: totalWeight
          }

        let cardContent = await foundary.applications.handlebars.renderTemplate(FreightSale.TEMPLATES.FREIGHTSALECARD, rollData);

        const resultOptions = {
          type: CONST.CHAT_MESSAGE_STYLES.OTHER,
          content: cardContent,
          speaker: ChatMessage.getSpeaker({ actor: this.actor })
        }

        if (showPlayers === "showNothing") {
            resultOptions.whisper = ChatMessage.getWhisperRecipients("GM");
        }

        ChatMessage.create(resultOptions);

        const textResult = this.actor.system.finances + cardContent;
        await this.actor.update({ 'system.finances': textResult });

        // add money to actor if enabled
        if (config.moneyTargetId != "0") {
            const target = game.actors.get(config.moneyTargetId);
            await target.update({ 'system.financeValues.cash': target.system.financeValues.cash + totalValue });
        }

        //remove relevant freight from the ship
        for (let i = 0; i < checkedList.length; i++) {
            const item = this.actor.items.get(checkedList[i].id);
            await item.delete();
        }

        this.populateFreight();
        
        await this.traderApp.render(true); // just to update deliver button
        await this.render(true);
    }
}
