let selectedModel = 'deepseek';
let selectedMood = 'professional';
let currentChatId = null;

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const inputField = document.querySelector('.input-field');
  const chatMessages = document.getElementById('chatMessages');
  const welcomeMessage = document.getElementById('welcomeMessage');
  const modelSelector = document.querySelector('.model-selector');
  const modelDropdown = document.getElementById('modelDropdown');
  const moodSelector = document.getElementById('moodSelector');
  const profileIcon = document.querySelector('.profile-icon');
  const profileDropdown = document.getElementById('profileDropdown');
  const menuIcon = document.querySelector('.menu-icon');
  const sidebar = document.querySelector('.sidebar');
  const newChatButton = document.getElementById('new-chat');
  const sendIcon = document.querySelector('.send-icon');
  const settingsPanel = document.getElementById('settingsPanel');

  // Input Field Focus/Blur
  inputField.addEventListener('focus', () => {
    document.querySelector('.input-area').style.boxShadow = '0 0 0 1px #8ab4f8';
  });

  inputField.addEventListener('blur', () => {
    document.querySelector('.input-area').style.boxShadow = 'none';
  });

  // Model Selection
  modelSelector.addEventListener('click', () => {
    modelDropdown.style.display = modelDropdown.style.display === 'none' ? 'block' : 'none';
  });

  document.querySelectorAll('.model-option').forEach(option => {
    option.addEventListener('click', () => {
      selectedModel = option.dataset.model;
      modelSelector.querySelector('div').textContent = option.textContent.trim();
      modelDropdown.style.display = 'none';
    });
  });

  // Mood Selection
  document.querySelectorAll('.mood-option').forEach(option => {
    option.addEventListener('click', () => {
      selectedMood = option.dataset.mood;
      moodSelector.style.display = 'none';
    });
  });

  // Profile Dropdown
  profileIcon.addEventListener('click', () => {
    profileDropdown.style.display = profileDropdown.style.display === 'none' ? 'block' : 'none';
  });

  // Sidebar Toggle for Mobile
  menuIcon.addEventListener('click', () => {
    sidebar.classList.toggle('active');
  });

  // Handle New Chat Button
  newChatButton.addEventListener('click', () => {
    currentChatId = null;
    chatMessages.innerHTML = '';
    welcomeMessage.style.display = 'flex';
    inputField.value = '';
    inputField.focus();
  });

  // Send Message
  const sendMessage = async () => {
    const message = inputField.value.trim();
    if (!message) return;

    welcomeMessage.style.display = 'none';
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'message user-message';
    userMessageDiv.textContent = message;
    chatMessages.appendChild(userMessageDiv);
    inputField.value = '';

    try {
      const response = await fetch('/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, model: selectedModel, mood: selectedMood })
      }).then(res => res.json());

      const assistantMessageDiv = document.createElement('div');
      assistantMessageDiv.className = 'message assistant-message';
      assistantMessageDiv.textContent = response.response;
      chatMessages.appendChild(assistantMessageDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (err) {
      console.error('Error sending message:', err);
      const errorMessageDiv = document.createElement('div');
      errorMessageDiv.className = 'message assistant-message';
      errorMessageDiv.textContent = 'Error: Unable to get a response from the AI model.';
      chatMessages.appendChild(errorMessageDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  };

  sendIcon.addEventListener('click', sendMessage);

  inputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  // Chat History
  document.querySelectorAll('.recent-chat').forEach(chat => {
    chat.addEventListener('click', async () => {
      currentChatId = chat.dataset.chatId;
      try {
        const chatData = await fetch(`/chat/history/${currentChatId}`).then(res => res.json());
        chatMessages.innerHTML = '';
        welcomeMessage.style.display = 'none';
        chatData.messages.forEach(msg => {
          const messageDiv = document.createElement('div');
          messageDiv.className = `message ${msg.role}-message`;
          messageDiv.textContent = msg.content;
          chatMessages.appendChild(messageDiv);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
      } catch (err) {
        console.error('Error loading chat history:', err);
      }
    });
  });

  // Settings & Help
  document.querySelector('.sidebar-footer .sidebar-item').addEventListener('click', () => {
    settingsPanel.style.display = 'block';
  });

  // Close Settings Panel
  document.querySelector('.close-settings').addEventListener('click', () => {
    settingsPanel.style.display = 'none';
  });

  // Make Suggestion Cards Clickable
  const suggestionCards = document.querySelectorAll('.suggestion-card');
  suggestionCards.forEach(card => {
    card.addEventListener('click', () => {
      inputField.value = card.querySelector('.suggestion-title').textContent;
      inputField.focus();
    });
  });

  // Close Dropdowns When Clicking Outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.model-selector') && !e.target.closest('.model-dropdown')) {
      modelDropdown.style.display = 'none';
    }
    if (!e.target.closest('.profile-icon') && !e.target.closest('.profile-dropdown')) {
      profileDropdown.style.display = 'none';
    }
  });

  // Sidebar Toggle Button
  const sidebarToggle = document.createElement('div');
  sidebarToggle.className = 'sidebar-toggle';
  sidebarToggle.innerHTML = '<i class="fas fa-bars"></i>';
  document.body.appendChild(sidebarToggle);

  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    sidebarToggle.innerHTML = sidebar.classList.contains('active')
      ? '<i class="fas fa-times"></i>'
      : '<i class="fas fa-bars"></i>';
  });

  // Close Sidebar When Clicking Outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.sidebar') &&
        !e.target.closest('.sidebar-toggle') &&
        sidebar.classList.contains('active')) {
      sidebar.classList.remove('active');
      sidebarToggle.innerHTML = '<i class="fas fa-bars"></i>';
    }
  });

  // Model Selection with visual feedback
  document.querySelectorAll('.model-option').forEach(option => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.model-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      option.classList.add('selected');
      modelSelector.querySelector('div').textContent = option.textContent.trim();
      document.getElementById('modelDropdown').style.display = 'none';
    });
  });

  // Advanced button tooltip
  const advancedButton = document.querySelector('.advanced-button');
  advancedButton.setAttribute('title', 'Upgrade to access more powerful models');
  
  // Mood selector toggle
  const moodButton = document.createElement('button');
  moodButton.className = 'advanced-button';
  moodButton.innerHTML = '<i class="fas fa-brain"></i> Mood';
  document.querySelector('.header-right').insertBefore(moodButton, document.querySelector('.header-icon'));
  
  moodButton.addEventListener('click', () => {
    const moodSelector = document.getElementById('moodSelector');
    moodSelector.style.display = moodSelector.style.display === 'none' ? 'block' : 'none';
  });

  // Delete chat functionality
  document.querySelectorAll('.delete-chat').forEach(deleteBtn => {
    deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        const chatId = deleteBtn.dataset.chatId;
        
        if (confirm('Are you sure you want to delete this chat?')) {
            try {
                const response = await fetch(`/chat/delete/${chatId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    // Remove chat from sidebar
                    deleteBtn.closest('.recent-chat-container').remove();
                    
                    // Clear chat area if current chat
                    if (currentChatId === chatId) {
                        currentChatId = null;
                        chatMessages.innerHTML = '';
                        welcomeMessage.style.display = 'flex';
                    }
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to delete chat');
                }
            } catch (error) {
                console.error('Error deleting chat:', error);
                alert(error.message);
            }
        }
    });
  });
});