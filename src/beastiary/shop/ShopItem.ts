import { Player } from "../../structures/GameObject/GameObjects/Player";
import Shop from "./Shop";

export default abstract class ShopItem {
    protected shop: Shop;

    public abstract readonly simpleNames: string[];

    public readonly canBuyMultiple: boolean = true;
    public readonly purchaseAmount: number = 1;
    public readonly effectiveUpgradeAmount: number = 1;

    constructor(shop: Shop) {
        this.shop = shop;
    }

    public abstract getName(player: Player): string;

    public abstract getPrice(player: Player): number;

    public abstract purchaseAction(player: Player, quantity?: number): void;

    public abstract getPlayerCurrentAmount(player: Player): number;

    public getPurchaseMessage(player: Player, quantity: number, price: number): string {
        const pepEmoji = this.shop.beastiaryClient.beastiary.emojis.getByName("pep");
        return `Purchase successful. You bought **${this.getName(player)} (x${quantity})** for **${price}**${pepEmoji}.`
    }
}