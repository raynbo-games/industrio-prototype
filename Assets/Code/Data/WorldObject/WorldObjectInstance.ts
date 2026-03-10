import { Reflect } from "@Easy/Core/Shared/Flamework";
import { DataStoreStoredValueType } from "Code/PlayerDataManager/PlayerSave";
import { WorldObjectNormal, WorldObjectRotation } from "Code/World/RotationValues";

export class WorldObjectComponentInstance<D extends DataStoreStoredValueType | undefined = undefined> {
    public data?: D;
    public operating?: boolean;
    public working?: boolean;

    public constructor(data?: D, operating?: boolean, working?: boolean) {
        if (data !== undefined) this.data = data;
        if (operating !== undefined) this.operating = operating;
        if (working !== undefined) this.working = working;
    }

    public Stringify(): string {
        const obj: {
            data?: D;
            operating?: boolean;
            working?: boolean;
        } = {};
        if (this.data !== undefined) obj.data = this.data;
        if (this.operating !== undefined) obj.operating = this.operating;
        if (this.working !== undefined) obj.working = this.working;
        return json.encode(obj);
    }

    public Fromstring(str: string): void {
        const obj: {
            data?: D;
            operating?: boolean;
            working?: boolean;
        } = json.decode(str);
        if (obj.data !== undefined) this.data = obj.data;
        if (obj.operating !== undefined) this.operating = obj.operating;
        if (obj.working !== undefined) this.working = obj.working;
    }
}

function Saved() {
  return (target: object, propertyName: string) => {
    Reflect.defineMetadata(target, "object:saved", true, propertyName);
  };
}

export class WorldObjectInstance {
    public item: number;
    public position: Vector3;
    @Saved()
    public rotation?: WorldObjectRotation;
    public normal?: WorldObjectNormal;
    public operating?: boolean;
    public working?: boolean;
    public components?: WorldObjectComponentInstance[];
}