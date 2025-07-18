/**
 * Alza Dni Kupónový Filter - Popup Script (Refactored with Debug Mode)
 * Improved version with comprehensive debugging and error handling
 */

// Debug configuration
const DEBUG_MODE = true; // Set to false to disable debug logs
const DEBUG_PREFIX = '[ALZA-POPUP]';

function debugLog(...args) {
    if (DEBUG_MODE) {
        console.log(DEBUG_PREFIX, ...args);
    }
}

function debugError(...args) {
    if (DEBUG_MODE) {
        console.error(DEBUG_PREFIX, ...args);
    }
}

function debugWarn(...args) {
    if (DEBUG_MODE) {
        console.warn(DEBUG_PREFIX, ...args);
    }
}

class AlzaFilterPopup {
    constructor() {
        debugLog('🚀 Initializing AlzaFilterPopup...');
        
        this.currentMode = 'currentPage';
        this.elements = {};
        this.isProcessing = false;
        this.activeFilters = new Set(); // Track active filter buttons
        
        debugLog('📊 Initial state:', {
            currentMode: this.currentMode,
            isProcessing: this.isProcessing,
            activeFilters: Array.from(this.activeFilters)
        });
        
        this.init();
    }

    init() {
        debugLog('🔧 Starting initialization...');
        
        try {
            this.cacheElements();
            this.setupEventListeners();
            this.updateModeIndicator();
            this.updateSelectedFiltersDisplay();
            this.updateApplyButtonState();
            this.loadSavedSettings();
            this.checkFirstTimeUser();
            
            debugLog('✅ Initialization completed successfully');
        } catch (error) {
            debugError('❌ Initialization failed:', error);
            this.showError('Chyba pri inicializácii rozšírenia');
        }
    }

    cacheElements() {
        debugLog('🔍 Caching DOM elements...');
        
        this.elements = {
            filterButtons: document.querySelectorAll('.filter-btn'),
            resetButton: document.getElementById('resetButton'),
            currentPageModeButton: document.getElementById('currentPageMode'),
            loadAllModeButton: document.getElementById('loadAllMode'),
            modeIndicator: document.getElementById('modeIndicator'),
            infoButton: document.getElementById('infoButton'),
            infoModal: document.getElementById('infoModal'),
            closeModal: document.querySelector('.close'),
            addCustomButton: document.getElementById('addCustomButton'),
            customPercentageInput: document.getElementById('customPercentage'),
            applyFiltersButton: document.getElementById('applyFiltersButton'),
            selectedFiltersDisplay: document.getElementById('selectedFiltersDisplay'),
            welcomeModal: document.getElementById('welcomeModal'),
            welcomeCloseButton: document.getElementById('welcomeCloseButton'),
            neverShowAgainCheckbox: document.getElementById('neverShowAgainCheckbox')
        };

        // Validate that all required elements exist
        const missingElements = Object.entries(this.elements)
            .filter(([key, element]) => !element)
            .map(([key]) => key);

        if (missingElements.length > 0) {
            debugError('❌ Missing required elements:', missingElements);
            this.showError(`Chýbajú elementy: ${missingElements.join(', ')}`);
        } else {
            debugLog('✅ All DOM elements cached successfully');
            debugLog('📊 Element counts:', {
                filterButtons: this.elements.filterButtons.length,
                hasResetButton: !!this.elements.resetButton,
                hasApplyButton: !!this.elements.applyFiltersButton,
                hasDisplay: !!this.elements.selectedFiltersDisplay
            });
        }
    }

