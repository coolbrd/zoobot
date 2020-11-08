import { Player } from "../../../models/Player";
import ShopItem from "../ShopItem";

export default class EncounterItem extends ShopItem {
    public readonly name = "Encounter";
    public readonly price = 3;

    public purchaseAction(player: Player, quantity: number): void {
        player.extraEncountersLeft += quantity;
    }
}