function initFullscreenControls() {
    const fullscreenBtn = $('#toggleFullscreenBtn');
    if (!fullscreenBtn.length) return; 

    const fullscreenIcon = fullscreenBtn.find('i');

    function updateFullscreenIcon() {
        if (document.fullscreenElement) {
            fullscreenIcon.removeClass('bi-arrows-fullscreen').addClass('bi-fullscreen-exit');
        } else {
            fullscreenIcon.removeClass('bi-fullscreen-exit').addClass('bi-arrows-fullscreen');
        }
    }

    fullscreenBtn.on('click', function() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`);
                alert(`Could not enter fullscreen mode: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    });

    $(document).on('fullscreenchange webkitfullscreenchange mozfullscreenchange MSFullscreenChange', function() {
        updateFullscreenIcon();
    });

    
    updateFullscreenIcon(); 
}


$(document).ready(function() {
    initFullscreenControls();
}); 