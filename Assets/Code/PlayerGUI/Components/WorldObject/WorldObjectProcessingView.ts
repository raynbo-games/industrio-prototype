import { WorldObjectPlacementData } from "Code/PlayerDataManager/PlayerSave"
import WorldObjectViewUI from "./WorldObjectView";
import ProcessingWorldObjectDataItem, { ProcessingWorldObjectData } from "Code/InventoryManager/Item/ProcessingWorldObjectDataItem";
import BackpackViewUI from "../Inventory/BackpackViewUI";
import WorldObjectInventoryUI from "../Inventory/WorldObjectInventoryUI";
import InventoryManager from "Code/InventoryManager/InventoryManager";
import StringUtils from "@Easy/Core/Shared/Types/StringUtil";


@AirshipComponentMenu("UI/World Object Processing View")
export default class WorldObjectProcessingViewUI extends WorldObjectViewUI {
    public backpackView: BackpackViewUI;
    public inputView: WorldObjectInventoryUI;
    public outputView: WorldObjectInventoryUI;
    public recipeText: TMP_Text;
    public progressText: TMP_Text;
    public statusText: TMP_Text;
    
    private updateProgress?: () => void;

    @NonSerialized()
    public objectItem: ProcessingWorldObjectDataItem;

    public Initialize(worldId: number, objectData: WorldObjectPlacementData): void {
        const item = InventoryManager.Get().Items.get(objectData.type)!.gameObject.GetAirshipComponent<ProcessingWorldObjectDataItem>()!;
        super.Initialize(worldId, objectData);
        this.worldObjectComponentNameText.text = StringUtils.ncifyVariableName(this.gameObject.name.split("(Clone)").join(""));
        this.objectItem = InventoryManager.Get().Items.get(objectData.type)!.gameObject.GetAirshipComponent<ProcessingWorldObjectDataItem>()!;
        if (!this.objectItem) return;
        this.inputView.Initialize(objectData, 'input');
        this.outputView.Initialize(objectData, 'output');
        this.backpackView.Initialize(this.inputView, item.validItemNames);
        this.OnObjectDataUpdate(objectData);
    }

    public OnObjectDataUpdate(objectData: WorldObjectPlacementData): void {
        this.objectItem = InventoryManager.Get().Items.get(objectData.type)!.gameObject.GetAirshipComponent<ProcessingWorldObjectDataItem>()!;
        if (!this.objectItem) return;
        const data = objectData.data as unknown as ProcessingWorldObjectData;
        const recipe = this.objectItem.recipes.find((r) => r.internalName === data.recipe)
        this.inputView.UpdateData(objectData);
        this.outputView.UpdateData(objectData);
        this.recipeText.text = `Recipe: ${recipe?.displayName ?? "None"}`;
        this.updateProgress = () => {
            this.progressText.text = `Progress: ${recipe ? math.clamp(100 - math.round(((data.time - DateTime.now().TimestampMilliseconds) / (recipe.processingTime * 1000)) * 100), 0, 100) : 0 }%`;
        }
        this.updateProgress();
        this.statusText.text = `Status: ${data.working ? "Processing" : "Inactive"}`;
    }

    protected Update(): void {
        if (this.updateProgress) this.updateProgress();
    }
}