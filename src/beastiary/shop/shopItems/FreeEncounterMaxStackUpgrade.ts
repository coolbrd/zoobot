import { stripIndent } from "common-tags";
import { Player } from "../../../structures/GameObject/GameObjects/Player";
import Emojis from "../../Emojis";
import ShopItem from "../ShopItem";

export default class FreeEncounterMaxStackUpgrade extends ShopItem {
    public readonly simpleNames = ["free encounter max stack", "encounter max stack", "encounter max", "encounter"];

    public readonly canBuyMultiple = false;
    public readonly inline = true;

    public getName(player: Player): string {
        return `free encounter max stack: lvl ${player.freeEncounterMaxStackUpgradeLevel + 1}`;
    }

    public getPrice(player: Player): number {
        return 3000 + player.freeEncounterMaxStackUpgradeLevel * 1500;
    }

    public purchaseAction(player: Player): void {
        player.freeEncounterMaxStackUpgradeLevel += 1;
    }

    public getPurchaseMessage(player: Player, _quantity: number, price: number): string {
        return stripIndent`
            Success, your free encounter max stack has been upgraded by +**1**, and is now **${player.freeEnconterMaxStack}**!
            -**${price}**${Emojis.pep}
        `;
    }

    public getPlayerCurrentAmount(player: Player): number {
        return player.freeEnconterMaxStack;
    }
}