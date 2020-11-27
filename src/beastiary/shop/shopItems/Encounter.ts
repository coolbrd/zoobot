import { Player } from "../../../structures/GameObject/GameObjects/Player";
import ShopItem from "../ShopItem";

export default class EncounterItem extends ShopItem {
    public readonly simpleNames = ["encounter", "e"];

    public getName(_player: Player): string {
        return "encounter";
    }

    public getPrice(_player: Player): number {
        return 20;
    }

    public purchaseAction(player: Player, quantity: number): void {
        player.extraEncountersLeft += quantity;
    }
}