// src/services/organizationService.js
import { supabase } from '../config/supabase'

export const createOrganization = async (organizationData) => {
    try {
        const { data, error } = await supabase
            .from('organizations')
            .insert([
                {
                    email: organizationData.email,
                    name: organizationData.name,
                    size: organizationData.size,
                    industry: organizationData.industry,
                    created_at: new Date().toISOString()
                }
            ])
            .single()

        if (error) throw error
        return { data, error: null }
    } catch (error) {
        console.error('Error creating organization:', error)
        return { data: null, error: error.message }
    }
}