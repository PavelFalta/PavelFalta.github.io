// Print Functionality

function initPrint() {
    // Initialize print button if it exists
    const printBtn = $('#printBtn');
    if (printBtn.length) {
        // Add tooltips if Bootstrap is available
        if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
            printBtn.attr('data-bs-toggle', 'tooltip');
            printBtn.attr('data-bs-placement', 'bottom');
            printBtn.attr('data-bs-title', 'Print your canvas (or save as PDF)');
            new bootstrap.Tooltip(printBtn);
        }

        printBtn.on('click', async function() {
            // First check if any industry is selected
            const selectedIndustry = localStorage.getItem('selectedIndustry');
            if (!selectedIndustry || selectedIndustry === 'Not specified') {
                return;
            }

            // Check if canvas is complete (progress bar at 100%)
            if (!isCanvasComplete()) {
                showPrintConfirmModal();
                return;
            }

            // If complete, proceed directly with printing
            await performPrint();
        });

        // Set up print confirmation modal event handlers using event delegation
        $(document).on('click', '#cancelPrintBtn', function() {
            hidePrintConfirmModal();
        });

        $(document).on('click', '#proceedPrintBtn', async function() {
            hidePrintConfirmModal();
            await performPrint();
        });

        // Handle escape key to close print confirmation modal
        $(document).on('keydown.printConfirm', function(e) {
            if (e.key === 'Escape' && $('#printConfirmModal').hasClass('visible')) {
                hidePrintConfirmModal();
            }
        });

        // Handle backdrop click to close print confirmation modal
        $(document).on('click', '#printConfirmModal', function(e) {
            if (e.target === this) {
                hidePrintConfirmModal();
            }
        });
    }
}

// Check if canvas is complete (all questions answered)
function isCanvasComplete() {
    const progressBar = $('#bmcProgress');
    if (!progressBar.length) return true; // If no progress bar, assume complete
    
    const percentage = parseInt(progressBar.attr('aria-valuenow') || '0', 10);
    return percentage === 100;
}

// Show print confirmation modal
function showPrintConfirmModal() {
    const modal = $('#printConfirmModal');
    const modalBox = modal.find('.confirmation-modal-box');
    
    modal.addClass('visible');
    // Use setTimeout to ensure the backdrop is visible before animating the box
    setTimeout(() => {
        modalBox.addClass('visible');
    }, 10);
}

// Hide print confirmation modal
function hidePrintConfirmModal() {
    const modal = $('#printConfirmModal');
    const modalBox = modal.find('.confirmation-modal-box');
    
    modalBox.removeClass('visible');
    // Wait for animation to complete before hiding backdrop
    setTimeout(() => {
        modal.removeClass('visible');
    }, 200);
}

// Perform the actual print operation
async function performPrint() {
    const printBtn = $('#printBtn');
    
    // Show loading feedback
    const originalIcon = printBtn.html();
    printBtn.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Preparing...');
    printBtn.prop('disabled', true);

    try {
        await generatePrintPage();
    } catch (error) {
        console.error('Error preparing print:', error);
    } finally {
        // Restore button state
        printBtn.html(originalIcon);
        printBtn.prop('disabled', false);
    }
}

// Generate print page using hidden iframe
async function generatePrintPage() {
    return new Promise((resolve, reject) => {
        // Create hidden iframe
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.style.top = '-9999px';
        iframe.style.width = '1px';
        iframe.style.height = '1px';
        iframe.style.opacity = '0';
        iframe.style.border = 'none';
        
        // Set up iframe load handler
        iframe.onload = function() {
            try {
                // Wait for content to fully load and auto-print to trigger
                setTimeout(() => {
                    try {
                        // Clean up after the auto-print has triggered
                        setTimeout(() => {
                            if (iframe.parentNode) {
                                document.body.removeChild(iframe);
                            }
                        }, 2000);
                        
                        resolve();
                    } catch (e) {
                        console.error('Error during print preparation:', e);
                        reject(e);
                    }
                }, 1500); // Wait 1.5 seconds for auto-print to trigger
            } catch (e) {
                console.error('Error setting up print iframe:', e);
                reject(e);
            }
        };
        
        iframe.onerror = function() {
            reject(new Error('Failed to load print page'));
        };
        
        // Add iframe to DOM and load the export page
        document.body.appendChild(iframe);
        iframe.src = 'pdf_export.html';
        
        // Fallback timeout
        setTimeout(() => {
            reject(new Error('Print preparation timeout'));
        }, 10000);
    });
}



// Initialize when document is ready
$(document).ready(function() {
    initPrint();
}); 