/**
 * Alza Dni Kupónový Filter - Content Script (Refactored with Debug Mode)
 * Improved version with comprehensive debugging and error handling
 */

// Debug configuration
const DEBUG_MODE = true; // Set to false to disable debug logs
const DEBUG_PREFIX = '[ALZA-CONTENT]';

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

class AlzaFilter {
    constructor() {
        this.currentFilter = '';
        this.isLoadingMore = false;
        this.filteredItemCount = 0;
        this.totalItemCount = 0;
        this.scannedItemCount = 0;
        this.loadingIndicator = null;
        this.observer = null;
        this.config = {
            selectors: {
                items: '.box.browsingitem.js-box.canBuy',
                couponCode: '.coupon-block__label--code',
                loadMoreButton: '.js-button-more.button-more.btnx.normal:not(.hdn)',
                totalCount: '.numberItem',
                unavailableItems: '.enRouteAvailability'
            },
            delays: {
                loadMore: 2000,
                nextLoad: 100
            },
            loadingIndicatorId: 'alza-filter-loading-indicator'
        };
        
        this.init();
    }

    init() {
        debugLog('🚀 AlzaFilter initialized');
        debugLog('📊 Configuration:', this.config);
        this.setupMessageListener();
        this.setupMutationObserver();
        debugLog('✅ AlzaFilter initialization completed');
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('Received message:', request);
            
            try {
                switch (request.action) {
                    case 'filter':
                        this.startFiltering(request.couponCode, request.mode);
                        sendResponse({ success: true });
                        break;
                    case 'filterMultiple':
                        this.startFilteringMultiple(request.couponCodes, request.mode);
                        sendResponse({ success: true });
                        break;
                    case 'reset':
                        this.resetFilter();
                        sendResponse({ success: true });
                        break;
                    default:
                        console.warn('Unknown action:', request.action);
                        sendResponse({ success: false, error: 'Unknown action' });
                }
            } catch (error) {
                console.error('Error handling message:', error);
                sendResponse({ success: false, error: error.message });
            }
        });
    }

    setupMutationObserver() {
        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new MutationObserver((mutations) => {
            if (this.currentFilter && !this.isLoadingMore) {
                // Debounce the filtering to avoid excessive calls
                clearTimeout(this.mutationTimeout);
                this.mutationTimeout = setTimeout(() => {
                    console.log('New content detected, applying filter to new items');
                    this.filterVisibleItems(this.currentFilter);
                }, 300);
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    createOrUpdateLoadingIndicator(scannedCount, totalCount, foundCount) {
        if (!this.loadingIndicator) {
            this.loadingIndicator = this.createLoadingIndicatorElement();
            document.body.appendChild(this.loadingIndicator);
        }
        
        const estimatedTime = Math.ceil(totalCount / 100) * 5;
        const maxEstimatedTime = estimatedTime * 2;
        const progress = totalCount > 0 ? Math.round((scannedCount / totalCount) * 100) : 0;
        
        // Format numbers with proper separators for better readability
        const formatNumber = (num) => num.toLocaleString('sk-SK');

        this.loadingIndicator.innerHTML = `
            <div style="margin-bottom: 15px;">
                <h3 style="color: white; margin: 0 0 10px 0;">Načítavanie a filtrovanie</h3>
                <div style="background: rgba(255,255,255,0.2); border-radius: 10px; height: 20px; margin: 10px 0; overflow: hidden;">
                    <div style="background: #4CAF50; height: 100%; border-radius: 10px; width: ${Math.min(progress, 100)}%; transition: width 0.3s; max-width: 100%;"></div>
                </div>
                <p style="margin: 5px 0; font-size: 16px; font-weight: bold; word-wrap: break-word;">📊 Prehľadané: ${formatNumber(scannedCount)} / ${formatNumber(totalCount)} položiek (${progress}%)</p>
                <p style="margin: 5px 0; font-size: 16px; color: #4CAF50; font-weight: bold; word-wrap: break-word;">✅ Nájdené: ${formatNumber(foundCount)} položiek</p>
                <p style="margin: 5px 0; font-size: 14px; opacity: 0.9;">Odhadovaný čas: ${estimatedTime}-${maxEstimatedTime} sekúnd</p>
            </div>
            <p style="font-size: 0.9em; margin: 0; opacity: 0.8;">
                ⚠️ Upozornenie: Ak opustíte túto stránku, filter prestane fungovať.<br>
                Prosím, buďte trpezliví a zostaňte na tejto stránke.
            </p>
        `;
    }

    createLoadingIndicatorElement() {
        const indicator = document.createElement('div');
        indicator.id = this.config.loadingIndicatorId;
        
        Object.assign(indicator.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '25px',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            borderRadius: '15px',
            zIndex: '10000',
            textAlign: 'center',
            maxWidth: '90vw',
            minWidth: '320px',
            width: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            fontFamily: 'Arial, sans-serif',
            border: '2px solid #4CAF50',
            boxSizing: 'border-box',
            wordWrap: 'break-word',
            overflowWrap: 'break-word'
        });

        return indicator;
    }

    removeLoadingIndicator() {
        if (this.loadingIndicator) {
            this.loadingIndicator.remove();
            this.loadingIndicator = null;
        }
    }

    filterVisibleItems(couponCodes) {
        // Handle both single coupon code (string) and multiple coupon codes (array)
        const codes = Array.isArray(couponCodes) ? couponCodes : [couponCodes];
        console.log('Filtering visible items for coupon codes:', codes);
        
        const items = document.querySelectorAll(this.config.selectors.items);
        console.log('Found', items.length, 'visible items to filter');
        
        if (items.length === 0) {
            console.warn('No items found to filter');
            return 0;
        }
        
        let filteredCount = 0;
        let unavailableCount = 0;
        
        // Extract percentages from all coupon codes
        const percentagesToFilter = codes.map(code => code.replace('%', '').trim());
        
        items.forEach((item, index) => {
            try {
                // Hide unavailable items first
                if (item.classList.contains('enRouteAvailability')) {
                    console.log(`Item ${index + 1} is unavailable, hiding`);
                    item.style.display = 'none';
                    unavailableCount++;
                    return;
                }

                const codeElement = item.querySelector(this.config.selectors.couponCode);
                if (codeElement) {
                    const itemCouponCode = codeElement.textContent.trim().toUpperCase();
                    console.log(`Item ${index + 1} coupon code:`, itemCouponCode);
                    
                    // Check if item matches ANY of the active filters
                    const matchesAnyFilter = percentagesToFilter.some(percentage => 
                        this.matchesCouponCode(itemCouponCode, percentage)
                    );
                    
                    if (matchesAnyFilter) {
                        console.log(`Item ${index + 1} matches one of the filters, displaying`);
                        item.style.display = 'block';
                        item.style.opacity = '1';
                        filteredCount++;
                    } else {
                        console.log(`Item ${index + 1} doesn't match any filter, hiding`);
                        item.style.display = 'none';
                    }
                } else {
                    console.log(`Item ${index + 1} has no coupon code, hiding`);
                    item.style.display = 'none';
                }
            } catch (error) {
                console.error(`Error processing item ${index + 1}:`, error);
                // Don't hide items if there's an error processing them
            }
        });

        console.log(`Filtered ${filteredCount} items, ${unavailableCount} items were unavailable`);
        this.filteredItemCount = filteredCount;
        return filteredCount;
    }

    matchesCouponCode(itemCouponCode, percentageToFilter) {
        // Multiple matching strategies for better compatibility
        const patterns = [
            percentageToFilter + '%',
            percentageToFilter + ' %',
            percentageToFilter,
            'ZĽAVA' + percentageToFilter,
            'SLEVA' + percentageToFilter
        ];
        
        return patterns.some(pattern => itemCouponCode.includes(pattern));
    }

    async loadMoreAndFilter() {
        const loadMoreButton = document.querySelector(this.config.selectors.loadMoreButton);
        
        if (!loadMoreButton || this.isLoadingMore) {
            console.log('No more items to load or already loading');
            this.isLoadingMore = false;
            this.removeLoadingIndicator();
            return;
        }

        try {
            this.isLoadingMore = true;
            console.log('Clicking load more button');
            
            // Scroll to load more button to ensure it's visible
            loadMoreButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Wait a bit for scroll to complete
            await this.delay(500);
            
            loadMoreButton.click();
            
            // Wait for new items to load
            await this.delay(this.config.delays.loadMore);
            
            const filteredCount = this.filterVisibleItems(this.currentFilter);
            const totalCount = this.getTotalItemCount();
            const scannedCount = document.querySelectorAll(this.config.selectors.items).length;
            
            this.scannedItemCount = scannedCount;
            this.createOrUpdateLoadingIndicator(scannedCount, totalCount, filteredCount);
            
            this.isLoadingMore = false;
            
            // Schedule the next load if there are more items
            const updatedLoadMoreButton = document.querySelector(this.config.selectors.loadMoreButton);
            if (updatedLoadMoreButton && !updatedLoadMoreButton.classList.contains('hdn')) {
                setTimeout(() => this.loadMoreAndFilter(), this.config.delays.nextLoad);
            } else {
                console.log('All items loaded');
                this.removeLoadingIndicator();
                this.showCompletionMessage(filteredCount, totalCount);
            }
        } catch (error) {
            console.error('Error in loadMoreAndFilter:', error);
            this.isLoadingMore = false;
            this.removeLoadingIndicator();
        }
    }

    getTotalItemCount() {
        try {
            const totalCountElement = document.querySelector(this.config.selectors.totalCount);
            return totalCountElement ? parseInt(totalCountElement.textContent.trim(), 10) || 0 : 0;
        } catch (error) {
            console.error('Error getting total item count:', error);
            return 0;
        }
    }

    showCompletionMessage(filteredCount, totalCount) {
        debugLog('🎉 Showing completion message:', { filteredCount, totalCount });
        
        // Format numbers with proper separators for better readability
        const formatNumber = (num) => num.toLocaleString('sk-SK');
        
        // Create completion message with same style as loading indicator
        const message = document.createElement('div');
        message.id = 'alza-filter-completion-message';
        
        // Use same styling as loading indicator
        Object.assign(message.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '25px',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            borderRadius: '15px',
            zIndex: '10000',
            textAlign: 'center',
            maxWidth: '90vw',
            minWidth: '320px',
            width: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            fontFamily: 'Arial, sans-serif',
            border: '2px solid #4CAF50',
            boxSizing: 'border-box',
            wordWrap: 'break-word',
            overflowWrap: 'break-word'
        });

        message.innerHTML = `
            <div style="margin-bottom: 15px;">
                <h3 style="color: white; margin: 0 0 15px 0;">🎉 Filtrovanie dokončené!</h3>
                <div style="background: rgba(76, 175, 80, 0.3); border-radius: 10px; height: 20px; margin: 15px 0; overflow: hidden;">
                    <div style="background: #4CAF50; height: 100%; border-radius: 10px; width: 100%; transition: width 0.3s; max-width: 100%;"></div>
                </div>
                <p style="margin: 10px 0; font-size: 18px; font-weight: bold; word-wrap: break-word;">📊 Prehľadané: ${formatNumber(totalCount)} položiek</p>
                <p style="margin: 10px 0; font-size: 18px; color: #4CAF50; font-weight: bold; word-wrap: break-word;">✅ Nájdené: ${formatNumber(filteredCount)} položiek</p>
                <p style="margin: 10px 0; font-size: 14px; opacity: 0.9;">Úspešnosť: ${totalCount > 0 ? Math.round((filteredCount / totalCount) * 100) : 0}%</p>
            </div>
            <p style="font-size: 0.9em; margin: 0; opacity: 0.8;">
                ✅ Filter bol úspešne aplikovaný na všetky položky.<br>
                Toto okno sa automaticky zatvorí za 5 sekúnd.
            </p>
        `;
        
        document.body.appendChild(message);
        
        debugLog('🎉 Completion message displayed');
        
        // Remove after 5 seconds with fade out effect
        setTimeout(() => {
            if (message.parentNode) {
                // Fade out animation
                message.style.transition = 'opacity 0.5s ease-out';
                message.style.opacity = '0';
                
                setTimeout(() => {
                    if (message.parentNode) {
                        message.remove();
                        debugLog('🎉 Completion message removed');
                    }
                }, 500);
            }
        }, 5000);
        
        // Allow clicking to close early
        message.addEventListener('click', () => {
            debugLog('🖱️ Completion message clicked - closing early');
            if (message.parentNode) {
                message.style.transition = 'opacity 0.3s ease-out';
                message.style.opacity = '0';
                setTimeout(() => {
                    if (message.parentNode) {
                        message.remove();
                    }
                }, 300);
            }
        });
        
        // Add hover effect
        message.addEventListener('mouseenter', () => {
            message.style.transform = 'translate(-50%, -50%) scale(1.02)';
        });
        
        message.addEventListener('mouseleave', () => {
            message.style.transform = 'translate(-50%, -50%) scale(1)';
        });
    }

    startFiltering(couponCode, mode) {
        console.log('Starting to filter items for coupon code:', couponCode, 'Mode:', mode);
        
        if (!couponCode) {
            console.error('No coupon code provided');
            return;
        }
        
        this.currentFilter = couponCode;
        
        // Remove any existing loading indicator
        this.removeLoadingIndicator();
        
        // Filter currently visible items
        const filteredCount = this.filterVisibleItems(couponCode);
        
        // If mode is 'loadAll', start loading more items and filtering them
        if (mode === 'loadAll') {
            const totalCount = this.getTotalItemCount();
            const scannedCount = document.querySelectorAll(this.config.selectors.items).length;
            this.scannedItemCount = scannedCount;
            this.createOrUpdateLoadingIndicator(scannedCount, totalCount, filteredCount);
            
            // Start loading more items after a short delay
            setTimeout(() => this.loadMoreAndFilter(), 500);
        } else {
            // Show completion message for current page mode
            const totalVisible = document.querySelectorAll(this.config.selectors.items).length;
            this.showCompletionMessage(filteredCount, totalVisible);
        }
    }

    startFilteringMultiple(couponCodes, mode) {
        console.log('Starting to filter items for multiple coupon codes:', couponCodes, 'Mode:', mode);
        
        if (!couponCodes || couponCodes.length === 0) {
            console.error('No coupon codes provided');
            return;
        }
        
        this.currentFilter = couponCodes; // Store array of filters
        
        // Remove any existing loading indicator
        this.removeLoadingIndicator();
        
        // Filter currently visible items with multiple codes
        const filteredCount = this.filterVisibleItems(couponCodes);
        
        // If mode is 'loadAll', start loading more items and filtering them
        if (mode === 'loadAll') {
            const totalCount = this.getTotalItemCount();
            const scannedCount = document.querySelectorAll(this.config.selectors.items).length;
            this.scannedItemCount = scannedCount;
            this.createOrUpdateLoadingIndicator(scannedCount, totalCount, filteredCount);
            
            // Start loading more items after a short delay
            setTimeout(() => this.loadMoreAndFilter(), 500);
        } else {
            // Show completion message for current page mode
            const totalVisible = document.querySelectorAll(this.config.selectors.items).length;
            this.showCompletionMessage(filteredCount, totalVisible);
        }
    }

    resetFilter() {
        console.log('Resetting filter');
        
        this.currentFilter = '';
        this.removeLoadingIndicator();
        
        // Clear any pending timeouts
        clearTimeout(this.mutationTimeout);
        
        // Reset all items to visible
        const items = document.querySelectorAll(this.config.selectors.items);
        console.log('Resetting', items.length, 'items');
        
        items.forEach(item => {
            item.style.display = 'block';
            item.style.opacity = '1';
        });
        
        // Show reset confirmation with same style
        this.showResetConfirmation();
    }

    showResetConfirmation() {
        debugLog('🔄 Showing reset confirmation');
        
        // Create reset confirmation with same style as completion message
        const message = document.createElement('div');
        message.id = 'alza-filter-reset-confirmation';
        
        // Use same styling as loading indicator but with blue theme
        Object.assign(message.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '25px',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            borderRadius: '15px',
            zIndex: '10000',
            textAlign: 'center',
            maxWidth: '90vw',
            minWidth: '320px',
            width: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            fontFamily: 'Arial, sans-serif',
            border: '2px solid #2196F3',
            boxSizing: 'border-box',
            wordWrap: 'break-word',
            overflowWrap: 'break-word'
        });

        message.innerHTML = `
            <div style="margin-bottom: 15px;">
                <h3 style="color: white; margin: 0 0 15px 0;">🔄 Filter zrušený</h3>
                <div style="background: rgba(33, 150, 243, 0.3); border-radius: 10px; height: 20px; margin: 15px 0;">
                    <div style="background: #2196F3; height: 100%; border-radius: 10px; width: 100%; transition: width 0.3s;"></div>
                </div>
                <p style="margin: 10px 0; font-size: 16px; font-weight: bold; color: #2196F3;">✅ Všetky položky sú opäť viditeľné</p>
            </div>
            <p style="font-size: 0.9em; margin: 0; opacity: 0.8;">
                🔄 Filter bol úspešne odstránený.<br>
                Toto okno sa automaticky zatvorí za 3 sekundy.
            </p>
        `;
        
        document.body.appendChild(message);
        
        debugLog('🔄 Reset confirmation displayed');
        
        // Remove after 3 seconds with fade out effect
        setTimeout(() => {
            if (message.parentNode) {
                message.style.transition = 'opacity 0.5s ease-out';
                message.style.opacity = '0';
                
                setTimeout(() => {
                    if (message.parentNode) {
                        message.remove();
                        debugLog('🔄 Reset confirmation removed');
                    }
                }, 500);
            }
        }, 3000);
        
        // Allow clicking to close early
        message.addEventListener('click', () => {
            debugLog('🖱️ Reset confirmation clicked - closing early');
            if (message.parentNode) {
                message.style.transition = 'opacity 0.3s ease-out';
                message.style.opacity = '0';
                setTimeout(() => {
                    if (message.parentNode) {
                        message.remove();
                    }
                }, 300);
            }
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Cleanup method
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        this.removeLoadingIndicator();
        clearTimeout(this.mutationTimeout);
    }
}

// Initialize the filter when the script loads
const alzaFilter = new AlzaFilter();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    alzaFilter.destroy();
});

console.log('Alza Filter content script ready (refactored version)');