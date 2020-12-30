import { Player } from "../../../structures/GameObject/GameObjects/Player";
import ShopItem from "../ShopItem";

export default class CollectionExpander extends ShopItem {
    public readonly simpleNames = ["collection expander", "expander", "collection"];

    public readonly canBuyMultiple = false;

    public getName(player: Player): string {
        return `collection expander (lvl ${player.collectionUpgradeLevel + 1})`;
    }

    public getPrice(player: Player): number {
        return 500 + player.collectionUpgradeLevel * 100;
    }

    public purchaseAction(player: Player): void {
        player.collectionUpgradeLevel += 1;
    }
}