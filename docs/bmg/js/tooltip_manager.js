/**
 * Initializes tooltip functionality for elements within a specified container.
 * 
 * @param {string} containerSelector The CSS selector for the container element where event delegation will occur.
 * @param {string} elementSelector The CSS selector for the elements within the container that should trigger the tooltip.
 * @param {string|function} tooltipSource A string representing the data attribute to pull tooltip text from (e.g., 'data-tooltip'), 
 *                                       or a function($element) that returns the tooltip text for the hovered element.
 * @param {string} [tooltipTargetId='questionTooltip'] The ID of the tooltip DOM element.
 */
function initTooltipLogic(containerSelector, elementSelector, tooltipSource, tooltipTargetId = 'questionTooltip') {
    const $tooltip = $('#' + tooltipTargetId);
    if (!$tooltip.length) {
        console.warn(`Tooltip element with ID '${tooltipTargetId}' not found.`);
        return; 
    }
    const tooltipOffset = 8; 
    let tooltipTimeout = null;

    $(containerSelector).on('mouseenter', elementSelector, function(e) {
        clearTimeout(tooltipTimeout); 
        const $element = $(this);
        let tooltipText;

        if (typeof tooltipSource === 'function') {
            tooltipText = tooltipSource($element);
        } else if (typeof tooltipSource === 'string') {
            tooltipText = $element.attr(tooltipSource); // Use .attr() to read data-* attributes correctly
        }

        if (!tooltipText) return; 

        $tooltip.html(tooltipText); // Use .html() to allow simple HTML in tooltips if needed

        const elementRect = e.currentTarget.getBoundingClientRect();
        
        // Pre-render off-screen to calculate size
        $tooltip.css({ top: '-9999px', left: '-9999px' }).addClass('visible'); 
        const tooltipWidth = $tooltip.outerWidth();
        const tooltipHeight = $tooltip.outerHeight();
        $tooltip.removeClass('visible'); // Hide again before positioning

        // Calculate position (prefer below, then above)
        let top = elementRect.bottom + tooltipOffset;
        let left = elementRect.left + (elementRect.width / 2) - (tooltipWidth / 2);

        // Adjust position to stay within viewport bounds
        if (left < 5) left = 5;
        if (left + tooltipWidth > window.innerWidth - 5) left = window.innerWidth - tooltipWidth - 5;
        
        if (top + tooltipHeight > window.innerHeight - 5) { // If overflows bottom
            top = elementRect.top - tooltipHeight - tooltipOffset; // Try above
             if (top < 5) top = 5; // Ensure it doesn't overflow top either
        }

        $tooltip.css({ top: top + 'px', left: left + 'px' });
        $tooltip.addClass('visible'); 

    }).on('mouseleave', elementSelector, function() {
         // Delay hiding to allow moving mouse onto the tooltip itself
         tooltipTimeout = setTimeout(() => {
             $tooltip.removeClass('visible');
         }, 50); 
    });
    
    // Keep tooltip visible if mouse enters it
    $tooltip.on('mouseenter', function() { clearTimeout(tooltipTimeout); });
    $tooltip.on('mouseleave', function() { $tooltip.removeClass('visible'); });
}

// Example Usage (would typically be called from other scripts):
/*
$(document).ready(function() {
    // Tooltip for BMC question indicators
    initTooltipLogic('#bmc-placeholder', '.question-indicator', 'data-full-question'); 

    // Tooltip for the industry display
    initTooltipLogic('.fullscreen-controls', '#currentIndustryDisplay', () => 'Change Industry'); 
});
*/ 