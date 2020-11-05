import { Player } from "../../models/Player";

export default abstract class ShopItem {
    public abstract readonly name: string;
    public abstract readonly price: number;

    public abstract purchaseAction(player: Player, quantity?: number): void;
}