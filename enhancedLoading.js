async function loadMoreAndFilter() {
    const loadMoreSelector = '.js-button-more.button-more.btnx.normal:not(.hdn)';
    const loadMoreButton = document.querySelector(loadMoreSelector);
    
    if (loadMoreButton && !isLoadingMore) {
        isLoadingMore = true;
        
        // Show loading indicator
        const loadingIndicator = createLoadingIndicator();
        document.body.appendChild(loadingIndicator);
        
        // Pre-allocate space
        const itemContainer = document.querySelector('.browsingitemcontainer');
        const placeholders = createPlaceholders(24);  // Assuming 24 new items
        itemContainer.appendChild(placeholders);
        
        // Smooth scroll to maintain position
        const scrollPosition = window.pageYOffset;
        
        console.log('Clicking load more button');
        loadMoreButton.click();
        
        // Wait for new items to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Batch update
        const fragment = document.createDocumentFragment();
        const items = document.querySelectorAll('.box.browsingitem.js-box.canBuy.inStockAvailability');
        items.forEach(item => {
            const clone = item.cloneNode(true);
            fragment.appendChild(clone);
        });
        
        // Apply filter to the cloned items
        filterItems(currentFilter, fragment);
        
        // Replace placeholders with actual items
        placeholders.replaceWith(fragment);
        
        // Remove loading indicator
        loadingIndicator.remove();
        
        // Restore scroll position with smooth scrolling
        window.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
        });
        
        isLoadingMore = false;
        
        // Schedule the next load
        setTimeout(loadMoreAndFilter, 100);
    } else {
        console.log('No more items to load or already loading');
        isLoadingMore = false;
    }
}

function createLoadingIndicator() {
    const indicator = document.createElement('div');
    indicator.textContent = 'Načítavanie ďalších položiek...';
    indicator.style.position = 'fixed';
    indicator.style.top = '50%';
    indicator.style.left = '50%';
    indicator.style.transform = 'translate(-50%, -50%)';
    indicator.style.padding = '10px';
    indicator.style.backgroundColor = 'rgba(0,0,0,0.7)';
    indicator.style.color = 'white';
    indicator.style.borderRadius = '5px';
    indicator.style.zIndex = '1000';
    return indicator;
}

function createPlaceholders(count) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
        const placeholder = document.createElement('div');
        placeholder.style.height = '300px';  // Adjust based on your item height
        placeholder.style.margin = '10px';
        placeholder.style.backgroundColor = '#f0f0f0';
        fragment.appendChild(placeholder);
    }
    return fragment;
}