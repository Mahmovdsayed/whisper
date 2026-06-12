(function () {
    const saved = localStorage.getItem('vocalizeTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('vocalizeTheme', next);
    });
})();

(function () {
    const lang = localStorage.getItem('vocalizeLang') || 'en';
    setLang(lang);
})();

function setLang(lang) {
    document.documentElement.setAttribute('data-lang', lang);
    localStorage.setItem('vocalizeLang', lang);
    document.getElementById('btnLangEn')?.classList.toggle('active', lang === 'en');
    document.getElementById('btnLangAr')?.classList.toggle('active', lang === 'ar');
}

function showSection(name) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('section' + name.charAt(0).toUpperCase() + name.slice(1)).classList.add('active');
    document.getElementById('nav' + name.charAt(0).toUpperCase() + name.slice(1)).classList.add('active');
    if (name === 'reports') loadReports();
    if (name === 'agents') loadAgents();
}

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
    sur: 'Surprised',
};
const EMOTION_AR = {
    hap: 'مبسوط', happy: 'مبسوط',
    ang: 'متضايق', angry: 'متضايق',
    sad: 'زهقان',
    neu: 'عادي', neutral: 'عادي',
    fea: 'قلقان', fear: 'قلقان',
    dis: 'متذمر', disgust: 'متذمر',
    sur: 'متفاجئ',
};

function getLang() {
    return document.documentElement.getAttribute('data-lang') || 'en';
}

function tQuality(v) { return getLang() === 'ar' ? (QUALITY_AR[v] || v) : (QUALITY_EN[v] || v); }
function tSentiment(v) { return getLang() === 'ar' ? (SENTIMENT_AR[v] || v) : (SENTIMENT_EN[v] || v); }
function tResolution(v) { return getLang() === 'ar' ? (RESOLUTION_AR[v] || v?.replace(/_/g, ' ')) : (RESOLUTION_EN[v] || v?.replace(/_/g, ' ')); }
function tEmotion(v) {
    const k = (v || '').toLowerCase();
    return getLang() === 'ar' ? (EMOTION_AR[k] || v || '—') : (EMOTION_EN[k] || v || '—');
}

function badgeClass(value) {
    const v = (value || '').toLowerCase();
    if (['excellent', 'good', 'positive', 'resolved'].includes(v)) return 'good';
    if (['poor', 'negative', 'unresolved'].includes(v)) return 'poor';
    return 'medium';
}

