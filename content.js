console.log('Content script loaded');

let currentFilter = '';
let isLoadingMore = false;

function filterVisibleItems(couponCode) {
    console.log('Filtering visible items for coupon code:', couponCode);
    const items = document.querySelectorAll('.box.browsingitem.js-box.canBuy.inStockAvailability');
    console.log('Found', items.length, 'visible items to filter');
    
    items.forEach((item, index) => {
        const codeElement = item.querySelector('.coupon-block__label--code');
        if (codeElement) {
            const itemCouponCode = codeElement.textContent.trim().toUpperCase();
            console.log(`Item ${index + 1} coupon code:`, itemCouponCode);
            
            if (itemCouponCode === couponCode.toUpperCase()) {
                console.log(`Item ${index + 1} matches filter, displaying`);
                item.style.display = 'block';
            } else {
                console.log(`Item ${index + 1} doesn't match filter, hiding`);
                item.style.display = 'none';
            }
        } else {
            console.log(`Item ${index + 1} has no coupon code, hiding`);
            item.style.display = 'none';
        }
    });
}

async function loadMoreAndFilter() {
    const loadMoreSelector = '.js-button-more.button-more.btnx.normal:not(.hdn)';
    const loadMoreButton = document.querySelector(loadMoreSelector);
    
    if (loadMoreButton && !isLoadingMore) {
        isLoadingMore = true;
        console.log('Clicking load more button');
        loadMoreButton.click();
        
        // Wait for new items to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        filterVisibleItems(currentFilter);
        isLoadingMore = false;
        
        // Schedule the next load
        setTimeout(loadMoreAndFilter, 100);
    } else {
        console.log('No more items to load or already loading');
        isLoadingMore = false;
    }
}

function startFiltering(couponCode, mode) {
    console.log('Starting to filter items for coupon code:', couponCode, 'Mode:', mode);
    currentFilter = couponCode;
    
    // Filter currently visible items
    filterVisibleItems(couponCode);
    
    // If mode is 'loadAll', start loading more items and filtering them
    if (mode === 'loadAll') {
        loadMoreAndFilter();
    }
}

function resetFilter() {
    console.log('Resetting filter');
    currentFilter = '';
    const items = document.querySelectorAll('.box.browsingitem.js-box.canBuy.inStockAvailability');
    console.log('Resetting', items.length, 'items');
    items.forEach(item => {
        item.style.display = 'block';
    });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request);
    if (request.action === 'filter') {
        console.log('Applying filter');
        startFiltering(request.couponCode, request.mode);
    } else if (request.action === 'reset') {
        console.log('Applying reset');
        resetFilter();
    }
});

// MutationObserver to handle dynamically loaded content
const observer = new MutationObserver((mutations) => {
    if (currentFilter && !isLoadingMore) {
        console.log('New content detected, applying filter to new items');
        filterVisibleItems(currentFilter);
    }
});

// Start observing the document with the configured parameters
observer.observe(document.body, {
    childList: true,
    subtree: true
});

console.log('Content script ready');