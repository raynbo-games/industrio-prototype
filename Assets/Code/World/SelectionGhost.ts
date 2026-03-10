import WorldManager from "./WorldManager";
import { WorldType } from "./World";
import { Game } from "@Easy/Core/Shared/Game";
import { RaycastData } from "Code/InventoryManager/Item/UseableItem";
import InteractiveWorld from "./InteractiveWorld/InteractiveWorld";

export class SelectionGhost {
    public world: InteractiveWorld;
    public lastData?: RaycastData;
    public object: GameObject;
    public static ghost?: SelectionGhost;

    public CreateSelector(): void {
        const selector = Instantiate(WorldManager.Get().selectionObject, this.world.gameObject.transform);
        const renderer = selector.GetComponent<Renderer>()!;
        renderer.material = WorldManager.Get().blackSelectionMaterial;
        this.object = selector;
        this.object.SetActive(false);
    }

    public Update(): void {
        if (this.object.IsDestroyed()) return;
        const world = WorldManager.Get().GetPlayerActiveWorldComponent(WorldType.InteractiveWorld, Game.localPlayer);
        const data = this.world.RaycastBlock("Select");
        if (json.encode(data) === json.encode(this.lastData)) return;
        this.lastData = data;
        if (!data) return this.object.SetActive(false);
        const targetPosition = world.occupancy.get(data.position);
        if (!targetPosition) return this.object.SetActive(false);
        this.object.transform.position = targetPosition;
        this.object.SetActive(true);
    }

    public Destroy(): void {
        Destroy(this.object);
    }

    public constructor(world: InteractiveWorld) {
        this.world = world;
        this.CreateSelector();
    }

    public static Create(world: InteractiveWorld): SelectionGhost | undefined {
        if (!world.IsAuthorized(Game.localPlayer)) return;
        this.ghost = new SelectionGhost(world);
        return this.ghost;
    }
}