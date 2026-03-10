import { Player } from "@Easy/Core/Shared/Player/Player";
import { ReturnSuccess } from "Code/Logger";
import ItemData from "./Item/ItemData";

export interface IUseableItem {
    item: ItemData;
    timeout: number;
    continualUseEnabled: boolean;
    OnEquipClient?(player: Player): void;
    OnUnequipClient?(player: Player): void;
    CanUse?(player: Player): ReturnSuccess;
    CanUseClient?(player: Player): ReturnSuccess;
    CanUseServer?(player: Player): ReturnSuccess;
    OnUse?(player: Player): void;
    OnUseClient?(player: Player): void;
    OnUseServer?(player: Player): void;
}