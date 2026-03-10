import { Mouse } from "@Easy/Core/Shared/UserInput";
import { Bin } from "@Easy/Core/Shared/Util/Bin";
import InventoryManager from "Code/InventoryManager/InventoryManager";
import WorldObjectItem from "Code/InventoryManager/Item/WorldObjectItem";
import { WorldObjectPlacementData } from "Code/PlayerDataManager/PlayerSave";
import PlayerGUI from "Code/PlayerGUI/PlayerGUI";
import InteractiveWorld from "Code/World/InteractiveWorld/InteractiveWorld";


@AirshipComponentMenu("UI/World Object View")
export default abstract class WorldObjectViewUI extends AirshipBehaviour {
    public worldObjectNameText: TMP_Text;
    public worldObjectComponentNameText: TMP_Text;

    private position: Vector3;
    private worldId: number;

    public bin = new Bin();
    
    public Initialize(worldId: number, objectData: WorldObjectPlacementData): void {
        this.bin.Add(Mouse.AddUnlocker());
        this.worldId = worldId;
        this.position = objectData.position;
        const item = InventoryManager.Get().Items.get(objectData.type)?.gameObject.GetAirshipComponent<WorldObjectItem>();
        if (!item || !item.view) return Destroy(this.gameObject);
        this.worldObjectNameText.text = item.displayName;
        this.worldObjectComponentNameText.text = this.gameObject.name;

        this.bin.Add(InteractiveWorld.onObjectDataUpdated.client.OnServerEvent((objectData) => {
            if (!objectData) return Destroy(this.gameObject);
            this.OnObjectDataUpdate(objectData);
        }));

        this.OnObjectDataUpdate(objectData);
    }

    public OnDestroy(): void {
        this.bin.Clean();
        InteractiveWorld.onObjectViewClosed.client.FireServer(this.worldId, this.position);
        PlayerGUI.Get().view = undefined;
    }

    public abstract OnObjectDataUpdate(objectData: WorldObjectPlacementData): void;
}