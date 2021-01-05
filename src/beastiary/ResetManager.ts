import gameConfig from "../config/gameConfig";
import { todaysMilliseconds } from "../utility/timeStuff";

export default class ResetManager {
    public getLastResetByPeriod(period: number): Date {
        const now = new Date();

        const millisecondsSinceLastReset = todaysMilliseconds() % period;

        return new Date(now.valueOf() - millisecondsSinceLastReset);
    }

    public getNextResetByPeriod(period: number): Date {
        return new Date(this.getLastResetByPeriod(period).valueOf() + period);
    }

    public getPeriodsSinceLastReset(lastReset: Date, lastGlobalReset: Date, period: number): number {
        const lastResetMS = lastReset.valueOf();
        const globalLastResetMS = lastGlobalReset.valueOf();

        if (lastResetMS >= globalLastResetMS) {
            return 0;
        }

        const timeSinceLastResetMS = globalLastResetMS - lastResetMS;
        const periodsPassedSinceLastReset = Math.ceil(timeSinceLastResetMS / period);

        return periodsPassedSinceLastReset;
    }

    public get lastCaptureReset(): Date {
        return this.getLastResetByPeriod(gameConfig.freeCapturePeriod);
    }

    public get nextCaptureReset(): Date {
        return this.getNextResetByPeriod(gameConfig.freeCapturePeriod);
    }

    public get lastEncounterReset(): Date {
        return this.getLastResetByPeriod(gameConfig.freeEncounterPeriod);
    }

    public get nextEncounterReset(): Date {
        return this.getNextResetByPeriod(gameConfig.freeEncounterPeriod)
    }

    public get lastXpBoostReset(): Date {
        return this.getLastResetByPeriod(gameConfig.freeXpBoostPeriod);
    }

    public get nextXpBoostReset(): Date {
        return this.getNextResetByPeriod(gameConfig.freeXpBoostPeriod);
    }
}