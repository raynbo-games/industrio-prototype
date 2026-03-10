@CreateAssetMenu("Industrio/Identity")
export default class IdentityData extends AirshipScriptableObject {
    public id: number = 0;
    public displayName: string = "";
    public description: string = "";
    public icon?: Sprite;
}