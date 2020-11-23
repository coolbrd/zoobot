import { Player } from "../../structures/GameObject/GameObjects/Player";

export default abstract class ShopItem {
    public abstract readonly simpleNames: string[];

    public readonly canBuyMultiple: boolean = true;

    public abstract getName(player: Player): string;

    public abstract getPrice(player: Player): number;

    public abstract purchaseAction(player: Player, quantity?: number): void;
}