import { Airship } from "@Easy/Core/Shared/Airship";

@AirshipComponentMenu("Singletons/Settings Manager")
export default class SettingsManager extends AirshipSingleton {
    protected Awake(): void {
        if ($SERVER) return;
        Airship.Settings.AddToggle("Air Place Enabled", false);
        Airship.Settings.AddSlider("Air Place Range", 0.2, 0, 1);
    }

    public GetAirPlaceSettings(): ({
        enabled: boolean,
        range: number,
    }) {
        return {
            enabled: Airship.Settings.GetToggle("Air Place Enabled"),
            range: Airship.Settings.GetSlider("Air Place Range") / 2,
        }
    }
}