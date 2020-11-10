import { Player } from "../../../models/Player";
import ShopItem from "../ShopItem";

export default class EncounterItem extends ShopItem {
    public getName(_player: Player): string {
        return "encounter";
    }

    public getPrice(_player: Player): number {
        return 3;
    }

    public purchaseAction(player: Player, quantity: number): void {
        player.extraEncountersLeft += quantity;
    }
}