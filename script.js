let audioCtx = null;
let audioBuffer1 = null; 
let audioBuffer2 = null; 
let mediaRecorder = null;
let chunks = [];
let currentSource = null;

const recordBtn1 = document.getElementById('record1');
const playRevBtn1 = document.getElementById('play-reverse1');
const recordBtn2 = document.getElementById('record2');
const playOrigBtn = document.getElementById('play-orig');
const playFinalBtn = document.getElementById('play-final');
const resetBtn = document.getElementById('reset');

// НОВАЯ ФУНКЦИЯ: Показ уведомлений сверху страницы
function showNotification(message, type = 'success') {
    const container = document.getElementById('toast-container');
    
    // Создаем элемент уведомления
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Добавляем в контейнер
    container.appendChild(toast);
    
    // Через 3 секунды запускаем плавное скрытие (0.5s на анимацию CSS)
    setTimeout(() => {
        toast.classList.add('fade-out');
        // Полностью удаляем из HTML после завершения анимации исчезновения
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 3000);
}

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

async function toggleRecording(button, onStopCallback) {
    initAudio();
    stopCurrentAudio();
    
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        chunks = [];

        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        
        mediaRecorder.onstop = async () => {
            button.textContent = button.id === 'record1' ? "🔴 Записать оригинал" : "🔴 Записать повтор";
            button.classList.remove('recording');
            
            const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
            const arrayBuffer = await blob.arrayBuffer();
            
            audioCtx.decodeAudioData(arrayBuffer, (buffer) => {
                onStopCallback(buffer);
            });

            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        button.textContent = "⏹️ Остановить запись...";
        button.classList.add('recording');

        // setTimeout(() => {
        //     if (mediaRecorder && mediaRecorder.state === "recording") {
        //         mediaRecorder.stop();
        //     }
        // }, 5000);

    } catch (err) {
        // ИЗМЕНЕНО: Ошибка микрофона теперь красная
        showNotification("Ошибка доступа к микрофону: " + err.message, 'error');
    }
}

function stopCurrentAudio() {
    if (currentSource) {
        try { currentSource.stop(); } catch (e) {}
        currentSource = null;
    }
}

function playBuffer(buffer, button, originalText, reverse = false) {
    if (!buffer) return;
    stopCurrentAudio();

    const source = audioCtx.createBufferSource();
    currentSource = source;
    
    if (reverse) {
        const numChannels = buffer.numberOfChannels;
        const reversedBuffer = audioCtx.createBuffer(numChannels, buffer.length, buffer.sampleRate);
        
        for (let channel = 0; channel < numChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            const reversedData = reversedBuffer.getChannelData(channel);
            for (let i = 0; i < buffer.length; i++) {
                reversedData[i] = channelData[buffer.length - 1 - i];
            }
        }
        source.buffer = reversedBuffer;
    } else {
        source.buffer = buffer;
    }

    button.textContent = "⏳ Прослушивание звука...";
    button.disabled = true;

    source.onended = () => {
        button.textContent = originalText;
        button.disabled = false;
        if (currentSource === source) currentSource = null;
    };

    source.connect(audioCtx.destination);
    source.start(0);
}

// --- События кнопок ---

recordBtn1.addEventListener('click', () => {
    toggleRecording(recordBtn1, (buffer) => {
        audioBuffer1 = buffer;
        playRevBtn1.disabled = false;
        recordBtn2.disabled = false;
    });
});

playRevBtn1.addEventListener('click', () => {
    playBuffer(audioBuffer1, playRevBtn1, "🔄 Слушать задом наперед (для Игрока 2)", true);
});

recordBtn2.addEventListener('click', () => {
    toggleRecording(recordBtn2, (buffer) => {
        audioBuffer2 = buffer;
        playOrigBtn.disabled = false;
        playFinalBtn.disabled = false;
    });
});

playOrigBtn.addEventListener('click', () => {
    playBuffer(audioBuffer1, playOrigBtn, "Оригинал Игрока 1", false);
});

playFinalBtn.addEventListener('click', () => {
    playBuffer(audioBuffer2, playFinalBtn, "Итог Игрока 2 (Развернутый)", true);
});

resetBtn.addEventListener('click', () => {
    stopCurrentAudio();
    audioBuffer1 = null;
    audioBuffer2 = null;
    playRevBtn1.disabled = true;
    recordBtn2.disabled = true;
    playOrigBtn.disabled = true;
    playFinalBtn.disabled = true;
    
    // ИЗМЕНЕНО: Сброс игры теперь выводит красивое зеленое уведомление
    showNotification("Игра успешно сброшена! Можно начинать заново.", 'success');
});
