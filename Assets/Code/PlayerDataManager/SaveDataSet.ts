import { Platform } from "@Easy/Core/Shared/Airship";

export interface GlobalSaveDataKnown {
    version: number;
    [key: string]: unknown;
}

export default class SaveDataSet<D extends { version: number }> {

    public name: string;
    public keyPrefix: string;

    public versions: {[version: number]: (last: { version: number }) => { version: number }};
    
    public constructor(name: string, versions: {[version: number]: (last: { version: number }) => { version: number }}) {
        this.keyPrefix = name;
        this.versions = versions;
    }

    public UpdateSave(save: { version: number }): D {
        if (!(save.version + 1 in this.versions)) return save as D;
        return this.UpdateSave(this.versions[save.version + 1](save));
    }

    public GetDefaultSave(): D {
        const save = (this.UpdateSave(this.versions[0]({ version: -1 })));
        return save;
    }

    public Get(key: string, override: (save: D) => D): D | undefined {
        if (!Platform.Server.DataStore.LockKeyOrStealSafely(`${this.keyPrefix}:${key}`).await()[1]) return;
        let save = Platform.Server.DataStore.GetKey<D>(
            `${this.keyPrefix}:${key}`,
        ).await()[1] as D | undefined;

        if (!save || !("version" in save)) {
            save = this.GetDefaultSave();
        } else {
            save = this.UpdateSave(save);
        }

        return override(save);
    }

    public Set(key: string, data: D): void {
        Platform.Server.DataStore.SetKey(`${this.keyPrefix}:${key}`, data).await();
        Platform.Server.DataStore.UnlockKey(`${this.keyPrefix}:${key}`).await();
    }

    public CleanUp(key: string): void {
        Platform.Server.DataStore.UnlockKey(`${this.keyPrefix}:${key}`).await();
    }
}