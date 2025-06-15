function loadQuestions(data, industry) {
  console.log("loadQuestions called, populating indicators. Industry:", industry);
  $('#bmc-placeholder ul[data-block-id]').each(function() {
      const ulElement = $(this);
      const blockId = ulElement.data('block-id');
      const cardBody = ulElement.closest('.card-body');
      const indicatorContainer = cardBody.find('.question-indicators');
      indicatorContainer.empty(); 

      const questions = (data[industry] && data[industry][blockId]) || (data.default && data.default[blockId]) || [];

      if (questions.length > 0) {
          questions.forEach((q, index) => {
              const indicatorHTML = `
                  <div class="question-indicator" 
                       data-question-index="${index}" 
                       data-full-question="${q.replace(/'/g, "&apos;").replace(/"/g, '&quot;')}">
                      Q${index + 1}
                  </div>
              `;
              indicatorContainer.append(indicatorHTML);
          });
      } else {
           indicatorContainer.append(`<span class="text-muted small fst-italic">No questions</span>`);
      }
  });
}


function updateIndicatorsForBlock(blockId, notesData) {
    const card = $("#bmc-placeholder .sbmc-card:has([data-block-id='" + blockId + "'])");
    const indicatorContainer = card.find('.question-indicators');
    indicatorContainer.find('.question-indicator').each(function() {
        const indicator = $(this);
        const index = parseInt(indicator.data('question-index'), 10);
        if (notesData && notesData[index] !== undefined && notesData[index] !== '') {
            indicator.addClass('answered');
        } else {
            indicator.removeClass('answered');
        }
    });
}

function checkSavedNotes(allQuestionsData, currentIndustry) { 
    console.log(`Checking for saved notes for industry: ${currentIndustry}...`);
    const industryForCheck = currentIndustry || 'Not specified'; 

    if (!allQuestionsData) {
        console.warn("checkSavedNotes called before allQuestionsData is loaded.");
        return;
    }

    $('#bmc-placeholder ul[data-block-id]').each(function() {
        const blockId = $(this).data('block-id');
        const card = $(this).closest('.sbmc-card');
        const storageKey = `bmcNotes_${industryForCheck}_${blockId}`;
        const savedNotesJson = localStorage.getItem(storageKey);

        const expectedQuestions = (allQuestionsData[industryForCheck] && allQuestionsData[industryForCheck][blockId]) || 
                                  (allQuestionsData.default && allQuestionsData.default[blockId]) || [];
        const expectedQuestionCount = expectedQuestions.length;

        let isComplete = false;
        let currentBlockNotes = {};
        if (savedNotesJson) {
            try {
                currentBlockNotes = JSON.parse(savedNotesJson);
                if (expectedQuestionCount > 0) {
                    
                    let answeredCount = 0;
                    for (let i = 0; i < expectedQuestionCount; i++) {
                        if (currentBlockNotes[i] !== undefined && currentBlockNotes[i] !== '') {
                           answeredCount++;
                        }
                    }
                    if (answeredCount === expectedQuestionCount) {
                        isComplete = true;
                    }
                } else {
                   
                   
                   isComplete = true; 
                }
            } catch (e) {
                console.error("Error parsing saved notes during check for", blockId, e);
                localStorage.removeItem(storageKey); 
            }
        } else if (expectedQuestionCount === 0) {
            
             isComplete = true;
        }

        
        if (isComplete) {
            card.addClass('has-notes');
        } else {
            card.removeClass('has-notes');
        }
        
        
        updateIndicatorsForBlock(blockId, currentBlockNotes);
    });
}

function updateProgressBar() {
    const totalCards = 14; 
    const savedCards = $('#bmc-placeholder .sbmc-card.has-notes').length;
    const percentage = totalCards > 0 ? Math.round((savedCards / totalCards) * 100) : 0;
    
    const progressBarDiv = $('#bmcProgress').closest('.progress'); 
    const progressBar = $('#bmcProgress');

    if (progressBar.length) {
        progressBar.css('width', percentage + '%').attr('aria-valuenow', percentage);
        
        
        if (percentage > 0 && !progressBarDiv.is(":visible")) {
            progressBarDiv.slideDown(); 
        } else if (percentage === 0 && progressBarDiv.is(":visible")) {
            
            progressBarDiv.slideUp(); 
        }
    }
    console.log(`Progress: ${savedCards}/${totalCards} (${percentage}%)`);
}

