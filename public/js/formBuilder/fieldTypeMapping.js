/**
 * Utility for consistent field type handling between form builder and form response
 */

// Map of field types used in the form builder UI
export const FIELD_TYPES = {
  SHORT_TEXT: 'short-text',
  LONG_TEXT: 'long-text',
  MULTIPLE_CHOICE: 'multiple-choice',
  CHECKBOX: 'checkbox'
};

// Map of field types used in the database and response handler
export const RESPONSE_TYPES = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  MULTIPLE_CHOICE: 'multiple_choice',
  CHECKBOX: 'checkbox'
};

/**
 * Normalize various input strings to standard field types
 * @param {string} type - Input field type string
 * @returns {string} - Normalized field type
 */
export function normalizeFieldType(type) {
  const typeMap = {
    'textarea': FIELD_TYPES.LONG_TEXT,
    'text': FIELD_TYPES.SHORT_TEXT,
    'radio': FIELD_TYPES.MULTIPLE_CHOICE,
    'multiple': FIELD_TYPES.MULTIPLE_CHOICE
  };
  return typeMap[type.toLowerCase()] || type;
}

/**
 * Convert form builder field type to response handler field type
 * @param {string} formBuilderType - Type from form builder
 * @returns {string} - Type for response handler
 */
export function mapToResponseType(formBuilderType) {
  const typeMap = {
    [FIELD_TYPES.SHORT_TEXT]: RESPONSE_TYPES.TEXT,
    [FIELD_TYPES.LONG_TEXT]: RESPONSE_TYPES.TEXTAREA,
    [FIELD_TYPES.MULTIPLE_CHOICE]: RESPONSE_TYPES.MULTIPLE_CHOICE,
    [FIELD_TYPES.CHECKBOX]: RESPONSE_TYPES.CHECKBOX
  };
  return typeMap[formBuilderType] || formBuilderType;
}

/**
 * Convert response handler field type to form builder field type
 * @param {string} responseType - Type from response handler
 * @returns {string} - Type for form builder
 */
export function mapToFormBuilderType(responseType) {
  const typeMap = {
    [RESPONSE_TYPES.TEXT]: FIELD_TYPES.SHORT_TEXT,
    [RESPONSE_TYPES.TEXTAREA]: FIELD_TYPES.LONG_TEXT,
    [RESPONSE_TYPES.MULTIPLE_CHOICE]: FIELD_TYPES.MULTIPLE_CHOICE,
    [RESPONSE_TYPES.CHECKBOX]: FIELD_TYPES.CHECKBOX
  };
  return typeMap[responseType] || responseType;
}
