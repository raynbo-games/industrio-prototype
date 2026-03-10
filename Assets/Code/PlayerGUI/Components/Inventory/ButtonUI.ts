import { Bin } from "@Easy/Core/Shared/Util/Bin";
import { SignalPriority } from "@Easy/Core/Shared/Util/Signal";

@AirshipComponentMenu("UI/Button")
export default class ButtonUI extends AirshipBehaviour {
    @SerializeField() protected button: Button;
    public bin = new Bin();

    @Client()
    public ConnectClick(func: () => void, priority: SignalPriority = SignalPriority.NORMAL): MonoSignalConnection {
        const conn = this.button.onClick.ConnectWithPriority(priority, () => func());
        this.bin.Add(conn);
        return conn;
    }

    protected OnDestroy(): void {
        this.bin.Clean();
    }
}