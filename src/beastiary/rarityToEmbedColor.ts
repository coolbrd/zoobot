export default function rarityToEmbedColor(rarity: number): number {
    if (rarity > 30) {
        return 0x4a6068;
    }
    else if (rarity > 25) {
        return 0x428272;
    }
    else if (rarity > 20) {
        return 0x5dc6c1;
    }
    else if (rarity > 15) {
        return 0x5fcca7;
    }
    else if (rarity > 10) {
        return 0x5fcc73;
    }
    else if (rarity > 5) {
        return 0xd2e567;
    }
    else if (rarity > 3) {
        return 0xb767e5;
    }
    else if (rarity > 2) {
        return 0xe54bad;
    }
    else if (rarity > 1) {
        return 0xef1c35;
    }
    else {
        return 0xFFFFFE;
    }
}