function calculateProgressInfo() {
    if (!allQuestionsData || !window.currentSelectedIndustry) {
        return null;
    }

    const industry = window.currentSelectedIndustry;
    const totalCards = 14;
    const blockIds = [
        'positive_impacts', 'negative_impacts', 'partners', 'value_creation', 
        'tech_resources', 'value_proposition', 'customer_relation', 'channels', 
        'customers', 'end_of_life', 'cost', 'subsidisation', 'revenue'
    ];

    let cardsCompleted = 0;
    let totalQuestions = 0;
    let answeredQuestions = 0;
    const cardProgress = {};

    blockIds.forEach(blockId => {
        const questions = (allQuestionsData[industry] && allQuestionsData[industry][blockId]) || 
                         (allQuestionsData.default && allQuestionsData.default[blockId]) || [];
        
        const storageKey = `bmcNotes_${industry}_${blockId}`;
        let savedNotes = {};
        try {
            const savedNotesJson = localStorage.getItem(storageKey);
            if (savedNotesJson) {
                savedNotes = JSON.parse(savedNotesJson);
            }
        } catch (e) {
            console.error(`Error parsing saved notes for ${blockId}:`, e);
        }

        const questionsCount = questions.length;
        const answersCount = Object.keys(savedNotes).length;
        const isComplete = questionsCount > 0 && answersCount === questionsCount;

        if (isComplete) {
            cardsCompleted++;
        }

        totalQuestions += questionsCount;
        answeredQuestions += answersCount;

        cardProgress[blockId] = {
            total_questions: questionsCount,
            answered_questions: answersCount,
            completion_percentage: questionsCount > 0 ? Math.round((answersCount / questionsCount) * 100) : 0,
            is_complete: isComplete
        };
    });

    const overallPercentage = totalCards > 0 ? Math.round((cardsCompleted / totalCards) * 100) : 0;
    const questionsPercentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

    return {
        overall_completion_percentage: overallPercentage,
        questions_completion_percentage: questionsPercentage,
        total_cards: totalCards,
        completed_cards: cardsCompleted,
        total_questions: totalQuestions,
        answered_questions: answeredQuestions,
        card_progress: cardProgress
    };
}

function initIndicatorHoverWave() {
    const indicatorWaveDelay = 60; 
    $('#bmc-placeholder').on('mouseenter', '.sbmc-card', function() {
        
        $(this).find('.question-indicator').each(function(index) {
            const indicator = $(this);
            clearTimeout(indicator.data('animationTimer')); 
            const timer = setTimeout(() => {
                indicator.addClass('visible'); 
            }, index * indicatorWaveDelay);
            indicator.data('animationTimer', timer); 
        });
    }).on('mouseleave', '.sbmc-card', function() {
        
        $(this).find('.question-indicator').each(function() {
            const indicator = $(this);
            clearTimeout(indicator.data('animationTimer'));
            indicator.removeClass('visible'); 
        });
    });
}





