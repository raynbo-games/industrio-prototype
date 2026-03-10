import IdentityData from "../IdentityData";
import TagData from "./TagData";
import MiningToolData from "../Tool/MiningToolData";
import WorldObjectData from "../WorldObject/WorldObjectData";
import { Player } from "@Easy/Core/Shared/Player/Player";
import InputManager from "Code/Input/InputManager";
import InventoryManager from "Code/InventoryManager/InventoryManager";

@CreateAssetMenu("Industrio/Item/Item")
export default class ItemData extends AirshipScriptableObject {
    public identity: IdentityData;
    public tags: TagData[];
    public accessory: AccessoryComponent;
    public worldObject?: WorldObjectData;
    public miningTool?: MiningToolData;

    public Equip(player: Player): void {
        if ($SERVER) return;
        InventoryManager.Get().onItemEquipChangedNetSignal.client.FireServer(this.identity.id, true);
        InputManager.Get().holdItemAnimation.Play(player);
    }

    public Unequip(player: Player): void {
        if ($SERVER) return;
        InventoryManager.Get().onItemEquipChangedNetSignal.client.FireServer(this.identity.id, false);
        InputManager.Get().holdItemAnimation.Stop(player);
    }
}