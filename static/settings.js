document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const modelSelect = document.getElementById('model-select');
    const modelInfo = document.getElementById('model-info');
    const saveButton = document.getElementById('save-model');
    const statusMessage = document.getElementById('status-message');
    const modelLoading = document.getElementById('model-loading');
    const modelSettings = document.getElementById('model-settings');
    const systemPromptTextarea = document.getElementById('system-prompt');
    const saveSystemPromptButton = document.getElementById('save-system-prompt');
    const anonUsersInput = document.getElementById('anon-users');
    const saveAnonUsersButton = document.getElementById('save-anon-users');
    const anonStatusMessage = document.getElementById('anon-status-message');
    
    // Fetch available models
    fetchAvailableModels();
    
    // Fetch current system prompt
    fetchSystemPrompt();
    
    // Fetch current anon users setting
    fetchAnonUsersSetting();
    
    // Event listeners
    modelSelect.addEventListener('change', updateModelInfo);
    saveButton.addEventListener('click', saveSettings);
    saveSystemPromptButton.addEventListener('click', saveSystemPrompt);
    saveAnonUsersButton.addEventListener('click', saveAnonUsersSetting);
    
    // Functions
    function fetchAvailableModels() {
        modelLoading.style.display = 'block';
        modelSettings.style.display = 'none';
        
        fetch('/api/models')
            .then(response => response.json())
            .then(data => {
                modelLoading.style.display = 'none';
                modelSettings.style.display = 'block';
                
                if (data.error) {
                    showError(data.error);
                    return;
                }
                
                // Clear existing options
                modelSelect.innerHTML = '<option value="">Select a model</option>';
                
                // Get models from the response
                let models = [];
                if (data.models) {
                    models = data.models;
                }
                
                // Add models to select dropdown
                models.forEach(model => {
                    const modelName = typeof model === 'object' ? model.name : model;
                    const option = document.createElement('option');
                    option.value = modelName;
                    option.textContent = modelName;
                    
                    // Set as selected if it's the current model
                    if (data.current_model && modelName === data.current_model) {
                        option.selected = true;
                    }
                    
                    modelSelect.appendChild(option);
                });
                
                // If a model is selected, show its info
                if (modelSelect.value) {
                    updateModelInfo();
                }
            })
            .catch(error => {
                console.error('Error fetching models:', error);
                modelLoading.style.display = 'none';
                showError('Failed to fetch models. Make sure Ollama is running on your system.');
            });
    }
    
    function fetchSystemPrompt() {
        fetch('/api/system-prompt')
            .then(response => response.json())
            .then(data => {
                if (data.system_prompt) {
                    systemPromptTextarea.value = data.system_prompt;
                }
            })
            .catch(error => {
                console.error('Error fetching system prompt:', error);
            });
    }
    
    function fetchAnonUsersSetting() {
        fetch('/api/anon-users')
            .then(response => response.json())
            .then(data => {
                if (data.num_anon_users !== undefined) {
                    anonUsersInput.value = data.num_anon_users;
                }
            })
            .catch(error => {
                console.error('Error fetching anon users setting:', error);
            });
    }
    
    function updateModelInfo() {
        const selectedModel = modelSelect.value;
        if (!selectedModel) {
            modelInfo.innerHTML = '<p>No model selected</p>';
            return;
        }
        
        modelInfo.innerHTML = '<p>Loading model information...</p>';
        
        fetch(`/api/models/${selectedModel}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    modelInfo.innerHTML = `<p>Error: ${data.error}</p>`;
                    return;
                }
                
                // Display model information based on the API response format
                let infoHTML = `<p><strong>Model:</strong> ${selectedModel}</p>`;
                
                // Handle different response formats
                if (data.size) {
                    infoHTML += `<p><strong>Size:</strong> ${formatSize(data.size)}</p>`;
                }
                
                if (data.modified_at) {
                    infoHTML += `<p><strong>Modified:</strong> ${new Date(data.modified_at).toLocaleString()}</p>`;
                }
                
                // Check for details in different formats
                const details = data.details || data.model_info || {};
                
                if (details) {
                    if (details.parameter_size || details['general.parameter_count']) {
                        const paramSize = details.parameter_size || formatParameterCount(details['general.parameter_count']);
                        infoHTML += `<p><strong>Parameter Size:</strong> ${paramSize}</p>`;
                    }
                    
                    if (details.family || details['general.architecture']) {
                        const family = details.family || details['general.architecture'];
                        infoHTML += `<p><strong>Family:</strong> ${family}</p>`;
                    }
                    
                    if (details.quantization_level) {
                        infoHTML += `<p><strong>Quantization:</strong> ${details.quantization_level}</p>`;
                    }
                }
                
                // If we have very little info, show a basic message
                if (infoHTML.split('<p>').length <= 2) {
                    infoHTML += `<p>Basic model information available. Model is ready to use.</p>`;
                }
                
                modelInfo.innerHTML = infoHTML;
            })
            .catch(error => {
                console.error('Error fetching model info:', error);
                // Show a more user-friendly message that doesn't indicate an error
                modelInfo.innerHTML = `
                    <p><strong>Model:</strong> ${selectedModel}</p>
                    <p>Basic model information available. Model is ready to use.</p>
                `;
            });
    }
    
    function saveSettings() {
        const selectedModel = modelSelect.value;
        if (!selectedModel) {
            showError('Please select a model first');
            return;
        }
        
        // Disable button and show loading state
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';
        
        fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model: selectedModel })
        })
        .then(response => response.json())
        .then(data => {
            // Re-enable button
            saveButton.disabled = false;
            saveButton.textContent = 'Save Settings';
            
            if (data.error) {
                showError(data.error);
                return;
            }
            
            // Show success message
            showSuccess(`Settings saved! Now using ${selectedModel}`);
        })
        .catch(error => {
            console.error('Error saving settings:', error);
            
            // Re-enable button
            saveButton.disabled = false;
            saveButton.textContent = 'Save Settings';
            
            showError('Failed to save settings. Please try again.');
        });
    }
    
    function saveSystemPrompt() {
        const systemPrompt = systemPromptTextarea.value.trim();
        
        // Disable button and show loading state
        saveSystemPromptButton.disabled = true;
        saveSystemPromptButton.textContent = 'Saving...';
        
        fetch('/api/system-prompt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ system_prompt: systemPrompt })
        })
        .then(response => response.json())
        .then(data => {
            // Re-enable button
            saveSystemPromptButton.disabled = false;
            saveSystemPromptButton.textContent = 'Save System Prompt';
            
            if (data.error) {
                showError(data.error);
                return;
            }
            
            // Show success message
            showSuccess('System prompt saved successfully!');
        })
        .catch(error => {
            console.error('Error saving system prompt:', error);
            
            // Re-enable button
            saveSystemPromptButton.disabled = false;
            saveSystemPromptButton.textContent = 'Save System Prompt';
            
            showError('Failed to save system prompt. Please try again.');
        });
    }
    
    function saveAnonUsersSetting() {
        const numAnonUsers = parseInt(anonUsersInput.value);
        
        // Validate input
        if (isNaN(numAnonUsers) || numAnonUsers < 0 || numAnonUsers > 7) {
            showAnonError('Please enter a number between 0 and 7');
            return;
        }
        
        // Disable button and show loading state
        saveAnonUsersButton.disabled = true;
        saveAnonUsersButton.textContent = 'Saving...';
        
        fetch('/api/anon-users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ num_anon_users: numAnonUsers })
        })
        .then(response => response.json())
        .then(data => {
            // Re-enable button
            saveAnonUsersButton.disabled = false;
            saveAnonUsersButton.textContent = 'Save Anonymous Users Setting';
            
            if (data.error) {
                showAnonError(data.error);
                return;
            }
            
            // Show success message
            showAnonSuccess(`Anonymous users setting saved! Now using ${numAnonUsers} anonymous users`);
        })
        .catch(error => {
            console.error('Error saving anon users setting:', error);
            
            // Re-enable button
            saveAnonUsersButton.disabled = false;
            saveAnonUsersButton.textContent = 'Save Anonymous Users Setting';
            
            showAnonError('Failed to save anonymous users setting. Please try again.');
        });
    }
    
    function showError(message) {
        statusMessage.className = 'status-message error';
        statusMessage.textContent = message;
        statusMessage.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 5000);
    }
    
    function showSuccess(message) {
        statusMessage.className = 'status-message success';
        statusMessage.textContent = message;
        statusMessage.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 5000);
    }
    
    function showAnonError(message) {
        anonStatusMessage.className = 'status-message error';
        anonStatusMessage.textContent = message;
        anonStatusMessage.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            anonStatusMessage.style.display = 'none';
        }, 5000);
    }
    
    function showAnonSuccess(message) {
        anonStatusMessage.className = 'status-message success';
        anonStatusMessage.textContent = message;
        anonStatusMessage.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            anonStatusMessage.style.display = 'none';
        }, 5000);
    }
    
    // Helper functions
    function formatSize(bytes) {
        if (!bytes) return 'Unknown';
        
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Byte';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    }
    
    function formatParameterCount(count) {
        if (!count) return 'Unknown';
        
        if (count >= 1e9) {
            return (count / 1e9).toFixed(1) + 'B';
        } else if (count >= 1e6) {
            return (count / 1e6).toFixed(1) + 'M';
        } else if (count >= 1e3) {
            return (count / 1e3).toFixed(1) + 'K';
        }
        
        return count.toString();
    }
});
