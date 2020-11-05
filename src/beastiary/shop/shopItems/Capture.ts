import { Player } from "../../../models/Player";
import ShopItem from "../ShopItem";

export default class CaptureItem extends ShopItem {
    public readonly name = "Capture";
    public readonly price = 20;

    public purchaseAction(player: Player, quantity: number): void {
        player.extraEncountersLeft += quantity;
    }
}