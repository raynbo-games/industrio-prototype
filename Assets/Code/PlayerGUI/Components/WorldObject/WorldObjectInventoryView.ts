import WorldObjectViewUI from "./WorldObjectView";
import BackpackViewUI from "../Inventory/BackpackViewUI";
import WorldObjectInventoryUI from "../Inventory/WorldObjectInventoryUI";
import InventoryManager from "Code/InventoryManager/InventoryManager";
import StringUtils from "@Easy/Core/Shared/Types/StringUtil";
import InventoryWorldObjectDataItem from "Code/InventoryManager/Item/InventoryWorldObjectDataItem";
import { WorldObjectPlacementData } from "Code/PlayerDataManager/PlayerSave";


@AirshipComponentMenu("UI/World Object Inventory View")
export default class WorldObjectInventoryView extends WorldObjectViewUI {
    public backpackView: BackpackViewUI;
    public contentView: WorldObjectInventoryUI;

    @NonSerialized()
    public objectItem: InventoryWorldObjectDataItem;

    public Initialize(worldId: number, objectData: WorldObjectPlacementData): void {
        super.Initialize(worldId, objectData);
        this.worldObjectComponentNameText.text = StringUtils.ncifyVariableName(this.gameObject.name.split("(Clone)").join(""));
        this.objectItem = InventoryManager.Get().Items.get(objectData.type)!.gameObject.GetAirshipComponent<InventoryWorldObjectDataItem>()!;
        if (!this.objectItem) return;
        this.contentView.Initialize(objectData);
        this.backpackView.Initialize(this.contentView);
        this.OnObjectDataUpdate(objectData);
    }

    public OnObjectDataUpdate(objectData: WorldObjectPlacementData): void {
        this.contentView.UpdateData(objectData)
    }
}