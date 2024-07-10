document.addEventListener('DOMContentLoaded', function() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const resetButton = document.getElementById('resetButton');
    const currentPageModeButton = document.getElementById('currentPageMode');
    const loadAllModeButton = document.getElementById('loadAllMode');
    const modeIndicator = document.getElementById('modeIndicator');
    const infoButton = document.getElementById('infoButton');
    const infoModal = document.getElementById('infoModal');
    const closeModal = document.getElementsByClassName('close')[0];
    let currentMode = 'currentPage';
  
    function updateModeIndicator() {
      modeIndicator.textContent = `Filtrovanie: ${currentMode === 'currentPage' ? 'Aktuálna stránka' : 'Načítať všetko'}`;
    }
  
    currentPageModeButton.addEventListener('click', () => {
      currentMode = 'currentPage';
      currentPageModeButton.classList.add('active');
      loadAllModeButton.classList.remove('active');
      updateModeIndicator();
    });
  
    loadAllModeButton.addEventListener('click', () => {
      currentMode = 'loadAll';
      loadAllModeButton.classList.add('active');
      currentPageModeButton.classList.remove('active');
      updateModeIndicator();
    });
  
    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        const couponCode = button.getAttribute('data-code');
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'filter',
            couponCode: couponCode,
            mode: currentMode
          });
        });
      });
    });
  
    resetButton.addEventListener('click', () => {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'reset'});
      });
    });
  
    infoButton.addEventListener('click', () => {
      infoModal.style.display = 'block';
    });
  
    closeModal.addEventListener('click', () => {
      infoModal.style.display = 'none';
    });
  
    window.addEventListener('click', (event) => {
      if (event.target == infoModal) {
        infoModal.style.display = 'none';
      }
    });
  
    updateModeIndicator();
  });