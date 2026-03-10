using System.Collections.Generic;
using Tayx.Graphy.Utils.NumString;
using UnityEditor;
using UnityEngine;

[CustomAirshipEditor("ItemData")]
public class ItemDataEditor : AirshipEditor {
    public override void OnInspectorGUI()
    {
        Utility.CreatePropertyIfNotExist(serializedObject, "identity", "Assets/Code/Data/IdentityData.ts");
        
        Utility.RenderChildProperty(serializedObject, "identity", "Assets/Code/Data/IdentityData.ts");
        
        EditorGUILayout.LabelField("Item Data");
        EditorGUILayout.BeginVertical(new GUIStyle("FrameBox") { padding = new RectOffset(5, 5, 5, 5), margin = new RectOffset(10, 10, 5, 5) });
        PropertyField("tags");
        EditorGUILayout.EndVertical();
        
        Utility.RenderChildProperty(serializedObject, "miningTool", "Assets/Code/Data/Tool/MiningToolData.ts");
        Utility.RenderChildProperty(serializedObject, "worldObject", "Assets/Code/Data/WorldObject/WorldObjectData.ts");
        
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
        
        var items = containerEditor.serializedObject.FindAirshipProperty("items");
        var included = false;
        for (var i = 0; i < items.array.size; i++)
        {
            if (items.array[i].objectReferenceValue != serializedObject.targetObject) continue;
            included = true;
            break;
        }
        if (!included) items.array.InsertLastElement(serializedObject.targetObject);
        containerEditor.serializedObject.ApplyModifiedProperties();
        serializedObject.ApplyModifiedProperties();
    }
}