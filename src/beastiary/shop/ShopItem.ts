import { Player } from "../../structures/GameObject/GameObjects/Player";

export default abstract class ShopItem {
    public abstract getName(player: Player): string;

    public abstract getPrice(player: Player): number;

    public abstract purchaseAction(player: Player, quantity?: number): void;
}