const QUALITY_EN = { excellent: 'Very Clear', good: 'Clear', medium: 'Somewhat Clear', poor: 'Unclear' };
const QUALITY_AR = { excellent: 'واضحة جداً', good: 'واضحة', medium: 'مقبولة', poor: 'غير واضحة' };

const SENTIMENT_EN = { positive: 'Positive', negative: 'Negative', neutral: 'Neutral', mixed: 'Mixed' };
const SENTIMENT_AR = { positive: 'إيجابي', negative: 'سلبي', neutral: 'عادي', mixed: 'متضارب' };

const RESOLUTION_EN = {
    resolved: 'Resolved ✓',
    unresolved: 'Unresolved ✗',
    partially_resolved: 'Partial ≈',
    not_applicable: 'N/A'
};
const RESOLUTION_AR = {
    resolved: 'اتحلت ✓',
    unresolved: 'لسه متحلتش ✗',
    partially_resolved: 'اتحلت جزءًا ≈',
    not_applicable: 'مش مطلوب'
};

const EMOTION_EN = {
    hap: 'Happy', happy: 'Happy',
    ang: 'Angry', angry: 'Angry',
    sad: 'Sad',
    neu: 'Neutral', neutral: 'Neutral',
    fea: 'Fearful', fear: 'Fearful',
    dis: 'Disgusted', disgust: 'Disgusted',
    sur: 'Surprised'
};
const EMOTION_AR = {
    hap: 'مبسوط', happy: 'مبسوط',
    ang: 'متضايق', angry: 'متضايق',
    sad: 'زهقان',
    neu: 'عادي', neutral: 'عادي',
    fea: 'قلقان', fear: 'قلقان',
    dis: 'متذمر', disgust: 'متذمر',
    sur: 'متفاجئ'
};

const BAR_DEFS = [
    { key: 'engagement_level',  labelEn: 'Engagement',         labelAr: 'مدى الجدية',       color: v => v >= 0.6 ? 'green'  : v >= 0.35 ? 'amber' : 'red' },
    { key: 'frustration_level', labelEn: 'Frustration',        labelAr: 'درجة الانزعاج',    color: v => v >= 0.65 ? 'red'   : v >= 0.35 ? 'amber' : 'green' },
    { key: 'confidence_level',  labelEn: 'Confidence',         labelAr: 'درجة الثقة',       color: v => v >= 0.6 ? 'blue'   : v >= 0.35 ? 'amber' : 'red' },
    { key: 'clarity',           labelEn: 'Audio Clarity',      labelAr: 'وضوح الصوت',       color: v => v >= 0.6 ? 'green'  : v >= 0.35 ? 'amber' : 'red' },
    { key: 'conflict_level',    labelEn: 'Urgency',            labelAr: 'مستوى الإلحاح',    color: v => v >= 0.6 ? 'red'    : v >= 0.35 ? 'amber' : 'green' },
    { key: 'responsiveness',    labelEn: 'Explanation Clarity', labelAr: 'وضوح الشرح',      color: v => v >= 0.6 ? 'purple' : v >= 0.35 ? 'amber' : 'red' },
];

function setLang(lang) {
    document.documentElement.setAttribute('data-lang', lang);
    localStorage.setItem('vocalizeLang', lang);
    document.getElementById('btnLangEn')?.classList.toggle('active', lang === 'en');
    document.getElementById('btnLangAr')?.classList.toggle('active', lang === 'ar');

    ['convQuality', 'sentiment', 'resolutionStatus', 'primaryEmotion'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.dataset.en) {
            el.textContent = lang === 'ar' ? (el.dataset.ar || el.dataset.en) : el.dataset.en;
        }
    });
}

setLang(localStorage.getItem('vocalizeLang') || 'en');

