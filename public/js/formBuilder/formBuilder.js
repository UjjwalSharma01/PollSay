document.addEventListener('DOMContentLoaded', () => {
    console.log('Form Builder Loaded');
    
    const availableFieldsContainers = document.querySelectorAll('.space-y-2');
    const formFieldsContainer = document.getElementById('form-fields');
    const emptyState = document.getElementById('empty-state');
    const propertiesPanel = document.querySelector('.properties-panel');

    let selectedField = null;

    // Initialize Sortable for available fields (left sidebar)
    availableFieldsContainers.forEach(container => {
        console.log('Initializing Sortable for:', container);
        Sortable.create(container, {
            group: {
                name: 'fields',
                pull: 'clone',
                put: false
            },
            sort: false,
            animation: 150
        });
    });

    // Initialize Sortable for form fields (drop target) - added "put: true"
    Sortable.create(formFieldsContainer, {
        group: {
            name: 'fields',
            pull: false,
            put: true
        },
        animation: 150,
        onAdd: (evt) => {
            console.log('Field dropped:', evt);
            const fieldType = evt.item.getAttribute('data-type');
            console.log(`Field dropped with type: ${fieldType}`);

            if (fieldType) {
                evt.item.remove(); // Remove the dragged item

                // Get and clone the template
                const template = document.getElementById(`${fieldType}-field-template`);
                if (template) {
                    const clone = template.content.cloneNode(true);
                    const fieldWrapper = clone.querySelector('.field-wrapper');
                    
                    // Make form fields visible and hide empty state
                    formFieldsContainer.classList.remove('hidden');
                    emptyState.classList.add('hidden');
                    
                    // Add the field and attach events
                    formFieldsContainer.appendChild(clone);
                    attachFieldEvents(fieldWrapper);
                    
                    console.log('Added field from template:', fieldType);
                } else {
                    console.error(`Template for type "${fieldType}" not found.`);
                }
            }
        }
    });

    function attachFieldEvents(field) {
        field.addEventListener('click', () => selectField(field));
        console.log('Attaching events to field:', field);

        // Clone button
        const cloneBtn = field.querySelector('.fa-copy');
        if (cloneBtn) {
            cloneBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const type = field.getAttribute('data-type');
                addFieldManually(type);
            });
        }

        // Settings button
        const settingsBtn = field.querySelector('.fa-cog');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                selectField(field);
            });
        }

        // Delete button
        const deleteBtn = field.querySelector('.fa-trash');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (field === selectedField) {
                    deselectField();
                }
                field.remove();
                if (formFieldsContainer.children.length === 0) {
                    formFieldsContainer.classList.add('hidden');
                    emptyState.classList.remove('hidden');
                }
            });
        }
    }

    function addFieldManually(type) {
        const template = document.getElementById(`${type}-field-template`);
        if (template) {
            const clone = template.content.cloneNode(true);
            const fieldWrapper = clone.querySelector('.field-wrapper');
            fieldWrapper.setAttribute('data-type', type);
            
            formFieldsContainer.classList.remove('hidden');
            emptyState.classList.add('hidden');
            
            formFieldsContainer.appendChild(clone);
            attachFieldEvents(fieldWrapper);
        }
    }

    function selectField(field) {
        if (selectedField) {
            selectedField.classList.remove('selected');
        }
        selectedField = field;
        selectedField.classList.add('selected');
        showProperties(selectedField);
    }

    function deselectField() {
        if (selectedField) {
            selectedField.classList.remove('selected');
            selectedField = null;
            hideProperties();
        }
    }

    function showProperties(field) {
        propertiesPanel.classList.remove('hidden');
        const properties = {
            label: field.querySelector('input[type="text"]').value,
            placeholder: field.querySelector('input[placeholder]').getAttribute('placeholder'),
            required: field.querySelector('input[name="field-required"]')?.checked || false
        };

        document.querySelector('input[name="field-label"]').value = properties.label;
        document.querySelector('input[name="field-placeholder"]').value = properties.placeholder;
        document.querySelector('input[name="field-required"]').checked = properties.required;
    }

    function hideProperties() {
        propertiesPanel.classList.add('hidden');
    }

    const propertiesForm = propertiesPanel.querySelector('.space-y-6');
    propertiesForm.addEventListener('input', (e) => {
        if (!selectedField) return;
        const name = e.target.name;
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;

        switch (name) {
            case 'field-label':
                selectedField.querySelector('.text-lg').value = value;
                break;
            case 'field-placeholder':
                selectedField.querySelector('input[placeholder]').setAttribute('placeholder', value);
                break;
            case 'field-required':
                const inputField = selectedField.querySelector('input');
                inputField.required = value;
                selectedField.classList.toggle('required', value);
                break;
        }
    });

    document.getElementById('save-button').addEventListener('click', () => {
        const formData = serializeForm();
        console.log('Form Saved:', formData);
    });

    document.getElementById('preview-button').addEventListener('click', () => {
        const formData = serializeForm();
        console.log('Form Preview:', formData);
    });

    function serializeForm() {
        const fields = [];
        formFieldsContainer.querySelectorAll('.field-wrapper').forEach(field => {
            fields.push({
                type: field.getAttribute('data-type'),
                label: field.querySelector('.text-lg').value,
                placeholder: field.querySelector('input[placeholder]').getAttribute('placeholder'),
                required: field.querySelector('input[name="field-required"]')?.checked || false
            });
        });
        return fields;
    }

    document.getElementById('delete-field-button').addEventListener('click', () => {
        if (selectedField) {
            selectedField.remove();
            deselectField();
            if (formFieldsContainer.children.length === 0) {
                formFieldsContainer.classList.add('hidden');
                emptyState.classList.remove('hidden');
            }
        }
    });

    document.body.addEventListener('click', (e) => {
        if (!propertiesPanel.contains(e.target) && !formFieldsContainer.contains(e.target)) {
            deselectField();
        }
    });
});