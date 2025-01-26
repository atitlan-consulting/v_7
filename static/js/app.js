document.addEventListener('DOMContentLoaded', () => {
    // Utility function to load partials into a section
    const loadPartial = (url, targetId, callback) => {
        fetch(url)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Failed to load ${url}: ${response.statusText}`);
                }
                return response.text();
            })
            .then((data) => {
                const target = document.getElementById(targetId);
                if (target) {
                    target.innerHTML = data;

                    // Run callback after content loads
                    if (callback) callback();
                } else {
                    console.error(`Target container #${targetId} not found.`);
                }
            })
            .catch((error) => {
                console.error(`Error loading partial: ${error}`);
            });
    };

    // Load all sections
    loadPartial('partials/about.html', 'about');
    loadPartial('partials/case-studies.html', 'case-studies', initializeCaseStudies); // Initialize map & carousel here
    loadPartial('partials/team.html', 'team');
    loadPartial('partials/contact.html', 'contact');

    // Load the header and footer
    loadPartial('partials/header.html', 'header');
    loadPartial('partials/footer.html', 'footer');
});
