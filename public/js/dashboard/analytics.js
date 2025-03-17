import { supabase } from '../../../src/config/supabase.js';
import { encryptionService } from '../services/encryptionService.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is logged in
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '/public/signin.html';
    return;
  }

  // Chart instances
  let timelineChart = null;
  let distributionChart = null;
  
  // Current form data
  let currentForm = null;
  let decryptedResponses = [];

  // Initialize form selector
  await loadUserForms(session.user.id);

  // Handle form selection
  const formSelector = document.getElementById('form-selector');
  formSelector.addEventListener('change', async () => {
    const formId = formSelector.value;
    if (formId) {
      await loadFormAnalytics(formId);
    }
  });

  // Export CSV functionality
  const exportBtn = document.getElementById('export-csv');
  exportBtn.addEventListener('click', async () => {
    const formId = formSelector.value;
    if (formId) {
      await exportFormResponses(formId);
    } else {
      alert('Please select a form first');
    }
  });

  // Load user's forms into selector
  async function loadUserForms(userId) {
    try {
      const { data: forms, error } = await supabase
        .from('forms')
        .select('id, title, created_at')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formSelector = document.getElementById('form-selector');
      formSelector.innerHTML = '<option value="" selected disabled>Select a form to view analytics</option>';
      
      if (forms.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No forms found - create a form first';
        formSelector.appendChild(option);
        return;
      }

      forms.forEach(form => {
        const option = document.createElement('option');
        option.value = form.id;
        option.textContent = form.title;
        formSelector.appendChild(option);
      });
      
      // If there are forms, load the first one by default
      if (forms.length > 0) {
        formSelector.value = forms[0].id;
        await loadFormAnalytics(forms[0].id);
      }
    } catch (error) {
      console.error('Error loading forms:', error);
    }
  }

  // Load analytics for a specific form
  async function loadFormAnalytics(formId) {
    try {
      // Show loading state
      document.getElementById('total-responses').textContent = 'Loading...';
      document.getElementById('completion-rate').textContent = 'Loading...';
      document.getElementById('avg-time').textContent = 'Loading...';
      document.getElementById('response-rate').textContent = 'Loading...';
      
      // Fetch form details
      const { data: form, error: formError } = await supabase
        .from('forms')
        .select('*, encrypted_responses(*), form_responses(*)')
        .eq('id', formId)
        .single();

      if (formError) throw formError;

      currentForm = form;
      
      // Check if form is encrypted
      const isEncrypted = form.encrypted;
      
      // Process responses
      let responses = [];
      
      if (isEncrypted && form.encrypted_responses) {
        // For encrypted forms, we need to decrypt the responses
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id')
          .eq('created_by', session.user.id)
          .single();
          
        if (orgError) throw orgError;
        
        // Ask for decryption password (in a real app, you'd want to cache this securely)
        const password = prompt('Enter your encryption passphrase to view encrypted responses:');
        if (!password) {
          alert('Cannot view encrypted responses without the passphrase');
          return;
        }
        
        try {
          // Get the encrypted private key
          const { data: keyData, error: keyError } = await supabase
            .from('organization_keys')
            .select('encrypted_private_key')
            .eq('id', orgData.id)
            .single();
            
          if (keyError) throw keyError;
          
          // Decrypt the private key
          const privateKeyString = await encryptionService.decryptWithPassword(
            keyData.encrypted_private_key,
            password
          );
          
          const privateKey = JSON.parse(privateKeyString);
          
          // Decrypt the form key
          const formKey = await encryptionService.decryptFormKey(
            form.encrypted_form_key,
            privateKey
          );
          
          // Decrypt each response
          decryptedResponses = await Promise.all(
            form.encrypted_responses.map(async (encResponse) => {
              try {
                // Decrypt the response data
                const decryptedData = await encryptionService.decryptFormData(
                  encResponse.encrypted_data,
                  formKey
                );
                
                return {
                  ...encResponse,
                  decrypted: true,
                  responses: decryptedData.responses,
                  timestamp: decryptedData.timestamp
                };
              } catch (err) {
                console.error('Failed to decrypt response:', err);
                return {
                  ...encResponse,
                  decrypted: false,
                  responses: [],
                  error: 'Decryption failed'
                };
              }
            })
          );
          
          responses = [...decryptedResponses];
          
        } catch (error) {
          console.error('Decryption error:', error);
          alert('Failed to decrypt responses. Please check your passphrase.');
          responses = form.encrypted_responses.map(r => ({
            ...r,
            decrypted: false,
            responses: [],
            error: 'Decryption failed'
          }));
        }
      } else if (form.form_responses) {
        // For unencrypted forms, use the responses directly
        responses = form.form_responses;
      }

      // Process responses for analytics
      updateKeyMetrics(responses);
      createResponseTimeline(responses);
      createResponseDistribution(form, responses);
      renderQuestionAnalysis(form, responses, isEncrypted);
      renderRecentActivity(responses);

    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  }

  // Update the key metrics based on response data
  function updateKeyMetrics(responses) {
    // Total responses
    const totalResponses = responses.length;
    document.getElementById('total-responses').textContent = totalResponses;
    
    // Get comparison data for previous period
    const now = new Date();
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
    
    const currentPeriodResponses = responses.filter(r => {
      const responseDate = new Date(r.created_at || r.timestamp);
      return responseDate >= oneWeekAgo;
    }).length;
    
    const previousPeriodResponses = responses.filter(r => {
      const responseDate = new Date(r.created_at || r.timestamp);
      return responseDate >= twoWeeksAgo && responseDate < oneWeekAgo;
    }).length;
    
    // Calculate percentage change
    let percentChange = 0;
    if (previousPeriodResponses > 0) {
      percentChange = ((currentPeriodResponses - previousPeriodResponses) / previousPeriodResponses) * 100;
    }
    
    // Update UI
    const responseChange = document.getElementById('response-change');
    if (percentChange > 0) {
      responseChange.innerHTML = `<span class="text-xs positive-change">↑ ${percentChange.toFixed(1)}% vs last week</span>`;
    } else if (percentChange < 0) {
      responseChange.innerHTML = `<span class="text-xs negative-change">↓ ${Math.abs(percentChange).toFixed(1)}% vs last week</span>`;
    } else {
      responseChange.innerHTML = `<span class="text-xs">No change vs last week</span>`;
    }
    
    // Completion rate (for this example, we'll assume 100% completion)
    document.getElementById('completion-rate').textContent = '100%';
    document.getElementById('completion-change').innerHTML = '<span class="text-xs">--</span>';
    
    // Average time to complete
    const completionTimes = responses.map(r => r.completion_time).filter(Boolean);
    if (completionTimes.length > 0) {
      const avgTime = completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length;
      const minutes = Math.floor(avgTime / 60);
      const seconds = Math.floor(avgTime % 60);
      document.getElementById('avg-time').textContent = `${minutes}m ${seconds}s`;
    } else {
      document.getElementById('avg-time').textContent = '--';
    }
    document.getElementById('time-change').innerHTML = '<span class="text-xs">--</span>';
    
    // Response rate (placeholder)
    document.getElementById('response-rate').textContent = '87%';
    document.getElementById('rate-change').innerHTML = '<span class="text-xs positive-change">↑ 5% vs last week</span>';
  }

  // Create the response timeline chart
  function createResponseTimeline(responses) {
    // Destroy previous chart if it exists
    if (timelineChart) {
      timelineChart.destroy();
    }
    
    // Group responses by date
    const responsesByDate = {};
    
    responses.forEach(response => {
      const date = new Date(response.created_at || response.timestamp);
      // Format date as YYYY-MM-DD
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (!responsesByDate[dateStr]) {
        responsesByDate[dateStr] = 0;
      }
      responsesByDate[dateStr]++;
    });
    
    // Sort dates and prepare chart data
    const dates = Object.keys(responsesByDate).sort();
    const counts = dates.map(date => responsesByDate[date]);
    
    // Create chart
    const ctx = document.getElementById('timeline-chart').getContext('2d');
    timelineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: 'Responses',
          data: counts,
          backgroundColor: 'rgba(124, 77, 255, 0.2)',
          borderColor: 'rgba(124, 77, 255, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(124, 77, 255, 1)',
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
              color: '#a3a3a3'
            }
          },
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
              color: '#a3a3a3'
            }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#ffffff'
            }
          }
        }
      }
    });
  }

  // Create the response distribution chart
  function createResponseDistribution(form, responses) {
    // Destroy previous chart if it exists
    if (distributionChart) {
      distributionChart.destroy();
    }
    
    // Find a multiple-choice question for the pie chart
    let mcQuestion = null;
    let questionResponses = {};
    
    // For unencrypted forms
    if (!form.encrypted && form.fields) {
      // Find the first multiple choice question
      const mcQuestionIndex = form.fields.findIndex(field => field.type === 'multiple_choice');
      
      if (mcQuestionIndex >= 0) {
        mcQuestion = form.fields[mcQuestionIndex];
        
        // Count responses for each option
        responses.forEach(response => {
          if (response.responses && Array.isArray(response.responses)) {
            const answer = response.responses[mcQuestionIndex]?.answer;
            if (answer) {
              questionResponses[answer] = (questionResponses[answer] || 0) + 1;
            }
          }
        });
      }
    } 
    // For encrypted forms with decrypted responses
    else if (form.encrypted && decryptedResponses.length > 0) {
      // Find the first multiple choice question in the decrypted responses
      const firstResponse = decryptedResponses.find(r => r.decrypted && r.responses && r.responses.length > 0);
      
      if (firstResponse) {
        const mcQuestionIndex = firstResponse.responses.findIndex(q => q.type === 'multiple_choice');
        
        if (mcQuestionIndex >= 0) {
          mcQuestion = firstResponse.responses[mcQuestionIndex];
          
          // Count responses for each option
          decryptedResponses.forEach(response => {
            if (response.decrypted && response.responses && Array.isArray(response.responses)) {
              const answer = response.responses[mcQuestionIndex]?.answer;
              if (answer) {
                questionResponses[answer] = (questionResponses[answer] || 0) + 1;
              }
            }
          });
        }
      }
    }
    
    // If no multiple choice question is found
    if (!mcQuestion) {
      document.getElementById('distribution-chart').parentNode.innerHTML = 
        '<div class="flex items-center justify-center h-64 text-light">No multiple choice questions found</div>';
      return;
    }
    
    // Prepare data for chart
    const labels = Object.keys(questionResponses);
    const data = labels.map(label => questionResponses[label]);
    const backgroundColors = [
      'rgba(124, 77, 255, 0.8)',
      'rgba(0, 184, 212, 0.8)',
      'rgba(16, 185, 129, 0.8)',
      'rgba(239, 68, 68, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(139, 92, 246, 0.8)',
    ];
    
    // Create chart
    const ctx = document.getElementById('distribution-chart').getContext('2d');
    distributionChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#262626'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#ffffff',
              padding: 20,
              font: {
                size: 12
              }
            }
          },
          title: {
            display: true,
            text: mcQuestion.question || 'Response Distribution',
            color: '#ffffff',
            font: {
              size: 14
            },
            padding: {
              bottom: 15
            }
          }
        }
      }
    });
  }

  // Render analytics for individual questions
  function renderQuestionAnalysis(form, responses, isEncrypted) {
    const container = document.getElementById('questions-container');
    container.innerHTML = '';
    
    let fields = [];
    
    // Handle encrypted vs unencrypted forms
    if (!isEncrypted && form.fields) {
      fields = form.fields;
    } else if (isEncrypted && decryptedResponses.length > 0) {
      // Use the first decrypted response to get question structure
      const firstResponse = decryptedResponses.find(r => r.decrypted && r.responses && r.responses.length > 0);
      if (firstResponse && firstResponse.responses) {
        fields = firstResponse.responses.map(r => ({
          question: r.question,
          type: r.type
        }));
      }
    }
    
    if (fields.length === 0) {
      container.innerHTML = '<div class="text-center text-light py-8">No questions available for analysis</div>';
      return;
    }
    
    // Create analysis for each question
    fields.forEach((field, index) => {
      const questionDiv = document.createElement('div');
      questionDiv.className = 'border-b border-mid pb-6 mb-6 last:mb-0 last:border-0';
      
      // Question header
      const questionHeader = document.createElement('div');
      questionHeader.className = 'flex justify-between items-center mb-3';
      questionHeader.innerHTML = `
        <h3 class="text-lg font-medium">${field.question}</h3>
        <span class="text-sm text-light bg-dark px-2 py-1 rounded">${field.type}</span>
      `;
      questionDiv.appendChild(questionHeader);
      
      // Different analysis based on question type
      switch (field.type) {
        case 'multiple_choice':
          const mcResponses = {};
          
          // Count responses for each option
          if (!isEncrypted) {
            responses.forEach(response => {
              if (response.responses && Array.isArray(response.responses)) {
                const answer = response.responses[index]?.answer;
                if (answer) {
                  mcResponses[answer] = (mcResponses[answer] || 0) + 1;
                }
              }
            });
          } else {
            decryptedResponses.forEach(response => {
              if (response.decrypted && response.responses && Array.isArray(response.responses)) {
                const answer = response.responses[index]?.answer;
                if (answer) {
                  mcResponses[answer] = (mcResponses[answer] || 0) + 1;
                }
              }
            });
          }
          
          // Create bar chart
          const barChartDiv = document.createElement('div');
          barChartDiv.className = 'space-y-3';
          
          Object.keys(mcResponses).forEach(option => {
            const percentage = Math.round((mcResponses[option] / responses.length) * 100);
            
            barChartDiv.innerHTML += `
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span>${option}</span>
                  <span>${mcResponses[option]} responses (${percentage}%)</span>
                </div>
                <div class="h-2 bg-dark rounded-full overflow-hidden">
                  <div class="bg-primary h-full rounded-full" style="width: ${percentage}%"></div>
                </div>
              </div>
            `;
          });
          
          questionDiv.appendChild(barChartDiv);
          break;
          
        case 'text':
        case 'textarea':
          const textResponsesDiv = document.createElement('div');
          textResponsesDiv.className = 'space-y-3';
          
          let textResponses = [];
          if (!isEncrypted) {
            textResponses = responses
              .filter(r => r.responses && r.responses[index]?.answer)
              .map(r => r.responses[index].answer)
              .slice(0, 5);
          } else {
            textResponses = decryptedResponses
              .filter(r => r.decrypted && r.responses && r.responses[index]?.answer)
              .map(r => r.responses[index].answer)
              .slice(0, 5);
          }
          
          if (textResponses.length > 0) {
            textResponses.forEach(response => {
              textResponsesDiv.innerHTML += `
                <div class="bg-dark p-3 rounded">
                  <p class="text-sm">${response}</p>
                </div>
              `;
            });
            
            // Add "Show more" link if there are more responses
            if ((isEncrypted ? decryptedResponses : responses).length > 5) {
              textResponsesDiv.innerHTML += `
                <button class="text-sm text-primary hover:underline">
                  Show ${(isEncrypted ? decryptedResponses : responses).length - 5} more responses
                </button>
              `;
            }
          } else {
            textResponsesDiv.innerHTML = '<p class="text-light">No responses yet</p>';
          }
          
          questionDiv.appendChild(textResponsesDiv);
          break;
      }
      
      container.appendChild(questionDiv);
    });
  }

  // Render recent activity
  function renderRecentActivity(responses) {
    const activityList = document.getElementById('activity-list');
    activityList.innerHTML = '';
    
    if (responses.length === 0) {
      activityList.innerHTML = `
        <li class="flex items-start p-4 text-light">
          No activity recorded yet
        </li>
      `;
      return;
    }
    
    // Sort responses by date
    const sortedResponses = [...responses].sort((a, b) => {
      const dateA = new Date(a.created_at || a.timestamp);
      const dateB = new Date(b.created_at || b.timestamp);
      return dateB - dateA;
    });
    
    // Display the 5 most recent activities
    sortedResponses.slice(0, 5).forEach(response => {
      const date = new Date(response.created_at || response.timestamp);
      const timeAgo = getTimeAgo(date);
      const name = response.show_real_name && response.respondent_email ? 
                   response.respondent_email.split('@')[0] :
                   (response.respondent_pseudonym || 'Anonymous');
      
      activityList.innerHTML += `
        <li class="p-4 flex items-start">
          <div class="rounded-full w-8 h-8 bg-primary/20 text-primary flex items-center justify-center mr-3 flex-shrink-0">
            <i class="fas fa-user-check"></i>
          </div>
          <div>
            <p class="text-white">New response received from <span class="font-medium">${name}</span></p>
            <p class="text-sm text-light mt-0.5">${timeAgo}</p>
          </div>
        </li>
      `;
    });
  }

  // Export form responses to CSV
  async function exportFormResponses(formId) {
    if (!currentForm) {
      alert('Please select a form first');
      return;
    }
    
    // Determine if we need to use decrypted responses
    const responses = currentForm.encrypted ? decryptedResponses : currentForm.form_responses;
    
    if (!responses || responses.length === 0) {
      alert('No responses to export');
      return;
    }
    
    try {
      // Prepare CSV data
      let fields = [];
      let csvData = [];
      
      // Get field headers from form or first response
      if (!currentForm.encrypted && currentForm.fields) {
        fields = currentForm.fields.map(f => f.question);
      } else if (currentForm.encrypted && decryptedResponses.length > 0) {
        const firstResponse = decryptedResponses.find(r => r.decrypted && r.responses && r.responses.length > 0);
        if (firstResponse && firstResponse.responses) {
          fields = firstResponse.responses.map(r => r.question);
        }
      }
      
      // Add metadata columns
      fields = ['Timestamp', 'Respondent', 'Completion Time (sec)', ...fields];
      
      // Add response data
      responses.forEach(response => {
        const row = {
          'Timestamp': new Date(response.created_at || response.timestamp).toISOString(),
          'Respondent': response.show_real_name ? response.respondent_email : (response.respondent_pseudonym || 'Anonymous'),
          'Completion Time (sec)': response.completion_time || '--'
        };
        
        // Add question responses
        if (!currentForm.encrypted && response.responses) {
          response.responses.forEach((resp, i) => {
            const question = currentForm.fields[i]?.question || `Question ${i + 1}`;
            row[question] = resp.answer || '';
          });
        } else if (currentForm.encrypted && response.decrypted && response.responses) {
          response.responses.forEach(resp => {
            row[resp.question] = resp.answer || '';
          });
        }
        
        csvData.push(row);
      });
      
      // Generate CSV
      const csv = Papa.unparse(csvData);
      
      // Download the CSV file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${currentForm.title || 'form'}_responses.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error exporting responses:', error);
      alert('Error exporting responses. Please try again.');
    }
  }

  // Utility function to convert date to "time ago" format
  function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffDay > 0) {
      return diffDay === 1 ? '1 day ago' : `${diffDay} days ago`;
    } else if (diffHour > 0) {
      return diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`;
    } else if (diffMin > 0) {
      return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
    } else {
      return 'just now';
    }
  }
});
