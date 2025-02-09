document.addEventListener('DOMContentLoaded', () => {
    const loadPartial = async (url, targetId, callback) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to load ${url}: ${response.statusText}`);

            // Sanitize response text
            const rawHtml = await response.text();
            const sanitizedHtml = sanitizeHTML(rawHtml);

            const target = document.getElementById(targetId);
            if (target) {
                target.innerHTML = sanitizedHtml;

                console.log(`✅ ${targetId} loaded successfully.`);
                if (callback) callback();
            } else {
                console.error(`❌ Target container #${targetId} not found.`);
            }
        } catch (error) {
            console.error(`❌ Error loading partial: ${error}`);
        }
    };

    // Example CSP-compatible sanitizer
    function sanitizeHTML(html) {
        const template = document.createElement('template');
        template.innerHTML = html;
        template.content.querySelectorAll('script, iframe, object').forEach(el => el.remove());
        return template.innerHTML;
    }

    // Load partials securely
    loadPartial('templates/partials/case-studies.html', 'case-studies');
    loadPartial('templates/partials/contact.html', 'contact');
});

