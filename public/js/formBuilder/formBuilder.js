import { supabase } from '../../../src/config/supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    // Add dynamic styles for animations and better UX
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        .field-entrance {
            animation: slideDown 0.3s ease-out forwards;
            opacity: 0;
            transform: translateY(-20px);
        }
        
        .field-exit {
            animation: fadeOut 0.3s ease-out forwards;
        }
        
        .option-entrance {
            animation: fadeIn 0.3s ease-out forwards;
            opacity: 0;
        }
        
        .option-exit {
            animation: fadeOut 0.3s ease-out forwards;
        }
        
        @keyframes slideDown {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes fadeIn {
            to {
                opacity: 1;
            }
        }
        
        @keyframes fadeOut {
            to {
                opacity: 0;
                transform: translateY(10px);
            }
        }
        
        .field-wrapper {
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .field-wrapper:hover {
            box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
            border-color: var(--primary-color, #4f46e5);
        }
        
        .required-toggle.is-required {
            background-color: rgba(79, 70, 229, 0.1);
            border: 1px solid rgba(79, 70, 229, 0.3);
        }
        
        .required-status {
            font-size: 0.7rem;
            margin-left: 0.25rem;
        }
        
        .add-option-btn:hover {
            transform: translateY(-1px);
        }
        
        .option-item {
            border-left: 2px solid transparent;
            padding-left: 5px;
            transition: all 0.2s ease;
        }
        
        .option-item:hover {
            border-left-color: var(--primary-color, #4f46e5);
            background-color: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
        }
    `;
    document.head.appendChild(styleEl);

    const formFields = document.getElementById('form-fields');
    // Fix the ID to match what's in the HTML
    const addFieldBtn = document.getElementById('add-field');
    // Define fieldMenu correctly based on the HTML structure
    const fieldMenu = document.querySelector('.dropdown-content');
    const saveFormBtn = document.getElementById('save-form');  // Use existing save button

    // Remove the code that tries to create and append another save button
    // No need for this code since the save button already exists in HTML:
    // saveFormBtn.id = 'save-form-btn';
    // saveFormBtn.textContent = 'Save Form';  
    // saveFormBtn.className = '...';
    // saveFormBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Save Form';
    // addFieldBtn.parentElement.appendChild(saveFormBtn);

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
    document.querySelectorAll('[data-type]').forEach(btn => {
        btn.addEventListener('click', () => {
            const fieldType = btn.dataset.type;
            // Normalize field types to ensure consistency
            const normalizedType = normalizeFieldType(fieldType);
            addField(normalizedType);
            fieldMenu.classList.add('hidden');
        });
    });

    // Normalize field types to ensure consistency with response handler
    function normalizeFieldType(type) {
        const typeMap = {
            'textarea': 'long-text',
            'text': 'short-text',
            'radio': 'multiple-choice',
            'multiple': 'multiple-choice'
        };
        return typeMap[type] || type;
    }

    // Add new field
    function addField(type) {
        console.log(`Trying to add field of type: ${type}`);
        const normalizedType = normalizeFieldType(type);
        const template = document.getElementById(`${normalizedType}-template`);
        
        if (!template) {
            console.warn(`Template with id "${normalizedType}-template" not found. Creating a default field.`);
            createDefaultField(normalizedType);
            return;
        }

        const clone = template.content.cloneNode(true);
        formFields.appendChild(clone);

        const newField = formFields.lastElementChild;
        
        // Add entrance animation
        newField.classList.add('field-entrance');
        setTimeout(() => newField.classList.remove('field-entrance'), 500);
        
        console.log('New field added:', newField);
        attachFieldEvents(newField);
    }

    // Create a default field if template is missing
    function createDefaultField(type) {
        const defaultFieldHTML = `
            <div class="field-wrapper p-4 mb-4 bg-mid/30 backdrop-blur-sm rounded-lg border border-mid/50 shadow-lg field-entrance">
                <div class="flex justify-between mb-2">
                    <input type="text" class="w-full bg-transparent border-b border-mid focus:outline-none focus:border-primary text-lg text-textColor transition-all duration-300" placeholder="Question">
                    <div class="flex space-x-2">
                        <button type="button" class="required-toggle p-2 rounded-full hover:bg-mid/50 transition-all duration-300 flex items-center" title="Toggle required">
                            <i class="fas fa-asterisk"></i>
                            <span class="required-status">Optional</span>
                        </button>
                        <button type="button" class="duplicate-field p-2 rounded-full hover:bg-mid/50 transition-all duration-300" title="Duplicate">
                            <i class="fas fa-clone"></i>
                        </button>
                        <button type="button" class="delete-field p-2 rounded-full hover:bg-mid/50 transition-all duration-300" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <input type="text" class="w-full bg-transparent border-b border-mid focus:outline-none focus:border-primary text-sm text-light transition-all duration-300" placeholder="Help text (optional)">
                ${getTypeSpecificHTML(type)}
            </div>
        `;
        
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = defaultFieldHTML;
        const defaultField = tempContainer.firstElementChild;
        
        formFields.appendChild(defaultField);
        attachFieldEvents(defaultField);
    }

    // Get specific HTML based on field type
    function getTypeSpecificHTML(type) {
        const normalizedType = normalizeFieldType(type);
        
        switch (normalizedType) {
            case 'short-text':
                return `<div class="mt-3">
                    <input type="text" class="w-full bg-mid/50 border border-mid rounded-lg mt-2 p-2 text-textColor focus:ring-2 focus:ring-primary/50 transition-all duration-300" disabled placeholder="Short text answer">
                </div>`;
                
            case 'long-text':
                return `<div class="mt-3">
                    <textarea class="w-full bg-mid/50 border border-mid rounded-lg mt-2 p-2 text-textColor h-24 focus:ring-2 focus:ring-primary/50 transition-all duration-300" disabled placeholder="Long text answer"></textarea>
                </div>`;
                
            case 'multiple-choice':
                return `
                    <div class="mt-3">
                        <div class="options-container space-y-2">
                            <div class="option-item flex items-center space-x-2 option-entrance">
                                <span class="text-primary"><i class="fas fa-circle-dot"></i></span>
                                <input type="text" class="option-input w-full bg-mid border border-mid rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-textColor transition-all duration-300" placeholder="Option">
                                <button class="remove-option text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-mid/50 transition-all duration-300">
                                    <i class="fas fa-minus-circle"></i>
                                </button>
                            </div>
                        </div>
                        <button type="button" class="add-option-btn multiple-choice mt-2 text-primary hover:text-primary-dark px-3 py-1 rounded-lg border border-primary/20 hover:border-primary/50 hover:bg-primary/10 transition-all duration-300">
                            <i class="fas fa-plus-circle mr-1"></i> Add option
                        </button>
                    </div>
                `;
                
            case 'checkbox':
                return `
                    <div class="mt-3">
                        <div class="options-container space-y-2">
                            <div class="option-item flex items-center space-x-2 option-entrance">
                                <span class="text-primary"><i class="fas fa-square-check"></i></span>
                                <input type="text" class="option-input w-full bg-mid border border-mid rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-textColor transition-all duration-300" placeholder="Option">
                                <button class="remove-option text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-mid/50 transition-all duration-300">
                                    <i class="fas fa-minus-circle"></i>
                                </button>
                            </div>
                        </div>
                        <button type="button" class="add-option-btn checkbox mt-2 text-primary hover:text-primary-dark px-3 py-1 rounded-lg border border-primary/20 hover:border-primary/50 hover:bg-primary/10 transition-all duration-300">
                            <i class="fas fa-plus-circle mr-1"></i> Add option
                        </button>
                    </div>
                `;
                
            default:
                console.error(`Unknown field type: ${type} (normalized to: ${normalizedType})`);
                // Default to short text if type is unrecognized
                return getTypeSpecificHTML('short-text');
        }
    }

    // Attach events to a field
    function attachFieldEvents(field) {
        const requiredToggle = field.querySelector('.required-toggle');
        if (requiredToggle) {
            const requiredStatus = requiredToggle.querySelector('.required-status') || 
                                  document.createElement('span');
            
            if (!requiredToggle.querySelector('.required-status')) {
                requiredStatus.className = 'required-status';
                requiredStatus.textContent = 'Optional';
                requiredToggle.appendChild(requiredStatus);
            }
            
            requiredToggle.addEventListener('click', (e) => {
                e.currentTarget.classList.toggle('text-primary');
                e.currentTarget.classList.toggle('is-required');
                
                const isRequired = e.currentTarget.classList.contains('text-primary');
                requiredStatus.textContent = isRequired ? 'Required' : 'Optional';
            });
        }

        field.querySelector('.duplicate-field')?.addEventListener('click', () => {
            const duplicate = field.cloneNode(true);
            formFields.appendChild(duplicate);
            
            // Add entrance animation
            duplicate.classList.add('field-entrance');
            setTimeout(() => duplicate.classList.remove('field-entrance'), 500);
            
            attachFieldEvents(duplicate);
        });

        field.querySelector('.delete-field')?.addEventListener('click', () => {
            // Add exit animation
            field.classList.add('field-exit');
            setTimeout(() => field.remove(), 300);
        });

        const addOptionBtn = field.querySelector('.add-option-btn');
        if (addOptionBtn) {
            addOptionBtn.addEventListener('click', () => {
                const optionsContainer = field.querySelector('.options-container');
                const optionTemplate = document.createElement('div');
                optionTemplate.classList.add('option-item', 'option-entrance');
                optionTemplate.innerHTML = `
                    <input type="text" class="option-input w-full bg-mid border border-mid rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-textColor transition-all duration-300" placeholder="Option">
                    <button class="remove-option text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-mid/50 transition-all duration-300">
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
                option.classList.add('option-exit');
                setTimeout(() => option.remove(), 300);
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
            
            // Enhanced required detection
            const requiredToggle = field.querySelector('.required-toggle');
            const isRequired = requiredToggle ? 
                (requiredToggle.classList.contains('text-primary') || 
                 requiredToggle.classList.contains('is-required')) : false;
            
            let type = '';
            let options = [];

            // More robust field type detection
            if (field.querySelector('textarea')) {
                type = 'long-text';
            } else if (field.querySelector('.options-container')) {
                const addOptionBtn = field.querySelector('.add-option-btn');
                if (addOptionBtn) {
                    if (addOptionBtn.classList.contains('multiple-choice')) {
                        type = 'multiple-choice';
                    } else {
                        type = 'checkbox';
                    }
                } else {
                    // Fallback detection by looking at the icon
                    const icon = field.querySelector('.option-item span i');
                    if (icon) {
                        type = icon.classList.contains('fa-circle-dot') ? 'multiple-choice' : 'checkbox';
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
                options,
                // Add field_type_key to ensure consistency with responseHandler
                field_type_key: mapTypeToResponseKey(type)
            });
        });

        // Collect participation restrictions values
        /* 
        // Participation restrictions feature - commented out for future implementation
        const allowedDomain = document.getElementById('allowed-domain').value.trim();
        const invitedEmailsRaw = document.getElementById('invited-emails').value.trim();
        const invitedEmails = invitedEmailsRaw ? invitedEmailsRaw.split(',').map(email => email.trim()).filter(email => email) : [];
        
        // Validate email format for invited emails
        const invalidEmails = invitedEmails.filter(email => !isValidEmail(email));
        if (invalidEmails.length > 0) {
            alert(`Invalid email format: ${invalidEmails.join(', ')}`);
            return null;
        }
        
        // Extract domain without @ if present
        let formattedDomain = null;
        if (allowedDomain) {
            formattedDomain = allowedDomain.startsWith('@') ? allowedDomain.substring(1) : allowedDomain;
        }
        
        const restrictions = {
            allowed_domains: formattedDomain ? [formattedDomain] : null,
            allowed_emails: invitedEmails.length > 0 ? invitedEmails : null,
            allow_all_emails: !(formattedDomain || invitedEmails.length > 0)
        };
        */
        const restrictions = {}; // Default empty restrictions
        
        const formData = {
            title,
            description,
            fields,
            // Participation restrictions feature commented out:
            // allowed_domains: restrictions.allowed_domains,
            // allowed_emails: restrictions.allowed_emails,
            // allow_all_emails: restrictions.allow_all_emails
        };

        console.log('Collected form data with restrictions (disabled):', formData);
        return formData;
    }
    
    // Map form builder types to response handler types
    function mapTypeToResponseKey(formBuilderType) {
        const typeMap = {
            'short-text': 'text',
            'long-text': 'textarea',
            'multiple-choice': 'multiple_choice',
            'checkbox': 'checkbox'
        };
        return typeMap[formBuilderType] || formBuilderType;
    }

    // Add email validation helper
    function isValidEmail(email) {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    // Show Preview Modal
    function showPreviewModal(formData) {
        if (!formData) return; // Don't proceed if form data is invalid
        
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

        // Create the form section for restrictions if present
        /*
        // Participation restrictions display - commented out for now
        if (formData.allowed_domains || formData.allowed_emails) {
            const restrictionsDiv = document.createElement('div');
            restrictionsDiv.className = 'mt-4 p-4 rounded-lg bg-yellow-900/20 border border-yellow-900/30';
            
            const restrictionsTitle = document.createElement('h4');
            restrictionsTitle.className = 'text-sm font-medium text-yellow-500 mb-2';
            restrictionsTitle.innerHTML = '<i class="fas fa-lock mr-2"></i>Access Restrictions';
            restrictionsDiv.appendChild(restrictionsTitle);
            
            if (formData.allowed_domains) {
                const domainP = document.createElement('p');
                domainP.className = 'text-xs text-light';
                domainP.textContent = `Only emails with domain: ${formData.allowed_domains.join(', ')}`;
                restrictionsDiv.appendChild(domainP);
            }
            
            if (formData.allowed_emails) {
                const emailsP = document.createElement('p');
                emailsP.className = 'text-xs text-light';
                emailsP.textContent = `Limited to specific emails: ${formData.allowed_emails.length} invited`;
                restrictionsDiv.appendChild(emailsP);
            }
            
            modalContent.appendChild(restrictionsDiv);
        }
        */

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
        shareBtn.innerHTML = '<i class="fas fa-share-alt mr-2"></i>Share';
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
                created_by: userID,
                // Add restrictions to the form submission
                // allowed_domains: formData.allowed_domains,
                // allowed_emails: formData.allowed_emails,
                // allow_all_emails: formData.allow_all_emails
            };

            try {
                const { data, error } = await supabase
                    .from('forms')
                    .insert([formToSave]);

                if (error) throw error;

                // At this point form is created, now the share UI would appear
                // which contains the access restriction controls

                // Show success message with appropriate restriction info
                let restrictionMsg = '';
                if (!formData.allow_all_emails) {
                    restrictionMsg = '\n\nNote: This form has access restrictions in place.';
                }

                // Construct the share link and copy it to clipboard
                const shareLink = `pollsay/${shareCode}`;
                try {
                    await navigator.clipboard.writeText(shareLink);
                    alert(`Form created successfully! Link copied to clipboard.${restrictionMsg}`);
                } catch (err) {
                    alert(`Form created successfully! Please copy the link: ${shareLink}${restrictionMsg}`);
                }
                document.body.removeChild(modalBg);
                
            } catch (error) {
                console.error('Error saving form:', error);
                alert('Error saving form: ' + error.message);
            }
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