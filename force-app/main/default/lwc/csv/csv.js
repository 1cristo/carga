// csv.js
import { LightningElement, track, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getObjectFields from '@salesforce/apex/devuelveobjetos.getObjectFields';
import getAvailableObjects from '@salesforce/apex/devuelveobjetos.getAvailableObjects';
import importCsvRecords from '@salesforce/apex/importHandler.importCsvRecords';

export default class ImportarYmapearRegistros extends LightningElement {
    @api type;
    @track importDate;
    @track filePath;
    @track importMessage = '';
    @track importMessageClass = '';
    @track importedData = [];
    @track columns = []; // Para los campos CSV
    @track column = []; // Para los campos CSV
    @track showFirstComponent = true;
    @track importSuccessful = false;
    @track showFields = false;
    @track combinedFields = [];
    @track showUploadSection = false;  // Añade esta línea para controlar la visualización de la sección de carga de archivos CSV
    @track selectedObject = ''; // Ahora es una variable de seguimiento
    @track objectFieldOptions = [];
    @track isModalOpen = false;
    @track selectedField = '';
    @track objectOptions = []; // Para las opciones de objeto disponibles
    @api csvHeaders = []; // Asumiendo que esto se usa para algo específico, lo mantenemos
    @api selectedObjectFields = [];
    currentRowIndex = null;
    isModalOpen = false;
    selectedField = '';

    searchTerm = ''; // Variable para almacenar el término de búsqueda
    filteredObjects = []; // Array para almacenar los objetos filtrados basados en el término de búsqueda

    @track showObjectSelection = true;
    @track showUploadSection = false;
    @track showFields = false;
    @track isModalOpen = false;

    // Métodos para cambiar las variables de estado
    mostrarUploadSection() {
        this.showObjectSelection = false;
        this.showUploadSection = true;
    }

    mostrarFields() {
        this.showUploadSection = false;
        this.showFields = true;
    }

    openModal() {
        this.isModalOpen = true;
    }

    closeModal() {
        this.isModalOpen = false;
    }

    
    // Obtener los objetos disponibles para seleccionar
    @wire(getAvailableObjects)
    wiredObjects({ error, data }) {
        if (data) {
            this.objectOptions = data.map(option => ({
                label: option.label, // Usa la etiqueta para mostrar al usuario en el combobox
                value: option.apiName // Usa el API name como valor interno para operaciones
            }));
        } else if (error) {
            console.error('Error loading available objects:', error);
        }
    }
    // Método para confirmar la selección del objeto y mostrar la plantilla de carga de archivos CSV
    confirmarSeleccion() {
        // Verifica que haya un objeto seleccionado antes de mostrar la sección de carga
        if (this.selectedObject) {
            this.showUploadSection = true;  // Esto hará que la sección de carga de archivos CSV sea visible
        } else {
            // Puedes añadir un mensaje de error o simplemente no hacer nada si no se ha seleccionado ningún objeto.
            this.updateImportMessage('Por favor, seleccione un objeto antes de continuar.', 'error');
        }
    }

    // Manejador de cambio para el campo de búsqueda
    handleSearchChange(event) {
        this.searchTerm = event.target.value.toLowerCase();
        this.filteredObjects = this.objectOptions.filter(obj =>
            obj.label.toLowerCase().includes(this.searchTerm));
        this.showResults = this.filteredObjects.length > 0;
        this.disableNext = !this.showResults;
    }

    handleObjectSelection(event) {
        this.selectedObject = event.currentTarget.dataset.value;
        this.searchTerm = this.selectedObject;
        this.showResults = false;
        this.disableNext = false;
        this.updateObjectFields();
    }


    filterObjects() {
        if (this.searchTerm) {
            // Filtra los objetos basados en el término de búsqueda
            this.filteredObjects = this.objectOptions.filter(obj => obj.label.toLowerCase().includes(this.searchTerm));
        } else {
            // Si el término de búsqueda está vacío, muestra todos los objetos disponibles
            this.filteredObjects = this.objectOptions;
        }
    }

    // Manejador de cambio para el objeto seleccionado
    handleObjectChange(event) {
        this.selectedObject = event.detail.value;
        this.fetchObjectFields(); // Llama al método para obtener los campos después de seleccionar un objeto
    }
    
    handleFileChange(event) {
        const selectedFile = event.target.files[0];
        if (!selectedFile) {
            this.updateImportMessage('No se seleccionó ningún archivo.', 'error');
            return;
        }
    
        this.filePath = selectedFile.name;
        const reader = new FileReader();
    
        reader.onload = () => {
            const csvContent = reader.result;
            const lines = csvContent.split('\n').filter(line => line.trim() !== '');
            if (lines.length < 2) {
                this.updateImportMessage('El archivo está vacío o no tiene el formato correcto.', 'error');
                return;
            }
    
            const headers = lines[0].split(',').map(header => header.trim());
            this.columns = headers.map(header => ({ label: header, fieldName: header, type: 'text' }));
    
            this.importedData = lines.slice(1).map(line => line.split(',').reduce((record, value, index) => {
                record[headers[index]] = value.trim();
                return record;
            }, {}));
    
            this.updateImportMessage('Datos preparados para importar.', 'success');
            this.importSuccessful = true;
            
        };
    
        reader.onerror = () => this.updateImportMessage('Error al leer el archivo.', 'error');
        reader.readAsText(selectedFile);
    }
    get hasImportedData() {
        return this.importedData.length > 0;
    }
    
    updateImportMessage(message, type) {
        this.importMessage = message;
        this.importMessageClass = `slds-text-color_${type === 'success' ? 'success' : 'error'}`;
        this.importSuccessful = (type === 'success');
        console.log('Import Message:', message, 'Type:', type);
    }

    mostrarSiguienteComponente() {
        // No necesitas cambiar la lógica aquí; se actualizará automáticamente cuando los campos estén disponibles
        this.showFirstComponent = false;
        this.showFields = true;
        this.updateCombinedFields(); // Asegurarse de que los campos combinados estén actualizados
    }
    mostrarComponenteAnterior() {
        // Vuelve a mostrar el primer componente y oculta los encabezados CSV
        this.showFields = false;
        this.showFirstComponent = true;
    }
    async fetchObjectFields() {
        if (this.selectedObject) {
            try {
                const fields = await getObjectFields({ objectName: this.selectedObject });
                this.objectFieldOptions = fields.map((field) => ({
                    label: field.label, // Usa la etiqueta para mostrar al usuario.
                    value: field.apiName, // Usa el API name como valor.
                    key: field.apiName // Usa el API name como clave para asegurar unicidad.
                }));
            } catch (error) {
                console.error('Error fetching object fields:', error);
                this.objectFieldOptions = [];
            }
        }
    }
    
    connectedCallback() {
        this.initColumns();
        this.updateCombinedFields();
    }
    
    initColumns() {
        // Definimos las columnas que se mostrarán en la datatable
        this.column = [
            { label: 'Editar', type: 'button-icon', initialWidth: 75, typeAttributes: { iconName: 'utility:edit', title: 'Cambiar', variant: 'border-filled', alternativeText: 'Cambiar', name: 'change' }},
            { label: 'Objeto de Salesforce asignado', fieldName: 'objectField', type: 'text', editable: false }, // Asumiendo que quieres que esta columna sea editable
            { label: 'Encabezado CSV', fieldName: 'csvField', type: 'text' }
        ];
    }
    
    updateCombinedFields() {
        let headers = [];
        if (this.importedData.length > 0) {
            headers = Object.keys(this.importedData[0]); // Extrae los encabezados del primer registro de CSV.
        }
    
        // Asegúrate de preservar los mapeos existentes cuando actualices los campos combinados.
        const existingMappings = this.combinedFields.reduce((acc, field) => {
            acc[field.csvField] = field.objectField; // Guarda el mapeo actual por encabezado CSV.
            return acc;
        }, {});
    
        this.combinedFields = headers.map((header, index) => {
            return {
                id: index,
                objectField: existingMappings[header] || 'Sin mapear', // Usa el mapeo existente si está disponible.
                csvField: header
            };
        });
    }
    
    
    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        if (actionName === 'change') {
            this.currentRowIndex = this.combinedFields.findIndex(r => r.id === row.id);
            // Abre el modal aquí
            this.openModal();
        }
    }
    
    
    openModal() {
        this.isModalOpen = true;
        // Asegúrate de llamar a fetchObjectFields aquí si aún no se ha llamado
        // o si necesitas actualizar las opciones basadas en alguna lógica
        this.fetchObjectFields();
    }

    closeModal() {
        this.isModalOpen = false;
    }
    
    handleFieldSelectionChange(event) {
        this.selectedField = event.detail.value; // Suponiendo que este es el API name del campo seleccionado.
        if (this.currentRowIndex !== null) {
            this.combinedFields[this.currentRowIndex].objectField = this.selectedField;
            // Forzar actualización para reflejar en la tabla
            this.combinedFields = [...this.combinedFields];
        }
    }    
    
    saveMapping() {
        if (this.currentRowIndex !== null && this.selectedField) {
            // Encuentra el label y el API Name del campo seleccionado basado en selectedField
            const selectedOption = this.objectFieldOptions.find(opt => opt.value === this.selectedField);
            // Asegúrate de que selectedOption no sea undefined
            if (selectedOption) {
                // Actualiza el campo en combinedFields con el API Name
                this.combinedFields[this.currentRowIndex].objectField = selectedOption.value; // Usar el API Name
    
                // Forzar la actualización de la tabla actualizando la referencia de combinedFields
                this.combinedFields = [...this.combinedFields];
    
                console.log(`Mapeo actualizado para: ${this.combinedFields[this.currentRowIndex].csvField}, a API Name: ${this.selectedField}`);
    
                // Restablecer para el próximo uso
                this.currentRowIndex = null;
                this.selectedField = '';
                this.closeModal();
            }
        }
    }
    prepareDataForImport() {
        let mappedRecords = this.importedData.map((csvRecord, index) => {
            let mappedRecord = this.combinedFields.reduce((accumulated, { objectField, csvField }) => {
                if (objectField !== 'Sin mapear') {
                    accumulated[objectField] = csvRecord[csvField];
                }
                return accumulated;
            }, {});
            
            // Agregar un log para visualizar cómo se está mapeando cada registro CSV a su correspondiente registro de Salesforce
            console.log(`Registro CSV [${index}]:`, csvRecord);
            console.log(`Registro mapeado [${index}]:`, mappedRecord);
            
            return mappedRecord;
        });
    
        // Agregar un log para visualizar todos los registros mapeados antes de la importación
        console.log('Todos los registros mapeados para la importación:', mappedRecords);
    
        return mappedRecords;
    }
    
    importRecords() {
        const objectApiName = this.selectedObject; // Asegúrate de que esto sea el API name correcto
        const mappedData = this.prepareDataForImport();
    
        console.log('Datos mapeados para la importación:', mappedData); // Verifica qué se está enviando para la importación
    
        importCsvRecords({ objectApiName, mappedRecords: mappedData })
        .then(result => {
            this.showToast('Éxito', 'Los registros se han importado con éxito.', 'success');
            console.log('Resultados de la importación:', result);
            // Más lógica de UI aquí
        })
        .catch(error => {
            this.showToast('Error', 'Error importando registros: ' + error.body.message, 'error');
            console.error('Error importando registros:', error);
        });
    }
    updateRecords() {
        const objectApiName = this.selectedObject; // Asegúrate de que esto sea el API name correcto
        const mappedData = this.prepareDataForImport(); // Reutiliza la lógica de preparación de datos para importar
    
        // Llama al método de Apex para actualizar registros
        importCsvRecords({ objectApiName, mappedRecords: mappedData })
        .then(result => {
            this.showToast('Éxito', 'Los registros se han actualizado con éxito.', 'success');
            console.log('Resultados de la actualización:', result);
            // Más lógica de UI aquí
        })
        .catch(error => {
            this.showToast('Error', 'Error al actualizar registros: ' + error.body.message, 'error');
            console.error('Error actualizando registros:', error);
        });
    }
    
    // Método para mostrar mensajes de toast
    showToast(title, message, variant = 'info') {
        const event = new ShowToastEvent({
            title,
            message,
            variant,
        });
        this.dispatchEvent(event);
    }      
}