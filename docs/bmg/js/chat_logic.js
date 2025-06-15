let sessionID = null;
let backendHealthStatus = {
    isHealthy: true,
    lastChecked: null,
    message: null
};

// Make health status globally accessible
window.backendHealthStatus = backendHealthStatus;

// Captcha state
let captchaVerified = false;
let currentCaptchaAnswer = null;
let pendingMessage = null;

// Healthcheck functionality
function checkBackendHealth() {
    return fetch(window.CONFIG.API_HEALTHCHECK, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        timeout: 5000 // 5 second timeout
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        backendHealthStatus = {
            isHealthy: data.status === 'ok' && data.openai_key_valid,
            lastChecked: new Date(),
            message: data.message
        };
        // Update global reference
        window.backendHealthStatus = backendHealthStatus;
        updateHealthUI();
        return backendHealthStatus;
    })
    .catch(error => {
        console.error('Backend health check failed:', error);
        backendHealthStatus = {
            isHealthy: false,
            lastChecked: new Date(),
            message: error.message.includes('Failed to fetch') ? 'Backend server is not responding' : error.message
        };
        // Update global reference
        window.backendHealthStatus = backendHealthStatus;
        updateHealthUI();
        return backendHealthStatus;
    });
}

function updateHealthUI() {
    const chatInput = $('#chatInput');
    const chatSendBtn = $('#chatSendBtn');
    const chatMessages = $('#chat-messages');
    const chatAttachmentInfo = $('#chatAttachmentInfo');
    const chatInputGroup = $('.chat-input');
    const chatGptAlternative = $('#chatgpt-alternative');
    
    if (!backendHealthStatus.isHealthy) {
        // Hide the regular chat interface
        chatMessages.hide();
        chatAttachmentInfo.hide();
        chatInputGroup.hide();
        
        // Clear any existing attachment when backend is down
        clearAttachment();
        
        // Show the AI assistant alternative
        chatGptAlternative.show();
        
    } else {
        // Show the regular chat interface
        chatMessages.show();
        chatInputGroup.show();
        
        // Hide the AI assistant alternative
        chatGptAlternative.hide();
        
        // Re-enable chat input if it was disabled due to health issues
        chatInput.prop('disabled', false);
        chatSendBtn.prop('disabled', false);
        chatInput.attr('placeholder', 'Ask about the canvas...');
    }
}

// Periodic health check (every 5 minutes when healthy, every 2 minutes when unhealthy for potential recovery)
let healthCheckInterval;
function startPeriodicHealthCheck() {
    clearInterval(healthCheckInterval);
    const interval = backendHealthStatus.isHealthy ? 300000 : 120000; // 5 min vs 2 min
    
    healthCheckInterval = setInterval(() => {
        checkBackendHealth().then(() => {
            // Restart with new interval based on current health status
            startPeriodicHealthCheck();
        });
    }, interval);
}

function generateUUIDv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getSessionID() {
    if (!sessionID) {
        sessionID = sessionStorage.getItem('chatSessionID');
        if (!sessionID) {
            sessionID = generateUUIDv4();
            sessionStorage.setItem('chatSessionID', sessionID);
        }
    }
    return sessionID;
}

// Call getSessionID once to ensure it's loaded or generated early, 
// though it will be called on each sendMessage too.
// getSessionID(); // Optional: call here or just rely on sendMessage to call it.

function scrollMessagesDivToBottom(smooth = false) {
    const chatMessages = $('#chat-messages');
    if (chatMessages.length) {
        if (smooth) {
            chatMessages.animate({ scrollTop: chatMessages[0].scrollHeight }, 300);
        } else {
            chatMessages.scrollTop(chatMessages[0].scrollHeight);
        }
    }
}

function addChatMessage(text, type, targetElement = null, attachedCardContext = null) {
    const messageClass = type === 'user' ? 'message user' : 'message gpt';
    
    // Parse markdown only for AI responses
    const sanitizedText = type === 'user' 
        ? String(text).replace(/</g, "&lt;").replace(/>/g, "&gt;")
        : marked.parse(String(text).replace(/</g, "&lt;").replace(/>/g, "&gt;"));
    
    let attachmentBadgeHTML = '';
    if (type === 'user' && attachedCardContext) {
        attachmentBadgeHTML = 
            `<span class="message-attachment-badge">` +
            `${attachedCardContext.iconHTML || ''} ${attachedCardContext.title || 'Context'}` +
            `</span>`;
    }

    const messageHTML = 
        `<div class="${messageClass}">` +
        `${attachmentBadgeHTML}` + 
        `<span class="message-text">${sanitizedText}</span>` + 
        `</div>`;
    
    let $newMessage;
    if (targetElement) {
        targetElement.html(`${attachmentBadgeHTML}<span class="message-text">${sanitizedText}</span>`); 
        $newMessage = targetElement; 
    } else {
        const chatMessages = $('#chat-messages');
        chatMessages.append(messageHTML);
        $newMessage = chatMessages.children().last(); 
    }
    return $newMessage;
}

