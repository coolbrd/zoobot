import { Player } from "../../../structures/GameObject/GameObjects/Player";
import ShopItem from "../ShopItem";

class XpBoostItem extends ShopItem {
    public readonly simpleNames = ["xp boost", "xp", "xp booster"];

    public getName(_player: Player): string {
        return "xp boost";
    }

    public getPrice(_player: Player): number {
        return 60;
    }

    public purchaseAction(player: Player, quantity: number): void {
        player.extraXpBoostsLeft += quantity;
    }

    public getPlayerCurrentAmount(player: Player): number {
        return player.xpBoostsLeft;
    }
}
export default new XpBoostItem();