document.addEventListener('DOMContentLoaded', () => {

    const html = document.documentElement;
    const themeBtn = document.getElementById('themeToggle');
    html.setAttribute('data-theme', localStorage.getItem('vocalizeTheme') || 'dark');
    themeBtn.addEventListener('click', () => {
        const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        localStorage.setItem('vocalizeTheme', next);
    });

    const dropZone        = document.getElementById('dropZone');
    const audioInput      = document.getElementById('audioInput');
    const fileInfo        = document.getElementById('fileInfo');
    const fileName        = document.getElementById('fileName');
    const processBtn      = document.getElementById('processBtn');
    const resetBtn        = document.getElementById('resetBtn');
    const uploadSection   = document.getElementById('uploadSection');
    const processingState = document.getElementById('processingState');
    const resultsDash     = document.getElementById('resultsDashboard');
    const tabCleaned      = document.getElementById('tabCleaned');
    const tabRaw          = document.getElementById('tabRaw');
    const transcriptText  = document.getElementById('transcriptText');
    const rawTranscriptText = document.getElementById('rawTranscriptText');

    tabCleaned.addEventListener('click', () => {
        tabCleaned.classList.add('active');
        tabRaw.classList.remove('active');
        transcriptText.classList.remove('hidden');
        rawTranscriptText.classList.add('hidden');
    });
    tabRaw.addEventListener('click', () => {
        tabRaw.classList.add('active');
        tabCleaned.classList.remove('active');
        rawTranscriptText.classList.remove('hidden');
        transcriptText.classList.add('hidden');
    });

    let currentFile = null;

    dropZone.addEventListener('click', () => audioInput.click());
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files[0]);
    });
    audioInput.addEventListener('change', e => {
        if (e.target.files.length) handleFileSelect(e.target.files[0]);
    });

    function handleFileSelect(file) {
        if (!file.type.startsWith('audio/')) {
            const lang = document.documentElement.getAttribute('data-lang');
            alert(lang === 'ar' ? 'يرجى اختيار ملف صوتي صالح.' : 'Please select a valid audio file.');
            return;
        }
        currentFile = file;
        fileName.textContent = file.name;
        dropZone.classList.add('hidden');
        fileInfo.classList.remove('hidden');
    }

    processBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        uploadSection.classList.add('hidden');
        processingState.classList.remove('hidden');
        animateProcessingSteps();

        const formData = new FormData();
        formData.append('audio', currentFile);

        try {
            const response = await fetch('/upload', { method: 'POST', body: formData });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to process audio');
            }
            const data = await response.json();
            renderResults(data);
        } catch (error) {
            console.error('Upload error:', error);
            const lang = document.documentElement.getAttribute('data-lang');
            alert(lang === 'ar'
                ? `فشل في معالجة الصوت: ${error.message}`
                : `Error processing audio: ${error.message}`);
            processingState.classList.add('hidden');
            uploadSection.classList.remove('hidden');
        }
    });

    resetBtn.addEventListener('click', () => {
        currentFile = null;
        audioInput.value = '';
        resultsDash.classList.add('hidden');
        fileInfo.classList.add('hidden');
        dropZone.classList.remove('hidden');
        uploadSection.classList.remove('hidden');
        document.getElementById('savedBadge').classList.add('hidden');
        document.getElementById('assignedAgentBanner').innerHTML = '';
        document.getElementById('metricBarsContainer').innerHTML = '';
        tabCleaned.classList.add('active');
        tabRaw.classList.remove('active');
        transcriptText.classList.remove('hidden');
        rawTranscriptText.classList.add('hidden');
        document.getElementById('summaryText').textContent = '';
        document.getElementById('summaryTextAr').textContent = '';
        document.getElementById('topicsTags').innerHTML = '';
        document.getElementById('topicsTagsAr').innerHTML = '';
        ['convQuality', 'sentiment', 'resolutionStatus', 'primaryEmotion'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.textContent = ''; el.className = 'badge'; delete el.dataset.en; delete el.dataset.ar; }
        });
    });

    function animateProcessingSteps() {
        const steps = document.querySelectorAll('.processing-view .step');
        let i = 0;
        steps.forEach(s => s.classList.remove('active'));
        const iv = setInterval(() => {
            steps.forEach(s => s.classList.remove('active'));
            if (i < steps.length) steps[i].classList.add('active');
            i++;
            if (i > steps.length) clearInterval(iv);
        }, 1800);
    }

    function renderMetricBars(analysis) {
        const container = document.getElementById('metricBarsContainer');
        container.innerHTML = '';

        const flat = {
            engagement_level:  analysis.speaker_insight?.engagement_level,
            frustration_level: analysis.speaker_insight?.frustration_level,
            confidence_level:  analysis.speaker_insight?.confidence_level,
            clarity:           analysis.interaction_quality?.clarity,
            conflict_level:    analysis.interaction_quality?.conflict_level,
            responsiveness:    analysis.interaction_quality?.responsiveness,
        };

        BAR_DEFS.forEach(def => {
            const val = flat[def.key] ?? 0;
            const pct = Math.round(val * 100);
            const color = def.color(val);
            const item = document.createElement('div');
            item.className = 'metric-bar-item';
            item.innerHTML = `
                <div class="metric-bar-label">
                    <span class="metric-bar-name">
                        <span class="lang-en-only">${def.labelEn}</span>
                        <span class="lang-ar-only">${def.labelAr}</span>
                    </span>
                    <span class="metric-bar-value ${color}">${pct}%</span>
                </div>
                <div class="metric-bar-track">
                    <div class="metric-bar-fill ${color}" data-pct="${pct}" style="width:0%"></div>
                </div>`;
            container.appendChild(item);
        });

        requestAnimationFrame(() => requestAnimationFrame(() => {
            container.querySelectorAll('.metric-bar-fill').forEach(fill => {
                fill.style.width = fill.dataset.pct + '%';
            });
        }));
    }

    function renderResults(data) {
        processingState.classList.add('hidden');
        resultsDash.classList.remove('hidden');

        const lang = document.documentElement.getAttribute('data-lang') || 'en';

        if (data.report_id) document.getElementById('savedBadge').classList.remove('hidden');

        const analysis = data.analysis;

        setMetricBilingual('convQuality',
            QUALITY_EN[analysis.conversation_quality] || analysis.conversation_quality,
            QUALITY_AR[analysis.conversation_quality] || analysis.conversation_quality,
            analysis.conversation_quality);

        setMetricBilingual('sentiment',
            SENTIMENT_EN[analysis.sentiment] || analysis.sentiment,
            SENTIMENT_AR[analysis.sentiment] || analysis.sentiment,
            analysis.sentiment);

        setMetricBilingual('resolutionStatus',
            RESOLUTION_EN[analysis.resolution_status] || (analysis.resolution_status || '').replace(/_/g, ' '),
            RESOLUTION_AR[analysis.resolution_status] || analysis.resolution_status,
            analysis.resolution_status);

        const rawLabel = (data.primary_emotion?.label || 'neutral').toLowerCase();
        setMetricBilingual('primaryEmotion',
            EMOTION_EN[rawLabel] || data.primary_emotion?.label || 'Unknown',
            EMOTION_AR[rawLabel] || data.primary_emotion?.label || 'غير معروف',
            'neutral');

        document.getElementById('summaryText').textContent   = analysis.summary    || '';
        document.getElementById('summaryTextAr').textContent = analysis.summary_ar || '';

        transcriptText.textContent     = data.transcript     || 'No transcript available.';
        rawTranscriptText.textContent  = data.raw_transcript || 'No raw transcript available.';

        renderTags('topicsTags',   analysis.topics    || []);
        renderTags('topicsTagsAr', analysis.topics_ar || [], true);

        renderMetricBars(analysis);

        const banner = document.getElementById('assignedAgentBanner');
        if (data.assigned_agent) {
            const ag = data.assigned_agent;
            const initials = ag.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
            const matchPct = Math.round((ag.match_score || 0) * 100);
            const reasonEn = data.routing_reason_en || '';
            const reasonAr = data.routing_reason_ar || '';

            banner.innerHTML = `
                <div class="agent-assigned-banner">
                    <div class="agent-avatar">${initials}</div>
                    <div class="agent-assigned-info" style="flex:1;min-width:0">
                        <h5>
                            <span class="lang-en-only">Auto-assigned: ${ag.name}</span>
                            <span class="lang-ar-only">تم التعيين تلقائيًا: ${ag.name}</span>
                        </h5>
                        <p>${ag.specialization_en}${ag.specialization_ar ? ' · ' + ag.specialization_ar : ''}</p>
                        ${(reasonEn || reasonAr) ? `
                        <div class="routing-reason-block">
                            <div class="routing-reason-label">
                                <span class="lang-en-only">Why routed here</span>
                                <span class="lang-ar-only">سبب التوجيه</span>
                            </div>
                            ${reasonEn ? `<p class="lang-en-only">${reasonEn}</p>` : ''}
                            ${reasonAr ? `<p class="lang-ar-only">${reasonAr}</p>` : ''}
                        </div>` : ''}
                    </div>
                    <div class="agent-match-bar">
                        <span class="agent-match-pct">${matchPct}%</span>
                        <span class="agent-match-label">
                            <span class="lang-en-only">Match</span>
                            <span class="lang-ar-only">تطابق</span>
                        </span>
                    </div>
                </div>`;
        } else {
            banner.innerHTML = `
                <div class="no-agent-banner">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    <span class="lang-en-only">No matching agent — <a href="/admin" target="_blank" style="color:var(--accent);text-decoration:none;font-weight:600">Add agents in Admin →</a></span>
                    <span class="lang-ar-only" style="direction:rtl">لا يوجد وكيل مناسب — <a href="/admin" target="_blank" style="color:var(--accent);text-decoration:none;font-weight:600">أضف وكلاء من لوحة الإدارة →</a></span>
                </div>`;
        }
    }

    function renderTags(containerId, items, rtl = false) {
        const el = document.getElementById(containerId);
        el.innerHTML = '';
        if (!items.length) {
            el.innerHTML = `<span class="tag">${rtl ? 'لا توجد مواضيع' : 'No topics identified'}</span>`;
            return;
        }
        items.forEach(item => {
            const span = document.createElement('span');
            span.className = 'tag';
            span.textContent = item;
            el.appendChild(span);
        });
    }

    function setMetricBilingual(id, labelEn, labelAr, valueKey) {
        const el = document.getElementById(id);
        if (!el) return;

        el.dataset.en = labelEn || '—';
        el.dataset.ar = labelAr || '—';
        el.className = 'badge';

        const lang = document.documentElement.getAttribute('data-lang') || 'en';
        el.textContent = lang === 'ar' ? (labelAr || labelEn || '—') : (labelEn || '—');

        const v = (valueKey || '').toLowerCase();
        if (['excellent', 'good', 'positive', 'resolved'].includes(v))   el.classList.add('good');
        else if (['poor', 'negative', 'unresolved'].includes(v))          el.classList.add('poor');
        else if (['neutral'].includes(v))                                  el.classList.add('neutral');
        else                                                               el.classList.add('medium');
    }

});
