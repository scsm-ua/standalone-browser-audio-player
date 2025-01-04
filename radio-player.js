/*
TODO:
Fix plyaer size on very wide screen (small desktop)
Fix player size on very small screen (iphone 5c)
Volume slider - make light color thiner.
Two columnts design for big screen - review width to fit left column by height.
Make playlist subtitles attachable to player.
Add image to subplaylist data.
Keep scrolling position on expanding playlist in bottom of screen.
*/

document.addEventListener('DOMContentLoaded', function() {
    const audioPlayer = document.getElementById('audioPlayer');
    const playPauseContainer = document.getElementById('playPauseContainer');
    const playPauseButton = document.getElementById('playPauseButton');
    const trackLink = document.getElementById('trackLink');
    const currentTime = document.getElementById('currentTime');
    const totalTime = document.getElementById('totalTime');
    const speedButton = document.getElementById('speedButton');
    const playlistContainer = document.getElementById('playlist');
    const progressBarWrapper = document.getElementById('progressBarWrapper');
    const progressBar = document.getElementById('progressBar');
    const bufferBar = document.getElementById('bufferBar');
    const liveButton = document.getElementById('liveButton');
    const volumeIcon = document.getElementById('volumeIcon');
    const volumeBarContainer = document.getElementById('volumeBarContainer');
    const volumeBar = document.getElementById('volumeBar');
    const playlistTitleText = document.getElementById('playlistTitleText');
    let currentTrackIndex = 0;
    let tracks = [];
    let isPlaying = false;
    let isMuted = false;
    let previousVolume = 1;
    let isFirstPlay = true;
    let playbackRate = 1;
    let isDragging = false;
    let playlists = [];

    const applyVolume = (percentage) => {
        audioPlayer.volume = Math.min(Math.max(percentage, 0), 1);
        volumeBar.style.height = (audioPlayer.volume * 100) + '%';
        isMuted = false;
        updateVolumeIcon();
        localStorage.setItem('audioPlayerVolume', audioPlayer.volume);
    };

    const calculateTotalPlaylistTime = (tracks) => {
        return tracks.reduce((total, track) => total + parseTime(track.duration), 0);
    };

    const formatTotalTime = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours > 0 ? hours + ':' : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    fetch('tracks.json')
        .then(response => response.json())
        .then(data => {
            playlists = data;
            data.forEach((playlistData, playlistIndex) => {
                const playlistTitleLi = document.createElement('li');
                const playlistTitleDiv = document.createElement('div');
                playlistTitleDiv.classList.add('playlist-title');

                // Create playlist title span
                const playlistTitleSpan = document.createElement('span');
                playlistTitleSpan.classList.add('playlist-title-text');
                playlistTitleSpan.textContent = playlistData.title;

                // Calculate and display total playlist time
                const totalPlaylistTime = calculateTotalPlaylistTime(playlistData.tracks);
                const totalTimeSpan = document.createElement('span');
                totalTimeSpan.classList.add('total-time');
                totalTimeSpan.textContent = formatTotalTime(totalPlaylistTime);

                // Create LIVE label
                const liveLabel = document.createElement('span');
                liveLabel.classList.add('live-label');
                liveLabel.innerHTML = '<span class="live-circle"></span> LIVE';

                playlistTitleDiv.appendChild(playlistTitleSpan);
                playlistTitleDiv.appendChild(liveLabel);
                playlistTitleDiv.appendChild(totalTimeSpan);

                playlistTitleDiv.setAttribute('data-playlist-index', playlistIndex);
                playlistTitleDiv.addEventListener('click', function() {
                    const subPlaylistUl = playlistTitleLi.querySelector(`ul[data-playlist-index="${playlistIndex}"]`);
                    const isCollapsed = subPlaylistUl.classList.toggle('collapsed');
                    if (!isCollapsed) {
                        subPlaylistUl.style.height = subPlaylistUl.scrollHeight + 'px';
                        subPlaylistUl.classList.add('expanded');
                        collapseOtherPlaylists(playlistIndex);
                        playlistTitleLi.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        setTimeout(() => {
                            playlistTitleLi.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 300); // Delay to match the CSS transition duration
                    } else {
                        subPlaylistUl.style.height = 0;
                        subPlaylistUl.classList.remove('expanded');
                    }
                });

                // Add first track image to the playlist title div
                if (playlistData.tracks.length > 0) {
                    const firstTrackImage = document.createElement('img');
                    firstTrackImage.src = playlistData.tracks[0].image;
                    firstTrackImage.alt = playlistData.title;
                    firstTrackImage.classList.add('playlist-title-image');
                    playlistTitleDiv.prepend(firstTrackImage);
                }

                const subPlaylistUl = document.createElement('ul');
                subPlaylistUl.classList.add('playlist-tracks', 'collapsed');
                subPlaylistUl.setAttribute('data-playlist-index', playlistIndex);

                playlistData.tracks.forEach(track => {
                    tracks.push(track);
                });

                playlistData.tracks.forEach((track, index) => {
                    const li = document.createElement('li');
                    li.classList.add('track');
                    li.setAttribute('data-playlist-index', playlistIndex);
                    li.innerHTML = `
                        <img src="${track.image}" alt="${track.title}">
                        <span class="title">${track.title}</span>
                        <span class="duration">${track.duration}</span>
                    `;
                    li.setAttribute('data-src', track.mp3);
                    li.setAttribute('data-index', tracks.indexOf(track));
                    li.addEventListener('click', function() {
                        const clickedTrackIndex = parseInt(this.getAttribute('data-index'));
                        if (clickedTrackIndex !== currentTrackIndex) {
                            currentTrackIndex = clickedTrackIndex;
                            playTrack(currentTrackIndex);
                        }
                    });
                    if (index === playlistData.tracks.length - 1) {
                        li.classList.add('last-playlist-item');
                    }
                    subPlaylistUl.appendChild(li);
                });

                playlistTitleLi.appendChild(playlistTitleDiv);
                playlistTitleLi.appendChild(subPlaylistUl);
                playlistContainer.appendChild(playlistTitleLi);
            });
            initializePlayerUI();
        })
        .catch(error => console.error('Error fetching tracks:', error));

    // Restore volume and playback speed from localStorage
    const savedVolume = localStorage.getItem('audioPlayerVolume');
    const savedPlaybackRate = localStorage.getItem('audioPlayerPlaybackRate');
    if (savedVolume !== null) {
        applyVolume(parseFloat(savedVolume));
        isMuted = parseFloat(savedVolume) === 0;
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
        const items = playlistContainer.querySelectorAll('li[data-index]');
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
            expandPlaylistByTrack(track); // Expand playlist with LIVE track
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
        updatePlaylistHighlight(index); // Pass the current track index to updatePlaylistHighlight
        updatePlaylistTitle(findPlaylistTitleByTrack(track)); // Update playlist title
        expandPlaylistByTrack(track); // Expand playlist with current track
    }

    function expandPlaylistByTrack(track) {
        const playlistIndex = findPlaylistIndexByTrack(track);
        if (playlistIndex !== -1) {
            const subPlaylistUl = playlistContainer.querySelector(`ul[data-playlist-index="${playlistIndex}"]`);
            if (subPlaylistUl) {
                subPlaylistUl.classList.remove('collapsed');
                subPlaylistUl.classList.add('expanded');
                subPlaylistUl.style.height = subPlaylistUl.scrollHeight + 'px'; // Ensure height is set for animation
                collapseOtherPlaylists(playlistIndex);
            }
        }
    }

    function findPlaylistByTrack(track) {
        for (let i = 0; i < playlists.length; i++) {
            if (playlists[i].tracks.includes(track)) {
                return { title: playlists[i].title, index: i };
            }
        }
        return { title: '', index: -1 };
    }

    function findPlaylistTitleByTrack(track) {
        return findPlaylistByTrack(track).title;
    }

    function findPlaylistIndexByTrack(track) {
        return findPlaylistByTrack(track).index;
    }

    function collapseOtherPlaylists(exceptIndex) {
        const subPlaylists = playlistContainer.querySelectorAll('ul.playlist-tracks');
        subPlaylists.forEach((subPlaylist, index) => {
            if (index !== exceptIndex) {
                subPlaylist.style.height = 0;
                subPlaylist.classList.add('collapsed');
                subPlaylist.classList.remove('expanded');
            }
        });
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
        const items = playlistContainer.querySelectorAll('li[data-index]');
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

        // Update playlist title with LIVE label
        const playlistIndex = findPlaylistIndexByTrack(track);
        const playlistTitleDivs = playlistContainer.querySelectorAll('div.playlist-title');
        playlistTitleDivs.forEach((playlistTitleDiv, i) => {
            const liveLabel = playlistTitleDiv.querySelector('.live-label');
            if (i === playlistIndex) {
                if (!liveLabel) {
                    const label = document.createElement('span');
                    label.classList.add('live-label');
                    label.innerHTML = '<span class="live-circle"></span> LIVE';
                    playlistTitleDiv.insertBefore(label, playlistTitleDiv.querySelector('.total-time'));
                }
            } else {
                if (liveLabel) {
                    liveLabel.remove();
                }
            }
        });
    }

    function updatePlaylistHighlight(currentIndex) {
        const items = playlistContainer.querySelectorAll('li.playing');
        items.forEach(item => item.classList.remove('playing'));
        const currentItem = playlistContainer.querySelector(`li[data-index="${currentIndex}"]`);
        if (currentItem) {
            currentItem.classList.add('playing');
        }

        // Update playlist title highlight
        const playlistIndex = currentItem.getAttribute('data-playlist-index');
        const playlistTitleDivs = playlistContainer.querySelectorAll('div.playlist-title');
        playlistTitleDivs.forEach((playlistTitleDiv, i) => {
            if (i === parseInt(playlistIndex)) {
                playlistTitleDiv.classList.add('active');
            } else {
                playlistTitleDiv.classList.remove('active');
            }
        });
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

    function updatePlaylistTitle(title) {
        playlistTitleText.textContent = title;
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
