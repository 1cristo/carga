public with sharing class FileContentFetcher {

    // Clase interna para representar la estructura de documentos.
    public class ContentDocumentDTO {
        @AuraEnabled public Id Id;
        @AuraEnabled public String Title;

        public ContentDocumentDTO(Id id, String title) {
            this.Id = id;
            this.Title = title;
        }
    }

    // Método para obtener todos los archivos CSV de la organización.
    @AuraEnabled(cacheable=true)
    public static List<ContentDocumentDTO> getAllCsvFiles() {
        List<ContentDocumentDTO> csvFiles = new List<ContentDocumentDTO>();
        // Obtiene todos los ContentDocument que son de tipo CSV.
        for (ContentDocument doc : [SELECT Id, Title FROM ContentDocument WHERE FileExtension = 'csv']) {
            csvFiles.add(new ContentDocumentDTO(doc.Id, doc.Title));
        }
        return csvFiles;
    }
    
    // Método para obtener el contenido de un archivo CSV como una cadena.
    @AuraEnabled
    public static String fetchFileContentById(Id documentId) {
        ContentVersion latestVersion = [SELECT VersionData FROM ContentVersion WHERE ContentDocumentId = :documentId AND IsLatest = true LIMIT 1];
        if (latestVersion != null) {
            String fileContentBase64 = EncodingUtil.base64Encode(latestVersion.VersionData);
            // Decodificar el contenido de base64 a string si es necesario
            // String fileContent = EncodingUtil.base64Decode(fileContentBase64).toString();
            // return fileContent;
            return fileContentBase64; // Devolver como base64 si se decodificará en el lado del cliente
        }
        return null;
    }
}