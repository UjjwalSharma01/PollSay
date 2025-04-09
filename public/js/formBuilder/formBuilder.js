import { supabase } from '../../../src/config/supabase.js';
import { initFormSharing } from './shareForm.js';

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
    const addFieldBtn = document.getElementById('add-field');
    const fieldMenu = document.querySelector('.dropdown-content');
    
    // Find the ORIGINAL save button - don't create a new one
    const saveFormBtn = document.getElementById('save-form');
    
    if (saveFormBtn) {
        // Update button text but keep it simple
        saveFormBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Save Form';
        
        // Remove existing listeners to avoid duplicates
        const newSaveBtn = saveFormBtn.cloneNode(true);
        saveFormBtn.parentNode.replaceChild(newSaveBtn, saveFormBtn);
        
        // Add our listener that will show the form preview
        newSaveBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const formData = collectFormData();
            if (formData.fields.length === 0) {
                alert('Please add at least one field to save the form.');
                return;
            }
            
            // First, collect access control settings via prompts
            collectAccessSettings(formData);
            
            return false;
        });
    } else {
        console.error("Save form button not found.");
    }

    addFieldBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fieldMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!addFieldBtn.contains(e.target) && 
            !fieldMenu.contains(e.target)) {
            fieldMenu.classList.add('hidden');
        }
    });

    document.querySelectorAll('[data-type]').forEach(btn => {
        btn.addEventListener('click', () => {
            const fieldType = btn.dataset.type;
            const normalizedType = normalizeFieldType(fieldType);
            addField(normalizedType);
            fieldMenu.classList.add('hidden');
        });
    });

    function normalizeFieldType(type) {
        const typeMap = {
            'textarea': 'long-text',
            'text': 'short-text',
            'radio': 'multiple-choice',
            'multiple': 'multiple-choice'
        };
        return typeMap[type] || type;
    }

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
        newField.classList.add('field-entrance');
        setTimeout(() => newField.classList.remove('field-entrance'), 500);
        
        console.log('New field added:', newField);
        attachFieldEvents(newField);
    }

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
                return getTypeSpecificHTML('short-text');
        }
    }

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
            duplicate.classList.add('field-entrance');
            setTimeout(() => duplicate.classList.remove('field-entrance'), 500);
            attachFieldEvents(duplicate);
        });

        field.querySelector('.delete-field')?.addEventListener('click', () => {
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

    function attachOptionEvents(option) {
        const removeOptionBtn = option.querySelector('.remove-option');
        if (removeOptionBtn) {
            removeOptionBtn.addEventListener('click', () => {
                option.classList.add('option-exit');
                setTimeout(() => option.remove(), 300);
            });
        }
    }

    function collectFormData() {
        const title = document.querySelector('input[placeholder="Untitled Form"]').value.trim();
        const description = document.querySelector('input[placeholder="Form Description"]').value.trim();
        const fields = [];

        formFields.querySelectorAll('.field-wrapper').forEach(field => {
            const question = field.querySelector('input[placeholder="Question"]').value.trim();
            const helpText = field.querySelector('input[placeholder="Help text (optional)"]')?.value.trim() || '';
            
            const requiredToggle = field.querySelector('.required-toggle');
            const isRequired = requiredToggle ? 
                (requiredToggle.classList.contains('text-primary') || 
                 requiredToggle.classList.contains('is-required')) : false;
            
            let type = '';
            let options = [];

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
                field_type_key: mapTypeToResponseKey(type)
            });
        });

        const formData = {
            title,
            description,
            fields,
        };

        console.log('Collected form data:', formData);
        return formData;
    }
    
    function mapTypeToResponseKey(formBuilderType) {
        const typeMap = {
            'short-text': 'text',
            'long-text': 'textarea',
            'multiple-choice': 'multiple_choice',
            'checkbox': 'checkbox'
        };
        return typeMap[formBuilderType] || formBuilderType;
    }

    function collectAccessSettings(formData) {
        const requireVerification = confirm("Does this form require email verification?\n\nIf you click OK, respondents will need to verify their email to access the form.");
        
        const restrictions = {
            require_login: requireVerification,
            allow_all_emails: true,
            allowed_domains: null,
            allowed_emails: null,
            response_limit: null
        };
        
        if (requireVerification) {
            const useDomainRestriction = confirm("Do you want to restrict access to specific email domains?\n\nFor example, only allow emails from 'company.com'.");
            
            if (useDomainRestriction) {
                const domain = prompt("Enter the email domain to allow (e.g., 'company.com'):");
                if (domain && domain.trim() !== '') {
                    restrictions.allowed_domains = [domain.trim()];
                    restrictions.allow_all_emails = false;
                }
            }
            
            const useSpecificEmails = confirm("Do you want to allow specific email addresses to access this form?");
            
            if (useSpecificEmails) {
                const emailsInput = prompt("Enter email addresses separated by commas:");
                if (emailsInput && emailsInput.trim() !== '') {
                    const emails = emailsInput.split(',').map(email => email.trim()).filter(email => email);
                    if (emails.length > 0) {
                        restrictions.allowed_emails = emails;
                        restrictions.allow_all_emails = false;
                    }
                }
            }
            
            const useResponseLimit = confirm("Do you want to limit the number of responses per user?");
            
            if (useResponseLimit) {
                const limit = prompt("Enter maximum number of responses per user:");
                const parsedLimit = parseInt(limit);
                if (!isNaN(parsedLimit) && parsedLimit > 0) {
                    restrictions.response_limit = parsedLimit;
                }
            }
        }
        
        const settingsSummary = `Form Access Settings:
        - Email verification: ${restrictions.require_login ? 'Required' : 'Not required'}
        ${restrictions.allowed_domains ? `- Allowed domains: ${restrictions.allowed_domains.join(', ')}` : ''}
        ${restrictions.allowed_emails ? `- Allowed emails: ${restrictions.allowed_emails.join(', ')}` : ''}
        ${restrictions.response_limit ? `- Response limit: ${restrictions.response_limit} per user` : ''}
        ${restrictions.allow_all_emails && restrictions.require_login ? '- Any verified email can access' : ''}
        ${!restrictions.require_login ? '- Anyone can access (no restrictions)' : ''}`;
        
        const confirmSettings = confirm(`${settingsSummary}\n\nAre these settings correct?`);
        
        if (confirmSettings) {
            saveFormWithAccessControls(formData, restrictions);
        } else {
            alert("Let's try again. You'll be asked to set access controls again.");
            collectAccessSettings(formData);
        }
    }
    
    async function saveFormWithAccessControls(formData, restrictions) {
        try {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (!sessionData?.session) {
                alert('Please log in before creating a form.');
                return;
            }

            const userID = sessionData.session.user.id;
            const orgID = sessionData.session.user.user_metadata?.org_id;

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
                require_login: restrictions.require_login,
                allowed_domains: restrictions.allowed_domains,
                allowed_emails: restrictions.allowed_emails,
                response_limit: restrictions.response_limit,
                allow_all_emails: restrictions.allow_all_emails
            };

            console.log("Saving form with access controls:", formToSave);
            
            const { data, error } = await supabase
                .from('forms')
                .insert([formToSave])
                .select();

            if (error) throw error;

            const shareURL = `${window.location.origin}/public/form-response.html?code=${shareCode}`;
            
            let accessSummary = "Form created successfully!";
            
            if (restrictions.require_login) {
                accessSummary += "\n\n• Email verification required";
                
                if (restrictions.allowed_domains) {
                    accessSummary += `\n• Limited to domain: ${restrictions.allowed_domains.join(', ')}`;
                }
                
                if (restrictions.allowed_emails) {
                    accessSummary += `\n• Limited to ${restrictions.allowed_emails.length} specific email(s)`;
                }
                
                if (restrictions.response_limit) {
                    accessSummary += `\n• Maximum ${restrictions.response_limit} response(s) per user`;
                }
                
                if (restrictions.allow_all_emails) {
                    accessSummary += "\n• Any verified email can access";
                }
            } else {
                accessSummary += "\n\n• Anyone can access (no restrictions)";
            }
            
            alert(`${accessSummary}\n\nForm Link: ${shareURL}`);
            
            navigator.clipboard.writeText(shareURL).then(() => {
                console.log('Share link copied to clipboard');
            }).catch(err => {
                console.error('Could not copy link: ', err);
            });
            
        } catch (error) {
            console.error('Error saving form:', error);
            alert('Error saving form: ' + error.message);
        }
    }

    function generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
});