import IdentityData from "./IdentityData";
import ItemData from "./Item/ItemData";
import TagData from "./Item/TagData";

@CreateAssetMenu("Industrio/Data Container")
export default class DataContainer extends AirshipScriptableObject {
    public identities: IdentityData[] = [];
    public items: ItemData[] = [];
    public tags: TagData[] = [];
}