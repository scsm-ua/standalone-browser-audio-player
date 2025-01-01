document.addEventListener('DOMContentLoaded', function() {
    const audioPlayer = document.getElementById('audioPlayer');
    const playPauseContainer = document.getElementById('playPauseContainer');
    const playPauseButton = document.getElementById('playPauseButton');
    const trackLink = document.getElementById('trackLink');
    const currentTime = document.getElementById('currentTime');
    const totalTime = document.getElementById('totalTime');
    const speedButton = document.getElementById('speedButton');
    const playlist = document.getElementById('playlist');
    const progressBarWrapper = document.getElementById('progressBarWrapper');
    const progressBar = document.getElementById('progressBar');
    const bufferBar = document.getElementById('bufferBar');
    const liveButton = document.getElementById('liveButton');
    const volumeIcon = document.getElementById('volumeIcon');
    const volumeBarContainer = document.getElementById('volumeBarContainer');
    const volumeBar = document.getElementById('volumeBar');
    let currentTrackIndex = 0;
    let tracks = [];
    let isPlaying = false;
    let isMuted = false;
    let previousVolume = 1;
    let isFirstPlay = true;
    let playbackRate = 1;
    let isDragging = false;

    const applyVolume = (percentage) => {
        audioPlayer.volume = Math.min(Math.max(percentage, 0), 1);
        volumeBar.style.height = (audioPlayer.volume * 100) + '%';
        isMuted = false;
        updateVolumeIcon();
        localStorage.setItem('audioPlayerVolume', audioPlayer.volume);
    };

    fetch('tracks.json')
        .then(response => response.json())
        .then(data => {
            tracks = data;
            tracks.forEach((track, index) => {
                // track.duration = '0:30'; // Ensure duration is a string in "mm:ss" format
                const li = document.createElement('li');
                li.innerHTML = `
                    <img src="${track.image}" alt="${track.title}">
                    <span class="title">${track.title}</span>
                    <span class="duration">${track.duration}</span>
                `;
                li.setAttribute('data-src', track.mp3);
                li.setAttribute('data-index', index);
                li.addEventListener('click', function() {
                    const clickedTrackIndex = parseInt(this.getAttribute('data-index'));
                    if (clickedTrackIndex !== currentTrackIndex) {
                        currentTrackIndex = clickedTrackIndex;
                        playTrack(currentTrackIndex);
                    }
                });
                playlist.appendChild(li);
            });
            initializePlayerUI();
        })
        .catch(error => console.error('Error fetching tracks:', error));

    // Restore volume and playback speed from localStorage
    const savedVolume = localStorage.getItem('audioPlayerVolume');
    const savedPlaybackRate = localStorage.getItem('audioPlayerPlaybackRate');
    if (savedVolume !== null) {
        applyVolume(parseFloat(savedVolume));
    }
    if (savedPlaybackRate !== null) {
        playbackRate = parseFloat(savedPlaybackRate);
        audioPlayer.playbackRate = playbackRate;
        speedButton.textContent = playbackRate + 'x';
    }

    playPauseContainer.addEventListener('click', function() {
        if (isPlaying) {
            audioPlayer.pause();
        } else {
            if (isFirstPlay) {
                const { track, position, index } = findCurrentTrackAndPosition();
                if (track) {
                    currentTrackIndex = index;
                    playTrack(currentTrackIndex, true);
                    audioPlayer.currentTime = position;
                } else {
                    audioPlayer.play();
                }
            } else {
                audioPlayer.play();
            }
        }
    });

    speedButton.addEventListener('click', function() {
        if (audioPlayer.playbackRate === 1) {
            playbackRate = 1.2;
        } else if (audioPlayer.playbackRate === 1.2) {
            playbackRate = 1.5;
        } else {
            playbackRate = 1;
        }
        audioPlayer.playbackRate = playbackRate;
        speedButton.textContent = playbackRate + 'x';
        localStorage.setItem('audioPlayerPlaybackRate', playbackRate);
    });

    volumeIcon.addEventListener('click', function() {
        if (isMuted) {
            applyVolume(previousVolume);
        } else {
            previousVolume = audioPlayer.volume;
            applyVolume(0);
            isMuted = true;
        }
    });

    const setVolume = (event) => {
        const rect = volumeBarContainer.getBoundingClientRect();
        const offsetY = event.clientY - rect.top;
        const height = rect.height;
        const percentage = 1 - (offsetY / height);
        applyVolume(percentage);
    };

    volumeBarContainer.addEventListener('mousedown', function(event) {
        setVolume(event);

        const onMouseMove = (event) => {
            setVolume(event);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    volumeBarContainer.addEventListener('click', setVolume);

    // Add touch event listeners for volume bar
    volumeBarContainer.addEventListener('touchstart', function(event) {
        event.preventDefault();
        setVolume(event.touches[0]);

        const onTouchMove = (event) => {
            event.preventDefault();
            setVolume(event.touches[0]);
        };

        const onTouchEnd = () => {
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
        };

        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
    }, { passive: false });

    const setProgressUI = (event) => {
        const rect = progressBarWrapper.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;
        const width = rect.width;
        const percentage = Math.min(Math.max(offsetX / width, 0), 1);
        progressBar.style.width = percentage * 100 + '%';
        currentTime.textContent = formatTime(percentage * audioPlayer.duration);
    };

    const setProgress = (event) => {
        const rect = progressBarWrapper.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;
        const width = rect.width;
        const percentage = Math.min(Math.max(offsetX / width, 0), 1);
        audioPlayer.currentTime = percentage * audioPlayer.duration;
        isDragging = false;
    };

    progressBarWrapper.addEventListener('click', function(event) {
        setProgress(event);
    });

    progressBarWrapper.addEventListener('mousedown', function(event) {
        isDragging = true;
        setProgressUI(event);

        const onMouseMove = (event) => {
            setProgressUI(event);
        };

        const onMouseUp = (event) => {
            setProgress(event);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    // Add touch event listeners for progress bar
    progressBarWrapper.addEventListener('touchstart', function(event) {
        event.preventDefault();
        isDragging = true;
        setProgressUI(event.touches[0]);

        const onTouchMove = (event) => {
            event.preventDefault();
            setProgressUI(event.touches[0]);
        };

        const onTouchEnd = (event) => {
            setProgress(event.changedTouches[0]);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
        };

        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
    }, { passive: false });

    audioPlayer.addEventListener('play', function() {
        isFirstPlay = false;
        isPlaying = true;
        playPauseButton.classList.remove('play');
        playPauseButton.classList.add('pause');
        updateLiveButtonState();
    });

    audioPlayer.addEventListener('pause', function() {
        isPlaying = false;
        playPauseButton.classList.remove('pause');
        playPauseButton.classList.add('play');
        updateLiveButtonState();
    });

    audioPlayer.addEventListener('timeupdate', function() {
        if (!isDragging) {
            currentTime.textContent = formatTime(audioPlayer.currentTime);
            const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            progressBar.style.width = progress + '%';
            updateLiveButtonState();
        }
    });

    audioPlayer.addEventListener('loadedmetadata', function() {
        totalTime.textContent = formatTime(audioPlayer.duration);
    });

    audioPlayer.addEventListener('ended', function() {
        currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
        playTrack(currentTrackIndex);
        scrollToNextTrackSmooth(currentTrackIndex); // Scroll to next track smoothly
        updateLiveButtonState();
    });

    function scrollToNextTrackSmooth(index) {
        scrollToTrack(index, { behavior: 'smooth', block: 'center' });
    }

    function scrollToLiveTrackNoSmooth(index) {
        scrollToTrack(index, { block: 'center' });
    }

    function scrollToTrack(index, options) {
        const items = playlist.querySelectorAll('li');
        if (items[index]) {
            items[index].scrollIntoView(options);
        }
    }

    audioPlayer.addEventListener('error', function() {
        console.error('Error playing track:', audioPlayer.error);
    });

    liveButton.addEventListener('click', function() {
        if (!liveButton.classList.contains('active')) {
            const { track, position, index } = findCurrentTrackAndPosition();
            if (track) {
                currentTrackIndex = index;
                playTrack(currentTrackIndex, true);
                audioPlayer.currentTime = position;
                scrollToNextTrackSmooth(index); // Scroll to LIVE track smoothly
            }
        }
    });

    setInterval(updateLiveLabel, 1000);

    function initializePlayerUI() {
        const { track, position, index } = findCurrentTrackAndPosition();
        if (track) {
            currentTrackIndex = index;
            playTrack(currentTrackIndex, false);
            audioPlayer.currentTime = position;
            scrollToLiveTrackNoSmooth(index); // Scroll to LIVE track without smooth
        } else {
            playTrack(currentTrackIndex, false);
        }
        updateLiveButtonState();
        updateVolumeIcon();
        volumeBar.style.height = (audioPlayer.volume * 100) + '%';
    }

    function playTrack(index, shouldPlay = true) {
        const track = tracks[index];
        if (audioPlayer.src !== track.mp3) {
            document.getElementById('audioSource').src = track.mp3;
            audioPlayer.load();
        }
        document.getElementById('player').style.backgroundImage = `url(${track.image})`; // Set player background to track image
        trackLink.href = track.link;
        trackLink.textContent = track.title;
        if (shouldPlay) {
            audioPlayer.play();
        }
        // Restore playback speed
        audioPlayer.playbackRate = playbackRate;
        speedButton.textContent = playbackRate + 'x';
        updatePlaylistHighlight();
    }

    function updateLiveButtonState() {
        const { track, position } = findCurrentTrackAndPosition();
        const isLive = track && Math.abs(audioPlayer.currentTime - position) < 5; // Allow a small buffer for sync
        if (isPlaying && isLive) {
            liveButton.classList.add('active');
            liveButton.classList.remove('inactive');
        } else {
            liveButton.classList.remove('active');
            liveButton.classList.add('inactive');
        }
    }

    function updateLiveLabel() {
        const { track, index } = findCurrentTrackAndPosition();
        const items = playlist.querySelectorAll('li');
        items.forEach((item, i) => {
            const liveLabel = item.querySelector('.live-label');
            if (i === index) {
                if (!liveLabel) {
                    const label = document.createElement('span');
                    label.classList.add('live-label');
                    label.innerHTML = '<span class="live-circle"></span> LIVE';
                    const durationElement = item.querySelector('.duration');
                    item.insertBefore(label, durationElement);
                }
            } else {
                if (liveLabel) {
                    liveLabel.remove();
                }
            }
        });
    }

    function updatePlaylistHighlight() {
        const items = playlist.querySelectorAll('li');
        items.forEach(item => item.classList.remove('playing'));
        items[currentTrackIndex].classList.add('playing');
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function findCurrentTrackAndPosition() {
        const zeroTime = new Date(0);
        const currentTime = new Date();
        const elapsedTime = (currentTime - zeroTime) / 1000 % getTotalDuration();
        return findTrackByElapsedTime(elapsedTime);
    }

    function findTrackByElapsedTime(elapsedTime) {
        let accumulatedTime = 0;
        for (let i = 0; i < tracks.length; i++) {
            const trackDuration = parseTime(tracks[i].duration);
            if (accumulatedTime + trackDuration > elapsedTime) {
                return { track: tracks[i], position: elapsedTime - accumulatedTime, index: i };
            }
            accumulatedTime += trackDuration;
        }
        return null;
    }

    function parseTime(timeString) {
        const [minutes, seconds] = timeString.split(':').map(Number);
        return minutes * 60 + seconds;
    }

    function getTotalDuration() {
        return tracks.reduce((total, track) => total + parseTime(track.duration), 0);
    }

    function updateVolumeIcon() {
        if (isMuted || audioPlayer.volume === 0) {
            volumeIcon.classList.add('muted');
            volumeIcon.classList.remove('low');
        } else if (audioPlayer.volume < 0.5) {
            volumeIcon.classList.add('low');
            volumeIcon.classList.remove('muted');
        } else {
            volumeIcon.classList.remove('muted', 'low');
        }
    }

    audioPlayer.addEventListener('progress', function() {
        if (audioPlayer.buffered.length > 0) {
            const bufferedEnd = audioPlayer.buffered.end(audioPlayer.buffered.length - 1);
            const duration = audioPlayer.duration;
            if (duration > 0) {
                const bufferWidth = (bufferedEnd / duration) * 100;
                bufferBar.style.width = bufferWidth + '%';
            }
        }
    });
});