    setupEventListeners() {
        debugLog('🎧 Setting up event listeners...');
        
        try {
            // Mode toggle buttons
            this.elements.currentPageModeButton?.addEventListener('click', () => {
                debugLog('🔄 Current page mode clicked');
                this.setMode('currentPage');
            });

            this.elements.loadAllModeButton?.addEventListener('click', () => {
                debugLog('🔄 Load all mode clicked');
                this.setMode('loadAll');
            });

            // Filter buttons (toggle selection only)
            this.elements.filterButtons.forEach((button, index) => {
                button.addEventListener('click', (event) => {
                    debugLog(`🎯 Filter button ${index + 1} clicked:`, button.getAttribute('data-code'));
                    this.handleFilterToggle(event);
                });
            });

            // Apply filters button
            this.elements.applyFiltersButton?.addEventListener('click', () => {
                debugLog('🔍 Apply filters button clicked');
                this.handleApplyFilters();
            });

            // Reset button
            this.elements.resetButton?.addEventListener('click', () => {
                debugLog('🔄 Reset button clicked');
                this.handleReset();
            });

            // Add custom filter
            this.elements.addCustomButton?.addEventListener('click', () => {
                debugLog('➕ Add custom button clicked');
                this.handleAddCustomFilter();
            });

            // Custom input - Enter key support
            this.elements.customPercentageInput?.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    debugLog('⌨️ Enter key pressed in custom input');
                    this.handleAddCustomFilter();
                }
            });

            // Custom input - real-time validation
            this.elements.customPercentageInput?.addEventListener('input', (event) => {
                debugLog('📝 Custom input changed:', event.target.value);
                this.validateCustomInput(event.target);
            });

            // Info modal
            this.elements.infoButton?.addEventListener('click', () => {
                debugLog('ℹ️ Info button clicked');
                this.showModal();
            });

            this.elements.closeModal?.addEventListener('click', () => {
                debugLog('❌ Close modal clicked');
                this.hideModal();
            });

            // Close modal when clicking outside
            window.addEventListener('click', (event) => {
                if (event.target === this.elements.infoModal) {
                    debugLog('🖱️ Modal background clicked');
                    this.hideModal();
                }
            });

            // Keyboard shortcuts
            document.addEventListener('keydown', (event) => {
                this.handleKeyboardShortcuts(event);
            });

            // Welcome modal events
            this.elements.welcomeCloseButton?.addEventListener('click', () => {
                debugLog('👋 Welcome modal close button clicked');
                this.closeWelcomeModal();
            });

            // Close welcome modal when clicking outside
            this.elements.welcomeModal?.addEventListener('click', (event) => {
                if (event.target === this.elements.welcomeModal) {
                    debugLog('🖱️ Welcome modal background clicked');
                    this.closeWelcomeModal();
                }
            });
            
            debugLog('✅ Event listeners setup completed');
        } catch (error) {
            debugError('❌ Error setting up event listeners:', error);
        }
    }

    setMode(mode) {
        debugLog('🔧 Setting mode:', mode);
        
        if (this.isProcessing) {
            debugWarn('⚠️ Cannot change mode while processing');
            return;
        }

        this.currentMode = mode;
        
        // Update button states
        this.elements.currentPageModeButton?.classList.toggle('active', mode === 'currentPage');
        this.elements.loadAllModeButton?.classList.toggle('active', mode === 'loadAll');
        
        this.updateModeIndicator();
        this.saveSettings();
        
        debugLog('✅ Mode set to:', mode);
    }

    updateModeIndicator() {
        debugLog('📊 Updating mode indicator');
        
        if (this.elements.modeIndicator) {
            const modeText = this.currentMode === 'currentPage' ? 'Aktuálna stránka' : 'Načítať všetko';
            this.elements.modeIndicator.textContent = `Filtrovanie: ${modeText}`;
            debugLog('✅ Mode indicator updated:', modeText);
        } else {
            debugWarn('⚠️ Mode indicator element not found');
        }
    }

    handleFilterToggle(event) {
        debugLog('🎯 Handling filter toggle');
        
        if (this.isProcessing) {
            debugWarn('⚠️ Cannot toggle filter while processing');
            return;
        }

        const button = event.currentTarget;
        const couponCode = button.getAttribute('data-code');
        
        if (!couponCode) {
            debugError('❌ Invalid coupon code for button:', button);
            this.showError('Neplatný kupónový kód');
            return;
        }

        debugLog('🔄 Toggling filter:', couponCode);
        
        // Toggle button selection state
        this.toggleFilterButton(button, couponCode);
        
        // Update display and apply button state
        this.updateSelectedFiltersDisplay();
        this.updateApplyButtonState();
        
        debugLog('✅ Filter toggle completed');
    }

    handleAddCustomFilter() {
        debugLog('➕ Handling add custom filter');
        
        if (this.isProcessing) {
            debugWarn('⚠️ Cannot add custom filter while processing');
            return;
        }

        const input = this.elements.customPercentageInput;
        const customPercentage = input?.value.trim();
        
        debugLog('📝 Custom percentage input:', customPercentage);
        
        if (!this.validateCustomPercentage(customPercentage)) {
            debugWarn('⚠️ Invalid custom percentage:', customPercentage);
            this.showError('Prosím, zadajte platné číslo medzi 1 a 99.');
            input?.focus();
            return;
        }

        const couponCode = customPercentage + '%';
        
        if (this.activeFilters.has(couponCode)) {
            debugWarn('⚠️ Filter already exists:', couponCode);
            this.showError(`Filter ${couponCode} už existuje`);
            return;
        }
        
        debugLog('✅ Adding custom filter:', couponCode);
        
        // Add custom filter to active filters
        this.activeFilters.add(couponCode);
        
        // Clear input
        input.value = '';
        this.validateCustomInput(input);
        
        // Update display and apply button state
        this.updateSelectedFiltersDisplay();
        this.updateApplyButtonState();
        
        this.showSuccess(`Pridané: ${couponCode}`);
        debugLog('✅ Custom filter added successfully');
    }

    async handleApplyFilters() {
        debugLog('🔍 Handling apply filters');
        
        if (this.isProcessing) {
            debugWarn('⚠️ Already processing, ignoring apply request');
            return;
        }
        
        if (this.activeFilters.size === 0) {
            debugWarn('⚠️ No filters selected');
            this.showError('Vyberte aspoň jeden filter');
            return;
        }

        debugLog('🚀 Starting filter application with filters:', Array.from(this.activeFilters));

        try {
            this.setProcessingState(true, this.elements.applyFiltersButton);
            
            const tabs = await this.getActiveTab();
            if (!tabs || tabs.length === 0) {
                throw new Error('Nenašla sa aktívna záložka');
            }

            debugLog('📋 Active tab found:', tabs[0].url);

            const response = await this.sendMessageToTab(tabs[0].id, {
                action: 'filterMultiple',
                couponCodes: Array.from(this.activeFilters),
                mode: this.currentMode
            });

            debugLog('📨 Response from content script:', response);

            if (!response?.success) {
                throw new Error(response?.error || 'Neznáma chyba pri aplikovaní filtra');
            }

            const filterText = Array.from(this.activeFilters).join(', ');
            this.showSuccess(`Aplikované filtre: ${filterText}`);
            debugLog('✅ Filters applied successfully');
            
        } catch (error) {
            debugError('❌ Error applying filters:', error);
            this.showError(`Chyba: ${error.message}`);
        } finally {
            this.setProcessingState(false, this.elements.applyFiltersButton);
        }
    }

    async handleReset() {
        debugLog('🔄 Handling reset');
        
        if (this.isProcessing) {
            debugWarn('⚠️ Cannot reset while processing');
            return;
        }

        try {
            this.setProcessingState(true, this.elements.resetButton);
            
            const tabs = await this.getActiveTab();
            if (!tabs || tabs.length === 0) {
                throw new Error('Nenašla sa aktívna záložka');
            }

            debugLog('📋 Sending reset to tab:', tabs[0].url);

            const response = await this.sendMessageToTab(tabs[0].id, {
                action: 'reset'
            });

            debugLog('📨 Reset response:', response);

            if (!response?.success) {
                throw new Error(response?.error || 'Neznáma chyba pri resetovaní filtra');
            }

            this.showSuccess('Filter bol zrušený');
            
            // Clear all active filters
            this.clearAllFilters();
            debugLog('✅ Reset completed successfully');
            
        } catch (error) {
            debugError('❌ Error resetting filter:', error);
            this.showError(`Chyba: ${error.message}`);
        } finally {
            this.setProcessingState(false, this.elements.resetButton);
        }
    }

    validateCustomPercentage(value) {
        if (!value) return false;
        
        const num = parseInt(value, 10);
        const isValid = !isNaN(num) && num > 0 && num <= 99;
        
        debugLog('🔍 Validating custom percentage:', { value, num, isValid });
        return isValid;
    }

    validateCustomInput(input) {
        const value = input.value.trim();
        const isValid = this.validateCustomPercentage(value);
        
        debugLog('📝 Validating input:', { value, isValid });
        
        // Visual feedback
        input.style.borderColor = isValid || !value ? '#4CAF50' : '#f44336';
        
        // Enable/disable custom filter button
        if (this.elements.addCustomButton) {
            this.elements.addCustomButton.disabled = !isValid && value !== '';
            this.elements.addCustomButton.style.opacity = (!isValid && value !== '') ? '0.5' : '1';
        }
    }

    getActiveTab() {
        debugLog('🔍 Getting active tab...');
        return new Promise((resolve) => {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                debugLog('📋 Active tabs found:', tabs.length);
                resolve(tabs);
            });
        });
    }

    sendMessageToTab(tabId, message) {
        debugLog('📨 Sending message to tab:', { tabId, message });
        return new Promise((resolve) => {
            chrome.tabs.sendMessage(tabId, message, (response) => {
                if (chrome.runtime.lastError) {
                    debugError('❌ Chrome runtime error:', chrome.runtime.lastError.message);
                    resolve({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    debugLog('📨 Message response received:', response);
                    resolve(response);
                }
            });
        });
    }

    setProcessingState(isProcessing, element) {
        debugLog('⚙️ Setting processing state:', { isProcessing, element: element?.id });
        
        this.isProcessing = isProcessing;
        
        if (element) {
            element.disabled = isProcessing;
            element.style.opacity = isProcessing ? '0.6' : '1';
            
            if (isProcessing) {
                element.dataset.originalText = element.textContent;
                element.textContent = 'Spracováva sa...';
            } else {
                element.textContent = element.dataset.originalText || element.textContent;
            }
        }

        // Disable all interactive elements during processing
        const allButtons = document.querySelectorAll('button, input');
        allButtons.forEach(btn => {
            if (isProcessing) {
                btn.dataset.wasDisabled = btn.disabled;
                btn.disabled = true;
            } else {
                btn.disabled = btn.dataset.wasDisabled === 'true';
            }
        });
    }

    toggleFilterButton(button, couponCode) {
        debugLog('🔄 Toggling filter button:', { couponCode, wasSelected: button.classList.contains('selected') });
        
        if (button.classList.contains('selected')) {
            // Deselect button
            button.classList.remove('selected');
            this.activeFilters.delete(couponCode);
            debugLog('➖ Filter deselected:', couponCode);
        } else {
            // Select button
            button.classList.add('selected');
            this.activeFilters.add(couponCode);
            debugLog('➕ Filter selected:', couponCode);
        }
        
        debugLog('📊 Active filters now:', Array.from(this.activeFilters));
    }

    updateSelectedFiltersDisplay() {
        debugLog('📊 Updating selected filters display');
        
        const display = this.elements.selectedFiltersDisplay;
        if (!display) {
            debugWarn('⚠️ Selected filters display element not found');
            return;
        }

        if (this.activeFilters.size === 0) {
            display.textContent = 'Žiadne filtre vybrané';
            display.classList.add('empty');
            debugLog('📊 Display updated: empty state');
        } else {
            const filtersArray = Array.from(this.activeFilters).sort();
            display.textContent = `Vybrané: ${filtersArray.join(', ')}`;
            display.classList.remove('empty');
            debugLog('📊 Display updated with filters:', filtersArray);
        }
    }

    updateApplyButtonState() {
        debugLog('🔍 Updating apply button state');
        
        const button = this.elements.applyFiltersButton;
        if (!button) {
            debugWarn('⚠️ Apply button element not found');
            return;
        }

        if (this.activeFilters.size === 0) {
            button.disabled = true;
            button.textContent = '🔍 Vyberte filtre';
            debugLog('🔍 Apply button disabled (no filters)');
        } else {
            button.disabled = false;
            button.textContent = `🔍 Filtrovať (${this.activeFilters.size})`;
            debugLog('🔍 Apply button enabled with count:', this.activeFilters.size);
        }
    }

    clearAllFilters() {
        debugLog('🧹 Clearing all filters');
        
        const previousSize = this.activeFilters.size;
        
        // Clear active filters set
        this.activeFilters.clear();
        
        // Remove selected class from all filter buttons
        this.elements.filterButtons.forEach(button => {
            button.classList.remove('selected');
        });
        
        // Clear custom input
        if (this.elements.customPercentageInput) {
            this.elements.customPercentageInput.value = '';
            this.validateCustomInput(this.elements.customPercentageInput);
        }
        
        // Update display and apply button state
        this.updateSelectedFiltersDisplay();
        this.updateApplyButtonState();
        
        debugLog('✅ All filters cleared, previous count:', previousSize);
    }

    showModal() {
        debugLog('📖 Showing info modal');
        if (this.elements.infoModal) {
            this.elements.infoModal.style.display = 'block';
        }
    }

    hideModal() {
        debugLog('❌ Hiding info modal');
        if (this.elements.infoModal) {
            this.elements.infoModal.style.display = 'none';
        }
    }

    showError(message) {
        debugError('❌ Showing error:', message);
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        debugLog('✅ Showing success:', message);
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        debugLog('📢 Showing notification:', { message, type });
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '10px',
            right: '10px',
            padding: '10px 15px',
            borderRadius: '5px',
            color: 'white',
            fontSize: '14px',
            zIndex: '10000',
            maxWidth: '250px',
            wordWrap: 'break-word',
            backgroundColor: type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3'
        });

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
                debugLog('📢 Notification removed');
            }
        }, 3000);
    }

    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + R for reset
        if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
            debugLog('⌨️ Keyboard shortcut: Reset (Ctrl+R)');
            event.preventDefault();
            this.handleReset();
        }
        
        // Escape to close modal
        if (event.key === 'Escape') {
            debugLog('⌨️ Keyboard shortcut: Escape');
            this.hideModal();
        }
        
        // Number keys 1-8 for quick filter selection
        if (event.key >= '1' && event.key <= '8') {
            const buttonIndex = parseInt(event.key) - 1;
            const button = this.elements.filterButtons[buttonIndex];
            if (button) {
                debugLog('⌨️ Keyboard shortcut: Filter button', event.key);
                button.click();
            }
        }
        
        // Enter to apply filters
        if (event.key === 'Enter' && !event.target.matches('input')) {
            debugLog('⌨️ Keyboard shortcut: Apply filters (Enter)');
            this.handleApplyFilters();
        }

        // Escape to close welcome modal
        if (event.key === 'Escape' && this.elements.welcomeModal?.style.display === 'block') {
            debugLog('⌨️ Keyboard shortcut: Close welcome modal (Escape)');
            this.closeWelcomeModal();
        }
    }

    saveSettings() {
        debugLog('💾 Saving settings');
        try {
            localStorage.setItem('alzaFilter_mode', this.currentMode);
            debugLog('✅ Settings saved successfully');
        } catch (error) {
            debugWarn('⚠️ Could not save settings:', error);
        }
    }

    loadSavedSettings() {
        debugLog('📂 Loading saved settings');
        try {
            const savedMode = localStorage.getItem('alzaFilter_mode');
            if (savedMode && (savedMode === 'currentPage' || savedMode === 'loadAll')) {
                debugLog('📂 Loaded saved mode:', savedMode);
                this.setMode(savedMode);
            }
            
            const lastFilter = localStorage.getItem('alzaFilter_lastFilter');
            if (lastFilter && this.elements.customPercentageInput) {
                const percentage = lastFilter.replace('%', '');
                if (this.validateCustomPercentage(percentage)) {
                    debugLog('📂 Loaded last filter:', lastFilter);
                    this.elements.customPercentageInput.value = percentage;
                }
            }
            
            debugLog('✅ Settings loaded successfully');
        } catch (error) {
            debugWarn('⚠️ Could not load saved settings:', error);
        }
    }

    saveLastFilter(couponCode) {
        debugLog('💾 Saving last filter:', couponCode);
        try {
            localStorage.setItem('alzaFilter_lastFilter', couponCode);
        } catch (error) {
            debugWarn('⚠️ Could not save last filter:', error);
        }
    }

    checkFirstTimeUser() {
        debugLog('👋 Checking if first time user...');
        try {
            const hasSeenWelcome = localStorage.getItem('alzaFilter_hasSeenWelcome');
            const neverShowAgain = localStorage.getItem('alzaFilter_neverShowWelcome');
            
            if (!hasSeenWelcome && !neverShowAgain) {
                debugLog('👋 First time user detected - showing welcome modal');
                setTimeout(() => {
                    this.showWelcomeModal();
                }, 500); // Small delay to ensure UI is ready
            } else {
                debugLog('👋 Returning user - skipping welcome modal');
            }
        } catch (error) {
            debugWarn('⚠️ Could not check first time user status:', error);
        }
    }

    showWelcomeModal() {
        debugLog('👋 Showing welcome modal');
        if (this.elements.welcomeModal) {
            this.elements.welcomeModal.style.display = 'block';
        }
    }

    closeWelcomeModal() {
        debugLog('👋 Closing welcome modal');
        
        try {
            // Check if "never show again" is checked
            const neverShowAgain = this.elements.neverShowAgainCheckbox?.checked;
            
            if (neverShowAgain) {
                debugLog('👋 User selected "never show again"');
                localStorage.setItem('alzaFilter_neverShowWelcome', 'true');
            } else {
                debugLog('👋 Marking welcome as seen');
                localStorage.setItem('alzaFilter_hasSeenWelcome', 'true');
            }
            
            // Hide the modal
            if (this.elements.welcomeModal) {
                this.elements.welcomeModal.style.display = 'none';
            }
            
        } catch (error) {
            debugWarn('⚠️ Could not save welcome modal preferences:', error);
            // Still close the modal even if saving fails
            if (this.elements.welcomeModal) {
                this.elements.welcomeModal.style.display = 'none';
            }
        }
    }
}

// Initialize the popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    debugLog('🌟 DOM Content Loaded - Starting popup initialization');
    
    try {
        new AlzaFilterPopup();
        debugLog('🎉 Popup initialization completed successfully');
    } catch (error) {
        debugError('💥 Fatal error during popup initialization:', error);
        
        // Show emergency error message
        document.body.innerHTML = `
            <div style="padding: 20px; text-align: center; color: red;">
                <h3>Chyba rozšírenia</h3>
                <p>Nastala chyba pri načítaní rozšírenia.</p>
                <p>Skúste obnoviť stránku alebo reštartovať prehliadač.</p>
                <details style="margin-top: 10px;">
                    <summary>Technické detaily</summary>
                    <pre style="text-align: left; font-size: 12px;">${error.stack}</pre>
                </details>
            </div>
        `;
    }
});

debugLog('📜 Popup script loaded and ready');