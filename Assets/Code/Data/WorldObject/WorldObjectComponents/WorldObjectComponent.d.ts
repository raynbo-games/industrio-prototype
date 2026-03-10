import ItemData from "../../Item/ItemData";
import { Player } from "@Easy/Core/Shared/Player/Player";

export default interface IWorldObjectComponent<T extends object | undefined = undefined> {
    name: string;
    priority: number;

    Load?(item: ItemData, data: string): T;
    Unload?(item: ItemData, data: T): string;
    OnInitialized?(item: ItemData, data: T): void;
    OnTick?(item: ItemData, data: T): void;
    OnStartedWorking?(item: ItemData, data: T): void;
    OnStoppedWorking?(item: ItemData, data: T): void;
    OnStartedOperating?(item: ItemData, data: T): void;
    OnStoppedOperating?(item: ItemData, data: T): void;
    OnDestroyed?(item: ItemData, data: T, player?: Player): void

}