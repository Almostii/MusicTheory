document.addEventListener('DOMContentLoaded', function() {
    let synth = null;
    let isSamplerLoaded = false; // 表示音源是否加载完成
    let isAudioContextStarted = false; // 表示音频上下文是否已启动

    const progressions = {
        'C-F-G-C': [['C4', 'E4', 'G4'], ['F4', 'A4', 'C5'], ['G4', 'B4', 'D5'], ['C4', 'E4', 'G4']]
    };

    function initPianoSound() {
        if (window.Tone) {
            try {
                synth = new Tone.Sampler({
                    urls: {
                        "C4": "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3", "A4": "A4.mp3",
                        "C5": "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3", "A5": "A5.mp3"
                    },
                    baseUrl: "https://tonejs.github.io/audio/salamander/",
                    onload: () => {
                        console.log("Piano sound loaded.");
                        isSamplerLoaded = true;
                        updatePlayButtons(true);
                    },
                    onerror: (error) => {
                        console.error("Failed to load piano sound:", error);
                        isSamplerLoaded = false;
                        updatePlayButtons(false);
                    }
                }).toDestination();
                synth.volume.value = -10;
            } catch (error) {
                console.error("Failed to initialize piano sound:", error);
                isSamplerLoaded = false;
                updatePlayButtons(false);
            }
        } else {
            console.error('Tone.js not loaded, cannot initialize piano sound');
            isSamplerLoaded = false;
            updatePlayButtons(false);
        }
    }

    async function startAudioContext() { // 声明为 async
        if (window.Tone && Tone.context.state !== 'running') {
            console.log('Attempting to start audio context...');
            try {
                await Tone.start(); // 等待 Tone.start() 的 Promise 解决
                isAudioContextStarted = true; // 设置音频上下文已启动
                console.log('Audio context started. isAudioContextStarted set to true.');
            } catch (error) {
                console.error('Failed to start audio context:', error);
                isAudioContextStarted = false; // 确保在启动失败时设置为 false
                throw error; // 抛出错误以便调用者者处理
            }
        } else if (window.Tone && Tone.context.state === 'running') {
            console.log('Audio context is already running. isAudioContextStarted set to true.');
            isAudioContextStarted = true;
        } else {
            console.warn('Tone.js not available, cannot start audio context. isAudioContextStarted set to false.');
            isAudioContextStarted = false;
        }
    }

    function updatePlayButtons(isLoaded) {
        const pianoWindows = document.querySelectorAll('.piano-window[data-progression]');
        pianoWindows.forEach(window => {
            const playButton = window.querySelector('.play-btn');
            if (isLoaded) {
                playButton.disabled = false;
                playButton.textContent = '播放和声进行';
            } else {
                playButton.disabled = true;
                playButton.textContent = '加载失败';
            }
        });
    }

    // 设置钢琴窗交互
    function setupPianoWindows() {
        const pianoWindows = document.querySelectorAll('.piano-window[data-progression]');
        pianoWindows.forEach(window => {
            const progressionName = window.dataset.progression;
            if (progressionName && progressions[progressionName]) {
                // 生成钢琴键盘
                generatePianoKeyboard(window, progressions[progressionName]);

                const playButton = window.querySelector('.play-btn');
                playButton.disabled = true;
                playButton.textContent = '加载音源...';
                playButton.addEventListener('click', async function() { // 将事件监听器改为 async
                    try {
                        await startAudioContext(); // 确保在播放前启动音频上下文
                        playProgression(progressionName);
                    } catch (error) {
                        console.error('Failed to start audio context on user gesture:', error);
                    }
                });
            }
        });
    }

    // 生成钢琴键盘
    function generatePianoKeyboard(pianoWindow, chordSequence) {
        const keyboardContainer = document.createElement('div');
        keyboardContainer.className = 'piano-keyboard';
        const keysContainer = document.createElement('div');
        keysContainer.className = 'keyboard-keys';

        // 固定显示 C4-G5 区域
        const minNoteOctave = 4; 
        const maxNoteOctave = 5; // 保持为5，但通过下面的逻辑控制到G5

        const notesInOrder = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const allKeys = [];

        for (let octave = minNoteOctave; octave <= maxNoteOctave; octave++) {
            notesInOrder.forEach(noteName => {
                // 如果是最高八度，并且音符超过 G，则跳过
                if (octave === maxNoteOctave && notesInOrder.indexOf(noteName) > notesInOrder.indexOf('G')) {
                    return; 
                }
                allKeys.push(noteName + octave);
            });
        }

        allKeys.forEach(note => {
            const isBlackKey = note.includes('#');
            const keyElement = document.createElement('div');
            keyElement.className = `piano-key ${isBlackKey ? 'black' : ''}`;
            keyElement.dataset.note = note;
            keyElement.textContent = note.replace('#', '♯'); // 显示升号
            keysContainer.appendChild(keyElement);
        });

        keyboardContainer.appendChild(keysContainer);
        pianoWindow.appendChild(keyboardContainer);

        // 绑定单个音符点击事件
        keysContainer.querySelectorAll('.piano-key').forEach(key => {
            key.addEventListener('click', async function() {
                const note = this.dataset.note;
                try {
                    await playSingleNote(note);
                    this.classList.add('active');
                    setTimeout(() => this.classList.remove('active'), 300);
                } catch (error) {
                    console.error("Error playing single note:", error);
                }
            });
        });
    }

    // 高亮钢琴键
    function highlightPianoKey(note, duration = 1000, pianoWindow = null) {
        // 移除在每个音符高亮前清除所有高亮的逻辑，现在由 playProgression 统一处理
        // const allActiveKeys = (pianoWindow || document).querySelectorAll('.piano-key.active');
        // allActiveKeys.forEach(key => key.classList.remove('active'));

        let keyElement;
        if (pianoWindow) {
            keyElement = pianoWindow.querySelector(`.piano-key[data-note="${note}"]`);
        } else {
            keyElement = document.querySelector(`.piano-key[data-note="${note}"]`);
        }

        if (keyElement) {
            keyElement.classList.add('active');
            setTimeout(() => keyElement.classList.remove('active'), duration);
        }
    }

    // 播放单个音符
    async function playSingleNote(note) { // 变为 async
        console.log(`playSingleNote called for note: ${note}. synth: ${!!synth}, isSamplerLoaded: ${isSamplerLoaded}, isAudioContextStarted: ${isAudioContextStarted}`);
        if (!synth || !isSamplerLoaded) { // 只需要检查音源是否加载
            console.warn('Piano sound not ready, cannot play note.');
            return;
        }
        await startAudioContext(); // 确保音频上下文已启动
        synth.triggerAttackRelease(note, "8n");
    }

    async function playProgression(progressionName) {
        console.log(`playProgression called for: ${progressionName}. synth: ${!!synth}, isSamplerLoaded: ${isSamplerLoaded}, isAudioContextStarted: ${isAudioContextStarted}`);
        if (!synth || !isSamplerLoaded) {
            console.warn('Piano sound not ready, cannot play progression.');
            return;
        }
    
        const chordSequence = progressions[progressionName];
        if (!chordSequence) {
            console.error('Unknown progression:', progressionName);
            return;
        }
    
        const pianoWindow = document.querySelector(`.piano-window[data-progression="${progressionName}"]`);
        const playButton = pianoWindow.querySelector('.play-btn');
        
        // 防止重复点击
        if (Tone.Transport.state === 'started') {
            return;
        }

        playButton.classList.add('playing');
        playButton.textContent = '播放中...';
    
        // 停止并清除任何先前的播放计划
        Tone.Transport.stop();
        Tone.Transport.cancel();
    
        const chordDuration = 1; // 每个和弦持续1秒
    
        // 调度每个和弦的播放和高亮
        chordSequence.forEach((chord, index) => {
            const startTime = index * chordDuration;
    
            // 调度和弦发声和高亮
            Tone.Transport.scheduleOnce(time => {
                // 播放和弦
                synth.triggerAttackRelease(chord, chordDuration, time);
                
                // 高亮琴键
                // 在播放新和弦之前，清除所有旧的高亮
                const allActiveKeys = pianoWindow.querySelectorAll('.piano-key.active');
                allActiveKeys.forEach(key => key.classList.remove('active'));
                chord.forEach(note => {
                    const keyElement = pianoWindow.querySelector(`.piano-key[data-note="${note}"]`);
                    if (keyElement) {
                        keyElement.classList.add('active');
                    }
                });

            }, startTime);
        });
    
        // 调度播放结束后的清理工作
        const totalDuration = chordSequence.length * chordDuration;
        Tone.Transport.scheduleOnce(time => {
            // 清除所有高亮
            const allActiveKeys = pianoWindow.querySelectorAll('.piano-key.active');
            allActiveKeys.forEach(key => key.classList.remove('active'));
    
            // 恢复按钮状态
            if (playButton) {
                playButton.classList.remove('playing');
                playButton.textContent = '播放和声进行';
            }
            Tone.Transport.stop();
        }, totalDuration);
    
        // 启动播放，增加一个小的延迟以确保调度准备就绪
        Tone.Transport.start(Tone.now() + 0.1);
    }

    setupPianoWindows();
    initPianoSound();
});
