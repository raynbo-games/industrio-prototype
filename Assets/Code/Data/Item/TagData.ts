import IdentityData from "../IdentityData";
import ItemData from "./ItemData";

@CreateAssetMenu("Industrio/Item/Tag")
export default class TagData extends AirshipScriptableObject {
    public identity: IdentityData;
    @NonSerialized() public items: ItemData[] = [];
}