import { stripIndent } from "common-tags";
import { Player } from "../../../structures/GameObject/GameObjects/Player";
import ShopItem from "../ShopItem";

export default class FreeXpBoostMaxStackUpgrade extends ShopItem {
    public readonly simpleNames = ["free xp boost max stack", "xp boost max stack", "xp boost max", "xp boost"];

    public readonly canBuyMultiple = false;
    public readonly inline = true;

    public getName(player: Player): string {
        return `free xp boost max stack: lvl ${player.freeXpBoostMaxStackUpgradeLevel + 1}`;
    }

    public getPrice(player: Player): number {
        return 2000 + player.freeXpBoostMaxStackUpgradeLevel * 2000;
    }

    public purchaseAction(player: Player): void {
        player.freeXpBoostMaxStackUpgradeLevel += 1;
    }

    public getPurchaseMessage(player: Player, _quantity: number, price: number): string {
        const pepEmoji = this.shop.beastiaryClient.beastiary.emojis.getByName("pep");
        return stripIndent`
            Success, your free xp boost max stack has been upgraded by +**1**, and is now **${player.freeXpBoostMaxStack}**!
            -**${price}**${pepEmoji}
        `;
    }

    public getPlayerCurrentAmount(player: Player): number {
        return player.freeXpBoostMaxStack;
    }
}