require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase with service role key (server-side only)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

app.use(cors());
app.use(express.json());

// Sign up endpoint - uses service role for organization creation
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, organization } = req.body;
    
    // Create organization first with service role
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert([{
        email,
        org_name: organization.org_name,
        org_size: organization.org_size,
        industry: organization.industry
      }])
      .select()
      .single();
      
    if (orgError) throw orgError;
    
    // Create auth user with org metadata
    const { data, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        org_id: org.id
      }
    });
    
    if (authError) throw authError;
    
    // Handle team members if provided
    if (organization.team && organization.team.members) {
      const teamMembers = organization.team.members.map(memberEmail => ({
        org_id: org.id,
        email: memberEmail,
        role: organization.team.defaultRole,
        user_id: data.user.id
      }));
      
      const { error: teamError } = await supabase
        .from('team_members')
        .insert(teamMembers);
        
      if (teamError) throw teamError;
    }
    
    res.status(200).json({ success: true, user: data.user });
    
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Auth API running on port ${PORT}`);
});
