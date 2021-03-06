import { Player } from "../../../structures/GameObject/GameObjects/Player";
import ShopItem from "../ShopItem";

export default class CaptureItem extends ShopItem {
    public readonly simpleNames = ["capture", "c"];

    public getName(_player: Player): string {
        return "capture";
    }

    public getPrice(_player: Player): number {
        return 500;
    }

    public purchaseAction(player: Player, quantity: number): void {
        player.extraCapturesLeft += quantity;
    }

    public getPlayerCurrentAmount(player: Player): number {
        return player.capturesLeft;
    }
}