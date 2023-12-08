import { getFreight, hasChecked, getChecked } from './utility.js';


export class FreightSale extends FormApplication {
    static ID = 'space-trader';

    static TEMPLATES = {
        FREIGHTSALEWINDOW: `modules/${FreightSale.ID}/templates/freight-sale.hbs`,
        FREIGHTSALECARD: `modules/${FreightSale.ID}/templates/chatcards/freightsale.hbs`
    }
  static FLAGS = {
    CONFIG: 'config'
  }

    static get defaultOptions() {
        const defaults = super.defaultOptions;

        const overrides = {
            height: 'auto',
            width: 450,
            id: 'freight-sale',
            template: this.TEMPLATES.FREIGHTSALEWINDOW,
            closeOnSubmit: false,
            title: game.i18n.localize('SPACE-TRADER.DeliverFreight')
        };
        const mergedOptions = foundry.utils.mergeObject(defaults, overrides);

        return mergedOptions;
    }

    constructor(traderApp, options) {
        super(options);
        this.actor = traderApp.actor;
        this.traderApp = traderApp;
        this.populateFreight();

        // this.freight = getFreight(this.actor);
        // this.allChecked = false;
        // this.noFreight = this.freight.length == 0;
        // this.freightList = [];

        // for (let i = 0; i < this.freight.length; i++) {
        //     this.freightList.push({
        //         id: this.freight[i].id, type: this.freight[i].name, tons: this.freight[i].system.weight,
        //         price: this.freight[i].system.purchasePrice, checked: false
        //     });
        // }
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

    async getData() {
        return {
            freightList: this.freightList,
            allChecked: this.allChecked,
            noFreight: this.noFreight
        }
    }

    async _updateObject(event, formData) {
        const data = foundry.utils.expandObject(formData);
        this.query = data.query;
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.on('change', ".toggle-all-freight", this._handleAllFreightToggle.bind(this));
        html.on('change', ".toggle-single-freight", this._handleFreightToggle.bind(this));
        html.on('click', ".deliver-button", this._handleDeliverFreightClick.bind(this));
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

        let cardContent = await renderTemplate(FreightSale.TEMPLATES.FREIGHTSALECARD, rollData);

        const resultOptions = {
          type: CONST.CHAT_MESSAGE_TYPES.OTHER,
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
