using System.Collections.Generic;
using Tayx.Graphy.Utils.NumString;
using UnityEditor;
using UnityEngine;


public static class Utility
{
    public static void RenderChildProperty(AirshipSerializedObject serializedObject, string propertyName, string scriptPath)
    {
        var property = serializedObject.FindAirshipProperty(propertyName);
        AirshipEditorGUI.PropertyField(property);
        if (serializedObject.FindAirshipProperty(propertyName).objectReferenceValue == null)
        {
            if (GUILayout.Button($"Add {ObjectNames.NicifyVariableName(propertyName)}"))
            {
                CreatePropertyIfNotExist(serializedObject, propertyName, scriptPath);
            }
            else
            {
                serializedObject.ApplyModifiedProperties();
                return;
            }
        }
        property.TryGetAsScriptableObject(out var identityScriptableObject);
        
        EditorGUILayout.BeginVertical(new GUIStyle("FrameBox")
        {
            padding = new RectOffset(5, 5, 5, 5), 
            margin = new RectOffset(10, 10, 5, 5)
        });
        
        if (identityScriptableObject != null)
        {
            var identityEditor = AirshipCustomEditors.GetEditor(identityScriptableObject);
            identityEditor.OnInspectorGUI();
            identityEditor.serializedObject.ApplyModifiedProperties();
        }

        EditorGUILayout.EndVertical();
        serializedObject.ApplyModifiedProperties();
    }

    public static void CreatePropertyIfNotExist(AirshipSerializedObject serializedObject, string propertyName, string scriptPath)
    {
        if (serializedObject.FindAirshipProperty(propertyName).objectReferenceValue != null) return;
        var property = AirshipScriptableObject.CreateInstance(scriptPath);
        property.name = $"{serializedObject.targetObject.name}.{propertyName}";
        AssetDatabase.AddObjectToAsset(property, serializedObject.targetObject);
        AssetDatabase.ImportAsset(AssetDatabase.GetAssetPath(serializedObject.targetObject));
        serializedObject.FindAirshipProperty(propertyName).objectReferenceValue = property;
        serializedObject.ApplyModifiedProperties();
    }
}