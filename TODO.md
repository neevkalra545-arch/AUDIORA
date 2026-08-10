# TODO - Home Page Songs Change Issue

- [ ] Fix Home trending song selection bug by removing fragile inline `onclick` JSON parsing.
- [ ] Implement safe click listeners for Home cards that call `playSingleTrackDirectly(track)`.
- [ ] Ensure UI updates instantly when a new song is selected (before YouTube fetch/play).
- [ ] Harden YouTube playback init by calling `initYouTubePlayer()` if needed before retry.
- [x] Verify by running app and clicking multiple Home songs quickly.


