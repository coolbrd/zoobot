import GameObject from "../GameObject";
import ResetField from "./ResetField";

export default class CountedResetField extends ResetField {
    private countFieldName: string;
    private baseCountPerPeriod: number;
    private baseMaxStack: number;
    private premiumCountPerPeriodModifier = 1;
    private premiumMaxStackModifier = 1;

    constructor(info: {
        gameObject: GameObject,
        countFieldName: string,
        lastResetFieldName: string,
        basePeriod: number,
        baseCountPerPeriod: number,
        baseMaxStack: number,
        premiumPeriodModifier?: number,
        premiumCountPerPeriodModifier?: number,
        premiumMaxStackModifier?: number,
        getPremium?: () => boolean
    }) {
        super(info);

        this.countFieldName = info.countFieldName;
        this.baseCountPerPeriod = info.baseCountPerPeriod;
        this.baseMaxStack = info.baseMaxStack;

        if (info.premiumCountPerPeriodModifier) {
            this.premiumCountPerPeriodModifier = info.premiumCountPerPeriodModifier;
        }

        if (info.premiumMaxStackModifier) {
            this.premiumMaxStackModifier = info.premiumMaxStackModifier;
        }
    }

    private get countNoReset(): number {
        return this.gameObject.document.get(this.countFieldName);
    }

    public get count(): number {
        this.applyReset();

        return this.countNoReset;
    }

    public set count(count: number) {
        this.gameObject.setDocumentField(this.countFieldName, count);
    }

    public get countPerPeriod(): number {
        return this.applyPremiumModifier(this.baseCountPerPeriod, this.premiumCountPerPeriodModifier);
    }

    public get maxStack(): number {
        return this.applyPremiumModifier(this.baseMaxStack, this.premiumMaxStackModifier);
    }

    public applyReset(): void {
        const freePeriodsPassed = this.periodsSinceLastReset;

        if (freePeriodsPassed > 0) {
            const countToAdd = freePeriodsPassed * this.countPerPeriod;

            this.count = Math.min(this.countNoReset + countToAdd, this.maxStack);

            this.lastReset = new Date();
        }
    }
}