import { Player } from "../../../structures/GameObject/GameObjects/Player";
import ShopItem from "../ShopItem";

class EncounterItem extends ShopItem {
    public readonly simpleNames = ["encounter", "e"];

    public getName(_player: Player): string {
        return "encounter";
    }

    public getPrice(_player: Player): number {
        return 40;
    }

    public purchaseAction(player: Player, quantity: number): void {
        player.extraEncountersLeft += quantity;
    }
}
export default new EncounterItem();