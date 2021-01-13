import Shop from "../Shop";
import CollectionExpander from "../shopItems/CollectionExpander";
import FreeEncounterMaxStackUpgrade from "../shopItems/FreeEncounterMaxStackUpgrade";

class UpgradeShop extends Shop {
    public readonly items = [
        CollectionExpander,
        FreeEncounterMaxStackUpgrade
    ];
}
export default new UpgradeShop;