import Shop from "../Shop";
import CaptureItem from "../shopItems/Capture";
import EncounterItem from "../shopItems/Encounter";
import XpBoostItem from "../shopItems/XpBoost";

class ItemShop extends Shop {
    public readonly items = [
        EncounterItem,
        CaptureItem,
        XpBoostItem
    ];
}
export default new ItemShop();