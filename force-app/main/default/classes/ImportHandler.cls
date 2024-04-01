public with sharing class ImportHandler {
    @AuraEnabled
    public static String importCsvRecords(String objectApiName, List<Map<String, Object>> mappedRecords) {
        if (String.isBlank(objectApiName)) {
            return 'Error: Nombre del objeto no proporcionado.';
        }

        SObjectType targetType = Schema.getGlobalDescribe().get(objectApiName);
        if (targetType == null) {
            return 'Error: Objeto no válido o no encontrado.';
        }

        List<SObject> recordsToUpsert = new List<SObject>();

        // Log de inicio de procesamiento
        System.debug('Inicio de la importación para el objeto: ' + objectApiName);
        System.debug('Registros a importar: ' + JSON.serialize(mappedRecords));

        for (Map<String, Object> recordMap : mappedRecords) {
            SObject record = targetType.newSObject();

            Map<String, Schema.SObjectField> fieldMap = targetType.getDescribe().fields.getMap();
            
            for (String fieldName : recordMap.keySet()) {
                if (fieldMap.containsKey(fieldName)) {
                    record.put(fieldName, recordMap.get(fieldName));
                } else {
                    System.debug('El campo ' + fieldName + ' no existe en el objeto ' + objectApiName + '. Se omite este campo.');
                }
            }

            recordsToUpsert.add(record);
        }

        try {
            upsert recordsToUpsert;
            System.debug('Registros procesados con éxito: ' + recordsToUpsert.size());
            return 'Importación exitosa. Registros procesados: ' + recordsToUpsert.size();
        } catch (Exception e) {
            System.debug('Error durante la importación: ' + e.getMessage());
            return 'Error durante la importación: ' + e.getMessage();
        }
    }

    @AuraEnabled
    public static String actualizarRegistrosCsv(String objectApiName, List<Map<String, Object>> mappedRecords) {
        if (String.isBlank(objectApiName)) {
            return 'Error: Nombre del objeto no proporcionado.';
        }

        SObjectType targetType = Schema.getGlobalDescribe().get(objectApiName);
        if (targetType == null) {
            return 'Error: Objeto no válido o no encontrado.';
        }

        List<SObject> recordsToUpdate = new List<SObject>();

        // Log de inicio de procesamiento
        System.debug('Inicio de la actualización para el objeto: ' + objectApiName);
        System.debug('Registros a actualizar: ' + JSON.serialize(mappedRecords));

        for (Map<String, Object> recordMap : mappedRecords) {
            // Asumimos que 'Id' es parte del mapa para identificar registros existentes
            if (!recordMap.containsKey('Id')) {
                continue; // Saltar este registro si no tiene Id
            }

            String recordId = (String) recordMap.remove('Id'); // Extraer y eliminar el Id para evitar intentar actualizar este campo directamente
            SObject record = targetType.newSObject(recordId, true);

            Map<String, Schema.SObjectField> fieldMap = targetType.getDescribe().fields.getMap();
            
            for (String fieldName : recordMap.keySet()) {
                if (fieldMap.containsKey(fieldName)) {
                    record.put(fieldName, recordMap.get(fieldName));
                } else {
                    System.debug('El campo ' + fieldName + ' no existe en el objeto ' + objectApiName + '. Se omite este campo.');
                }
            }

            recordsToUpdate.add(record);
        }

        try {
            Database.update(recordsToUpdate, false); // Usar el modo de fallo parcial para tratar de actualizar tantos registros como sea posible
            System.debug('Registros actualizados con éxito: ' + recordsToUpdate.size());
            return 'Actualización exitosa. Registros procesados: ' + recordsToUpdate.size();
        } catch (Exception e) {
            System.debug('Error durante la actualización: ' + e.getMessage());
            return 'Error durante la actualización: ' + e.getMessage();
        }
    }

}