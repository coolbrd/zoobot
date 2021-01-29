import { stripIndent } from "common-tags";
import { Player } from "../../../structures/GameObject/GameObjects/Player";
import ShopItem from "../ShopItem";

export default class CollectionExpander extends ShopItem {
    public readonly simpleNames = ["collection expander", "expander", "collection"];

    public readonly canBuyMultiple = false;

    public readonly effectiveChangeAmount = 5;

    public getName(player: Player): string {
        return `collection expander (lvl ${player.collectionUpgradeLevel + 1})`;
    }

    public getPrice(player: Player): number {
        return 500 + player.collectionUpgradeLevel * 100;
    }

    public purchaseAction(player: Player): void {
        player.collectionUpgradeLevel += 1;
    }

    public getPurchaseMessage(player: Player, _quantity: number, price: number): string {
        const pepEmoji = this.shop.beastiaryClient.beastiary.emojis.getByName("pep");
        return stripIndent`
            Success, your collection is now level **${player.collectionUpgradeLevel}**, and can hold up to **${player.collectionSizeLimit}** animals.
            -**${price}**${pepEmoji}
        `;
    }

    public getPlayerCurrentAmount(player: Player): number {
        return player.collectionSizeLimit;
    }
}