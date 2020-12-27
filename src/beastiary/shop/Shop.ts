import { stripIndent } from "common-tags";
import { Player } from "../../structures/GameObject/GameObjects/Player";
import UserError from "../../structures/UserError";
import { capitalizeFirstLetter } from "../../utility/arraysAndSuch";
import EmojiManager from '../EmojiManager';
import ShopItem from "./ShopItem";

export interface ShopReceipt {
    itemName: string,
    quantity: number,
    nameAndQuantity: string,
    totalPrice: number
}

export default abstract class Shop {
    protected abstract readonly items: ShopItem[];

    private resolveStringToItem(itemString: string): ShopItem | undefined {
        const itemNumber = Number(itemString) - 1;
        
        if (!isNaN(itemNumber)) {
            if (itemNumber < 0 || itemNumber >= this.items.length) {
                return undefined;
            }

            return this.items[itemNumber];
        }

        return this.items.find(currentItem => {
            return currentItem.simpleNames.includes(itemString.toLowerCase());
        });
    }

    public attemptToPurchase(emojiManager: EmojiManager, itemString: string, player: Player, quantity = 1): ShopReceipt {
        const selectedItem = this.resolveStringToItem(itemString);

        if (!selectedItem) {
            throw new UserError("No item with that name/number exists in this shop.");
        }

        if (!selectedItem.canBuyMultiple) {
            quantity = 1;
        }

        if (quantity <= 0) {
            throw new UserError("You can't buy less than one item from the shop!");
        }

        const itemName = capitalizeFirstLetter(selectedItem.getName(player));
        const itemPrice = selectedItem.getPrice(player);

        const totalPrice = itemPrice * quantity;

        const itemNameAndQuantity = `${itemName} (x${quantity})`;

        const pepEmoji = emojiManager.getByName("pep");

        if (totalPrice > player.pep) {
            throw new UserError(stripIndent`
                You don't have enough pep to buy **${itemNameAndQuantity}**.
                Cost: **${totalPrice}**${pepEmoji}. You have: **${player.pep}**${pepEmoji}.
            `);
        }

        player.pep -= totalPrice;

        selectedItem.purchaseAction(player, quantity);

        const purchaseReceipt: ShopReceipt = {
            itemName: itemName,
            quantity: quantity,
            nameAndQuantity: itemNameAndQuantity,
            totalPrice: totalPrice
        };

        return purchaseReceipt;
    }
}