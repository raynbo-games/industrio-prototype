using System.Collections.Generic;
using Tayx.Graphy.Utils.NumString;
using UnityEditor;
using UnityEngine;

[CustomAirshipEditor("IdentityData")]
public class IdentityDataEditor : AirshipEditor {
    public override void OnInspectorGUI()
    {
        var id = serializedObject.FindAirshipProperty("id");
        if (!id.numberValue.Equals(0))
        {
            EditorGUILayout.LabelField($"Identity ID: {id.numberValue}");
            PropertyFields("displayName", "description", "icon");
            return;
        }

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
        
        var identities = containerEditor.serializedObject.FindAirshipProperty("identities");
        var ids = new List<int>();
        for (var i = identities.array.size - 1; i >= 0; i--)
        {
            if (identities.array[i].objectReferenceValue == null)
            {
                identities.array.RemoveElementAtIndex(i);
            }
            else
            {
                identities.array[i].TryGetAsScriptableObject(out var identityScriptableObject);
                var identityEditor = AirshipCustomEditors.GetEditor(identityScriptableObject);
                ids.Insert(ids.Count, identityEditor.serializedObject.FindAirshipProperty("id").numberValue.ToInt());
            }
        }

        var nextId = 1;
        while (ids.Contains(nextId)) nextId++;
        id.numberValue = nextId;
        identities.array.InsertLastElement(serializedObject.targetObject);
        
        serializedObject.ApplyModifiedProperties();
        containerEditor.serializedObject.ApplyModifiedProperties();

        EditorGUILayout.LabelField($"Identity ID: {id.numberValue}");
        PropertyFields("displayName", "description", "icon");
        serializedObject.ApplyModifiedProperties();
    }
}