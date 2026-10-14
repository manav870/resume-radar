// ============================================
// Resume Radar — Client Screening Orchestrator
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // ── 1. Theme Initialization (Handled globally per page) ──
    const currentTheme = localStorage.getItem('rr_theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    // ── 2. Load Active Job Criteria ──
    let activeJobCriteria = null;
    let activeCustomWeights = null;

    try {
        const savedCriteria = localStorage.getItem('rr_job_criteria');
        if (savedCriteria) {
            activeJobCriteria = JSON.parse(savedCriteria);
        }
        const savedWeights = localStorage.getItem('rr_custom_weights');
        if (savedWeights) {
            activeCustomWeights = JSON.parse(savedWeights);
        }
    } catch (e) {
        console.warn('Could not parse saved job criteria:', e);
    }

    // Default criteria if user hasn't visited job.html yet
    if (!activeJobCriteria) {
        activeJobCriteria = {
            jobTitle: 'Senior Full Stack Engineer',
            department: 'Core Engineering',
            requiredSkills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'RESTful API'],
            preferredSkills: ['Docker', 'AWS', 'GraphQL', 'TailwindCSS'],
            minYearsExperience: 4,
            minEducationLevel: "Bachelor's",
            certifications: ['AWS Certified Developer']
        };
        localStorage.setItem('rr_job_criteria', JSON.stringify(activeJobCriteria));
    }

    // Update active criteria banner in UI
    const titleEl = document.getElementById('activeJobTitle');
    const deptEl = document.getElementById('activeJobDept');
    const metaEl = document.getElementById('activeJobMeta');

    if (titleEl) titleEl.textContent = activeJobCriteria.jobTitle || 'Target Position';
    if (deptEl) deptEl.textContent = activeJobCriteria.department || 'General';
    if (metaEl) {
        const reqCount = activeJobCriteria.requiredSkills?.length || 0;
        const prefCount = activeJobCriteria.preferredSkills?.length || 0;
        const minExp = activeJobCriteria.minYearsExperience || 0;
        const edu = activeJobCriteria.minEducationLevel || 'Any';
        metaEl.textContent = `Evaluating: ${reqCount} Required Skills • ${prefCount} Preferred Skills • ${minExp}+ Yrs Exp • ${edu}`;
    }

    // ── 3. Application State ──
    let allCandidates = [];
    let currentModalCandidate = null;

    const API_BASE = (typeof BACKEND_URL !== 'undefined') ? BACKEND_URL : '';

    // ── 4. Batch Screening from Google Drive ──
    const form = document.getElementById('processForm');
    if (form) {
        const submitBtn = document.getElementById('submitBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const spinner = document.getElementById('loadingSpinner');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const inputFolderId = document.getElementById('inputFolderId').value.trim();
            const outputDocId = document.getElementById('outputDocId')?.value.trim() || '';
            const maxFiles = document.getElementById('maxFiles')?.value || 5;
            const generateDocs = document.getElementById('generateDocsCheckbox')?.checked ?? true;

            if (!inputFolderId) {
                alert('Please enter a Google Drive Resume Folder ID.');
                return;
            }

            // Set loading state
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            spinner.style.display = 'inline-block';

            try {
                const response = await fetch(`${API_BASE}/api`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        inputFolderId,
                        outputFolderId: outputDocId || null,
                        outputDocId: outputDocId || null,
                        maxFiles: parseInt(maxFiles, 10),
                        jobCriteria: activeJobCriteria,
                        customWeights: activeCustomWeights || {},
                        generateDocs
                    })
                });

                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Server error occurred during batch screening');
                }

                allCandidates = data.candidates || [];
                localStorage.setItem('rr_last_batch_results', JSON.stringify(data));

                renderDashboard(data);
                showNotification(`Successfully evaluated ${allCandidates.length} candidate(s)!`);

            } catch (err) {
                console.error(err);
                alert(`Screening Failed: ${err.message}`);
            } finally {
                submitBtn.disabled = false;
                btnText.style.display = 'inline-block';
                spinner.style.display = 'none';
            }
        });
    }

    // ── 5. Single Direct Resume Upload ──
    const dropzone = document.getElementById('singleResumeDropzone');
    const singleInput = document.getElementById('singleResumeInput');
    const singleScreenBtn = document.getElementById('singleScreenBtn');
    const singleSelectedName = document.getElementById('singleSelectedName');
    let singleFile = null;

    if (dropzone && singleInput) {
        ['dragenter', 'dragover'].forEach(name => {
            dropzone.addEventListener(name, (e) => {
                e.preventDefault();
                dropzone.classList.add('drag-active');
            });
        });

        ['dragleave', 'drop'].forEach(name => {
            dropzone.addEventListener(name, (e) => {
                e.preventDefault();
                dropzone.classList.remove('drag-active');
            });
        });

        dropzone.addEventListener('drop', (e) => {
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleSingleFileSelect(e.dataTransfer.files[0]);
            }
        });

        singleInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleSingleFileSelect(e.target.files[0]);
            }
        });

        function handleSingleFileSelect(file) {
            singleFile = file;
            if (singleSelectedName) {
                singleSelectedName.textContent = `Selected: ${file.name} (${Math.round(file.size / 1024)} KB)`;
                singleSelectedName.style.display = 'block';
            }
            if (singleScreenBtn) {
                singleScreenBtn.disabled = false;
            }
        }

        singleScreenBtn?.addEventListener('click', async () => {
            if (!singleFile) return;

            const btnText = document.getElementById('singleBtnText');
            const spinner = document.getElementById('singleSpinner');

            singleScreenBtn.disabled = true;
            btnText.style.display = 'none';
            spinner.style.display = 'inline-block';

            try {
                const formData = new FormData();
                formData.append('resumeFile', singleFile);
                formData.append('jobCriteria', JSON.stringify(activeJobCriteria));
                if (activeCustomWeights) {
                    formData.append('customWeights', JSON.stringify(activeCustomWeights));
                }
                formData.append('generateDocs', 'true');

                const response = await fetch(`${API_BASE}/api/candidates/screen-file`, {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Direct screening failed.');
                }

                // Add or prepend single candidate to current pool
                allCandidates.unshift(data.candidate);

                // Re-sort descending
                allCandidates.sort((a, b) => (b.matchEvaluation?.finalScore ?? 0) - (a.matchEvaluation?.finalScore ?? 0));

                const updatedPayload = {
                    success: true,
                    candidates: allCandidates,
                    jobCriteria: activeJobCriteria
                };
                localStorage.setItem('rr_last_batch_results', JSON.stringify(updatedPayload));

                renderDashboard(updatedPayload);
                showNotification(`Screened ${data.candidate.candidateProfile?.fullName || singleFile.name}!`);

            } catch (err) {
                console.error(err);
                alert(`Screening Error: ${err.message}`);
            } finally {
                singleScreenBtn.disabled = false;
                btnText.style.display = 'inline-block';
                spinner.style.display = 'none';
            }
        });
    }

    // ── 6. Render Dashboard Results ──
    function renderDashboard(data) {
        const resultsSection = document.getElementById('resultsSection');
        if (!resultsSection) return;

        resultsSection.style.display = 'block';

        // Calculate aggregate metrics
        const total = allCandidates.length;
        const valid = allCandidates.filter(c => c.status === 'success' && c.matchEvaluation);
        const scores = valid.map(c => c.matchEvaluation.finalScore);
        const avg = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;
        const topMatches = scores.filter(s => s >= 85).length;
        const shortlisted = allCandidates.filter(c => c.reviewStatus === 'shortlisted').length;

        // Populate summary cards
        document.getElementById('summaryTotal').textContent = total;
        document.getElementById('summaryAvgScore').textContent = `${avg}%`;
        document.getElementById('summaryTopMatches').textContent = topMatches;
        document.getElementById('summaryShortlisted').textContent = shortlisted;

        // Render table rows
        filterAndRenderTable();

        // Smooth scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ── 7. Filter & Render Candidate Table ──
    const searchInput = document.getElementById('candidateSearchInput');
    const scoreTierFilter = document.getElementById('scoreTierFilter');
    const statusFilter = document.getElementById('statusFilter');

    searchInput?.addEventListener('input', filterAndRenderTable);
    scoreTierFilter?.addEventListener('change', filterAndRenderTable);
    statusFilter?.addEventListener('change', filterAndRenderTable);

    function filterAndRenderTable() {
        const tbody = document.getElementById('resultsBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const tier = scoreTierFilter ? scoreTierFilter.value : 'all';
        const status = statusFilter ? statusFilter.value : 'all';

        const filtered = allCandidates.filter(c => {
            const name = (c.candidateProfile?.fullName || c.fileName || '').toLowerCase();
            const skills = (c.candidateProfile?.skills || []).map(s => s.toLowerCase()).join(' ');

            // Search query filter
            if (query && !name.includes(query) && !skills.includes(query)) {
                return false;
            }

            // Status filter
            if (status !== 'all' && (c.reviewStatus || 'unreviewed') !== status) {
                return false;
            }

            // Score tier filter
            const score = c.matchEvaluation?.finalScore ?? 0;
            if (tier === 'top' && score < 85) return false;
            if (tier === 'good' && (score < 70 || score >= 85)) return false;
            if (tier === 'moderate' && (score < 50 || score >= 70)) return false;
            if (tier === 'low' && score >= 50) return false;

            return true;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 32px;">No matching candidates found.</td></tr>`;
            return;
        }

        filtered.forEach((candidate, index) => {
            const tr = document.createElement('tr');

            const score = candidate.matchEvaluation?.finalScore ?? 0;
            let badgeClass = 'score-badge-low';
            if (score >= 85) badgeClass = 'score-badge-high';
            else if (score >= 70) badgeClass = 'score-badge-med';

            const prof = candidate.candidateProfile || {};
            const cat = candidate.matchEvaluation?.categoryScores || {};

            // Category Mini-Breakdown
            const req = cat.requiredSkills ? `${cat.requiredSkills.score}/${cat.requiredSkills.max}` : '-';
            const pref = cat.preferredSkills ? `${cat.preferredSkills.score}/${cat.preferredSkills.max}` : '-';
            const exp = cat.experience ? `${cat.experience.score}/${cat.experience.max}` : '-';
            const edu = cat.education ? `${cat.education.score}/${cat.education.max}` : '-';

            // Matched & Missing Skills Preview (Top 2 each)
            const matchedSkills = candidate.matchEvaluation?.matchedRequiredSkills || [];
            const missingSkills = candidate.matchEvaluation?.missingRequiredSkills || [];

            let skillsHtml = '';
            matchedSkills.slice(0, 2).forEach(s => {
                skillsHtml += `<span class="skill-tag matched"><i class="fa-solid fa-check"></i> ${escapeHTML(s)}</span>`;
            });
            if (matchedSkills.length > 2) {
                skillsHtml += `<span class="skill-tag matched">+${matchedSkills.length - 2}</span>`;
            }
            missingSkills.slice(0, 2).forEach(m => {
                skillsHtml += `<span class="skill-tag missing"><i class="fa-solid fa-xmark"></i> ${escapeHTML(m)}</span>`;
            });
            if (missingSkills.length > 2) {
                skillsHtml += `<span class="skill-tag missing">+${missingSkills.length - 2}</span>`;
            }
            if (!skillsHtml) {
                skillsHtml = '<span style="color: var(--text-muted); font-size: 0.8rem;">No skills extracted</span>';
            }

            // Review Status Select
            const reviewStatus = candidate.reviewStatus || 'unreviewed';
            const statusSelectHtml = `
                <select class="form-select status-picker" data-id="${candidate.candidateId}" style="padding: 4px 8px; font-size: 0.8rem; width: auto;">
                    <option value="unreviewed" ${reviewStatus === 'unreviewed' ? 'selected' : ''}>Unreviewed</option>
                    <option value="shortlisted" ${reviewStatus === 'shortlisted' ? 'selected' : ''}>Shortlisted</option>
                    <option value="interview_scheduled" ${reviewStatus === 'interview_scheduled' ? 'selected' : ''}>Interview</option>
                    <option value="hold" ${reviewStatus === 'hold' ? 'selected' : ''}>Hold</option>
                    <option value="rejected" ${reviewStatus === 'rejected' ? 'selected' : ''}>Rejected</option>
                </select>
            `;

            // Google Doc action
            let docActionHtml = '';
            if (candidate.reportDocUrl) {
                docActionHtml = `<a href="${candidate.reportDocUrl}" target="_blank" class="btn-outline btn-sm" style="padding: 4px 8px;" title="Open Google Doc Report"><i class="fa-solid fa-arrow-up-right-from-square"></i> Doc</a>`;
            } else {
                docActionHtml = `<button type="button" class="btn-outline btn-sm gen-doc-btn" data-id="${candidate.candidateId}" style="padding: 4px 8px;" title="Generate Google Doc"><i class="fa-solid fa-file-word"></i> Gen Doc</button>`;
            }

            tr.innerHTML = `
                <td style="font-weight: 700; color: var(--text-muted); font-size: 0.85rem;">#${index + 1}</td>
                <td>
                    <div style="font-weight: 600; color: var(--text-primary);">${escapeHTML(prof.fullName || candidate.fileName)}</div>
                    <div style="font-size: 0.78rem; color: var(--text-secondary);">${escapeHTML(prof.email || 'No email')} • ${prof.totalYearsExperience ?? 0} yrs exp</div>
                </td>
                <td>
                    <span class="score-badge ${badgeClass}">${score}%</span>
                </td>
                <td>
                    <div style="font-size: 0.76rem; font-family: 'JetBrains Mono', monospace; color: var(--text-secondary); line-height: 1.4;">
                        <div>Req: <span style="color: var(--text-primary);">${req}</span> | Pref: <span style="color: var(--text-primary);">${pref}</span></div>
                        <div>Exp: <span style="color: var(--text-primary);">${exp}</span> | Edu: <span style="color: var(--text-primary);">${edu}</span></div>
                    </div>
                </td>
                <td>
                    <div style="max-width: 220px; display: flex; flex-wrap: wrap;">${skillsHtml}</div>
                </td>
                <td>${statusSelectHtml}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <button type="button" class="btn-primary btn-sm view-details-btn" data-id="${candidate.candidateId}">
                            <i class="fa-solid fa-eye"></i> Details
                        </button>
                        ${docActionHtml}
                    </div>
                </td>
            `;

            tbody.appendChild(tr);
        });

        // Attach event listeners for in-table action buttons
        attachTableEventListeners();
    }

    function attachTableEventListeners() {
        // Status pickers
        document.querySelectorAll('.status-picker').forEach(picker => {
            picker.addEventListener('change', async (e) => {
                const candId = picker.getAttribute('data-id');
                const newStatus = e.target.value;
                updateCandidateStatus(candId, newStatus);
            });
        });

        // View Details buttons
        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const candId = btn.getAttribute('data-id');
                const candidate = allCandidates.find(c => c.candidateId === candId);
                if (candidate) openCandidateModal(candidate);
            });
        });

        // On-demand Doc Generation buttons
        document.querySelectorAll('.gen-doc-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const candId = btn.getAttribute('data-id');
                const candidate = allCandidates.find(c => c.candidateId === candId);
                if (candidate) generateDocForCandidate(candidate, btn);
            });
        });
    }

    // ── 8. Status Update API ──
    async function updateCandidateStatus(candidateId, newStatus) {
        const candidate = allCandidates.find(c => c.candidateId === candidateId);
        if (candidate) {
            candidate.reviewStatus = newStatus;
        }

        // Update summary count
        const shortlisted = allCandidates.filter(c => c.reviewStatus === 'shortlisted').length;
        document.getElementById('summaryShortlisted').textContent = shortlisted;

        // Persist updated list
        localStorage.setItem('rr_last_batch_results', JSON.stringify({
            success: true,
            candidates: allCandidates,
            jobCriteria: activeJobCriteria
        }));

        try {
            await fetch(`${API_BASE}/api/candidates/review-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ candidateId, status: newStatus })
            });
            showNotification(`Updated status to ${newStatus}`);
        } catch (err) {
            console.warn('Review status server sync notice:', err.message);
        }
    }

    // ── 9. On-Demand Doc Generator ──
    async function generateDocForCandidate(candidate, btnElement) {
        const originalText = btnElement.innerHTML;
        btnElement.disabled = true;
        btnElement.innerHTML = `<span class="spinner" style="width: 12px; height: 12px;"></span>`;

        try {
            const response = await fetch(`${API_BASE}/api/candidates/generate-report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidateData: candidate,
                    jobCriteria: activeJobCriteria
                })
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to generate document');
            }

            candidate.reportDocUrl = data.docUrl;
            candidate.reportDocId = data.docId;

            // Re-render table row
            filterAndRenderTable();
            window.open(data.docUrl, '_blank');

        } catch (err) {
            alert(`Could not generate Google Doc: ${err.message}`);
            btnElement.disabled = false;
            btnElement.innerHTML = originalText;
        }
    }

    // ── 10. Deep-Dive Modal Logic ──
    const modal = document.getElementById('candidateModal');
    const closeModalBtn = document.getElementById('closeModalBtn');

    closeModalBtn?.addEventListener('click', () => {
        if (modal) modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    function openCandidateModal(candidate) {
        if (!modal) return;
        currentModalCandidate = candidate;

        const prof = candidate.candidateProfile || {};
        const match = candidate.matchEvaluation || {};
        const ai = candidate.aiFeedback || {};
        const score = match.finalScore ?? 0;

        document.getElementById('modalCandidateName').textContent = prof.fullName || candidate.fileName;
        document.getElementById('modalContact').textContent = `${prof.email || 'Email not provided'} • ${prof.phone || 'Phone not provided'} • ${prof.totalYearsExperience ?? 0} Years Experience`;

        // Score Badge
        const scoreEl = document.getElementById('modalFinalScore');
        scoreEl.textContent = `${score}%`;
        scoreEl.className = `score-badge ${score >= 85 ? 'score-badge-high' : score >= 70 ? 'score-badge-med' : 'score-badge-low'}`;

        // Status Fit Badge
        const fitBadge = document.getElementById('modalFitBadge');
        if (score >= 85) {
            fitBadge.textContent = 'Top Candidate / Strong Match';
            fitBadge.className = 'badge badge-success';
        } else if (score >= 70) {
            fitBadge.textContent = 'Qualified / Good Match';
            fitBadge.className = 'badge badge-warning';
        } else {
            fitBadge.textContent = 'Moderate / Low Fit';
            fitBadge.className = 'badge badge-danger';
        }

        // Formula
        document.getElementById('modalFormula').textContent = match.explanationString || 'Deterministic match score calculation verified.';

        // Summary
        document.getElementById('modalSummary').textContent = prof.summary || 'No professional summary extracted.';

        // Matched Skills
        const matchedEl = document.getElementById('modalMatchedSkills');
        matchedEl.innerHTML = '';
        const matched = match.matchedRequiredSkills || [];
        if (matched.length > 0) {
            matched.forEach(s => {
                matchedEl.innerHTML += `<span class="skill-tag matched" style="margin: 3px;"><i class="fa-solid fa-check"></i> ${escapeHTML(s)}</span>`;
            });
        } else {
            matchedEl.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">None matched</span>';
        }

        // Missing Skills
        const missingEl = document.getElementById('modalMissingSkills');
        missingEl.innerHTML = '';
        const missing = match.missingRequiredSkills || [];
        if (missing.length > 0) {
            missing.forEach(m => {
                missingEl.innerHTML += `<span class="skill-tag missing" style="margin: 3px;"><i class="fa-solid fa-xmark"></i> ${escapeHTML(m)}</span>`;
            });
        } else {
            missingEl.innerHTML = '<span style="color: var(--success); font-size: 0.85rem;"><i class="fa-solid fa-circle-check"></i> All required skills evidenced</span>';
        }

        // Strengths
        const strengthsEl = document.getElementById('modalStrengths');
        strengthsEl.innerHTML = '';
        const strengths = ai.strengths || [];
        if (strengths.length > 0) {
            strengths.forEach(st => {
                strengthsEl.innerHTML += `<div style="margin-bottom: 4px;">• ${escapeHTML(st)}</div>`;
            });
        } else {
            strengthsEl.innerHTML = '<div>• Candidate credentials documented in submission.</div>';
        }

        // Gaps
        const gapsEl = document.getElementById('modalGaps');
        gapsEl.innerHTML = '';
        const gaps = ai.gaps || [];
        if (gaps.length > 0) {
            gaps.forEach(gp => {
                gapsEl.innerHTML += `<div style="margin-bottom: 4px;">• ${escapeHTML(gp)}</div>`;
            });
        } else {
            gapsEl.innerHTML = '<div>• No critical red flags identified.</div>';
        }

        // Questions
        const qEl = document.getElementById('modalQuestions');
        qEl.innerHTML = '';
        const questions = ai.interviewQuestions || [];
        if (questions.length > 0) {
            questions.forEach((q, idx) => {
                const qText = typeof q === 'string' ? q : q.question;
                const rText = q.rationale ? `<div style="color: var(--text-muted); font-size: 0.8rem; margin-top: 2px;">(Rationale: ${escapeHTML(q.rationale)})</div>` : '';
                qEl.innerHTML += `
                    <div style="background: var(--bg-surface); padding: 10px 14px; border-radius: 6px; border: 1px solid var(--border);">
                        <div style="font-weight: 600; font-size: 0.88rem; color: var(--text-primary);">Q${idx + 1}: "${escapeHTML(qText)}"</div>
                        ${rText}
                    </div>
                `;
            });
        }

        // Status Select
        document.getElementById('modalStatusSelect').value = candidate.reviewStatus || 'unreviewed';

        // Doc Button in Modal
        const modalDocBtn = document.getElementById('modalDocBtn');
        if (candidate.reportDocUrl) {
            modalDocBtn.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square"></i> Open Google Doc`;
            modalDocBtn.onclick = () => window.open(candidate.reportDocUrl, '_blank');
        } else {
            modalDocBtn.innerHTML = `<i class="fa-solid fa-file-word"></i> Generate Google Doc`;
            modalDocBtn.onclick = () => generateDocForCandidate(candidate, modalDocBtn);
        }

        modal.style.display = 'block';
    }

    // Modal Save Decision Button
    document.getElementById('modalSaveDecisionBtn')?.addEventListener('click', () => {
        if (!currentModalCandidate) return;
        const newStatus = document.getElementById('modalStatusSelect').value;
        updateCandidateStatus(currentModalCandidate.candidateId, newStatus);
        filterAndRenderTable();
        modal.style.display = 'none';
        showNotification('Decision saved successfully!');
    });

    // ── 11. CSV Export ──
    document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
        if (allCandidates.length === 0) {
            alert('No candidate results available to export.');
            return;
        }

        const headers = ['Rank', 'Candidate Name', 'Email', 'Phone', 'Match Score (%)', 'Required Skills Score', 'Preferred Skills Score', 'Experience Score', 'Education Score', 'Certifications Score', 'Review Status', 'Google Doc URL'];
        const rows = allCandidates.map((c, idx) => {
            const p = c.candidateProfile || {};
            const cat = c.matchEvaluation?.categoryScores || {};
            return [
                idx + 1,
                `"${(p.fullName || c.fileName || '').replace(/"/g, '""')}"`,
                `"${(p.email || '').replace(/"/g, '""')}"`,
                `"${(p.phone || '').replace(/"/g, '""')}"`,
                c.matchEvaluation?.finalScore ?? 0,
                cat.requiredSkills?.score ?? 0,
                cat.preferredSkills?.score ?? 0,
                cat.experience?.score ?? 0,
                cat.education?.score ?? 0,
                cat.certifications?.score ?? 0,
                `"${c.reviewStatus || 'unreviewed'}"`,
                `"${c.reportDocUrl || ''}"`
            ];
        });

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `resume-radar-screening-${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        showNotification('Exported candidate screening results to CSV!');
    });

    // ── 12. Auto-load cached batch results if existing ──
    try {
        const cached = localStorage.getItem('rr_last_batch_results');
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed.candidates) && parsed.candidates.length > 0) {
                allCandidates = parsed.candidates;
                renderDashboard(parsed);
            }
        }
    } catch (e) {
        console.warn('Could not parse cached batch results:', e);
    }

    // Helper functions
    function showNotification(msg) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--success);"></i> <span>${escapeHTML(msg)}</span>`;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(16px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function escapeHTML(str) {
        if (!str) return '';
        return String(str).replace(/[&<>'"]/g,
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
