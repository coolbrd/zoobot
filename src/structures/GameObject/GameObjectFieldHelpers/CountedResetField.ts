import GameObject from "../GameObject";
import ResetField from "./ResetField";

export default class CountedResetField extends ResetField {
    private countFieldName: string;
    private baseCountPerPeriod: number;
    private premiumCountPerPeriodModifier = 1;
    private getMaxStack: () => number;

    constructor(info: {
        gameObject: GameObject,
        countFieldName: string,
        lastResetFieldName: string,
        basePeriod: number,
        baseCountPerPeriod: number,
        getMaxStack: () => number,
        premiumPeriodModifier?: number,
        premiumCountPerPeriodModifier?: number,
        getPremium?: () => boolean
    }) {
        super(info);

        this.countFieldName = info.countFieldName;
        this.baseCountPerPeriod = info.baseCountPerPeriod;

        this.getMaxStack = info.getMaxStack;

        if (info.premiumCountPerPeriodModifier) {
            this.premiumCountPerPeriodModifier = info.premiumCountPerPeriodModifier;
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

    public applyReset(): void {
        const freePeriodsPassed = this.periodsSinceLastReset;

        if (freePeriodsPassed > 0) {
            const countToAdd = freePeriodsPassed * this.countPerPeriod;

            this.count = Math.min(this.countNoReset + countToAdd, this.getMaxStack());

            this.lastReset = new Date();
        }
    }
}