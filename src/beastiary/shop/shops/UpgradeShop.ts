import Shop from "../Shop";
import CollectionExpander from "../shopItems/CollectionExpander";

class UpgradeShop extends Shop {
    public readonly items = [
        CollectionExpander
    ];
}
export default new UpgradeShop;