function typeResponse(targetTextSpan, text, speed = 30) {
    targetTextSpan.empty();
    // Remove cancel button if it exists in the parent bubble once typing starts for real response
    targetTextSpan.closest('.message.gpt').find('.cancel-request-btn').remove();

    // Split text into chunks that preserve markdown
    // This regex looks for:
    // 1. Markdown special characters and their content: **bold**, *italic*, [links](url), etc.
    // 2. Regular words
    // 3. Punctuation
    // 4. Whitespace
    const chunks = text.match(/(\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\)|\n|[^\s\*\[\n]+|\s+)/g) || [text];
    
    let i = 0;
    let currentText = '';
    const chatMessagesContainer = $('#chat-messages');
    const scrollThreshold = 50;

    function typeChunk() {
        if (i < chunks.length) {
            const currentScrollHeight = chatMessagesContainer[0].scrollHeight;
            const currentScrollTop = chatMessagesContainer.scrollTop();
            const currentClientHeight = chatMessagesContainer.innerHeight();

            const isNearBottom = (currentScrollHeight - currentScrollTop - currentClientHeight) < scrollThreshold;

            // Add the next chunk to our accumulated text
            currentText += chunks[i];
            // Parse the accumulated text as markdown and update display
            targetTextSpan.html(marked.parse(currentText));
            i++;
            
            if (isNearBottom) {
                scrollMessagesDivToBottom();
            }

            setTimeout(typeChunk, speed);
        } else {
            // Ensure final state is correctly formatted
            targetTextSpan.html(marked.parse(text));
            
            const chatInput = $('#chatInput');
            const chatSendBtn = $('#chatSendBtn');
            chatInput.prop('disabled', false);
            chatSendBtn.prop('disabled', false);
            chatInput.focus();
            scrollMessagesDivToBottom(true);
        }
    }
    typeChunk();
}

function updateAttachmentUI(info) {
    const chatAttachmentDiv = $('#chatAttachmentInfo'); 
    if (!chatAttachmentDiv.length) return; 

    const attachedCardName = chatAttachmentDiv.find('.attached-card-name');
    
     if (info && info.id && info.title) {
        attachedCardName.html(info.iconHTML + info.title);
        
        if (!chatAttachmentDiv.is(':visible')) {
             chatAttachmentDiv.slideDown(150);
        }
    } else {
         
        if (chatAttachmentDiv.is(':visible')) {
             chatAttachmentDiv.slideUp(150, () => {
                
                attachedCardName.empty(); 
             });
        } else {
            attachedCardName.empty(); 
        }
    }
}

function clearAttachment() {
    window.attachedCardInfo = null; 
    updateAttachmentUI(null);
    console.log("Chat attachment cleared.");
}

