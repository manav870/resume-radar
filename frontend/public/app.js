document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('processForm');
    if (!form) return; // Only runs on grade.html

    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const spinner = document.getElementById('loadingSpinner');
    
    const resultsSection = document.getElementById('resultsSection');
    const summaryTotal = document.getElementById('summaryTotal');
    const summarySuccess = document.getElementById('summarySuccess');
    const summaryFailed = document.getElementById('summaryFailed');
    const summarySkipped = document.getElementById('summarySkipped');
    const resultsBody = document.getElementById('resultsBody');

    // Use same origin when hosted on web server, or fallback to BACKEND_URL
    const API_BASE = (window.location.protocol.startsWith('http'))
        ? window.location.origin
        : (typeof BACKEND_URL !== 'undefined' ? BACKEND_URL : 'http://localhost:8080');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const inputFolderId = document.getElementById('inputFolderId').value.trim();
        const outputDocId = document.getElementById('outputDocId').value.trim();
        const maxFiles = document.getElementById('maxFiles').value;

        if (!inputFolderId || !outputDocId) {
            alert('Please provide both Input Folder ID and Feedback Doc ID.');
            return;
        }

        // Reset UI
        resultsSection.classList.add('hidden');
        resultsBody.innerHTML = '';
        
        // Set loading state
        submitBtn.disabled = true;
        btnText.textContent = 'Processing...';
        spinner.classList.remove('hidden');

        try {
            const response = await fetch(`${API_BASE}/process-batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputFolderId,
                    outputFolderId: outputDocId,
                    maxFiles: parseInt(maxFiles, 10)
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Server error occurred');
            }

            renderResults(data);
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            btnText.textContent = 'Generate Batch Feedback';
            spinner.classList.add('hidden');
        }
    });

    function renderResults(data) {
        summaryTotal.textContent = data.processedCount || 0;
        summarySuccess.textContent = data.successCount || 0;
        summaryFailed.textContent = data.failedCount || 0;
        summarySkipped.textContent = data.skippedCount || 0;

        if (data.results && data.results.length > 0) {
            data.results.forEach(result => {
                const tr = document.createElement('tr');
                
                const badge = `<span class="badge ${result.status}">${result.status}</span>`;
                const scoreDisplay = result.status === 'success' ? `${result.overallScore}/20` : '-';
                
                let linkHTML = '-';
                if (result.feedbackDocUrl) {
                    linkHTML = `<a href="${result.feedbackDocUrl}" target="_blank" class="doc-link">Open Feedback →</a>`;
                }

                tr.innerHTML = `
                    <td>${escapeHTML(result.fileName)}</td>
                    <td>${badge}</td>
                    <td>${scoreDisplay}</td>
                    <td style="color: var(--text-muted); font-size: 0.88rem;">${escapeHTML(result.message)}</td>
                    <td>${linkHTML}</td>
                `;
                resultsBody.appendChild(tr);
            });
        } else {
            resultsBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">No files found or processed.</td></tr>`;
        }

        resultsSection.classList.remove('hidden');

        // Trigger reveal animations on new results
        resultsSection.querySelectorAll('.reveal').forEach(el => {
            el.classList.add('visible');
        });

        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }
});
