using System.Collections.Generic;
using Tayx.Graphy.Utils.NumString;
using UnityEditor;
using UnityEngine;

[CustomAirshipEditor("TagData")]
public class TagDataEditor : AirshipEditor {
    public override void OnInspectorGUI()
    {
        Utility.CreatePropertyIfNotExist(serializedObject, "identity", "Assets/Code/Data/IdentityData.ts");
        
        Utility.RenderChildProperty(serializedObject, "identity", "Assets/Code/Data/IdentityData.ts");

        var container = AssetDatabase.LoadAssetAtPath<AirshipScriptableObject>(
            "Assets/Raynbo Games/Data/DataContainer.asset"
        );
        if (container == null)
        {
            Debug.LogError("Data container not found!");
            return;
        }

        var containerEditor = AirshipCustomEditors.GetEditor(container);
        if (containerEditor == null) return;
        
        var tags = containerEditor.serializedObject.FindAirshipProperty("tags");
        var included = false;
        for (var i = 0; i < tags.array.size; i++)
        {
            if (tags.array[i].objectReferenceValue != serializedObject.targetObject) continue;
            included = true;
            break;
        }
        if (!included) tags.array.InsertLastElement(serializedObject.targetObject);
        containerEditor.serializedObject.ApplyModifiedProperties();
        serializedObject.ApplyModifiedProperties();
    }
}