// Captcha functions
function generateCaptcha() {
    const operations = ['+', '-', '*'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let num1, num2, answer;
    
    switch(operation) {
        case '+':
            num1 = Math.floor(Math.random() * 20) + 1;
            num2 = Math.floor(Math.random() * 20) + 1;
            answer = num1 + num2;
            break;
        case '-':
            num1 = Math.floor(Math.random() * 30) + 10;
            num2 = Math.floor(Math.random() * num1);
            answer = num1 - num2;
            break;
        case '*':
            num1 = Math.floor(Math.random() * 10) + 1;
            num2 = Math.floor(Math.random() * 10) + 1;
            answer = num1 * num2;
            break;
    }
    
    const expression = `${num1} ${operation} ${num2}`;
    currentCaptchaAnswer = answer;
    
    drawCaptcha(expression);
}

function drawCaptcha(expression) {
    const canvas = document.getElementById('captchaCanvas');
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Add much more background noise - small dots
    for (let i = 0; i < 150; i++) {
        ctx.beginPath();
        ctx.arc(
            Math.random() * canvas.width,
            Math.random() * canvas.height,
            Math.random() * 3,
            0, 2 * Math.PI
        );
        ctx.fillStyle = `rgba(${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, ${Math.random() * 0.15})`;
        ctx.fill();
    }
    
    // Add background rectangles
    for (let i = 0; i < 20; i++) {
        ctx.fillStyle = `rgba(${Math.floor(Math.random() * 150)}, ${Math.floor(Math.random() * 150)}, ${Math.floor(Math.random() * 150)}, ${Math.random() * 0.1})`;
        ctx.fillRect(
            Math.random() * canvas.width,
            Math.random() * canvas.height,
            Math.random() * 10 + 2,
            Math.random() * 10 + 2
        );
    }
    
    // Draw many random lines with varying styles
    for (let i = 0; i < 15; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.strokeStyle = `rgba(${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, ${Math.random() * 0.3})`;
        ctx.lineWidth = Math.random() * 3 + 0.5;
        ctx.stroke();
    }
    
    // Add curved interference lines
    for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.quadraticCurveTo(
            Math.random() * canvas.width, 
            Math.random() * canvas.height,
            Math.random() * canvas.width, 
            Math.random() * canvas.height
        );
        ctx.strokeStyle = `rgba(${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, ${Math.random() * 0.2})`;
        ctx.lineWidth = Math.random() * 2 + 0.5;
        ctx.stroke();
    }
    
    // Draw expression with some distortion - adjusted for wider canvas
    ctx.font = 'bold 22px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const chars = expression.split('');
    const padding = 30; // Padding from edges
    const availableWidth = canvas.width - (padding * 2);
    const charSpacing = Math.min(35, availableWidth / chars.length); // Dynamic spacing
    const startX = padding + (availableWidth / 2) - ((chars.length - 1) * charSpacing / 2);
    
    chars.forEach((char, index) => {
        // Ensure characters stay within bounds
        const baseX = startX + (index * charSpacing);
        const x = Math.max(padding + 15, Math.min(baseX + Math.random() * 8 - 4, canvas.width - padding - 15));
        const y = canvas.height / 2 + Math.random() * 8 - 4;
        const rotation = (Math.random() - 0.5) * 0.3;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        
        // Add green gradient to text
        const gradient = ctx.createLinearGradient(0, -12, 0, 12);
        gradient.addColorStop(0, '#22c55e');
        gradient.addColorStop(1, '#16a34a');
        ctx.fillStyle = gradient;
        
        // Add shadow for better visibility
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 1;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        ctx.fillText(char, 0, 0);
        ctx.restore();
    });
}

function showCaptcha(messageText) {
    pendingMessage = messageText;
    generateCaptcha();
    $('#captchaModal').fadeIn(300);
    $('#captchaInput').focus();
}

function hideCaptcha() {
    $('#captchaModal').fadeOut(300);
    $('#captchaInput').val('');
    $('#captchaError').hide();
    pendingMessage = null;
}

function verifyCaptcha() {
    const userAnswer = parseInt($('#captchaInput').val().trim());
    
    if (userAnswer === currentCaptchaAnswer) {
        captchaVerified = true;
        hideCaptcha();
        
        // Proceed with the pending message
        if (pendingMessage) {
            proceedWithMessage(pendingMessage);
        }
    } else {
        $('#captchaError').show();
        generateCaptcha(); // Generate new captcha
        $('#captchaInput').val('').focus();
    }
}

function proceedWithMessage(messageText) {
    // Set the input with the pending message and call internal function
    $('#chatInput').val(messageText);
    sendMessageInternal(messageText);
}

function sendMessage() {
    const chatInput = $('#chatInput');
    const messageText = chatInput.val().trim();
    if (messageText === '') return;

    // Check if this is the first message and captcha hasn't been verified
    if (!captchaVerified && backendHealthStatus.isHealthy) {
        showCaptcha(messageText);
        return;
    }

    sendMessageInternal(messageText);
}

