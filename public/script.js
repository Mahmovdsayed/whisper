document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const audioInput = document.getElementById('audioInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const processBtn = document.getElementById('processBtn');
    const resetBtn = document.getElementById('resetBtn');
    
    const uploadSection = document.getElementById('uploadSection');
    const processingState = document.getElementById('processingState');
    const resultsDashboard = document.getElementById('resultsDashboard');

    let currentFile = null;

    dropZone.addEventListener('click', () => audioInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    audioInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFileSelect(e.target.files[0]);
        }
    });

    function handleFileSelect(file) {
        if (!file.type.startsWith('audio/')) {
            alert('Please select a valid audio file.');
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

        const formData = new FormData();
        formData.append('audio', currentFile);

        try {
            const response = await fetch('http://localhost:3000/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to process audio');
            }

            const data = await response.json();
            renderResults(data);

        } catch (error) {
            console.error('Error:', error);
            alert(`Error processing audio: ${error.message}`);
            processingState.classList.add('hidden');
            uploadSection.classList.remove('hidden');
        }
    });

    resetBtn.addEventListener('click', () => {
        currentFile = null;
        audioInput.value = '';
        resultsDashboard.classList.add('hidden');
        fileInfo.classList.add('hidden');
        dropZone.classList.remove('hidden');
        uploadSection.classList.remove('hidden');
    });

    function renderResults(data) {
        processingState.classList.add('hidden');
        resultsDashboard.classList.remove('hidden');

        const analysis = data.analysis;
        
        setMetric('convQuality', analysis.conversation_quality);
        setMetric('sentiment', analysis.sentiment);
        setMetric('resolutionStatus', analysis.resolution_status);
        
        const emotionMap = {
            'hap': 'Happy',
            'ang': 'Angry',
            'sad': 'Sad',
            'neu': 'Neutral',
            'sur': 'Surprised',
            'fea': 'Fearful',
            'dis': 'Disgusted'
        };
        const rawLabel = data.primary_emotion ? data.primary_emotion.label : 'Unknown';
        const emotionLabel = emotionMap[rawLabel.toLowerCase()] || rawLabel;
        setMetric('primaryEmotion', emotionLabel, 'neutral'); 

        document.getElementById('summaryText').textContent = analysis.summary;
        document.getElementById('transcriptText').textContent = data.transcript || "No transcript available.";

        const topicsContainer = document.getElementById('topicsTags');
        topicsContainer.innerHTML = '';
        if (analysis.topics && analysis.topics.length) {
            analysis.topics.forEach(topic => {
                const span = document.createElement('span');
                span.className = 'tag';
                span.textContent = topic;
                topicsContainer.appendChild(span);
            });
        } else {
            topicsContainer.innerHTML = '<span class="tag">No topics identified</span>';
        }
    }

    function setMetric(elementId, value, defaultClass = '') {
        const el = document.getElementById(elementId);
        if (!el || !value) return;
        
        el.textContent = value.replace(/_/g, ' ').toUpperCase();
        el.className = 'badge'; 
        
        const normalized = value.toLowerCase();
        if (defaultClass) {
            el.classList.add(defaultClass);
        } else if (['excellent', 'good', 'positive', 'resolved'].includes(normalized)) {
            el.classList.add('good');
        } else if (['poor', 'negative', 'unresolved'].includes(normalized)) {
            el.classList.add('poor');
        } else {
            el.classList.add('medium');
        }
    }
});
