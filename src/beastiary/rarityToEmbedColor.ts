interface RarityInfo {
    text: string,
    color: number
}

// Gets some visual indication info for any given weighted rarity value
export default function getRarityInfo(rarity: number): RarityInfo {
    if (rarity > 30) {
        return {
            text: "very common",
            color: 0x4a6068
        }
    }
    else if (rarity > 25) {
        return {
            text: "common",
            color: 0x428272
        }
    }
    else if (rarity > 20) {
        return {
            text: "somewhat common",
            color: 0x5dc6c1
        }
    }
    else if (rarity > 15) {
        return {
            text: "uncommon",
            color: 0x5fcca7
        }
    }
    else if (rarity > 10) {
        return {
            text: "very uncommon",
            color: 0x5fcc73
        }
    }
    else if (rarity > 5) {
        return {
            text: "rare",
            color: 0xd2e567
        }
    }
    else if (rarity > 3) {
        return {
            text: "very rare",
            color: 0xb767e5
        }
    }
    else if (rarity > 2) {
        return {
            text: "legendary",
            color: 0xe54bad
        }
    }
    else if (rarity > 1) {
        return {
            text: "mythical",
            color: 0xef1c35
        }
    }
    else if (rarity > 0) {
        return {
            text: "unheard of",
            color: 0xFFFFFE
        }
    }
    else {
        return {
            text: "nonexistant",
            color: 0x000000
        }
    }
}