function sendMessageInternal(messageText) {
    const chatInput = $('#chatInput');
    const chatSendBtn = $('#chatSendBtn');

    let cardAttachmentContext = null; // Context from the card explicitly attached to chat input
    if (window.attachedCardInfo) {
        cardAttachmentContext = { 
            id: window.attachedCardInfo.id,
            title: window.attachedCardInfo.title
        };
        console.log("Card attached to chat input:", cardAttachmentContext.id);
    }

    // Display user's message (pass the specific cardAttachmentContext here for the badge)
    addChatMessage(messageText, 'user', null, cardAttachmentContext); 
    scrollMessagesDivToBottom(true);

    chatInput.val('');
    chatInput.prop('disabled', true);
    chatSendBtn.prop('disabled', true);

    const chatMessages = $('#chat-messages');
    const typingHTML = `<span class="typing-indicator-inline"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>`;
    const tempBubbleId = `temp-bubble-${Date.now()}`;
    const randomMaxWidth = Math.floor(Math.random() * 26) + 60;
    const inlineStyle = `style="max-width: ${randomMaxWidth}%;"`;
    
    const cancelButtonHTML = `<button class="btn btn-xs btn-outline-danger cancel-request-btn" style="display:none; position:absolute; top:2px; right:5px; padding: 0px 4px; font-size: 0.7rem;" title="Cancel request">&times;</button>`;

    const $tempBubble = $(`<div class="message gpt typing" id="${tempBubbleId}" ${inlineStyle}>${cancelButtonHTML}<span class="message-text">${typingHTML}</span></div>`);
    chatMessages.append($tempBubble);
    scrollMessagesDivToBottom(true);

    // --- AbortController for fetch cancellation ---
    const abortController = new AbortController();
    $tempBubble.data('abortController', abortController); // Store controller with the bubble

    // Attach click listener to the cancel button within this specific bubble
    $tempBubble.find('.cancel-request-btn').on('click', function() {
        const controller = $tempBubble.data('abortController');
        if (controller) {
            controller.abort();
            // UI update for cancellation is handled in the .catch block of fetch
        }
    });
    // --- End AbortController setup ---

    // --- Construct the new payload ---
    let finalContext = null;
    let activeModalQuestionContext = null;

    if (typeof window.getCurrentModalQuestionContext === 'function') {
        activeModalQuestionContext = window.getCurrentModalQuestionContext();
    }

    if (activeModalQuestionContext) {
        // If modal is open and has a question, this is the primary context
        finalContext = activeModalQuestionContext; // Contains blockId, blockTitle, questionIndex, questionText, currentAnswer
    } else if (cardAttachmentContext) {
        // If no modal question, but a card is attached to the chat input
        finalContext = {
            blockId: cardAttachmentContext.id,
            blockTitle: cardAttachmentContext.title
            // No specific question details here, it's a general card context
        };
    }
    // If neither, finalContext remains null

    // Get progress information
    let progressInfo = null;
    if (typeof calculateProgressInfo === 'function') {
        progressInfo = calculateProgressInfo();
    }

    const requestPayload = {
        session_id: getSessionID(),
        industry: window.currentSelectedIndustry || 'Not specified',
        query: messageText,
        context: finalContext,
        progress: progressInfo 
    };

    console.log("Sending payload to backend:", requestPayload);

    fetch(window.CONFIG.API_CHAT, { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': getSessionID(), // Add session_id to headers for rate limiting
        },
        body: JSON.stringify(requestPayload),
        signal: abortController.signal // Pass the signal to fetch
    })
    .then(response => {
        if (!response.ok) {
            // Handle rate limiting specifically
            if (response.status === 429) {
                return response.json().then(errData => {
                    // Extract rate limit info for a friendly message
                    const rateLimitInfo = errData.error || 'Rate limit exceeded';
                    throw new Error(`RATE_LIMIT:${rateLimitInfo}`);
                }).catch((parseError) => {
                    // Fallback if JSON parsing fails
                    throw new Error('RATE_LIMIT:Rate limit exceeded: Please wait a moment before trying again');
                });
            }
            
            // Try to get error message from backend for other errors
            return response.json().then(errData => {
                throw new Error(errData.detail || `HTTP error! status: ${response.status}`);
            }).catch(() => {
                // Fallback if response.json() fails or no detail provided
                throw new Error(`HTTP error! status: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        const responseBubble = $(`#${tempBubbleId}`);
        const textualAnswer = data.answer || "Sorry, I couldn't get a response.";

        if (responseBubble.length) {
            responseBubble.removeClass('typing');
            typeResponse(responseBubble.find('.message-text'), textualAnswer, 30);
        } else {
            console.warn("Typing indicator bubble not found, adding new message.");
            addChatMessage(textualAnswer, 'gpt');
            // Ensure input is re-enabled even in this fallback case
            // chatInput and chatSendBtn are re-enabled in typeResponse's completion or in catch block
        }

        // --- Handle Tool Calls ---
        if (data.tool_calls && Array.isArray(data.tool_calls)) {
            data.tool_calls.forEach(toolCall => {
                if (toolCall.tool_name === 'propose_answer_update' && toolCall.tool_input) {
                    console.log("Received tool_call: propose_answer_update", toolCall.tool_input);
                    if (typeof window.proposeAnswerUpdate === 'function') {
                        // Pass the entire tool_input, which might contain suggested_text, blockId, questionIndex
                        window.proposeAnswerUpdate(toolCall.tool_input);
                    } else {
                        console.warn("window.proposeAnswerUpdate function not found.");
                    }
                }
                // Add other tool call handlers here if needed in the future
            });
        }
        // --- End Handle Tool Calls ---

    })
    .catch(error => {
        console.error('Error sending message to backend:', error);
        const chatInput = $('#chatInput'); // Ensure chatInput is defined in this scope
        const chatSendBtn = $('#chatSendBtn'); // Ensure chatSendBtn is defined in this scope
        const responseBubble = $(`#${tempBubbleId}`);

        if (error.name === 'AbortError') {
            console.log("Fetch aborted by user.");
            if (responseBubble.length) {
                responseBubble.remove(); // Remove the bubble entirely on user cancel
            }
            // Re-enable input as the request is fully handled (cancelled)
            chatInput.prop('disabled', false);
            chatSendBtn.prop('disabled', false);
            return; // Exit the catch block early for AbortError
        }
        
        // For other errors (not AbortError):
        let errorMessage = "Error: Could not connect to the assistant.";
        let isRateLimit = false;
        
        if (error.message && error.message.startsWith("RATE_LIMIT:")) {
            // Handle rate limit errors with friendly message
            isRateLimit = true;
            const rateLimitDetails = error.message.replace("RATE_LIMIT:", "");
            
            // Create a friendly rate limit message
            errorMessage = "You're sending messages too quickly. Please wait a moment before trying again.";
        } else if (error.message && !error.message.startsWith("HTTP error!")) {
            errorMessage = error.message;
        }

        if (responseBubble.length) {
            responseBubble.removeClass('typing');
            responseBubble.find('.message-text').html(marked.parse(errorMessage));
            responseBubble.addClass(isRateLimit ? 'rate-limit-message' : 'error-message'); 
            responseBubble.find('.cancel-request-btn').remove(); 
        }
        
        // Re-enable input after other errors
        chatInput.prop('disabled', false);
        chatSendBtn.prop('disabled', false);
        scrollMessagesDivToBottom(true);
    });
}

function initChatLogic() {
    const chatInput = $('#chatInput');
    const chatSendBtn = $('#chatSendBtn');
    const removeAttachmentBtn = $('#removeAttachmentBtn'); 

    if (!chatInput.length || !chatSendBtn.length) {
        console.error("Chat input or send button not found!");
        return;
    }

    
    chatSendBtn.on('click', sendMessage);
    chatInput.on('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) { 
            e.preventDefault(); 
            sendMessage();
        }
    });

    
    chatInput.on('keydown', function(e) { 
        const fakeModal = $('#fakeModalContainer');
        const modalTextarea = $('#currentQuestionTextarea'); 
        
        if (e.key === 'Tab' && !e.shiftKey && fakeModal.hasClass('visible') && modalTextarea.length) {
            e.preventDefault(); 
            console.log("Tabbing from Chat Input to Modal Textarea");
            modalTextarea.focus(); 
        }
        
    });

    
    if (removeAttachmentBtn.length) {
        removeAttachmentBtn.on('click', function() {
             clearAttachment();
        });
    } else {
        console.warn("Remove attachment button (#removeAttachmentBtn) not found.");
    }

    // Captcha event listeners
    $('#captchaSubmit').on('click', verifyCaptcha);
    $('#captchaCancel').on('click', hideCaptcha);
    $('#refreshCaptcha').on('click', generateCaptcha);
    
    // Enter key in captcha input
    $('#captchaInput').on('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            verifyCaptcha();
        }
    });
    
    // Close modal when clicking outside
    $('#captchaModal').on('click', function(e) {
        if (e.target === this) {
            hideCaptcha();
        }
    });
    
    console.log("Chat Logic Initialized.");
    
    // Run initial health check and start periodic checking
    checkBackendHealth().then(() => {
        startPeriodicHealthCheck();
    });
}