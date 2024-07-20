console.log('Content script loaded');

let currentFilter = '';
let isLoadingMore = false;
let filteredItemCount = 0;
let totalItemCount = 0;
let saleItemCount = 0;
function createOrUpdateLoadingIndicator(filteredCount, totalCount) {
    let loadingIndicator = document.getElementById('alza-filter-loading-indicator');
    if (!loadingIndicator) {
        loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'alza-filter-loading-indicator';
        loadingIndicator.style.position = 'fixed';
        loadingIndicator.style.top = '50%';
        loadingIndicator.style.left = '50%';
        loadingIndicator.style.transform = 'translate(-50%, -50%)';
        loadingIndicator.style.padding = '20px';
        loadingIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        loadingIndicator.style.color = 'white';
        loadingIndicator.style.borderRadius = '10px';
        loadingIndicator.style.zIndex = '9999';
        loadingIndicator.style.textAlign = 'center';
        loadingIndicator.style.maxWidth = '80%';
        loadingIndicator.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        document.body.appendChild(loadingIndicator);
    }
    
    const estimatedTime = Math.ceil(totalCount / 100) * 5;
    const maxEstimatedTime = estimatedTime * 2;

    loadingIndicator.innerHTML = `
        <h3 style="color: white">Načítavanie a filtrovanie</h3>
        <p>${filteredCount} / ${totalCount} položiek</p>
        <p>Odhadovaný čas: ${estimatedTime}-${maxEstimatedTime} sekúnd</p>
        <p style="font-size: 0.9em; margin-top: 15px;">
            Upozornenie: Ak opustíte túto stránku, filter prestane fungovať.<br>
            Prosím, buďte trpezliví a zostaňte na tejto stránke.
        </p>
    `;
}

function removeLoadingIndicator() {
    const loadingIndicator = document.getElementById('alza-filter-loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }
}
function filterVisibleItems(couponCode) {
    console.log('Filtering visible items for coupon code:', couponCode);
    const items = document.querySelectorAll('.box.browsingitem.js-box.canBuy');
    console.log('Found', items.length, 'visible items to filter');
    
    let filteredCount = 0;
    let unavailableCount = 0;
    
    // Extract the percentage from the couponCode (e.g., '50%' becomes '50')
    const percentageToFilter = couponCode.replace('%', '');
    
    items.forEach((item, index) => {
        if (item.classList.contains('enRouteAvailability')) {
            console.log(`Item ${index + 1} is unavailable, hiding`);
            item.style.display = 'none';
            unavailableCount++;
            return; // Skip further processing for this item
        }

        const codeElement = item.querySelector('.coupon-block__label--code');
        if (codeElement) {
            const itemCouponCode = codeElement.textContent.trim().toUpperCase();
            console.log(`Item ${index + 1} coupon code:`, itemCouponCode);
            
            if (itemCouponCode.includes(percentageToFilter)) {
                console.log(`Item ${index + 1} matches filter ${percentageToFilter}%, displaying`);
                item.style.display = 'block';
                filteredCount++;
            } else {
                console.log(`Item ${index + 1} doesn't match filter ${percentageToFilter}%, hiding`);
                item.style.display = 'none';
            }
        } else {
            console.log(`Item ${index + 1} has no coupon code, hiding`);
            item.style.display = 'none';
        }
    });

    console.log(`Filtered ${filteredCount} items, ${unavailableCount} items were unavailable`);
    return filteredCount;
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
        
        const filteredCount = filterVisibleItems(currentFilter);
        const totalCount = parseInt(document.querySelector('.numberItem').textContent.trim(), 10) || 0;
        
        createOrUpdateLoadingIndicator(filteredCount, totalCount);
        
        isLoadingMore = false;
        
        // Schedule the next load
        if (loadMoreButton && !loadMoreButton.classList.contains('hdn')) {
            setTimeout(loadMoreAndFilter, 100);
        } else {
            removeLoadingIndicator();
        }
    } else {
        console.log('No more items to load or already loading');
        isLoadingMore = false;
        removeLoadingIndicator();
    }
}

function startFiltering(couponCode, mode) {
    console.log('Starting to filter items for coupon code:', couponCode, 'Mode:', mode);
    currentFilter = couponCode;
    
    // Filter currently visible items
    const filteredCount = filterVisibleItems(couponCode);
    
    // If mode is 'loadAll', start loading more items and filtering them
    if (mode === 'loadAll') {
        const totalCount = parseInt(document.querySelector('.numberItem').textContent.trim(), 10) || 0;
        createOrUpdateLoadingIndicator(filteredCount, totalCount);
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