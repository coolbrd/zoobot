import { stripIndent } from "common-tags";
import { Player } from "../../../structures/GameObject/GameObjects/Player";
import EmojiManager from "../../EmojiManager";
import ShopItem from "../ShopItem";

class WishlistSlotsUpgrade extends ShopItem {
    public readonly simpleNames = ["wishlist slots", "wish slots", "wishlist size", "wish size"];

    public readonly canBuyMultiple = false;

    public getName(player: Player): string {
        return `wishlist size lvl ${player.wishlistSlotsUpgradeLevel + 1}`;
    }

    public getPrice(player: Player): number {
        return 10000 + player.wishlistSlotsUpgradeLevel * 5000;
    }

    public purchaseAction(player: Player): void {
        player.wishlistSlotsUpgradeLevel += this.purchaseAmount;
    }

    public getPurchaseMessage(player: Player, _quantity: number, price: number, emojiManager: EmojiManager): string {
        const pepEmoji = emojiManager.getByName("pep");
        return stripIndent`
            Success, your wishlist size has been increased by +**${this.purchaseAmount}**, and is now **${player.maxWishlistSize}**!
            -**${price}**${pepEmoji}
        `;
    }

    public getPlayerCurrentAmount(player: Player): number {
        return player.maxWishlistSize;
    }
}
export default new WishlistSlotsUpgrade();