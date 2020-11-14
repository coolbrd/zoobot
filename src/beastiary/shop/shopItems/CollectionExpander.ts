import { Player } from "../../../structures/GameObject/GameObjects/Player";
import ShopItem from "../ShopItem";

export default class CollectionExpander extends ShopItem {
    public readonly simpleName = "collection expander";

    public readonly canBuyMultiple = false;

    public getName(player: Player): string {
        return `collection expander (lvl ${player.collectionUpgradeLevel + 1})`;
    }

    public getPrice(player: Player): number {
        return 100 + player.collectionUpgradeLevel * 50;
    }

    public purchaseAction(player: Player): void {
        player.collectionUpgradeLevel += 1;
    }
}