function initBmcLogic(globalAllQuestionsData, globalAttachedCardInfoRef, globalCurrentOpenBlockIdRef, chatUpdateAttachmentUI, chatClearAttachment, selectedIndustry) {
    
    allQuestionsData = globalAllQuestionsData; 
    const currentSelectedIndustry = selectedIndustry || 'Not specified'; 
    window.currentSelectedIndustry = currentSelectedIndustry; // Expose globally

    const fakeModal = $('#fakeModalContainer');
    const fakeModalBackdrop = $('#fakeModalBackdrop');
    const chatAttachmentDiv = $('#chatAttachmentInfo'); 

    $('#bmc-placeholder').off('.bmcEvents'); // Use namespacing for easy removal
    fakeModal.off('.bmcEvents');

    let currentQuestionsArray = [];
    let currentQuestionIndex = 0;
    let currentNotesData = {}; 
    let currentBlockIdForModal = null;
    let currentSuggestedAnswer = null; // Variable to store the AI's suggestion
    let currentUserAnswerForPreview = null; // Variable to store user's answer when suggestion is shown
    let isTypingSuggestion = false;

    // Make current modal question context available globally
    window.getCurrentModalQuestionContext = function() {
        if (!currentBlockIdForModal || !currentQuestionsArray || currentQuestionsArray.length === 0) {
            return null; // No modal active or no questions in current block
        }
        // Ensure window.attachedCardInfo is also checked as it provides the title
        const blockTitle = (window.attachedCardInfo && window.attachedCardInfo.id === currentBlockIdForModal) 
                           ? window.attachedCardInfo.title 
                           : null;

        return {
            blockId: currentBlockIdForModal,
            blockTitle: blockTitle,
            questionIndex: currentQuestionIndex,
            questionText: currentQuestionsArray[currentQuestionIndex] || null,
            currentAnswer: currentNotesData[currentQuestionIndex] || null
        };
    };

    // --- Function to type out AI Answer Suggestion ---
    function typeAnswerSuggestion(targetElement, text, speed = 30) {
        targetElement.empty();
        const words = text.split(' ');
        let i = 0;
        isTypingSuggestion = true;
        $('#acceptSuggestionBtn, #rejectSuggestionBtn, #viewAISuggestionBtn, #viewUserAnswerBtn').prop('disabled', true);

        function typeWord() {
            if (i < words.length) {
                targetElement.append(words[i] + ' ');
                i++;
                if (targetElement[0].scrollHeight > targetElement.innerHeight()) {
                    targetElement.scrollTop(targetElement[0].scrollHeight);
                }
                setTimeout(typeWord, speed);
            } else {
                isTypingSuggestion = false;
                $('#acceptSuggestionBtn, #rejectSuggestionBtn, #viewAISuggestionBtn, #viewUserAnswerBtn').prop('disabled', false);
                // Ensure the correct toggle button is active after typing completes
                $('#viewAISuggestionBtn').addClass('active');
                $('#viewUserAnswerBtn').removeClass('active');
            }
        }
        typeWord();
    }

    // --- Function to handle AI Answer Suggestion ---
    window.proposeAnswerUpdate = function(suggestionDetails) {
        if (isTypingSuggestion) return; 
        if (!suggestionDetails || !suggestionDetails.suggested_text) {
            console.warn("proposeAnswerUpdate called without suggested_text");
            return;
        }

        if (suggestionDetails.blockId && suggestionDetails.questionIndex !== undefined) {
            if (suggestionDetails.blockId !== currentBlockIdForModal || 
                suggestionDetails.questionIndex !== currentQuestionIndex) {
                console.warn("AI suggestion received for a different/closed question. Ignoring.");
                return;
            }
        }
        else if (!$('#fakeModalContainer').hasClass('visible') || !currentBlockIdForModal) {
             console.warn("AI suggestion received, but no modal is active or no blockId is current. Ignoring.");
             return;
        }
        
        $('#questionDisplayWrapper').hide(); // Hide the wrapper for question and textarea
        $('#answerSuggestionContainer').slideDown(200); // Show the suggestion container

        currentUserAnswerForPreview = $('#currentQuestionTextarea').val();
        currentSuggestedAnswer = suggestionDetails.suggested_text;
        
        // Start by typing AI suggestion
        typeAnswerSuggestion($('#answerPreviewArea'), currentSuggestedAnswer);
        $('#viewAISuggestionBtn').addClass('active').siblings().removeClass('active');
    };

    function hideSuggestionUI() {
        if (isTypingSuggestion) {
            isTypingSuggestion = false;
            $('#acceptSuggestionBtn, #rejectSuggestionBtn, #viewAISuggestionBtn, #viewUserAnswerBtn').prop('disabled', false);
        }
        $('#answerSuggestionContainer').slideUp(150, function() {
            $('#questionDisplayWrapper').show(); // Show the wrapper for question and textarea
        });
        currentSuggestedAnswer = null;
        currentUserAnswerForPreview = null;
    }
    // --- End AI Answer Suggestion ---

    function saveCurrentNote() {
        if (!currentBlockIdForModal || !currentQuestionsArray || currentQuestionsArray.length === 0) return;
        const currentTextarea = $('#currentQuestionTextarea');
        const noteValue = currentTextarea.val().trim();
        const previousNoteValue = currentNotesData[currentQuestionIndex] || '';
        let changed = false;

        if (noteValue) {
            if (currentNotesData[currentQuestionIndex] !== noteValue) {
                currentNotesData[currentQuestionIndex] = noteValue;
                changed = true;
            }
        } else {
            if (currentNotesData.hasOwnProperty(currentQuestionIndex)) {
                delete currentNotesData[currentQuestionIndex]; 
                changed = true;
            }
        }
        
        if (changed) {
            console.log("Saved note for index", currentQuestionIndex, "Data:", currentNotesData);
            showSaveNotification(); // Trigger notification on in-memory save
        } else {
            // console.log("Note for index", currentQuestionIndex, "unchanged.");
        }
    }

    function displayQuestion(index, direction = 'none') {
        hideSuggestionUI(); // Hide any previous suggestion when changing questions
        const container = $('#questionDisplayWrapper');
        const animationDuration = 250; 
        const slideOffset = '30px';

        const updateContent = () => {
            if (!currentQuestionsArray || index < 0 || index >= currentQuestionsArray.length) {
                
                container.css({'opacity': '1', 'transform': 'translateX(0)'}); 
                $('#currentQuestionText').text('No questions defined for this block.');
                $('#currentQuestionTextarea').val('').prop('disabled', true);
                $('#questionCounter').text('0 / 0');
                $('#prevQuestionBtn').prop('disabled', true);
                $('#nextQuestionBtn').prop('disabled', true);
                return;
            }

            const questionText = currentQuestionsArray[index];
            const savedNote = currentNotesData[index] || '';

            $('#currentQuestionText').text(questionText);
            $('#currentQuestionTextarea').val(savedNote).prop('disabled', false);
            $('#questionCounter').text(`${index + 1} / ${currentQuestionsArray.length}`);

            const hasQuestions = currentQuestionsArray.length > 0;
            const prevBtn = $('#prevQuestionBtn');
            const nextBtn = $('#nextQuestionBtn');

            prevBtn.prop('disabled', !hasQuestions);
            nextBtn.prop('disabled', !hasQuestions);

            if (hasQuestions) {
                if (index === 0) {
                    prevBtn.html('<i class="bi bi-save me-1"></i> Save & Close');
                } else {
                    prevBtn.html('<i class="bi bi-chevron-left me-1"></i> Save & Prev');
                }

                if (index === currentQuestionsArray.length - 1) {
                    nextBtn.html('<i class="bi bi-save me-1"></i> Save & Close');
                } else {
                    nextBtn.html('Save & Next <i class="bi bi-chevron-right ms-1"></i>');
                }
            }
             
            setTimeout(() => { $('#currentQuestionTextarea').focus(); }, 50); 
        };

        if (direction === 'none') {
            updateContent();
             
            container.css({'opacity': '0', 'transform': 'translateY(10px)'}); 
            setTimeout(() => {
                container.css({'opacity': '1', 'transform': 'translateY(0)'});
            }, 50); 
        } else {
            
            let slideOutTransform = direction === 'next' ? `translateX(-${slideOffset})` : `translateX(${slideOffset})`;
            let slideInTransform = direction === 'next' ? `translateX(${slideOffset})` : `translateX(-${slideOffset})`;

            container.css({ 
                'opacity': '0',
                'transform': slideOutTransform
            });

            setTimeout(() => {
                updateContent(); 
                
                
                container.css({
                    'transition': 'none', 
                    'transform': slideInTransform 
                });

                
                container[0].offsetHeight; 

                
                container.css({
                    'transition': '', 
                    'opacity': '1',
                    'transform': 'translateX(0)' 
                });

            }, animationDuration);
        }
    }

    let _isProcessingClose = false; // To prevent re-entrant calls

    function hasUnsavedChanges() {
        if (!currentBlockIdForModal || !currentQuestionsArray || currentQuestionsArray.length === 0) {
            // If no block is open, or no questions in the current block, consider no unsaved changes.
            const currentTextarea = $('#currentQuestionTextarea');
            // Check if textarea exists and has content when no questions are technically loaded (edge case)
            if (currentTextarea.length > 0 && currentTextarea.val().trim() !== '') {
                 // This case should ideally not happen if UI disables textarea when no questions.
                 // But if it does, and there's text, treat as unsaved.
                return true; 
            }
            return false;
        }
        const currentTextareaValue = $('#currentQuestionTextarea').val(); // Raw value
        const savedNoteValue = currentNotesData[currentQuestionIndex] || '';
        return currentTextareaValue !== savedNoteValue;
    }

    function _performActualCloseActions() {
        hideSuggestionUI(); // Hide any previous suggestion when closing modal
        const fakeModal = $('#fakeModalContainer');
        const fakeModalBackdrop = $('#fakeModalBackdrop');

        fakeModal.removeClass('visible');
        fakeModalBackdrop.removeClass('visible');
        
        if (window.currentOpenBlockId === currentBlockIdForModal) { // Only clear if this is the modal being closed
            window.currentOpenBlockId = null; 
            if (typeof chatClearAttachment === 'function') chatClearAttachment(); 
        }
        fakeModal.removeClass('modal-negative'); 
        
        // Reset state for the *next* time a modal is opened.
        // currentBlockIdForModal, currentQuestionsArray, currentQuestionIndex, currentNotesData
        // are reset here, because they are specific to the *instance* of the open modal.
        currentBlockIdForModal = null;
        currentQuestionsArray = [];
        currentQuestionIndex = 0;
        currentNotesData = {}; // Crucial: Clear notes for the next opening.
        
        _isProcessingClose = false;
    }

    function showSaveNotification() {
        const notification = $('#saveNotification');
        const spinner = notification.find('.save-spinner');
        const checkmark = notification.find('.save-checkmark');

        if (notification.length) {
            if (notification.data('hideTimeout')) clearTimeout(notification.data('hideTimeout'));
            if (notification.data('checkmarkTimeout')) clearTimeout(notification.data('checkmarkTimeout'));

            spinner.removeClass('active').css('display', 'none'); // Ensure reset
            checkmark.removeClass('active').css('display', 'none'); // Ensure reset

            spinner.addClass('active').css('display', 'flex'); // Show spinner
            
            notification.css('display', 'flex'); // Set display before adding visible class for transition
            notification.addClass('visible');

            const checkmarkTimeout = setTimeout(function() {
                spinner.removeClass('active').css('display', 'none');
                checkmark.addClass('active').css('display', 'flex'); // Show checkmark
                
                const hideTimeout = setTimeout(function() {
                    notification.removeClass('visible');
                    // After transition, set display to none again if needed, but CSS handles visibility with opacity
                    // Let's ensure display:none is set after animation for performance
                    setTimeout(() => notification.css('display', 'none'), 250); // Match transition duration
                }, 800); 
                notification.data('hideTimeout', hideTimeout);
            }, 400); 
            notification.data('checkmarkTimeout', checkmarkTimeout);
        }
    }

    // This function persists the state of currentNotesData to localStorage and updates UI
    function persistBlockNotesState() {
        if (!currentBlockIdForModal) {
            console.warn("persistBlockNotesState called without currentBlockIdForModal");
            return;
        }

        const industry = currentSelectedIndustry || 'Not specified'; // Ensure currentSelectedIndustry is available
        const storageKey = `bmcNotes_${industry}_${currentBlockIdForModal}`;
        const notesToSave = { ...currentNotesData }; // Work with a copy
        const answeredCount = Object.keys(notesToSave).length;
        let actualSaveOccurred = false;

        if (answeredCount > 0) {
            localStorage.setItem(storageKey, JSON.stringify(notesToSave));
            console.log(`Saved notes object for ${currentBlockIdForModal} (Industry: ${industry}):`, notesToSave);
            actualSaveOccurred = true;
        } else {
            // Only count as a "save" action for notification if an item existed and is now removed.
            if (localStorage.getItem(storageKey) !== null) {
                actualSaveOccurred = true;
            }
            localStorage.removeItem(storageKey); 
            console.log(`No notes to save, removed item for ${currentBlockIdForModal} (Industry: ${industry})`);
        }
        
        
        const card = $("#bmc-placeholder .sbmc-card:has([data-block-id='" + currentBlockIdForModal + "'])");
        const blockIdToUpdate = currentBlockIdForModal; 
        
        // Ensure allQuestionsData is available in this scope
        const expectedQuestionsForBlock = (allQuestionsData[industry] && allQuestionsData[industry][blockIdToUpdate]) || 
                                        (allQuestionsData.default && allQuestionsData.default[blockIdToUpdate]) || [];
        const expectedCount = expectedQuestionsForBlock.length;
        
        let isBlockComplete = false;
        if (expectedCount > 0) {
            let actualAnsweredCount = 0;
            for (let i = 0; i < expectedCount; i++) {
                if (notesToSave[i] !== undefined && notesToSave[i] !== '') {
                    actualAnsweredCount++;
                }
            }
            if (actualAnsweredCount === expectedCount) {
                isBlockComplete = true;
            }
        } else {
            isBlockComplete = true; 
        }
        
        if (isBlockComplete) {
            card.addClass('has-notes');
        } else {
            card.removeClass('has-notes');
        }
        
        updateIndicatorsForBlock(blockIdToUpdate, notesToSave); // updateIndicatorsForBlock needs notesData
        updateProgressBar(); 
    }


    function closeModalAndPersistChanges() {
        if (!currentBlockIdForModal) { // If no modal was effectively open
            _performActualCloseActions();
            return;
        }
        saveCurrentNote(); // Ensure current textarea text is in currentNotesData
        persistBlockNotesState();
        _performActualCloseActions();
    }

    function closeModalWithoutPersistingCurrentChanges() {
        // This means currentNotesData (reflecting saved notes from Prev/Next or initial load) is persisted.
        // The *current* textarea's potentially unsaved text is discarded.
        if (!currentBlockIdForModal) {
            _performActualCloseActions();
            return;
        }
        persistBlockNotesState(); // Persists currentNotesData as is
        _performActualCloseActions();
    }


    // This is the old closeModal, to be replaced by requestCloseModal
    // function closeModal() { ... } // Keep the old one for reference or remove

    function requestCloseModal() {
        if (_isProcessingClose || !$('#fakeModalContainer').hasClass('visible')) return;
        _isProcessingClose = true;

        if (hasUnsavedChanges()) {
            $('#saveChangesModal').addClass('visible'); // Show backdrop
            $('#saveChangesModal .confirmation-modal-box').addClass('visible'); // Show content box
        } else {
            saveCurrentNote(); 
            persistBlockNotesState();
            _performActualCloseActions();
            return; 
        }
        _isProcessingClose = false; 
    }

    function openModalForQuestion(blockId, questionIndex = 0) {
        
        window.currentOpenBlockId = blockId; 
        currentBlockIdForModal = blockId;

        const card = $("#bmc-placeholder .sbmc-card:has([data-block-id='" + blockId + "'])");
        const cardTitleElement = card.find('h5.card-title, h6.card-title'); 
        const cardIconHTML = cardTitleElement.find('i').prop('outerHTML') || '';
        
        const cardTitleText = cardTitleElement.clone().children().remove().end().text().trim(); 
        
        
        if (cardTitleElement.hasClass('text-danger')) { 
            fakeModal.addClass('modal-negative');
        } else {
            fakeModal.removeClass('modal-negative'); 
        }
        
        
        // Only attach card info if backend is healthy
        if (window.backendHealthStatus && window.backendHealthStatus.isHealthy) {
            window.attachedCardInfo = {
                id: blockId,
                title: cardTitleText,
                iconHTML: cardIconHTML
            };
            console.log(`Modal opened for ${blockId}, question ${questionIndex + 1}, card attached:`, window.attachedCardInfo);
            chatUpdateAttachmentUI(window.attachedCardInfo);
        } else {
            // Clear any existing attachment if backend is down
            window.attachedCardInfo = null;
            console.log(`Modal opened for ${blockId}, but backend is down - no attachment set`);
        } 
        
        fakeModal.find('#fakeModalTitle').html(cardIconHTML + cardTitleText || 'Card Details');

        
        const industry = currentSelectedIndustry; 
        currentQuestionsArray = (allQuestionsData[industry] && allQuestionsData[industry][blockId]) || (allQuestionsData.default && allQuestionsData.default[blockId]) || [];
        currentQuestionIndex = questionIndex; 
        currentNotesData = {}; 
        
        
        const storageKey = `bmcNotes_${industry}_${blockId}`;
        try {
            const savedNotesJson = localStorage.getItem(storageKey);
            if (savedNotesJson) {
                currentNotesData = JSON.parse(savedNotesJson);
                 console.log(`Loaded notes for ${blockId} (Industry: ${industry}):`, currentNotesData);
            }
        } catch (e) {
            console.error(`Error parsing saved notes for ${blockId} (Industry: ${industry})`, e);
            localStorage.removeItem(storageKey); 
        }

        displayQuestion(currentQuestionIndex, 'none'); 
        
        
        fakeModalBackdrop.addClass('visible');
        fakeModal.addClass('visible');
    }

    
    
    
    // Attach listeners using namespacing
    $('#bmc-placeholder').on('click.bmcEvents', '#prevQuestionBtn', function() {
        if (currentQuestionsArray.length === 0) return; 
        saveCurrentNote(); 
        
        if (currentQuestionIndex === 0) { // If it's the first question
            closeModalAndPersistChanges(); // Save and close the modal
            return; // Stop further execution
        }
        
        // This code only runs if it's not the first question
        let newIndex = currentQuestionIndex - 1;
        // The case where newIndex would be < 0 (i.e., currentQuestionIndex was 0) is handled by the block above.
        currentQuestionIndex = newIndex;
        displayQuestion(currentQuestionIndex, 'prev');
    });

    $('#bmc-placeholder').on('click.bmcEvents', '#nextQuestionBtn', function() {
        if (currentQuestionsArray.length === 0) return; 
        saveCurrentNote(); 

        let newIndex = currentQuestionIndex + 1;
        if (newIndex >= currentQuestionsArray.length) {
            closeModalAndPersistChanges();
            return;
        }
        currentQuestionIndex = newIndex;
        displayQuestion(currentQuestionIndex, 'next');
    });

    
    $('#bmc-placeholder').on('click.bmcEvents', '.sbmc-card', function() {
        if (!allQuestionsData || fakeModal.hasClass("visible")) return; 
        
        const blockId = $(this).find('ul[data-block-id]').data('block-id');
         if (blockId) { 
             openModalForQuestion(blockId, 0); 
         } else {
             console.warn("Could not find block-id for clicked card:", this);
         }
    });

    $('#bmc-placeholder').on('click.bmcEvents', '.question-indicator', function(e) {
        e.stopPropagation(); 
        if (!allQuestionsData || fakeModal.hasClass("visible")) return;

        const indicator = $(this);
        const questionIndex = parseInt(indicator.data('question-index'), 10);
        const blockId = indicator.closest('.sbmc-card').find('ul[data-block-id]').data('block-id');
        
        if (blockId && !isNaN(questionIndex)) {
            openModalForQuestion(blockId, questionIndex); 
        } else {
             console.warn("Could not determine blockId or questionIndex for indicator:", this);
        }
    });

    
    fakeModal.on('click.bmcEvents', '.fake-modal-close', function() {
        requestCloseModal();
    });

    $('#bmc-placeholder').on('click.bmcEvents', '#fakeModalBackdrop', function() { 
        // Only close if the main modal is visible, not the confirmation modal
        if ($('#fakeModalContainer').hasClass('visible') && !$('#saveChangesModal').hasClass('visible')) {
            requestCloseModal();
        }
    });

    
    $('#bmc-placeholder').on('keydown.bmcEvents', '#currentQuestionTextarea', function(e) {
        const fakeModal = $('#fakeModalContainer'); 
        if (e.key === 'Tab' && !e.shiftKey && fakeModal.hasClass('visible')) {
            e.preventDefault(); 
            console.log("Tabbing from Modal Textarea to Chat Input");
            $('#chatInput').focus(); 
        }
        
    });

    
    $(document).on('click', '#saveAndCloseBtn', function() {
        if (!$('#saveChangesModal').hasClass('visible')) return;
        $('#saveChangesModal .confirmation-modal-box').removeClass('visible');
        $('#saveChangesModal').removeClass('visible');
        closeModalAndPersistChanges();
    });

    $(document).on('click', '#dontSaveCloseBtn', function() {
        if (!$('#saveChangesModal').hasClass('visible')) return;
        $('#saveChangesModal .confirmation-modal-box').removeClass('visible');
        $('#saveChangesModal').removeClass('visible');
        closeModalWithoutPersistingCurrentChanges();
    });

    $(document).on('click', '#cancelCloseBtn', function() {
        if (!$('#saveChangesModal').hasClass('visible')) return;
        $('#saveChangesModal .confirmation-modal-box').removeClass('visible');
        $('#saveChangesModal').removeClass('visible');
        _isProcessingClose = false; 
    });

    // Adjust Escape key handler for the main modal
    $(document).off('keydown.closeBmcModal'); 
    $(document).on('keydown.closeBmcModal', function(e) { 
        const mainModalActive = $('#fakeModalContainer').hasClass('visible');
        const confModalActive = $('#saveChangesModal').hasClass('visible');

        if (e.key === 'Escape') {
            if (confModalActive) {
                $('#saveChangesModal .confirmation-modal-box').removeClass('visible');
                $('#saveChangesModal').removeClass('visible');
                _isProcessingClose = false; 
            } else if (mainModalActive) {
                requestCloseModal();
            }
        }
    });

    
    // --- Listeners for Suggestion Box ---
    $('#fakeModalContainer').on('click.bmcEvents', '#viewAISuggestionBtn', function() {
        if (isTypingSuggestion) return;
        $(this).addClass('active').siblings().removeClass('active');
        $('#answerPreviewArea').text(currentSuggestedAnswer || "(No AI suggestion available)");
    });

    $('#fakeModalContainer').on('click.bmcEvents', '#viewUserAnswerBtn', function() {
        if (isTypingSuggestion) return;
        $(this).addClass('active').siblings().removeClass('active');
        $('#answerPreviewArea').text(currentUserAnswerForPreview || "(No current answer recorded)");
    });

    $('#fakeModalContainer').on('click.bmcEvents', '#acceptSuggestionBtn', function() {
        if (isTypingSuggestion) return;
        if (currentSuggestedAnswer !== null) {
            $('#currentQuestionTextarea').val(currentSuggestedAnswer);
            saveCurrentNote(); 
            showSaveNotification(); 
        }
        hideSuggestionUI();
    });

    $('#fakeModalContainer').on('click.bmcEvents', '#rejectSuggestionBtn', function() {
        if (isTypingSuggestion) return;
        hideSuggestionUI();
    });
    // --- End Listeners for Suggestion Box ---

    console.log("BMC Logic Initializing for industry:", currentSelectedIndustry);
    
    loadQuestions(allQuestionsData, currentSelectedIndustry);
    checkSavedNotes(allQuestionsData, currentSelectedIndustry); 
    updateProgressBar(); 
    
    // Initialize tooltip for question indicators using the new manager
    if (typeof initTooltipLogic === 'function') {
        initTooltipLogic('#bmc-placeholder', '.question-indicator', 'data-full-question');
    } else {
        console.error("Tooltip Manager (initTooltipLogic) not found. Ensure tooltip_manager.js is loaded before bmc_logic.js");
    }

    initIndicatorHoverWave();

    console.log("BMC Logic Initialized.");
}