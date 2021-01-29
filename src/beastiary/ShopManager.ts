import BeastiaryClient from "../bot/BeastiaryClient";
import ItemShop from "./shop/shops/ItemShop";
import UpgradeShop from "./shop/shops/UpgradeShop";

export default class ShopManager {
    public readonly beastiaryClient: BeastiaryClient;

    public readonly itemShop: ItemShop;
    public readonly upgradeShop: UpgradeShop;

    constructor(beastiaryClient: BeastiaryClient) {
        this.beastiaryClient = beastiaryClient;

        this.itemShop = new ItemShop(beastiaryClient).init();
        this.upgradeShop = new UpgradeShop(beastiaryClient).init();
    }
}