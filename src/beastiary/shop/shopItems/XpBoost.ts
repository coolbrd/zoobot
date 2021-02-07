import { Player } from "../../../structures/GameObject/GameObjects/Player";
import ShopItem from "../ShopItem";

export default class XpBoostItem extends ShopItem {
    public readonly simpleNames = ["xp boost", "xp", "xp booster"];

    public getName(_player: Player): string {
        return "xp boost";
    }

    public getPrice(_player: Player): number {
        return 75;
    }

    public purchaseAction(player: Player, quantity: number): void {
        player.extraXpBoostsLeft += quantity;
    }

    public getPlayerCurrentAmount(player: Player): number {
        return player.xpBoostsLeft;
    }
}