export class ReturnSuccess<ReturnType = string, SuccessType extends boolean = boolean> {
    public readonly success: SuccessType;
    public readonly value?: SuccessType extends true ? ReturnType : string;

    public constructor(success: SuccessType, value?: SuccessType extends true ? ReturnType : string) {
        this.success = success;
        this.value = value;
    }
}

@AirshipComponentMenu("Singletons/Logger")
export default class Logger extends AirshipSingleton {

    @SerializeField()
    private debugEnabled: boolean = false;

    public DebugPrint(msg: unknown): void {
        if (this.debugEnabled) print(msg);
    }

    public DebugWarn(msg: unknown): void {
        if (this.debugEnabled) warn(msg);
    }

    public DebugError(msg: unknown): void {
        if (this.debugEnabled) throw error(msg);
    }

    public Print(msg: unknown): void {
        print(msg);
    }

    public Warn(msg: unknown): void {
        warn(msg);
    }

    public Error(msg: unknown): void {
        throw error(msg);
    }
}
