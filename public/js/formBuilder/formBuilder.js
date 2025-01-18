import { supabase } from '../../../src/config/supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const formFields = document.getElementById('form-fields');
    const addFieldBtn = document.getElementById('add-field-btn');
    const fieldMenu = document.getElementById('field-menu');
    const saveFormBtn = document.createElement('button');

    // Initialize save button
    saveFormBtn.id = 'save-form-btn';
    saveFormBtn.textContent = 'Save Form';
    saveFormBtn.className = 'bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors flex items-center mt-4';
    saveFormBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Save Form';
    addFieldBtn.parentElement.appendChild(saveFormBtn);

    // Toggle field menu
    addFieldBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fieldMenu.classList.toggle('hidden');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!addFieldBtn.contains(e.target) && 
            !fieldMenu.contains(e.target)) {
            fieldMenu.classList.add('hidden');
        }
    });

    // Handle field type selection
    document.querySelectorAll('.field-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const fieldType = btn.dataset.type;
            addField(fieldType);
            fieldMenu.classList.add('hidden');
        });
    });

    // Add new field
    function addField(type) {
        const template = document.getElementById(`${type}-template`);
        if (!template) return;

        const clone = template.content.cloneNode(true);
        formFields.appendChild(clone);

        const newField = formFields.lastElementChild;
        attachFieldEvents(newField);
    }

    // Attach events to a field
    function attachFieldEvents(field) {
        field.querySelector('.required-toggle')?.addEventListener('click', (e) => {
            e.currentTarget.classList.toggle('text-primary');
        });

        field.querySelector('.duplicate-field')?.addEventListener('click', () => {
            const duplicate = field.cloneNode(true);
            attachFieldEvents(duplicate);
            formFields.appendChild(duplicate);
        });

        field.querySelector('.delete-field')?.addEventListener('click', () => {
            field.remove();
        });

        const addOptionBtn = field.querySelector('.add-option-btn');
        if (addOptionBtn) {
            addOptionBtn.addEventListener('click', () => {
                const optionsContainer = field.querySelector('.options-container');
                const optionTemplate = document.createElement('div');
                optionTemplate.classList.add('option-item');
                optionTemplate.innerHTML = `
                    <input type="text" class="option-input w-full bg-mid border border-mid rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-textColor" placeholder="Option">
                    <button class="remove-option text-red-500 hover:text-red-700">
                        <i class="fas fa-minus-circle"></i>
                    </button>
                `;
                optionsContainer.appendChild(optionTemplate);
                attachOptionEvents(optionTemplate);
            });
        }

        const optionItems = field.querySelectorAll('.option-item');
        optionItems.forEach(option => {
            attachOptionEvents(option);
        });
    }

    // Attach events to an option
    function attachOptionEvents(option) {
        const removeOptionBtn = option.querySelector('.remove-option');
        if (removeOptionBtn) {
            removeOptionBtn.addEventListener('click', () => {
                option.remove();
            });
        }
    }

    // Save Form Event Listener
    saveFormBtn.addEventListener('click', () => {
        const formData = collectFormData();
        if (formData.fields.length === 0) {
            alert('Please add at least one field to save the form.');
            return;
        }
        showPreviewModal(formData);
    });

    // Collect Form Data
    function collectFormData() {
        const title = document.querySelector('input[placeholder="Untitled Form"]').value.trim();
        const description = document.querySelector('input[placeholder="Form Description"]').value.trim();
        const fields = [];

        formFields.querySelectorAll('.field-wrapper').forEach(field => {
            const question = field.querySelector('input[placeholder="Question"]').value.trim();
            const helpText = field.querySelector('input[placeholder="Help text (optional)"]')?.value.trim() || '';
            const isRequired = field.querySelector('.required-toggle')?.classList.contains('text-primary') || false;
            let type = '';
            let options = [];

            if (field.querySelector('textarea')) {
                type = 'long-text';
            } else if (field.querySelector('.option-item')) {
                const addOptionBtn = field.querySelector('.add-option-btn');
                if (addOptionBtn) {
                    if (addOptionBtn.classList.contains('multiple-choice')) {
                        type = 'multiple-choice';
                    } else {
                        type = 'checkbox';
                    }
                }
            } else {
                type = 'short-text';
            }

            if (type === 'multiple-choice' || type === 'checkbox') {
                field.querySelectorAll('.option-input').forEach(optionInput => {
                    const option = optionInput.value.trim();
                    if (option) {
                        options.push(option);
                    }
                });
            }

            fields.push({
                type,
                question,
                helpText,
                required: isRequired,
                options
            });
        });

        return { title, description, fields };
    }

    // Show Preview Modal
    function showPreviewModal(formData) {
        const modalBg = document.createElement('div');
        modalBg.className = 'fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50';

        const modalContent = document.createElement('div');
        modalContent.className = 'bg-dark rounded-lg p-6 w-11/12 md:w-2/3 lg:w-1/2 overflow-y-auto max-h-screen border border-mid glass-effect';

        // Modal Header
        const header = document.createElement('h2');
        header.className = 'text-2xl font-bold mb-4 text-textColor bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent';
        header.textContent = 'Form Preview';
        modalContent.appendChild(header);

        // Form Title and Description
        const formTitle = document.createElement('h3');
        formTitle.className = 'text-xl font-semibold text-textColor';
        formTitle.textContent = formData.title || 'Untitled Form';
        modalContent.appendChild(formTitle);

        const formDesc = document.createElement('p');
        formDesc.className = 'text-light mb-4';
        formDesc.textContent = formData.description || '';
        modalContent.appendChild(formDesc);

        // Form Fields
        const previewForm = document.createElement('form');
        previewForm.className = 'space-y-4';
        formData.fields.forEach(field => {
            const fieldDiv = document.createElement('div');
            fieldDiv.className = 'mb-4 p-4 rounded-lg bg-mid/30 backdrop-blur-sm';

            const question = document.createElement('label');
            question.className = 'block text-textColor font-medium mb-2';
            question.textContent = field.question + (field.required ? ' *' : '');
            fieldDiv.appendChild(question);

            if (field.type === 'short-text') {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'w-full px-3 py-2 bg-mid/50 border border-mid rounded-lg text-textColor focus:ring-2 focus:ring-primary focus:border-transparent';
                input.disabled = true;
                fieldDiv.appendChild(input);
            } else if (field.type === 'long-text') {
                const textarea = document.createElement('textarea');
                textarea.className = 'w-full px-3 py-2 bg-mid/50 border border-mid rounded-lg text-textColor focus:ring-2 focus:ring-primary focus:border-transparent';
                textarea.disabled = true;
                fieldDiv.appendChild(textarea);
            } else if (field.type === 'multiple-choice') {
                field.options.forEach(option => {
                    const optionDiv = document.createElement('div');
                    optionDiv.className = 'flex items-center mb-2';
                    const input = document.createElement('input');
                    input.type = 'radio';
                    input.name = field.question;
                    input.disabled = true;
                    input.className = 'mr-2 text-primary focus:ring-primary';
                    const label = document.createElement('label');
                    label.className = 'text-textColor';
                    label.textContent = option;
                    optionDiv.appendChild(input);
                    optionDiv.appendChild(label);
                    fieldDiv.appendChild(optionDiv);
                });
            } else if (field.type === 'checkbox') {
                field.options.forEach(option => {
                    const optionDiv = document.createElement('div');
                    optionDiv.className = 'flex items-center mb-2';
                    const input = document.createElement('input');
                    input.type = 'checkbox';
                    input.disabled = true;
                    input.className = 'mr-2 text-primary focus:ring-primary';
                    const label = document.createElement('label');
                    label.className = 'text-textColor';
                    label.textContent = option;
                    optionDiv.appendChild(input);
                    optionDiv.appendChild(label);
                    fieldDiv.appendChild(optionDiv);
                });
            }

            if (field.helpText) {
                const help = document.createElement('p');
                help.className = 'text-sm text-light mt-1';
                help.textContent = field.helpText;
                fieldDiv.appendChild(help);
            }

            previewForm.appendChild(fieldDiv);
        });
        modalContent.appendChild(previewForm);

        // Modal Buttons
        const buttonDiv = document.createElement('div');
        buttonDiv.className = 'flex justify-end mt-6 space-x-3';

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.textContent = 'Edit';
        editBtn.className = 'px-4 py-2 rounded-lg border border-mid hover:bg-mid/50 text-textColor transition-all duration-300';
        editBtn.addEventListener('click', () => {
            document.body.removeChild(modalBg);
        });

        const shareBtn = document.createElement('button');
        shareBtn.type = 'button';
        shareBtn.textContent = 'Share';
        shareBtn.className = 'gradient-btn text-white px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-primary/20 transition-all duration-300';
        shareBtn.addEventListener('click', async () => {
            // Check if user is logged in
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (!sessionData?.session) {
                alert('Please log in before creating a form.');
                return;
            }

            // Retrieve user and org info (adjust key names as per your setup)
            const userID = sessionData.session.user.id;
            const orgID = sessionData.session.user.user_metadata?.org_id; // or wherever org_id is stored

            if (!orgID) {
                alert('No organization found. Please ensure your account has an associated org_id.');
                return;
            }

            const shareCode = generateRandomString(12);
            const formToSave = {
                title: formData.title,
                description: formData.description,
                fields: formData.fields,
                share_code: shareCode,
                org_id: orgID,
                created_by: userID
            };

            const { data, error } = await supabase
                .from('forms')
                .insert([formToSave]);

            if (error) {
                alert('Error saving form: ' + error.message);
                return;
            }

            // Construct the share link and copy it to clipboard
            const shareLink = `pollsay/${shareCode}`;
            try {
                await navigator.clipboard.writeText(shareLink);
                alert(`Form shared! Link copied to clipboard: ${shareLink}`);
            } catch (err) {
                alert(`Form shared! Please copy the link: ${shareLink}`);
            }
            document.body.removeChild(modalBg);
        });

        buttonDiv.appendChild(editBtn);
        buttonDiv.appendChild(shareBtn);
        modalContent.appendChild(buttonDiv);

        modalBg.appendChild(modalContent);
        document.body.appendChild(modalBg);
    }

    // Generate Random String
    function generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
});