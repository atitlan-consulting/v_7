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

                    console.log(`✅ ${targetId} loaded successfully.`);

                    // Run callback AFTER content loads
                    if (callback) callback();
                } else {
                    console.error(`❌ Target container #${targetId} not found.`);
                }
            })
            .catch((error) => {
                console.error(`❌ Error loading partial: ${error}`);
            });
    };

    // Load all sections
    loadPartial('templates/partials/about.html', 'about');
    loadPartial('templates/partials/case-studies.html', 'case-studies', () => {
        console.log("✅ Case Studies section is now loaded. Initializing case studies...");
        initializeCaseStudies(); // Run only after partial loads
    });
    loadPartial('templates/partials/team.html', 'team');
    loadPartial('templates/partials/resources.html', 'resources');
    loadPartial('templates/partials/contact.html', 'contact');

    // Load the header and footer
    loadPartial('templates/partials/header.html', 'header');
    loadPartial('templates/partials/footer.html', 'footer');
});
