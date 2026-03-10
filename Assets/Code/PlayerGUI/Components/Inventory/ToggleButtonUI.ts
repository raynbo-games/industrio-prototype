import { SignalPriority } from "@Easy/Core/Shared/Util/Signal";
import ButtonUI from "./ButtonUI";

@AirshipComponentMenu("UI/Toggle Button")
export default class ToggleButtonUI extends ButtonUI {
    @SerializeField() protected toggled: boolean = false;

    @Client()
    public IsToggled(): boolean {
        return this.toggled;
    }

    protected Awake(): void {
        this.bin.Add(this.ConnectClick(() => {
            if (this.toggled) this.toggled = false;
            else this.toggled = true;
        }, SignalPriority.HIGHEST));
    }

    @Client()
    public ConnectToggled(func: () => void, priority: SignalPriority = SignalPriority.NORMAL): MonoSignalConnection {
        const conn = this.button.onClick.ConnectWithPriority(priority, () => func());
        this.bin.Add(conn);
        return conn;
    }

    @Client()
    public ConnectEnabled(func: () => void, priority: SignalPriority = SignalPriority.NORMAL): MonoSignalConnection {
        const conn = this.ConnectToggled(() => {
            if (this.toggled) func();
        }, priority);
        return conn;
    }

    @Client()
    public ConnectDisabled(func: () => void, priority: SignalPriority = SignalPriority.NORMAL): MonoSignalConnection {
        const conn = this.ConnectToggled(() => {
            if (!this.toggled) func();
        }, priority);
        return conn;
    }
}