function formatDate(dt) {
    if (!dt) return '—';
    return new Date(dt).toLocaleString(getLang() === 'ar' ? 'ar-SA' : 'en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function parseJsonArray(str) {
    try { return JSON.parse(str) || []; } catch { return []; }
}

function pct(val) {
    if (val === null || val === undefined) return '—';
    return Math.round(val * 100) + '%';
}

function initials(name) {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const BAR_DEFS = [
    { enKey: 'engagement_level',  labelEn: 'Engagement',          labelAr: 'مدى الجدية',       color: v => v >= 0.6 ? 'green'  : v >= 0.35 ? 'amber' : 'red' },
    { enKey: 'frustration_level', labelEn: 'Frustration',         labelAr: 'درجة الانزعاج',    color: v => v >= 0.65 ? 'red'   : v >= 0.35 ? 'amber' : 'green' },
    { enKey: 'confidence_level',  labelEn: 'Confidence',          labelAr: 'درجة الثقة',       color: v => v >= 0.6 ? 'blue'   : v >= 0.35 ? 'amber' : 'red' },
    { enKey: 'clarity',           labelEn: 'Audio Clarity',       labelAr: 'وضوح الصوت',       color: v => v >= 0.6 ? 'green'  : v >= 0.35 ? 'amber' : 'red' },
    { enKey: 'conflict_level',    labelEn: 'Urgency',             labelAr: 'مستوى الإلحاح',    color: v => v >= 0.6 ? 'red'    : v >= 0.35 ? 'amber' : 'green' },
    { enKey: 'responsiveness',    labelEn: 'Explanation Clarity', labelAr: 'وضوح الشرح',      color: v => v >= 0.6 ? 'purple' : v >= 0.35 ? 'amber' : 'red' },
];

function renderMetricBarsHTML(r) {
    const vals = {
        engagement_level: r.engagement_level,
        frustration_level: r.frustration_level,
        confidence_level: r.confidence_level,
        clarity: r.clarity,
        conflict_level: r.conflict_level,
        responsiveness: r.responsiveness,
    };

    const items = BAR_DEFS.map(def => {
        const val = vals[def.enKey] ?? 0;
        const p = Math.round(val * 100);
        const c = def.color(val);
        return `
        <div class="metric-bar-item">
            <div class="metric-bar-label">
                <span class="metric-bar-name">
                    <span class="lang-en-only">${def.labelEn}</span>
                    <span class="lang-ar-only">${def.labelAr}</span>
                </span>
                <span class="metric-bar-value ${c}">${p}%</span>
            </div>
            <div class="metric-bar-track">
                <div class="metric-bar-fill ${c}" data-pct="${p}" style="width:0%"></div>
            </div>
        </div>`;
    }).join('');

    return `
    <div class="modal-metrics-section">
        <div class="metrics-bars-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            <span class="lang-en-only">Interaction Analysis</span>
            <span class="lang-ar-only">تحليل التفاعل</span>
        </div>
        <div class="metric-bar-row">${items}</div>
    </div>`;
}

function animateModalBars(container) {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            container.querySelectorAll('.metric-bar-fill').forEach(fill => {
                fill.style.width = fill.dataset.pct + '%';
            });
        });
    });
}

async function loadReports() {
    const container = document.getElementById('reportsTable');
    const lang = getLang();

    container.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>${lang === 'ar' ? 'جارٍ تحميل التقارير...' : 'Loading reports...'}</p></div>`;

    try {
        const res = await fetch('/reports');
        const reports = await res.json();

        const countEl = document.getElementById('reportCount');
        countEl.innerHTML = lang === 'ar'
            ? `<span class="lang-ar-only">${reports.length} تقرير${reports.length !== 1 ? '' : ''}</span>`
            : `<span class="lang-en-only">${reports.length} report${reports.length !== 1 ? 's' : ''} saved</span>`;

        if (reports.length === 0) {
            container.innerHTML = `
                <div class="table-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <p>
                        <span class="lang-en-only">No reports yet. Upload audio from the main app to get started.</span>
                        <span class="lang-ar-only">لا توجد تقارير بعد. ارفع ملفاً صوتياً من التطبيق الرئيسي للبدء.</span>
                    </p>
                </div>`;
            return;
        }

        const rows = reports.map(r => `
            <tr class="clickable" onclick="openReportModal(${r.id})">
                <td>#${r.id}</td>
                <td>${r.filename || '—'}</td>
                <td>${formatDate(r.created_at)}</td>
                <td><span class="badge ${badgeClass(r.sentiment)}">${tSentiment(r.sentiment) || '—'}</span></td>
                <td>${tEmotion(r.primary_emotion)}</td>
                <td><span class="badge ${badgeClass(r.conversation_quality)}">${tQuality(r.conversation_quality) || '—'}</span></td>
                <td><span class="badge ${badgeClass(r.resolution_status)}">${tResolution(r.resolution_status) || '—'}</span></td>
                <td>${r.assigned_agent_name
                ? `<span style="color:#818cf8;font-weight:500">${r.assigned_agent_name}</span>`
                : `<span style="color:#6b7280">${lang === 'ar' ? 'غير معيَّن' : 'Unassigned'}</span>`
            }</td>
            </tr>
        `).join('');

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th><span class="lang-en-only">Filename</span><span class="lang-ar-only">اسم الملف</span></th>
                        <th><span class="lang-en-only">Date</span><span class="lang-ar-only">التاريخ</span></th>
                        <th><span class="lang-en-only">Sentiment</span><span class="lang-ar-only">المشاعر</span></th>
                        <th><span class="lang-en-only">Emotion</span><span class="lang-ar-only">العاطفة</span></th>
                        <th><span class="lang-en-only">Quality</span><span class="lang-ar-only">الجودة</span></th>
                        <th><span class="lang-en-only">Resolution</span><span class="lang-ar-only">الحل</span></th>
                        <th><span class="lang-en-only">Assigned Agent</span><span class="lang-ar-only">الوكيل المعيَّن</span></th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>`;
    } catch (err) {
        container.innerHTML = `<div class="table-empty"><p style="color:#f87171">${getLang() === 'ar' ? 'فشل تحميل التقارير: ' : 'Failed to load reports: '}${err.message}</p></div>`;
    }
}

