import { Player } from "../../structures/GameObject/GameObjects/Player";
import Emojis from "../Emojis";
import Shop from "./Shop";

export default abstract class ShopItem {
    public abstract readonly simpleNames: string[];

    protected shop: Shop;

    public readonly canBuyMultiple: boolean = true;
    public readonly effectiveChangeAmount: number = 1;
    public readonly inline: boolean = true;

    constructor(shop: Shop) {
        this.shop = shop;
    }

    public abstract getName(player: Player): string;

    public abstract getPrice(player: Player): number;

    public abstract purchaseAction(player: Player, quantity?: number): void;

    public abstract getPlayerCurrentAmount(player: Player): number;

    public getPurchaseMessage(player: Player, quantity: number, price: number): string {
        return `Purchase successful. You bought **${this.getName(player)} (x${quantity})** for **${price}**${Emojis.pep}.`
    }
}