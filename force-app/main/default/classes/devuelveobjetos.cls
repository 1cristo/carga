public with sharing class devuelveobjetos {
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getAvailableObjects() {
        List<Map<String, String>> objectsInfo = new List<Map<String, String>>();
        Map<String, Schema.SObjectType> globalDescribe = Schema.getGlobalDescribe();

        for (String objName : globalDescribe.keySet()) {
            Schema.DescribeSObjectResult describe = globalDescribe.get(objName).getDescribe();
            
            Map<String, String> objInfo = new Map<String, String>();
            objInfo.put('label', describe.getLabel()); // La etiqueta del objeto para mostrar al usuario
            objInfo.put('apiName', objName); // El API Name del objeto para uso interno

            objectsInfo.add(objInfo);
        }

        // objectsInfo.sort((a, b) -> a.get('label').compareTo(b.get('label')));
        // Elimina o reemplaza la línea anterior para corregir el error

        return objectsInfo;
    }

    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getObjectFields(String objectName) {
        List<Map<String, String>> fieldsInfo = new List<Map<String, String>>();
        
        if (String.isBlank(objectName)) {
            return new List<Map<String, String>>(); // Retorna lista vacía si el nombre del objeto es nulo o vacío.
        }

        Map<String, Schema.SObjectType> globalDescribe = Schema.getGlobalDescribe();
        Schema.SObjectType sObjectType = globalDescribe.get(objectName);
        if (sObjectType == null) {
            return new List<Map<String, String>>(); // Objeto no encontrado, retorna lista vacía.
        }
        
        Schema.DescribeSObjectResult objDescribe = sObjectType.getDescribe();
        for (Schema.SObjectField field : objDescribe.fields.getMap().values()) {
            Map<String, String> fieldInfo = new Map<String, String>();
            fieldInfo.put('label', field.getDescribe().getLabel()); // Etiqueta del campo para mostrar al usuario.
            fieldInfo.put('apiName', field.getDescribe().getName()); // API name del campo para uso interno.
            fieldsInfo.add(fieldInfo);
        }
        
        return fieldsInfo;
    }
}