async function openReportModal(id) {
    const modal = document.getElementById('reportModal');
    const lang = getLang();
    modal.classList.remove('hidden');
    document.getElementById('modalBody').innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;

    try {
        const res = await fetch(`/reports/${id}`);
        const r = await res.json();

        const topicsEn = parseJsonArray(r.topics_en);
        const topicsAr = parseJsonArray(r.topics_ar);
        const keywords = parseJsonArray(r.keywords);
        const riskFlags = parseJsonArray(r.risk_flags);

        document.getElementById('modalTitle').innerHTML = `
            <span class="lang-en-only">Report #${r.id} — ${r.filename || 'Untitled'}</span>
            <span class="lang-ar-only">تقرير #${r.id} — ${r.filename || 'بدون اسم'}</span>`;

        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
            <div class="modal-detail-grid">
                <div class="modal-detail-item">
                    <label><span class="lang-en-only">Date</span><span class="lang-ar-only">التاريخ</span></label>
                    <p>${formatDate(r.created_at)}</p>
                </div>
                <div class="modal-detail-item">
                    <label><span class="lang-en-only">Assigned Agent</span><span class="lang-ar-only">الوكيل المعيَّن</span></label>
                    <p style="color:${r.assigned_agent_name ? '#818cf8' : 'inherit'};font-weight:${r.assigned_agent_name ? '600' : 'normal'}">
                        ${r.assigned_agent_name || (lang === 'ar' ? 'غير معيَّن' : 'Unassigned')}
                        ${r.match_score ? ` <span style="color:var(--text-3);font-weight:400;font-size:0.8rem">(${pct(r.match_score)} ${lang === 'ar' ? 'تطابق' : 'match'})</span>` : ''}
                    </p>
                </div>
                <div class="modal-detail-item">
                    <label><span class="lang-en-only">Sentiment</span><span class="lang-ar-only">المشاعر العامة</span></label>
                    <p><span class="badge ${badgeClass(r.sentiment)}">${tSentiment(r.sentiment) || '—'}</span></p>
                </div>
                <div class="modal-detail-item">
                    <label><span class="lang-en-only">Primary Emotion</span><span class="lang-ar-only">المشاعر الأساسية</span></label>
                    <p>${tEmotion(r.primary_emotion)} ${r.primary_emotion_score ? `<span style="color:var(--text-3);font-size:0.8rem">(${pct(r.primary_emotion_score)})</span>` : ''}</p>
                </div>
                <div class="modal-detail-item">
                    <label><span class="lang-en-only">Quality</span><span class="lang-ar-only">جودة المحادثة</span></label>
                    <p><span class="badge ${badgeClass(r.conversation_quality)}">${tQuality(r.conversation_quality) || '—'}</span></p>
                </div>
                <div class="modal-detail-item">
                    <label><span class="lang-en-only">Resolution</span><span class="lang-ar-only">حالة الحل</span></label>
                    <p><span class="badge ${badgeClass(r.resolution_status)}">${tResolution(r.resolution_status) || '—'}</span></p>
                </div>
            </div>

            ${renderMetricBarsHTML(r)}

            ${(r.routing_reason_en || r.routing_reason_ar) ? `
            <div style="margin-bottom:1.25rem">
                <label class="modal-detail-item" style="display:block;margin-bottom:0.5rem">
                    <span class="lang-en-only" style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-3)">AI Routing Reason</span>
                    <span class="lang-ar-only" style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-3)">سبب التوجيه الذكي</span>
                </label>
                <div class="routing-reason-block">
                    ${r.routing_reason_en ? `<p class="lang-en-only">${r.routing_reason_en}</p>` : ''}
                    ${r.routing_reason_ar ? `<p class="lang-ar-only">${r.routing_reason_ar}</p>` : ''}
                </div>
            </div>` : ''}

            <div class="modal-detail-item" style="margin-bottom:1rem">
                <label><span class="lang-en-only">Summary (English)</span><span class="lang-ar-only">الملخص (إنجليزي)</span></label>
                <p class="lang-en-only" style="line-height:1.65;margin-top:0.35rem;font-size:0.875rem;color:var(--text-2)">${r.summary_en || '—'}</p>
                <p class="lang-ar-only" style="line-height:1.65;margin-top:0.35rem;font-size:0.875rem;color:var(--text-2)">${r.summary_en || '—'}</p>
            </div>
            <div class="modal-detail-item" style="margin-bottom:1rem" dir="rtl">
                <label style="direction:ltr;text-align:left">
                    <span class="lang-en-only">ملخص (عربي)</span>
                    <span class="lang-ar-only">الملخص (عربي)</span>
                </label>
                <p style="line-height:1.65;margin-top:0.35rem;font-size:0.875rem;color:var(--text-2)">${r.summary_ar || '—'}</p>
            </div>

            <div class="modal-detail-item" style="margin-bottom:1rem">
                <label><span class="lang-en-only">Topics (EN)</span><span class="lang-ar-only">المواضيع (إنجليزي)</span></label>
                <div class="agent-topics" style="margin-top:0.4rem">
                    ${topicsEn.map(t => `<span class="topic-chip">${t}</span>`).join('') || '—'}
                </div>
            </div>
            <div class="modal-detail-item" style="margin-bottom:1rem">
                <label><span class="lang-en-only">Topics (AR)</span><span class="lang-ar-only">المواضيع (عربي)</span></label>
                <div class="agent-topics" style="margin-top:0.4rem;direction:rtl">
                    ${topicsAr.map(t => `<span class="topic-chip">${t}</span>`).join('') || '—'}
                </div>
            </div>

            ${riskFlags.length ? `
            <div class="modal-detail-item" style="margin-bottom:1rem">
                <label><span class="lang-en-only">⚠ Risk Flags</span><span class="lang-ar-only">⚠ علامات الخطر</span></label>
                <div class="agent-topics" style="margin-top:0.4rem">
                    ${riskFlags.map(f => `<span class="topic-chip" style="color:#f87171;border-color:rgba(239,68,68,0.3);background:rgba(239,68,68,0.1)">${f}</span>`).join('')}
                </div>
            </div>` : ''}

            <div class="modal-detail-item">
                <label><span class="lang-en-only">Refined Transcript</span><span class="lang-ar-only">النص المنقول المصحَّح</span></label>
                <div class="modal-transcript">${r.refined_transcript || r.raw_transcript || '—'}</div>
            </div>`;

        animateModalBars(modalBody);

    } catch (err) {
        document.getElementById('modalBody').innerHTML = `<p style="color:#f87171;padding:1.5rem">
            ${getLang() === 'ar' ? 'فشل التحميل: ' : 'Failed to load: '}${err.message}</p>`;
    }
}

function closeModal() {
    document.getElementById('reportModal').classList.add('hidden');
}

document.getElementById('reportModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('reportModal')) closeModal();
});

async function exportCSV() {
    const btn = document.getElementById('exportBtn');
    const lang = getLang();
    btn.disabled = true;
    btn.querySelector('.lang-en-only') && (btn.querySelector('.lang-en-only').textContent = 'Downloading...');
    btn.querySelector('.lang-ar-only') && (btn.querySelector('.lang-ar-only').textContent = 'جارٍ التنزيل...');

    try {
        const res = await fetch('/reports/export/csv');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vocalize-reports-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (err) {
        alert((lang === 'ar' ? 'فشل التصدير: ' : 'Export failed: ') + err.message);
    } finally {
        btn.disabled = false;
        btn.querySelector('.lang-en-only') && (btn.querySelector('.lang-en-only').textContent = 'Export CSV');
        btn.querySelector('.lang-ar-only') && (btn.querySelector('.lang-ar-only').textContent = 'تصدير CSV');
    }
}

let editingAgentId = null;

async function loadAgents() {
    const container = document.getElementById('agentsList');
    const lang = getLang();
    container.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>${lang === 'ar' ? 'جارٍ تحميل الوكلاء...' : 'Loading agents...'}</p></div>`;

    try {
        const res = await fetch('/agents');
        const agents = await res.json();

        if (agents.length === 0) {
            container.innerHTML = `
                <div class="no-agents">
                    <p>
                        <span class="lang-en-only">No agents yet. Add one to enable AI auto-routing.</span>
                        <span class="lang-ar-only">لا يوجد وكلاء بعد. أضف وكيلاً لتفعيل التوجيه الذكي.</span>
                    </p>
                </div>`;
            return;
        }

        container.innerHTML = `<div class="agents-grid">${agents.map(renderAgentCard).join('')}</div>`;
    } catch (err) {
        container.innerHTML = `<div class="no-agents"><p style="color:#f87171">${getLang() === 'ar' ? 'فشل التحميل: ' : 'Failed to load: '}${err.message}</p></div>`;
    }
}

function renderAgentCard(a) {
    const topics = parseJsonArray(a.topics);
    const lang = getLang();
    return `
        <div class="agent-card">
            <div class="agent-card-header">
                <div class="agent-avatar">${initials(a.name)}</div>
                <div class="agent-card-actions">
                    <button class="icon-btn" onclick="editAgent(${a.id})" title="${lang === 'ar' ? 'تعديل' : 'Edit'}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="icon-btn danger" onclick="deleteAgentById(${a.id}, '${a.name.replace(/'/g, "\\'")}')" title="${lang === 'ar' ? 'حذف' : 'Delete'}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>
                    </button>
                </div>
            </div>
            <div class="agent-name">${a.name}</div>
            <div class="agent-email">${a.email || (lang === 'ar' ? 'لا يوجد بريد إلكتروني' : 'No email')}</div>
            <div class="agent-spec lang-en-only">${a.specialization_en}</div>
            ${a.specialization_ar ? `<div class="agent-spec-ar lang-ar-only">${a.specialization_ar}</div>` : ''}
            ${a.specialization_ar ? `<div class="agent-spec lang-en-only" style="font-size:0.75rem;color:var(--text-3)">${a.specialization_ar}</div>` : ''}
            <div class="agent-topics">
                ${topics.slice(0, 6).map(t => `<span class="topic-chip">${t}</span>`).join('')}
                ${topics.length > 6 ? `<span class="topic-chip">+${topics.length - 6}</span>` : ''}
            </div>
        </div>
    `;
}

function openAgentForm() {
    editingAgentId = null;
    const lang = getLang();
    document.getElementById('agentFormTitle').innerHTML = `
        <span class="lang-en-only">New Support Agent</span>
        <span class="lang-ar-only">وكيل دعم جديد</span>`;
    document.getElementById('agentSubmitBtn').innerHTML = `
        <span class="lang-en-only">Create Agent</span>
        <span class="lang-ar-only">إنشاء وكيل</span>`;
    document.getElementById('agentName').value = '';
    document.getElementById('agentEmail').value = '';
    document.getElementById('agentSpecEn').value = '';
    document.getElementById('agentSpecAr').value = '';
    document.getElementById('agentTopics').value = '';
    document.getElementById('agentForm').classList.remove('hidden');
    document.getElementById('agentForm').scrollIntoView({ behavior: 'smooth' });
}

async function editAgent(id) {
    try {
        const res = await fetch(`/agents/${id}`);
        const a = await res.json();
        const topics = parseJsonArray(a.topics);
        const lang = getLang();

        editingAgentId = id;
        document.getElementById('agentFormTitle').innerHTML = `
            <span class="lang-en-only">Edit Agent — ${a.name}</span>
            <span class="lang-ar-only">تعديل الوكيل — ${a.name}</span>`;
        document.getElementById('agentSubmitBtn').innerHTML = `
            <span class="lang-en-only">Save Changes</span>
            <span class="lang-ar-only">حفظ التغييرات</span>`;
        document.getElementById('agentName').value = a.name;
        document.getElementById('agentEmail').value = a.email || '';
        document.getElementById('agentSpecEn').value = a.specialization_en;
        document.getElementById('agentSpecAr').value = a.specialization_ar || '';
        document.getElementById('agentTopics').value = topics.join(', ');
        document.getElementById('agentForm').classList.remove('hidden');
        document.getElementById('agentForm').scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        alert((getLang() === 'ar' ? 'فشل تحميل الوكيل: ' : 'Failed to load agent: ') + err.message);
    }
}

function closeAgentForm() {
    editingAgentId = null;
    document.getElementById('agentForm').classList.add('hidden');
}

async function submitAgent() {
    const lang = getLang();
    const name = document.getElementById('agentName').value.trim();
    const email = document.getElementById('agentEmail').value.trim();
    const specEn = document.getElementById('agentSpecEn').value.trim();
    const specAr = document.getElementById('agentSpecAr').value.trim();
    const topicsRaw = document.getElementById('agentTopics').value.trim();

    if (!name || !specEn || !topicsRaw) {
        alert(lang === 'ar'
            ? 'الاسم والتخصص (إنجليزي) والكلمات المفتاحية مطلوبة.'
            : 'Name, Specialization (EN), and Topics are required.');
        return;
    }

    const topics = topicsRaw.split(',').map(t => t.trim()).filter(Boolean);
    const btn = document.getElementById('agentSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = `<span>${lang === 'ar' ? 'جارٍ الحفظ...' : 'Saving...'}</span>`;

    try {
        const url = editingAgentId ? `/agents/${editingAgentId}` : '/agents';
        const method = editingAgentId ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email: email || undefined, specialization_en: specEn, specialization_ar: specAr || undefined, topics }),
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.details || err.error || 'Unknown error');
        }

        closeAgentForm();
        await loadAgents();
    } catch (err) {
        alert((lang === 'ar' ? 'فشل: ' : 'Failed: ') + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = editingAgentId
            ? `<span class="lang-en-only">Save Changes</span><span class="lang-ar-only">حفظ التغييرات</span>`
            : `<span class="lang-en-only">Create Agent</span><span class="lang-ar-only">إنشاء وكيل</span>`;
    }
}

async function deleteAgentById(id, name) {
    const lang = getLang();
    if (!confirm(lang === 'ar'
        ? `هل تريد حذف الوكيل "${name}"؟ لا يمكن التراجع عن هذا الإجراء.`
        : `Delete agent "${name}"? This cannot be undone.`
    )) return;

    try {
        await fetch(`/agents/${id}`, { method: 'DELETE' });
        await loadAgents();
    } catch (err) {
        alert((lang === 'ar' ? 'فشل الحذف: ' : 'Failed to delete: ') + err.message);
    }
}

loadReports();
